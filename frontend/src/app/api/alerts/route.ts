import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';

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

    const latestTimestamp = latestMetricSnapshot.docs[0].data().timestamp;
    const latestTime = new Date(latestTimestamp).getTime();

    // Fetch recent alerts (up to 200 documents)
    const alertsSnapshot = await db.collection('alerts')
      .orderBy('timestamp', 'desc')
      .limit(200)
      .get();
      
    const allAlerts = alertsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data() as any
    }));

    // Filter in-memory to keep only the alerts from the latest run (within 5 minutes)
    const alerts = allAlerts.filter(a => {
      const aTime = new Date(a.timestamp).getTime();
      return Math.abs(latestTime - aTime) < 5 * 60 * 1000;
    });

    return NextResponse.json({ alerts });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
