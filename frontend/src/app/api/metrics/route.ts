import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';

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

    const latestTimestamp = latestSnapshot.docs[0].data().timestamp;
    const latestTime = new Date(latestTimestamp).getTime();

    // Fetch recent metrics (up to 200 documents)
    const metricsSnapshot = await db.collection('metrics')
      .orderBy('timestamp', 'desc')
      .limit(200)
      .get();
      
    const allMetrics = metricsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data() as any
    }));

    // Filter in-memory to keep only the metrics from the latest run (within 5 minutes)
    const metrics = allMetrics.filter(m => {
      const mTime = new Date(m.timestamp).getTime();
      return Math.abs(latestTime - mTime) < 5 * 60 * 1000;
    });

    return NextResponse.json({ metrics });
  } catch (error) {
    console.error('Error fetching metrics:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
