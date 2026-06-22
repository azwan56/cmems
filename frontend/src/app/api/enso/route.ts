import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
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
