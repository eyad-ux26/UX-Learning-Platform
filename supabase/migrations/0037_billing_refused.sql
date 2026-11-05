-- Slice 5 follow-up: a checkout refused because the card was issued outside Egypt (PAYMOB_EG_CARDS_ONLY=1).
-- The return page shows its own message for it, and the payment is refunded. Run after 0036, before turning the flag on.
alter table public.checkout_sessions drop constraint if exists checkout_sessions_status_check;
alter table public.checkout_sessions add constraint checkout_sessions_status_check
  check (status in ('open', 'pending', 'paid', 'failed', 'cancelled', 'refused'));
