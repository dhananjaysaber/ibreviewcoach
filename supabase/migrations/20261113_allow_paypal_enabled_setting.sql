-- The admin PayPal on/off switch could not save: set_ia_app_setting only allowed 'block_right_click'.
-- Allow 'paypal_enabled' (boolean only). Already applied live.
create or replace function public.set_ia_app_setting(p_key text, p_value jsonb)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if auth.uid() is null or not public.is_ia_admin() then
    raise exception 'Admin access is required';
  end if;
  if p_key not in ('block_right_click', 'paypal_enabled') then
    raise exception 'Unknown setting';
  end if;
  if p_key = 'paypal_enabled' and jsonb_typeof(p_value) <> 'boolean' then
    raise exception 'paypal_enabled must be true or false';
  end if;
  insert into public.ia_app_settings (key, value, updated_at)
  values (p_key, p_value, now())
  on conflict (key) do update set value = excluded.value, updated_at = now();
end;
$function$;
