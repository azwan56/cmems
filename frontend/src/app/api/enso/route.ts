import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 1. Try fetching from aggregated dashboard first (exactly 1 document read)
    const dashDoc = await db.collection('latest_run').doc('dashboard').get();
    if (dashDoc.exists) {
      const enso_metrics = dashDoc.data()?.enso_metrics;
      if (Array.isArray(enso_metrics) && enso_metrics.length > 0) {
        // Ensure chronological ascending order for Recharts plotting
        const sortedMetrics = [...enso_metrics].sort((a: any, b: any) => 
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
        return NextResponse.json({ metrics: sortedMetrics }, {
          headers: { 'Cache-Control': 's-maxage=3600, stale-while-revalidate=7200' }
        });
      }
    }

    // 2. Fallback to individual document queries for compatibility
    const snapshot = await db.collection('enso_metrics')
      .orderBy('timestamp', 'desc')
      .limit(60) // Retrieve last 5 years of monthly data
      .get();

    if (snapshot.empty) {
      return NextResponse.json({ metrics: [] });
    }

    const metrics = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        timestamp: data.timestamp as string,
        sst_mean: data.sst_mean as number,
        oni: data.oni as number,
      };
    });

    // Reverse to chronological order (ascending) for Recharts plotting
    metrics.reverse();

    return NextResponse.json({ metrics }, {
      headers: { 'Cache-Control': 's-maxage=3600, stale-while-revalidate=7200' }
    });
  } catch (error) {
    console.error('Error fetching ENSO metrics:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
