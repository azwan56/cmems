import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const doc = await db.collection('latest_run').doc('dashboard').get();
    if (!doc.exists) {
      return NextResponse.json({ alerts: [] });
    }
    const alertsData = doc.data()?.alerts || [];
    const alerts = alertsData.map((a: any, index: number) => ({
      ...a,
      id: a.id || `${a.lat}_${a.lon}_${a.type}_${index}`
    }));
    return NextResponse.json({ alerts }, {
      headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=120' }
    });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
