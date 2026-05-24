create extension if not exists pgcrypto;

create table if not exists public.bank_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null default 'plaid',
  item_id text not null,
  access_token_ciphertext text,
  encryption_iv text,
  institution_id text,
  institution_name text,
  cursor text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider, item_id)
);

create table if not exists public.bank_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  connection_id uuid references public.bank_connections(id) on delete set null,
  provider text not null default 'plaid',
  provider_transaction_id text not null,
  account_id text,
  date date not null,
  posted_date date,
  merchant_name text not null,
  raw_description text,
  amount numeric(12, 2) not null,
  category text,
  pending boolean not null default false,
  ignored boolean not null default false,
  applied_log_id text,
  applied_item_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider, provider_transaction_id)
);

create index if not exists bank_transactions_user_date_idx on public.bank_transactions(user_id, date desc);
create index if not exists bank_transactions_user_merchant_idx on public.bank_transactions(user_id, lower(merchant_name));

alter table public.bank_connections enable row level security;
alter table public.bank_transactions enable row level security;

drop policy if exists "Users can view their own bank connection metadata" on public.bank_connections;
create policy "Users can view their own bank connection metadata"
  on public.bank_connections for select
  using (auth.uid() = user_id);

drop policy if exists "Users can view their own bank transactions" on public.bank_transactions;
create policy "Users can view their own bank transactions"
  on public.bank_transactions for select
  using (auth.uid() = user_id);

drop policy if exists "Users can update review fields on their bank transactions" on public.bank_transactions;
create policy "Users can update review fields on their bank transactions"
  on public.bank_transactions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
