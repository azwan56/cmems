import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

const VALID_VARIABLES = ['chl', 'o2', 'litter_density'] as const;

interface MetricHistoryEntry {
  timestamp: string;
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

    // Generate consistent document ID: lat_lon_var (using fixed 4 decimal places matching Python uploader)
    const docId = `${targetLat.toFixed(4)}_${targetLon.toFixed(4)}_${variable}`;
    
    // Exactly 1 document read replacing the old 500 reads unbounded query!
    const doc = await db.collection('time_series').doc(docId).get();
    
    let history: MetricHistoryEntry[] = [];
    
    if (doc.exists) {
      const data = doc.data();
      history = (data?.history || []) as MetricHistoryEntry[];
    } else {
      console.warn(`Time series document not found for ID: ${docId}`);
      
      // Fallback: If for some float rounding reason the doc is not found, we can do a fallback
      // search on the coordinate neighborhood. However, in standard flows this is bypassed.
      const tolerance = 0.01;
      const fallbackSnapshot = await db.collection('time_series')
        .where('variable', '==', variable)
        .where('lat', '>=', targetLat - tolerance)
        .where('lat', '<=', targetLat + tolerance)
        .limit(5)
        .get();
        
      if (!fallbackSnapshot.empty) {
        // Find the closest point and extract history
        let closestDoc = fallbackSnapshot.docs[0];
        let minDistance = Infinity;
        
        for (const fDoc of fallbackSnapshot.docs) {
          const fData = fDoc.data();
          const dist = Math.pow(fData.lat - targetLat, 2) + Math.pow(fData.lon - targetLon, 2);
          if (dist < minDistance) {
            minDistance = dist;
            closestDoc = fDoc;
          }
        }
        
        console.log(`Fallback matched closest doc: ${closestDoc.id}`);
        history = (closestDoc.data()?.history || []) as MetricHistoryEntry[];
      }
    }

    return NextResponse.json({ history }, {
      headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=120' }
    });
  } catch (error) {
    console.error('Error fetching history:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
