import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const latStr = searchParams.get('lat');
    const lonStr = searchParams.get('lon');
    const variable = searchParams.get('variable') || 'chl';

    if (!latStr || !lonStr) {
      return NextResponse.json({ error: 'lat and lon are required' }, { status: 400 });
    }

    const targetLat = parseFloat(latStr);
    const targetLon = parseFloat(lonStr);

    // Fetch all metrics ordered by timestamp.
    // To keep it 100% plug-and-play and avoid index-creation requirements,
    // we filter by variable, lat, and lon in-memory.
    const metricsSnapshot = await db.collection('metrics')
      .orderBy('timestamp', 'asc')
      .get();

    const history = metricsSnapshot.docs
      .map(doc => {
        const data = doc.data();
        return {
          timestamp: data.timestamp,
          lat: data.lat,
          lon: data.lon,
          variable: data.variable,
          value: data.value,
        };
      })
      .filter(m => {
        return m.variable === variable &&
               Math.abs(m.lat - targetLat) < 0.01 &&
               Math.abs(m.lon - targetLon) < 0.01;
      });

    return NextResponse.json({ history });
  } catch (error) {
    console.error('Error fetching history:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
