// process-queue.ts
// Picks queued render jobs from `render_jobs` and renders them via Remotion Lambda.
// Run locally with `npx tsx scripts/process-queue.ts` or wire to a cron.
//
// Env required (load from /video/.env):
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY    (write access to render_jobs)
//   REMOTION_AWS_ACCESS_KEY_ID
//   REMOTION_AWS_SECRET_ACCESS_KEY
//   REMOTION_AWS_REGION          (e.g. us-west-2)
//   REMOTION_SERVE_URL           (from `npm run lambda:sites`)
//   REMOTION_FUNCTION_NAME       (from `npm run lambda:deploy`)
//
// Cost: roughly $0.005–$0.01 per minute of rendered video on Lambda with
// memory=3008MB, depending on concurrency and region.

import {createClient} from '@supabase/supabase-js';
import {renderMediaOnLambda, getRenderProgress} from '@remotion/lambda/client';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SVC = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const AWS_REGION   = process.env.REMOTION_AWS_REGION ?? 'us-west-2';
const SERVE_URL    = process.env.REMOTION_SERVE_URL!;
const FN_NAME      = process.env.REMOTION_FUNCTION_NAME!;

if (!SUPABASE_URL || !SUPABASE_SVC) throw new Error('SUPABASE env not set');
if (!SERVE_URL || !FN_NAME) throw new Error('REMOTION_SERVE_URL + REMOTION_FUNCTION_NAME required');

const db = createClient(SUPABASE_URL, SUPABASE_SVC);

// H15: bound the poll loop. A Lambda render of 1080 frames at 30fps =
// 36s of video — even with overhead, well under 30 min. If we're still
// polling after MAX_POLL_MS without `done` or `fatalErrorEncountered`,
// the render is hung; bail and let the next worker (or Dana) retry.
const MAX_POLL_MS = 30 * 60 * 1000;

async function processOne(): Promise<boolean> {
  // H15: atomic claim via SECURITY DEFINER RPC instead of two-step
  // SELECT then UPDATE. A second processor sees 0 rows returned and
  // skips to the next iteration.
  const {data: claimed, error: claimErr} = await db.rpc('claim_render_job');
  if (claimErr) {
    console.error(`✗ claim_render_job failed: ${claimErr.message}`);
    return false;
  }
  const job = Array.isArray(claimed) ? claimed[0] : claimed;
  if (!job) return false;

  console.log(`▶ Rendering job ${job.id} (${job.composition}) for listing ${job.listing_id}`);

  try {
    const {bucketName, renderId} = await renderMediaOnLambda({
      region: AWS_REGION as never,
      functionName: FN_NAME,
      serveUrl: SERVE_URL,
      composition: job.composition,
      inputProps: job.input_props,
      codec: job.composition === 'ListingTourThumbnail' ? 'png' as never : 'h264',
      imageFormat: 'jpeg',
      jpegQuality: 80,
      pixelFormat: 'yuv420p',
      framesPerLambda: 2250,
      maxRetries: 1,
      privacy: 'public',
      downloadBehavior: {type: 'play-in-browser'},
    });

    await db.from('render_jobs').update({
      lambda_render_id: renderId,
    }).eq('id', job.id);

    // Poll for completion. H15: cap the loop so a stuck Lambda doesn't
    // hang the runner forever (and block every later queued job).
    const pollStart = Date.now();
    while (true) {
      if (Date.now() - pollStart > MAX_POLL_MS) {
        await db.from('render_jobs').update({
          status: 'failed',
          error: `poll_timeout after ${Math.round(MAX_POLL_MS / 60000)}min`,
          completed_at: new Date().toISOString(),
        }).eq('id', job.id);
        console.error(`  ✗ poll timeout`);
        return true;
      }

      const progress = await getRenderProgress({
        renderId,
        bucketName,
        functionName: FN_NAME,
        region: AWS_REGION as never,
      });

      if (progress.done) {
        await db.from('render_jobs').update({
          status: 'succeeded',
          output_url: progress.outputFile,
          duration_ms: progress.timeToFinish ?? null,
          cost_cents: progress.costs?.accruedSoFar
            ? Math.round(progress.costs.accruedSoFar * 100)
            : null,
          completed_at: new Date().toISOString(),
        }).eq('id', job.id);
        console.log(`  ✓ done → ${progress.outputFile}`);
        return true;
      }
      if (progress.fatalErrorEncountered) {
        await db.from('render_jobs').update({
          status: 'failed',
          error: progress.errors?.[0]?.message ?? 'unknown',
          completed_at: new Date().toISOString(),
        }).eq('id', job.id);
        console.error(`  ✗ failed: ${progress.errors?.[0]?.message}`);
        return true;
      }
      process.stdout.write(`  ${Math.round((progress.overallProgress ?? 0) * 100)}% `);
      await new Promise(r => setTimeout(r, 5000));
    }
  } catch (e) {
    const msg = (e as Error).message;
    await db.from('render_jobs').update({
      status: 'failed',
      error: msg,
      completed_at: new Date().toISOString(),
    }).eq('id', job.id);
    console.error(`  ✗ error: ${msg}`);
    return true;
  }
}

(async () => {
  const args = process.argv.slice(2);
  const loop = args.includes('--loop');
  do {
    const had = await processOne();
    if (!had) {
      if (loop) {
        await new Promise(r => setTimeout(r, 30_000));
      } else {
        console.log('No queued jobs. Exit.');
        break;
      }
    }
  } while (loop);
})();
