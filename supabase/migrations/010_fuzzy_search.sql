-- Enable pg_trgm extension for fuzzy search similarity
create extension if not exists "pg_trgm";

-- Create a search function that uses similarity
-- This function can be called via RPC for advanced fuzzy search
create or replace function search_businesses_fuzzy(
  search_query text,
  search_country text default null,
  match_threshold float default 0.3
)
returns setof businesses
language sql
as $$
  select *
  from businesses
  where 
    (search_country is null or country_code = search_country)
    and (
      legal_name % search_query
      or company_description % search_query
      or similarity(legal_name, search_query) > match_threshold
    )
  order by 
    similarity(legal_name, search_query) desc
  limit 20;
$$;
