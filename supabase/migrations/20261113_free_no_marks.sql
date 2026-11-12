-- Free review shows no marks at all.
-- Patches the live functions in place (they were created in 20261113_strict_free_review.sql
-- and 20261113_report_history_free_scores.sql):
--  * get_my_ia_review_content: the free Research Design criterion loses
--    indicative_mark_range / indicative_band / confidence / why_this_range.
--  * get_my_ia_report_history: free submissions return no criterion scores.
do $$
declare d text; d2 text;
begin
  d := pg_get_functiondef('public.get_my_ia_review_content(uuid)'::regprocedure);
  d2 := replace(d, 'select coalesce(jsonb_agg(e), ''[]''::jsonb) into v_criteria',
    'select coalesce(jsonb_agg(e - ''indicative_mark_range'' - ''indicative_band'' - ''confidence'' - ''why_this_range''), ''[]''::jsonb) into v_criteria');
  if d2 = d then raise exception 'rpc patch did not match'; end if;
  execute d2;

  d := pg_get_functiondef('public.get_my_ia_report_history()'::regprocedure);
  d2 := replace(d, 'where e ->> ''criterion'' = ''ResearchDesign''), ''[]''::jsonb)', 'where false), ''[]''::jsonb)');
  if d2 = d then raise exception 'history patch did not match'; end if;
  execute d2;
end $$;
