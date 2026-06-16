// fetchListing — pulls a listing's full render payload from Supabase.
// Called from Root.tsx via the `calculateMetadata` hook so every render
// reads fresh data from the DB.
//
// Required env (set in Remotion CLI or Lambda runtime):
//   SUPABASE_URL
//   SUPABASE_ANON_KEY   (publishable key is fine — table data is public-readable
//                        per existing RLS, voice-clips bucket is public)

import {createClient} from '@supabase/supabase-js';
import {ListingTourProps} from './types';

// Lazy init — only create the client when fetchListing is actually called.
// This avoids crashing on Lambda where Supabase env vars aren't set
// (Lambda renders receive complete inputProps and skip calculateMetadata).
let _db: ReturnType<typeof createClient> | null = null;
function getDb() {
  if (_db) return _db;
  const url = process.env.SUPABASE_URL ?? process.env.REMOTION_SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY ?? process.env.REMOTION_SUPABASE_KEY;
  if (!url || !key) {
    throw new Error('SUPABASE_URL / SUPABASE_ANON_KEY must be set for fetchListing');
  }
  _db = createClient(url, key);
  return _db;
}

// VO scene id → (room key, chapter label, duration sec).
// Tweak per listing; this is the default tour template.
const SCENE_MAP: Array<{
  id: string;
  roomKey: string;
  emptyKey?: string;
  duration: number;
}> = [
  {id: '01_cold_open',  roomKey: 'exterior_front',                           duration: 8},
  {id: '03_exterior',   roomKey: 'exterior_front',                           duration: 20},
  {id: '04_greatroom',  roomKey: 'greatroom_staged', emptyKey: 'greatroom_empty', duration: 27},
  {id: '05_kitchen',    roomKey: 'kitchen_1',                                duration: 30},
  {id: '06_primary',    roomKey: 'primary_staged',   emptyKey: 'primary_empty',   duration: 25},
  {id: '07_secondary',  roomKey: 'bedroom_1',                                duration: 18},
  {id: '08_garage',     roomKey: 'garage',                                   duration: 12},
  {id: '09_backyard',   roomKey: 'back_patio_staged',emptyKey: 'back_patio_empty',duration: 35},
  {id: '10_eastmark',   roomKey: 'eastmark_clubhouse',                       duration: 20},
];

function priceLabel(n: number | null | undefined): string {
  if (!n) return '';
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2).replace(/\.?0+$/, '')}M`;
  if (n >= 100_000)   return `$${Math.round(n / 1000)}K`;
  return `$${n.toLocaleString()}`;
}

export async function fetchListing(listing_id: string): Promise<ListingTourProps> {
  const {data: listing, error: lErr} = await getDb().from('listings')
    .select('id, property_id, current_price, list_price, status')
    .eq('id', listing_id)
    .maybeSingle();
  if (lErr || !listing) throw new Error(`listing ${listing_id} not found: ${lErr?.message}`);

  const {data: prop, error: pErr} = await getDb().from('properties')
    .select('id, address, city, state, zip, bedrooms, bathrooms, sqft, neighborhood, image_url')
    .eq('id', listing.property_id)
    .maybeSingle();
  if (pErr || !prop) throw new Error(`property ${listing.property_id} not found: ${pErr?.message}`);

  const {data: media, error: mErr} = await getDb().from('media_assets')
    .select('id, storage_url, tags, staged_from_id')
    .eq('property_id', prop.id)
    .eq('kind', 'photo');
  if (mErr || !media) throw new Error(`media for ${prop.id} not loaded: ${mErr?.message}`);

  // Build a key→url map using the "key:xxx" tag set during MLS import.
  const urlByKey: Record<string, string> = {};
  for (const m of media) {
    const keyTag = (m.tags ?? []).find((t: string) => t.startsWith('key:'));
    if (keyTag) urlByKey[keyTag.slice(4)] = m.storage_url;
  }

  // Pull VO segments from the voice-clips bucket via ai_generation_log.
  // We use the most-recent successful TTS row per `prompt` (the script line)
  // and key them by VO id passed in body.scene_id (if logged) or by ordering.
  // For now we accept VO URLs being passed in via env or hardcoded per-listing
  // (see render-trigger edge fn).
  // → In production, render-trigger fills `scene_vo_url_map` and passes it as props.

  // Read VO map from a custom table or settings row keyed on listing.
  const {data: voRow} = await getDb().from('listing_video_assets')
    .select('vo_urls, music_url, aerial_dusk_url, hook_line, scene_overrides')
    .eq('listing_id', listing_id)
    .maybeSingle();

  const voMap: Record<string, string> = voRow?.vo_urls ?? {};

  const scenes = SCENE_MAP.map((m) => ({
    id: m.id,
    label: m.id,
    duration_seconds: m.duration,
    stagedUrl: urlByKey[m.roomKey] ?? prop.image_url ?? '',
    emptyUrl:  m.emptyKey ? urlByKey[m.emptyKey] : undefined,
    voUrl:     voMap[m.id] ?? '',
    kenBurnsZoom: [1.0, 1.05] as [number, number],
  }));

  const addr1 = prop.address ?? '';
  const addr2 = `${prop.city ?? ''}, ${prop.state ?? ''} ${prop.zip ?? ''}`.trim();

  return {
    listing_id,
    property_id: prop.id,
    address_line1: addr1,
    address_line2: addr2,
    price_label: priceLabel(listing.current_price ?? listing.list_price),
    beds: prop.bedrooms ?? 0,
    baths: prop.bathrooms ?? 0,
    sqft: prop.sqft ?? 0,
    neighborhood: prop.neighborhood ?? '',
    hook_line: voRow?.hook_line ?? '',
    scenes,
    musicUrl: voRow?.music_url ?? undefined,
    aerialDuskUrl: voRow?.aerial_dusk_url ?? undefined,
  };
}
