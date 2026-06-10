# /video — Remotion listing tour renderer

Renders branded 3:45 listing tour videos + matching YouTube thumbnails for any listing in the app. Every render pulls data live from Supabase (`listings`, `properties`, `media_assets`, `listing_video_assets`) so the pipeline scales from one listing to all of them.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│  App UI                                                              │
│    Listings page → "Render video" button                             │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ POST { listing_id }
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Supabase edge fn  render-trigger                                    │
│    • Loads listing + property + media_assets + listing_video_assets │
│    • Builds inputProps                                               │
│    • Validates every scene has staged + VO URL (fail fast)           │
│    • INSERT render_jobs row (status='queued')                        │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│  /video/scripts/process-queue.ts  (local or cron)                    │
│    • Pulls queued jobs                                               │
│    • renderMediaOnLambda(...) → AWS Remotion Lambda                  │
│    • Polls render progress                                           │
│    • Updates render_jobs with output_url + cost on completion        │
└─────────────────────────────────────────────────────────────────────┘
```

## Local development

```bash
cd video
npm install
cp .env.example .env       # fill in SUPABASE_URL + SUPABASE_ANON_KEY
npm run dev                # opens Remotion Studio on :3000
```

In Studio:
- **ListingTour** — full 3:45 tour. Default props point at Theia. Change `listing_id` in the props panel to preview a different listing (will hit `fetchListing` if `SUPABASE_URL` is set in `.env`).
- **ListingTourThumbnail** — 1280×720 YouTube thumbnail.

To render a one-off MP4 locally (slow — ~15 min for 3:45 on an M1):
```bash
npm run render              # → out/ListingTour.mp4
npm run render:thumb        # → out/Thumbnail.png
```

## One-time AWS setup (Remotion Lambda)

You need an AWS account. Free-tier covers most renders; expect ~$0.005–$0.01 per minute of video at memory=3008MB.

### 1. Create AWS IAM user

In AWS Console → IAM → Users → Add user `remotion-render`:

- Programmatic access (access key + secret)
- Attach this inline policy (least-privilege for Remotion Lambda):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    { "Sid": "RemotionLambda",
      "Effect": "Allow",
      "Action": [
        "iam:CreateRole", "iam:PassRole", "iam:GetRole", "iam:PutRolePolicy",
        "lambda:CreateFunction", "lambda:DeleteFunction", "lambda:GetFunction",
        "lambda:InvokeFunction", "lambda:InvokeAsync", "lambda:ListFunctions",
        "lambda:UpdateFunctionCode", "lambda:UpdateFunctionConfiguration",
        "s3:CreateBucket", "s3:GetBucketLocation", "s3:GetObject", "s3:ListBucket",
        "s3:PutBucketAcl", "s3:PutBucketCors", "s3:PutBucketPolicy",
        "s3:PutBucketVersioning", "s3:PutLifecycleConfiguration",
        "s3:PutObject", "s3:PutObjectAcl"
      ],
      "Resource": "*"
    }
  ]
}
```

> The Remotion docs publish the canonical policy at https://www.remotion.dev/docs/lambda/permissions — copy that if it has drifted from what's above.

Copy the **Access Key ID** + **Secret Access Key** into `video/.env`:

```
REMOTION_AWS_ACCESS_KEY_ID=AKIA...
REMOTION_AWS_SECRET_ACCESS_KEY=...
REMOTION_AWS_REGION=us-west-2
```

### 2. Deploy the Lambda function + site

```bash
cd video

# Deploy the Remotion Lambda function (rendering engine)
npm run lambda:deploy
# → prints: Deployed as "remotion-render-4-0-198-mem3008mb-disk10240mb-900sec"

# Upload the React bundle (your compositions) to S3 as a "serve URL"
npm run lambda:sites
# → prints: Serve URL: https://remotionlambda-...s3....amazonaws.com/sites/listing-tour/index.html
```

Add both to `.env`:

