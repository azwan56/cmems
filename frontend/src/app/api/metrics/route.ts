import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const doc = await db.collection('latest_run').doc('dashboard').get();
    if (!doc.exists) {
      return NextResponse.json({ metrics: [] });
    }
    const metricsData = doc.data()?.metrics || [];
    const metrics = metricsData.map((m: any, index: number) => ({
      ...m,
      id: m.id || `${m.lat}_${m.lon}_${m.variable}_${index}`
    }));
    return NextResponse.json({ metrics }, {
      headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=120' }
    });
  } catch (error) {
    console.error('Error fetching metrics:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
