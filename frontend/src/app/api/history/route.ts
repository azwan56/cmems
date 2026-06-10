import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

const VALID_VARIABLES = ['chl', 'o2'] as const;
const COORD_TOLERANCE = 0.01; // ~1.1km tolerance for coordinate matching
const MAX_HISTORY_DOCS = 500; // Cap to prevent unbounded reads

interface MetricRecord {
  timestamp: string;
  lat: number;
  lon: number;
  variable: string;
  value: number;
}

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

    // Validate numeric values and geographic bounds
    if (isNaN(targetLat) || isNaN(targetLon) || 
        targetLat < -90 || targetLat > 90 || 
        targetLon < -180 || targetLon > 180) {
      return NextResponse.json({ error: 'Invalid lat/lon values' }, { status: 400 });
    }

    // Validate variable against allowlist
    if (!VALID_VARIABLES.includes(variable as typeof VALID_VARIABLES[number])) {
      return NextResponse.json({ error: `Invalid variable. Must be one of: ${VALID_VARIABLES.join(', ')}` }, { status: 400 });
    }

    // Filter by variable in Firestore to reduce reads, then limit results
    const metricsSnapshot = await db.collection('metrics')
      .where('variable', '==', variable)
      .orderBy('timestamp', 'asc')
      .limit(MAX_HISTORY_DOCS)
      .get();

    const history: MetricRecord[] = metricsSnapshot.docs
      .map(doc => {
        const data = doc.data();
        return {
          timestamp: data.timestamp as string,
          lat: data.lat as number,
          lon: data.lon as number,
          variable: data.variable as string,
          value: data.value as number,
        };
      })
      .filter(m => {
        return Math.abs(m.lat - targetLat) < COORD_TOLERANCE &&
               Math.abs(m.lon - targetLon) < COORD_TOLERANCE;
      });

    return NextResponse.json({ history }, {
      headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=120' }
    });
  } catch (error) {
    console.error('Error fetching history:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
