-- Admin can save a fixed USD to INR rate (50 to 150), or clear it (JSON null) to use the live rate.
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
  if p_key not in ('block_right_click', 'paypal_enabled', 'usd_inr_rate') then
    raise exception 'Unknown setting';
  end if;
  if p_key = 'paypal_enabled' and jsonb_typeof(p_value) <> 'boolean' then
    raise exception 'paypal_enabled must be true or false';
  end if;
  if p_key = 'usd_inr_rate' then
    if jsonb_typeof(p_value) = 'number' then
      if (p_value #>> '{}')::numeric < 50 or (p_value #>> '{}')::numeric > 150 then
        raise exception 'usd_inr_rate must be between 50 and 150';
      end if;
    elsif jsonb_typeof(p_value) <> 'null' then
      raise exception 'usd_inr_rate must be a number or null';
    end if;
  end if;
  insert into public.ia_app_settings (key, value, updated_at)
  values (p_key, p_value, now())
  on conflict (key) do update set value = excluded.value, updated_at = now();
end;
$function$;
