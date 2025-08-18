-- 중복 방지 유니크 인덱스 추가
create unique index if not exists bookings_unique_ymd_sid_country
  on public.bookings (basis_dt, screen_id, coalesce(country_nm,''));
