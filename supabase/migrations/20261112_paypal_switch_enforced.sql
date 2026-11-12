-- When the admin switches PayPal off (ia_app_settings.paypal_enabled = false), no new PayPal order can be created.
-- Enforced in the database so it holds even if the edge function is called directly.
create or replace function public.block_paypal_orders_when_off()
returns trigger language plpgsql security definer set search_path to '' as $function$
begin
  if new.payment_provider = 'paypal'
     and exists (select 1 from public.ia_app_settings s where s.key = 'paypal_enabled' and s.value = 'false'::jsonb) then
    raise exception 'PayPal payments are currently switched off.' using errcode = 'P0001';
  end if;
  return new;
end;
$function$;

drop trigger if exists trg_block_paypal_orders_when_off on public.ia_payment_orders;
create trigger trg_block_paypal_orders_when_off
  before insert on public.ia_payment_orders
  for each row execute function public.block_paypal_orders_when_off();
