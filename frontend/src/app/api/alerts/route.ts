import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

const RUN_WINDOW_MS = 5 * 60 * 1000; // 5-minute window to group alerts from the same run
const MAX_ALERTS = 200;

interface AlertRecord {
  id: string;
  lat: number;
  lon: number;
  type: string;
  level: string;
  message: string;
  timestamp: string;
}

export async function GET() {
  try {
    // Get the latest run timestamp from the metrics collection
    const latestMetricSnapshot = await db.collection('metrics')
      .orderBy('timestamp', 'desc')
      .limit(1)
      .get();

    if (latestMetricSnapshot.empty) {
      return NextResponse.json({ alerts: [] });
    }

    const latestTimestamp = latestMetricSnapshot.docs[0].data().timestamp as string;
    const latestTime = new Date(latestTimestamp).getTime();

    // Fetch recent alerts (up to MAX_ALERTS documents)
    const alertsSnapshot = await db.collection('alerts')
      .orderBy('timestamp', 'desc')
      .limit(MAX_ALERTS)
      .get();
      
    const allAlerts: AlertRecord[] = alertsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        lat: data.lat as number,
        lon: data.lon as number,
        type: data.type as string,
        level: data.level as string,
        message: data.message as string,
        timestamp: data.timestamp as string,
      };
    });

    // Filter to keep only alerts from the latest run (within the run window)
    const alerts = allAlerts.filter(a => {
      const aTime = new Date(a.timestamp).getTime();
      return Math.abs(latestTime - aTime) < RUN_WINDOW_MS;
    });

    return NextResponse.json({ alerts }, {
      headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=120' }
    });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
