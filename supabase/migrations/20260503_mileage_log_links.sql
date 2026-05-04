-- Mileage log: optional transaction + contact linkage
-- So a trip can be filed against a closing or a client and roll up in the
-- listing/deal/contact-level expense views.

ALTER TABLE public.mileage_log
  ADD COLUMN IF NOT EXISTS transaction_id uuid REFERENCES public.transactions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS contact_id     uuid REFERENCES public.contacts(id)     ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_mileage_log_transaction_id ON public.mileage_log(transaction_id) WHERE transaction_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mileage_log_contact_id     ON public.mileage_log(contact_id)     WHERE contact_id IS NOT NULL;

COMMENT ON COLUMN public.mileage_log.transaction_id IS 'Optional link to a transaction (closing) so mileage rolls up under the deal';
COMMENT ON COLUMN public.mileage_log.contact_id     IS 'Optional link to a client so mileage rolls up under the contact';
