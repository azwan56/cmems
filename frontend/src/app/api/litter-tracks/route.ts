import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

const RUN_WINDOW_MS = 5 * 60 * 1000; // 5-minute window to group tracks from the same run
const MAX_TRACKS = 50;

interface TrackRecord {
  id: string;
  lat: number;
  lon: number;
  name: string;
  drift_factors: {
    current: number;
    wave: number;
    wind: number;
  };
  path: Array<{
    lat: number;
    lon: number;
    hours: number;
  }>;
  timestamp: string;
}

export async function GET() {
  try {
    // Get the latest timestamp in the litter_tracks collection to identify the latest run
    const latestSnapshot = await db.collection('litter_tracks')
      .orderBy('timestamp', 'desc')
      .limit(1)
      .get();

    if (latestSnapshot.empty) {
      return NextResponse.json({ tracks: [] });
    }

    const latestTimestamp = latestSnapshot.docs[0].data().timestamp as string;
    const latestTime = new Date(latestTimestamp).getTime();

    // Fetch recent tracks
    const tracksSnapshot = await db.collection('litter_tracks')
      .orderBy('timestamp', 'desc')
      .limit(MAX_TRACKS)
      .get();
      
    const allTracks: TrackRecord[] = tracksSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        lat: data.lat as number,
        lon: data.lon as number,
        name: data.name as string,
        drift_factors: data.drift_factors as TrackRecord['drift_factors'],
        path: data.path as TrackRecord['path'],
        timestamp: data.timestamp as string,
      };
    });

    // Filter to keep only tracks from the latest run (within the run window)
    const tracks = allTracks.filter(t => {
      const tTime = new Date(t.timestamp).getTime();
      return Math.abs(latestTime - tTime) < RUN_WINDOW_MS;
    });

    return NextResponse.json({ tracks }, {
      headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=120' }
    });
  } catch (error) {
    console.error('Error fetching litter tracks:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
