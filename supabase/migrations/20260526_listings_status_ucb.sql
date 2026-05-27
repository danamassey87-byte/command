-- Add 'ucb' (Under Contract Accepting Backups) to listings.status enum.
-- ARMLS uses UCB when a listing has an accepted contract but is still
-- accepting backup offers. Behaves like 'pending' for workflow purposes
-- (auto-seeds M1–M10 deadlines + required documents) but is shown
-- distinctly so Dana / buyer agents know backups are welcome.
ALTER TABLE listings DROP CONSTRAINT IF EXISTS listings_status_check;
ALTER TABLE listings ADD CONSTRAINT listings_status_check
  CHECK (status = ANY (ARRAY[
    'lead'::text, 'signed'::text, 'coming_soon'::text, 'active'::text,
    'pending'::text, 'ucb'::text, 'contingent'::text, 'closed'::text,
    'withdrawn'::text, 'cancelled'::text, 'expired'::text, 'relaunching'::text
  ]));
