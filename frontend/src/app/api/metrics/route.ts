import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

const RUN_WINDOW_MS = 5 * 60 * 1000; // 5-minute window to group metrics from the same run
const MAX_METRICS = 200;

interface MetricRecord {
  id: string;
  lat: number;
  lon: number;
  variable: string;
  value: number;
  timestamp: string;
}

export async function GET() {
  try {
    // Get the latest timestamp in the metrics collection to identify the latest run
    const latestSnapshot = await db.collection('metrics')
      .orderBy('timestamp', 'desc')
      .limit(1)
      .get();

    if (latestSnapshot.empty) {
      return NextResponse.json({ metrics: [] });
    }

    const latestTimestamp = latestSnapshot.docs[0].data().timestamp as string;
    const latestTime = new Date(latestTimestamp).getTime();

    // Fetch recent metrics (up to MAX_METRICS documents)
    const metricsSnapshot = await db.collection('metrics')
      .orderBy('timestamp', 'desc')
      .limit(MAX_METRICS)
      .get();
      
    const allMetrics: MetricRecord[] = metricsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        lat: data.lat as number,
        lon: data.lon as number,
        variable: data.variable as string,
        value: data.value as number,
        timestamp: data.timestamp as string,
      };
    });

    // Filter to keep only metrics from the latest run (within the run window)
    const metrics = allMetrics.filter(m => {
      const mTime = new Date(m.timestamp).getTime();
      return Math.abs(latestTime - mTime) < RUN_WINDOW_MS;
    });

    return NextResponse.json({ metrics }, {
      headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=120' }
    });
  } catch (error) {
    console.error('Error fetching metrics:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
