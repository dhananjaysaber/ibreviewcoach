create or replace function public.admin_list_ia_students(p_search text default null, p_limit integer default 50, p_offset integer default 0)
returns jsonb language plpgsql stable security definer set search_path to '' as $function$
declare v_admin_id uuid; v_limit integer; v_offset integer; v_search text;
begin
  v_admin_id := public.require_ia_admin();
  v_limit := least(greatest(coalesce(p_limit, 50), 1), 200);
  v_offset := greatest(coalesce(p_offset, 0), 0);
  v_search := lower(nullif(btrim(coalesce(p_search, '')), ''));
  return (
    with student_rows as (
      select s.id as student_id, s.full_name, s.cohort, u.email::text as email, s.created_at,
        coalesce(ca.free_review_status, 'available') as free_review_status,
        exists (select 1 from public.ia_admin_users iau where iau.user_id = s.id and iau.is_active = true) as is_admin,
        coalesce((select sum(g.credits_remaining) from public.ia_credit_grants g where g.student_id = s.id and g.grant_type in ('purchase','refund') and g.revoked_at is null and (g.expires_at is null or g.expires_at > now())), 0)::integer as paid_credits_remaining,
        coalesce((select sum(g.credits_remaining) from public.ia_credit_grants g where g.student_id = s.id and g.grant_type = 'complimentary' and g.revoked_at is null and (g.expires_at is null or g.expires_at > now())), 0)::integer as complimentary_credits_remaining,
        (select count(*) from public.ia_payment_orders po where po.student_id = s.id and po.status = 'paid')::integer as paid_order_count,
        coalesce((select sum(po.amount) from public.ia_payment_orders po where po.student_id = s.id and po.status = 'paid' and po.currency = 'USD'), 0) as paid_total_usd,
        coalesce((select jsonb_object_agg(c.currency, c.total) from (select po.currency, sum(po.amount) as total from public.ia_payment_orders po where po.student_id = s.id and po.status = 'paid' group by po.currency) c), '{}'::jsonb) as paid_by_currency,
        (select count(*) from public.ia_submissions sub where sub.student_id = s.id and sub.deleted_at is null)::integer as review_count,
        (select count(*) from public.ia_submissions sub where sub.student_id = s.id and sub.deleted_at is null and sub.status = 'completed')::integer as completed_review_count,
        (select max(po.created_at) from public.ia_payment_orders po where po.student_id = s.id) as last_payment_at,
        (select max(sub.uploaded_at) from public.ia_submissions sub where sub.student_id = s.id and sub.deleted_at is null) as last_review_at
      from public.students s
      left join auth.users u on u.id = s.id
      left join public.ia_credit_accounts ca on ca.student_id = s.id
      where v_search is null or lower(coalesce(s.full_name, '')) like '%' || v_search || '%' or lower(coalesce(u.email::text, '')) like '%' || v_search || '%' or lower(coalesce(s.cohort, '')) like '%' || v_search || '%'
    ),
    paged as (select * from student_rows order by created_at desc limit v_limit offset v_offset)
    select jsonb_build_object(
      'total', (select count(*) from student_rows), 'limit', v_limit, 'offset', v_offset,
      'rows', coalesce((select jsonb_agg(to_jsonb(paged) order by paged.created_at desc) from paged), '[]'::jsonb)
    )
  );
end;
$function$;
