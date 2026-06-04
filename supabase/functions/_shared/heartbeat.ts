// H14 / X3 cross-cutting infra from SECURITY_AUDIT_PUNCHLIST.
//
// Every cron's successful end-of-run calls heartbeat(supabase, name, metadata).
// A separate hourly watchdog (public.cron_watchdog_check SQL function) reads
// public.cron_heartbeats and writes system_events('cron.stalled', 'err', …)
// for any function whose last heartbeat is older than 2× its expected
// interval. Slack #system fans severity=err out automatically.
//
// Best-effort: a heartbeat write failure is logged but does NOT throw,
// because the cron's actual work has already succeeded.
import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

export async function heartbeat(
  supabase: SupabaseClient,
  functionName: string,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  const { error } = await supabase
    .from('cron_heartbeats')
    .update({
      last_completed_at: new Date().toISOString(),
      metadata,
    })
    .eq('function_name', functionName)
  if (error) {
    console.warn(`[heartbeat] ${functionName} write failed:`, error.message)
  }
}
