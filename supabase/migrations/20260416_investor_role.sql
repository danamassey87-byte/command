-- Add investor_role to track whether investor is buying, selling, or both
alter table investors add column if not exists investor_role text not null default 'buyer'
  check (investor_role in ('buyer', 'seller', 'both'));
