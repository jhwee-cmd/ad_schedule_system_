create table if not exists public.bookings (
  id bigserial primary key,
  basis_dt date not null,
  screen_id text not null,
  country_nm text,
  guaranteed_exposure integer
);

create index if not exists bookings_basis_dt_screen_id_idx
  on public.bookings (basis_dt, screen_id);

alter table public.bookings enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where polname = 'bookings_insert_auth'
  ) then
    create policy "bookings_insert_auth"
    on public.bookings for insert
    to authenticated
    with check (true);
  end if;
end$$;



