import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const doc = await db.collection('latest_run').doc('dashboard').get();
    if (!doc.exists) {
      return NextResponse.json({ tracks: [] });
    }
    const tracksData = doc.data()?.litter_tracks || [];
    const tracks = tracksData.map((t: any, index: number) => ({
      ...t,
      id: t.id || `${t.lat}_${t.lon}_${t.name || index}_${index}`
    }));
    return NextResponse.json({ tracks }, {
      headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=120' }
    });
  } catch (error) {
    console.error('Error fetching litter tracks:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
