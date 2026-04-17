-- ============================================================
-- Migration: Showing Feedback System + Slack Channel Integration
-- Created: 2026-04-16
--
-- Tables:
--   showing_requests       — every showing on Dana's listings (parsed from Gmail)
--   showing_feedback       — feedback tied to specific showing + agent
--   listing_showing_stats  — per-listing aggregated stats (materialized)
--   feedback_follow_ups    — outbound nudges to agents with no feedback
--   weekly_report_snapshots — frozen data for weekly email sends
--   slack_channels         — maps contacts/listings to Slack channels
--   slack_message_log      — dedup + audit for Slack messages
-- ============================================================

-- ============================================================
-- TABLE 1: showing_requests
-- ============================================================
CREATE TABLE IF NOT EXISTS public.showing_requests (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id        uuid REFERENCES public.listings(id) ON DELETE SET NULL,

  -- Property identification (redundant for when listing_id is null)
  property_address  text NOT NULL,
  mls_number        text,

  -- Requesting agent
  agent_name        text,
  agent_email       text,
  agent_phone       text,
  agent_brokerage   text,

  -- Timing
  requested_date    date NOT NULL,
  requested_time    time,
  date_received     timestamptz NOT NULL DEFAULT now(),

  -- Source tracking
  source_platform   text NOT NULL DEFAULT 'unknown',
  source_email_id   text UNIQUE,
  source_thread_id  text,

  -- Status
  status            text NOT NULL DEFAULT 'confirmed'
                    CHECK (status IN ('pending','confirmed','cancelled','completed')),

  -- Feedback linkage
  feedback_id       uuid,
  feedback_status   text NOT NULL DEFAULT 'awaiting'
                    CHECK (feedback_status IN ('awaiting','received','no_response','follow_up_sent')),

  -- Metadata
  raw_email_body    text,
  notes             text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- TABLE 2: showing_feedback
-- ============================================================
CREATE TABLE IF NOT EXISTS public.showing_feedback (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  showing_id        uuid REFERENCES public.showing_requests(id) ON DELETE CASCADE,
  listing_id        uuid REFERENCES public.listings(id) ON DELETE SET NULL,

  -- Who gave feedback
  agent_name        text,
  agent_email       text,

  -- Feedback content
  feedback_text     text NOT NULL,
  feedback_type     text NOT NULL DEFAULT 'freeform'
                    CHECK (feedback_type IN ('structured','freeform','rating_only')),

  -- Structured fields (nullable)
  overall_rating    smallint CHECK (overall_rating BETWEEN 1 AND 5),
  price_opinion     text CHECK (price_opinion IN ('too_high','fair','too_low','no_opinion')),
  buyer_interest    text CHECK (buyer_interest IN ('very_interested','interested','not_interested','no_response')),
  would_show_again  boolean,
  liked             text,
  disliked          text,
  additional_comments text,

  -- Sentiment (computed by Claude)
  sentiment_score   numeric(3,2) CHECK (sentiment_score BETWEEN -1 AND 1),
  sentiment_label   text CHECK (sentiment_label IN ('positive','neutral','negative','mixed')),
  sentiment_summary text,

  -- Source tracking
  source_email_id   text UNIQUE,
  source_thread_id  text,
  raw_email_body    text,

  received_at       timestamptz NOT NULL DEFAULT now(),
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- Add the FK back-reference
ALTER TABLE public.showing_requests
  ADD CONSTRAINT fk_showing_feedback
  FOREIGN KEY (feedback_id) REFERENCES public.showing_feedback(id) ON DELETE SET NULL;

-- ============================================================
-- TABLE 3: listing_showing_stats
-- ============================================================
CREATE TABLE IF NOT EXISTS public.listing_showing_stats (
  listing_id          uuid PRIMARY KEY REFERENCES public.listings(id) ON DELETE CASCADE,
  property_address    text NOT NULL,
  mls_number          text,

  total_showings      integer NOT NULL DEFAULT 0,
  total_feedback      integer NOT NULL DEFAULT 0,
  feedback_rate       numeric(5,2) DEFAULT 0,
  avg_rating          numeric(3,2),
  avg_sentiment       numeric(3,2),

  week_showings       integer NOT NULL DEFAULT 0,
  week_feedback       integer NOT NULL DEFAULT 0,
  week_avg_rating     numeric(3,2),
  week_avg_sentiment  numeric(3,2),

  offers_received     integer NOT NULL DEFAULT 0,
  showing_to_offer_ratio numeric(5,2),

  last_showing_date   date,
  last_feedback_date  date,
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- TABLE 4: feedback_follow_ups
-- ============================================================
CREATE TABLE IF NOT EXISTS public.feedback_follow_ups (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  showing_id      uuid NOT NULL REFERENCES public.showing_requests(id) ON DELETE CASCADE,
  agent_email     text NOT NULL,
  sent_at         timestamptz NOT NULL DEFAULT now(),
  follow_up_number smallint NOT NULL DEFAULT 1,
  resend_email_id text,
  delivery_status text DEFAULT 'sent',
  response_received boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- TABLE 5: weekly_report_snapshots
-- ============================================================
CREATE TABLE IF NOT EXISTS public.weekly_report_snapshots (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id      uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  property_address text NOT NULL,
  report_period_start date NOT NULL,
  report_period_end   date NOT NULL,

  showings_data   jsonb NOT NULL DEFAULT '[]'::jsonb,
  feedback_data   jsonb NOT NULL DEFAULT '[]'::jsonb,
  stats           jsonb NOT NULL DEFAULT '{}'::jsonb,

  email_sent      boolean NOT NULL DEFAULT false,
  email_sent_at   timestamptz,
  resend_email_id text,

  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- TABLE 6: slack_channels
-- ============================================================
CREATE TABLE IF NOT EXISTS public.slack_channels (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id      uuid REFERENCES public.contacts(id) ON DELETE CASCADE,
  listing_id      uuid REFERENCES public.listings(id) ON DELETE SET NULL,

  slack_channel_id   text NOT NULL UNIQUE,
  channel_name       text NOT NULL,
  channel_type       text NOT NULL CHECK (channel_type IN ('seller','buyer')),

  is_archived     boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- TABLE 7: slack_message_log
-- ============================================================
CREATE TABLE IF NOT EXISTS public.slack_message_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slack_channel_id text NOT NULL,
  message_type    text NOT NULL,
  source_id       text,
  message_ts      text,
  posted_at       timestamptz NOT NULL DEFAULT now(),

  UNIQUE(slack_channel_id, message_type, source_id)
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_sr_listing ON public.showing_requests(listing_id);
CREATE INDEX idx_sr_date ON public.showing_requests(requested_date DESC);
CREATE INDEX idx_sr_source_email ON public.showing_requests(source_email_id);
CREATE INDEX idx_sr_status ON public.showing_requests(status);
CREATE INDEX idx_sr_feedback_status ON public.showing_requests(feedback_status);

CREATE INDEX idx_sf_showing ON public.showing_feedback(showing_id);
CREATE INDEX idx_sf_listing ON public.showing_feedback(listing_id);
CREATE INDEX idx_sf_source_email ON public.showing_feedback(source_email_id);
CREATE INDEX idx_sf_received ON public.showing_feedback(received_at DESC);

CREATE INDEX idx_lss_updated ON public.listing_showing_stats(updated_at DESC);

CREATE INDEX idx_ffu_showing ON public.feedback_follow_ups(showing_id);

CREATE INDEX idx_wrs_listing_period ON public.weekly_report_snapshots(listing_id, report_period_end DESC);

CREATE INDEX idx_sc_contact ON public.slack_channels(contact_id);
CREATE INDEX idx_sc_listing ON public.slack_channels(listing_id);
CREATE INDEX idx_sc_slack_id ON public.slack_channels(slack_channel_id);
CREATE INDEX idx_sc_type ON public.slack_channels(channel_type);

CREATE INDEX idx_sml_channel ON public.slack_message_log(slack_channel_id);
CREATE INDEX idx_sml_source ON public.slack_message_log(source_id);

-- ============================================================
-- RLS (permissive, matching existing pattern)
-- ============================================================
ALTER TABLE public.showing_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.showing_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_showing_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_report_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slack_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slack_message_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all" ON public.showing_requests FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON public.showing_feedback FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON public.listing_showing_stats FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON public.feedback_follow_ups FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON public.weekly_report_snapshots FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON public.slack_channels FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON public.slack_message_log FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- FUNCTION: Refresh listing stats after insert/update
-- ============================================================
CREATE OR REPLACE FUNCTION refresh_listing_showing_stats(p_listing_id uuid)
RETURNS void AS $$
BEGIN
  INSERT INTO public.listing_showing_stats (
    listing_id, property_address, mls_number,
    total_showings, total_feedback, feedback_rate, avg_rating, avg_sentiment,
    week_showings, week_feedback, week_avg_rating, week_avg_sentiment,
    last_showing_date, last_feedback_date, updated_at
  )
  SELECT
    sr.listing_id,
    MIN(sr.property_address),
    MIN(sr.mls_number),
    COUNT(DISTINCT sr.id)::integer,
    COUNT(DISTINCT sf.id)::integer,
    CASE WHEN COUNT(DISTINCT sr.id) > 0
      THEN (COUNT(DISTINCT sf.id)::numeric / COUNT(DISTINCT sr.id) * 100)
      ELSE 0 END,
    AVG(sf.overall_rating),
    AVG(sf.sentiment_score),
    COUNT(DISTINCT sr.id) FILTER (WHERE sr.requested_date >= CURRENT_DATE - INTERVAL '7 days')::integer,
    COUNT(DISTINCT sf.id) FILTER (WHERE sf.received_at >= now() - INTERVAL '7 days')::integer,
    AVG(sf.overall_rating) FILTER (WHERE sf.received_at >= now() - INTERVAL '7 days'),
    AVG(sf.sentiment_score) FILTER (WHERE sf.received_at >= now() - INTERVAL '7 days'),
    MAX(sr.requested_date),
    MAX(sf.received_at::date),
    now()
  FROM public.showing_requests sr
  LEFT JOIN public.showing_feedback sf ON sf.showing_id = sr.id
  WHERE sr.listing_id = p_listing_id
  GROUP BY sr.listing_id
  ON CONFLICT (listing_id) DO UPDATE SET
    total_showings = EXCLUDED.total_showings,
    total_feedback = EXCLUDED.total_feedback,
    feedback_rate = EXCLUDED.feedback_rate,
    avg_rating = EXCLUDED.avg_rating,
    avg_sentiment = EXCLUDED.avg_sentiment,
    week_showings = EXCLUDED.week_showings,
    week_feedback = EXCLUDED.week_feedback,
    week_avg_rating = EXCLUDED.week_avg_rating,
    week_avg_sentiment = EXCLUDED.week_avg_sentiment,
    last_showing_date = EXCLUDED.last_showing_date,
    last_feedback_date = EXCLUDED.last_feedback_date,
    updated_at = now();
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- FUNCTION: Get pending feedback follow-ups
-- ============================================================
CREATE OR REPLACE FUNCTION get_pending_feedback_follow_ups()
RETURNS TABLE (
  showing_id uuid,
  listing_id uuid,
  property_address text,
  agent_name text,
  agent_email text,
  requested_date date,
  hours_since_showing numeric
) AS $$
  SELECT
    sr.id,
    sr.listing_id,
    sr.property_address,
    sr.agent_name,
    sr.agent_email,
    sr.requested_date,
    EXTRACT(EPOCH FROM (now() - (sr.requested_date + COALESCE(sr.requested_time, '12:00'::time))::timestamptz)) / 3600
  FROM public.showing_requests sr
  WHERE sr.feedback_status = 'awaiting'
    AND sr.status IN ('confirmed', 'completed')
    AND sr.agent_email IS NOT NULL
    AND sr.requested_date <= CURRENT_DATE - INTERVAL '2 days'
    AND NOT EXISTS (
      SELECT 1 FROM public.feedback_follow_ups ffu
      WHERE ffu.showing_id = sr.id AND ffu.follow_up_number >= 2
    );
$$ LANGUAGE sql STABLE;

-- ============================================================
-- FUNCTION: Get weekly report data for a listing
-- ============================================================
CREATE OR REPLACE FUNCTION get_weekly_report(p_listing_id uuid, p_week_end date DEFAULT CURRENT_DATE)
RETURNS jsonb AS $$
  SELECT row_to_json(wrs.*)::jsonb
  FROM public.weekly_report_snapshots wrs
  WHERE wrs.listing_id = p_listing_id
    AND wrs.report_period_end <= p_week_end
  ORDER BY wrs.report_period_end DESC
  LIMIT 1;
$$ LANGUAGE sql STABLE;

-- ============================================================
-- FUNCTION: Get showing velocity (sparkline data)
-- ============================================================
CREATE OR REPLACE FUNCTION get_showing_velocity(p_listing_id uuid, p_days integer DEFAULT 30)
RETURNS jsonb AS $$
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object('date', d.day::date, 'count', COALESCE(c.cnt, 0))
    ORDER BY d.day
  ), '[]'::jsonb)
  FROM generate_series(
    CURRENT_DATE - (p_days || ' days')::interval,
    CURRENT_DATE,
    '1 day'
  ) AS d(day)
  LEFT JOIN (
    SELECT requested_date, COUNT(*) as cnt
    FROM public.showing_requests
    WHERE listing_id = p_listing_id AND status != 'cancelled'
    GROUP BY requested_date
  ) c ON c.requested_date = d.day::date;
$$ LANGUAGE sql STABLE;
