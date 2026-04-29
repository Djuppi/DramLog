alter table whiskies
  add column if not exists bottle_size integer; -- ml, e.g. 700, 750, 1000
