create table collection (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references auth.users on delete cascade,
  whisky_id  uuid        not null references whiskies  on delete cascade,
  opened_at  timestamptz,
  added_at   timestamptz not null default now(),
  constraint collection_user_whisky_unique unique (user_id, whisky_id)
);

alter table collection enable row level security;

-- Each user owns their own collection rows entirely
create policy "collection:all"
  on collection for all to authenticated
  using  (user_id = auth.uid())
  with check (user_id = auth.uid());