```
REMOTION_FUNCTION_NAME=remotion-render-4-0-198-mem3008mb-disk10240mb-900sec
REMOTION_SERVE_URL=https://remotionlambda-...s3....amazonaws.com/sites/listing-tour/index.html
```

### 3. Smoke-test from your terminal

```bash
SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/process-queue.ts
```

You should see a queued job (the one I created earlier — `71cc5910-...`) pick up, render, and write `output_url` to the `render_jobs` row.

### 4. Production: continuous queue processor

Two options:

- **Cron on your Mac (simple).** Use `launchd` or `crontab` to run `npx tsx scripts/process-queue.ts --loop` overnight.
- **Fly.io / Railway worker (always-on).** Containerize this folder and run `npm run process-queue -- --loop` as a long-running worker. ~$5/mo.
- **AWS EventBridge (cheapest at scale).** Schedule a Lambda that calls `process-queue` directly. No idle compute cost.

For now, run it manually whenever you queue a new listing.

## When you re-deploy compositions

Anytime you edit `src/compositions/*.tsx` or `src/components/*.tsx`, you must re-upload the site:

```bash
npm run lambda:sites
# Update REMOTION_SERVE_URL in .env if the URL changed (it usually doesn't)
```

You do NOT need to redeploy the Lambda function unless you change Remotion version.

## Adding a new listing

1. The listing must have:
   - `properties.address`, `bedrooms`, `bathrooms`, `sqft` filled in
   - 32-ish photos in `media_assets` tagged with `key:<roomKey>` (see `process-queue.ts` SCENE_MAP for the keys we look for: `exterior_front`, `greatroom_staged`, `kitchen_1`, `bedroom_1`, `garage`, `eastmark_clubhouse`, etc.)
   - A `listing_video_assets` row with the 11 VO MP3 URLs in `vo_urls` (call the `elevenlabs-tts` edge fn 11 times to generate)
2. Trigger render:
   ```bash
   curl -X POST $SUPABASE_URL/functions/v1/render-trigger \
     -H "Authorization: Bearer $ANON" \
     -d '{"listing_id":"<uuid>"}'
   ```
3. Wait for `process-queue.ts` to pick it up — watch `render_jobs` table for status.

## File layout

```
video/
├── package.json
├── tsconfig.json
├── remotion.config.ts
├── src/
│   ├── Root.tsx                       # registers ListingTour + Thumbnail
│   ├── compositions/
│   │   ├── ListingTour.tsx            # main 3:45 video timeline
│   │   └── Thumbnail.tsx              # 1280×720 still
│   ├── components/
│   │   ├── RoomScene.tsx              # empty→staged crossfade + slow Ken Burns
│   │   ├── BrandCard.tsx              # opening/closing title cards
│   │   ├── Chapter.tsx                # lower-third chapter labels
│   │   ├── EndScreen.tsx              # subscribe + CTA outro
│   │   └── LogoOverlay.tsx            # REAL + Dana logos in corners
│   └── lib/
│       ├── brand.ts                   # colors, fonts, logo URLs, agent info
│       ├── fetchListing.ts            # Supabase data loader
│       └── types.ts                   # zod schemas
└── scripts/
    └── process-queue.ts               # local queue processor → Lambda
```

## Edit-bay rules (matches the directive: slow, cozy, no fast cuts)

- All transitions are cross-dissolves (1.0–1.5s)
- Every staged frame holds ≥ 6 seconds
- Ken Burns: 3–5% zoom over the scene duration — no faster
- Warm overlay ramps in during the empty→staged crossfade (radial gradient, soft-light blend, ~18% opacity)
- Bottom vignette under all chapter lower-thirds for legibility
- No whip pans, no zoom punches, no flash frames

If you want to tweak pacing, edit `SCENE_MAP` in both `src/lib/fetchListing.ts` and `supabase/functions/render-trigger/index.ts` (they should match). Per-scene overrides also live in `listing_video_assets.scene_overrides` (jsonb) if you want one listing to pace differently.
