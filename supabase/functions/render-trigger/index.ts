// ─────────────────────────────────────────────────────────────────────────────
// render-trigger — queue a Remotion render job for a listing.
//
// Flow:
//   1. POST with { listing_id, composition? } (composition defaults to ListingTour)
//   2. Look up the listing + listing_video_assets + media_assets
//   3. Build the inputProps payload for Remotion
//   4. INSERT a render_jobs row (status='queued')
//   5. Return { job_id, input_props } — the actual Lambda render is kicked off
//      by /video/scripts/process-queue.ts (running locally or via cron) which
//      pulls queued rows and calls @remotion/lambda.
//
// Why not invoke Lambda directly from this edge fn?
//   The official @remotion/lambda SDK is Node-only and not trivially portable
//   to Deno's edge runtime. Keeping the queue pattern means: (a) Dana can swap
//   render compute providers without touching this fn, (b) renders can be
//   retried independently, (c) we get a clean spend log per job.
// ─────────────────────────────────────────────────────────────────────────────
import {serve} from 'https://deno.land/std@0.168.0/http/server.ts';
import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {status, headers: {...CORS, 'Content-Type': 'application/json'}});
}

// Mirror of the SCENE_MAP in video/src/lib/fetchListing.ts.
// Kept here so the edge fn can validate that every required asset exists
// before queuing the job (fail fast, save AWS minutes).
const SCENE_MAP: Array<{id: string; roomKey: string; emptyKey?: string; duration: number}> = [
  {id: '01_cold_open', roomKey: 'exterior_front',                                     duration: 8},
  {id: '03_exterior',  roomKey: 'exterior_front',                                     duration: 20},
  {id: '04_greatroom', roomKey: 'greatroom_staged', emptyKey: 'greatroom_empty',      duration: 27},
  {id: '05_kitchen',   roomKey: 'kitchen_1',                                          duration: 30},
  {id: '06_primary',   roomKey: 'primary_staged',   emptyKey: 'primary_empty',        duration: 25},
  {id: '07_secondary', roomKey: 'bedroom_1',                                          duration: 18},
  {id: '08_garage',    roomKey: 'garage',                                             duration: 12},
  {id: '09_backyard',  roomKey: 'back_patio_staged',emptyKey: 'back_patio_empty',     duration: 35},
  {id: '10_eastmark',  roomKey: 'eastmark_clubhouse',                                 duration: 20},
];

function priceLabel(n: number | null | undefined): string {
  if (!n) return '';
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2).replace(/\.?0+$/, '')}M`;
  if (n >= 100_000) return `$${Math.round(n / 1000)}K`;
  return `$${n.toLocaleString()}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', {headers: CORS});

  const db = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  try {
    const body = await req.json();
    const listing_id = body.listing_id;
    const composition: 'ListingTour' | 'ListingTourThumbnail' = body.composition ?? 'ListingTour';
    const triggered_by = body.triggered_by ?? 'manual';

    if (!listing_id) return json({error: 'listing_id is required'}, 400);

    // ─── Fetch listing + property + video assets + media ───────────────────
    const {data: listing} = await db.from('listings')
      .select('id, property_id, current_price, list_price')
      .eq('id', listing_id)
      .maybeSingle();
    if (!listing) return json({error: `listing ${listing_id} not found`}, 404);

    const {data: prop} = await db.from('properties')
      .select('id, address, city, state, zip, bedrooms, bathrooms, sqft, neighborhood, image_url')
      .eq('id', listing.property_id)
      .maybeSingle();
    if (!prop) return json({error: `property ${listing.property_id} not found`}, 404);

    const {data: assets} = await db.from('listing_video_assets')
      .select('vo_urls, hook_line, music_url, aerial_dusk_url, thumbnail_headline, thumbnail_sub_tag, thumbnail_hero_url')
      .eq('listing_id', listing_id)
      .maybeSingle();
    if (!assets) return json({error: `No listing_video_assets row for listing ${listing_id}. Generate VO first.`}, 409);

    const {data: media} = await db.from('media_assets')
      .select('storage_url, tags')
      .eq('property_id', prop.id)
      .eq('kind', 'photo');
    if (!media || media.length === 0) return json({error: 'No photos in media_assets for this property'}, 409);

    const urlByKey: Record<string, string> = {};
    for (const m of media) {
      const keyTag = (m.tags ?? []).find((t: string) => t.startsWith('key:'));
      if (keyTag) urlByKey[keyTag.slice(4)] = m.storage_url;
    }

    // ─── Build inputProps for the selected composition ─────────────────────
    let input_props: Record<string, unknown>;

    if (composition === 'ListingTourThumbnail') {
      input_props = {
        headline:    assets.thumbnail_headline ?? 'Live Outside\n9 Months a Year',
        sub_tag:     assets.thumbnail_sub_tag ?? `${prop.neighborhood ?? prop.city}`,
        hero_url:    assets.thumbnail_hero_url ?? prop.image_url,
        price_label: priceLabel(listing.current_price ?? listing.list_price),
      };
    } else {
      const voMap = (assets.vo_urls ?? {}) as Record<string, string>;

      const scenes = SCENE_MAP.map((m) => ({
        id: m.id,
        label: m.id,
        duration_seconds: m.duration,
        stagedUrl: urlByKey[m.roomKey] ?? prop.image_url ?? '',
        emptyUrl: m.emptyKey ? urlByKey[m.emptyKey] : undefined,
        voUrl: voMap[m.id] ?? '',
        kenBurnsZoom: [1.0, 1.05] as [number, number],
      }));

      // Validate every scene has a stagedUrl + voUrl. Fail fast if not.
      const missing = scenes.filter(s => !s.stagedUrl || !s.voUrl).map(s => s.id);
      if (missing.length > 0) {
        return json({error: 'Missing assets', missing_scene_ids: missing}, 409);
      }

      input_props = {
        listing_id,
        property_id: prop.id,
        address_line1: prop.address,
        address_line2: `${prop.city}, ${prop.state} ${prop.zip}`,
        price_label: priceLabel(listing.current_price ?? listing.list_price),
        beds: prop.bedrooms,
        baths: prop.bathrooms,
        sqft: prop.sqft,
        neighborhood: prop.neighborhood ?? '',
        hook_line: assets.hook_line ?? '',
        scenes,
        musicUrl: assets.music_url ?? undefined,
        aerialDuskUrl: assets.aerial_dusk_url ?? undefined,
      };
    }

    // ─── Insert render_jobs row ────────────────────────────────────────────
    const {data: job, error: insErr} = await db.from('render_jobs').insert({
      listing_id,
      composition,
      status: 'queued',
      input_props,
      triggered_by,
    }).select('id, created_at').single();
    if (insErr) return json({error: 'Failed to queue render', details: insErr.message}, 500);

    return json({
      success: true,
      job_id: job.id,
      composition,
      status: 'queued',
      created_at: job.created_at,
      note: 'Run /video/scripts/process-queue.ts to render queued jobs via Remotion Lambda.',
    });
  } catch (err) {
    return json({error: (err as Error).message || 'Internal error'}, 500);
  }
});
