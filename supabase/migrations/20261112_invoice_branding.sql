alter table public.ia_payment_orders alter column merchant_name set default 'IB IA Review';
update public.ia_payment_orders set merchant_name = 'IB IA Review' where merchant_name = 'PE Freak';

create or replace function public.assign_ia_payment_document_references()
returns trigger language plpgsql security definer set search_path to '' as $function$
declare v_number bigint; v_year text; v_padded_number text;
begin
  if new.status <> 'paid' then return new; end if;
  new.paid_at := coalesce(new.paid_at, now());
  new.invoice_issued_at := coalesce(new.invoice_issued_at, new.paid_at, now());
  if new.invoice_number is null or new.receipt_number is null then
    v_number := nextval('public.ia_payment_document_number_seq'::regclass);
    v_year := to_char(coalesce(new.paid_at, now()), 'YYYY');
    v_padded_number := lpad(v_number::text, 6, '0');
    new.invoice_number := coalesce(new.invoice_number, 'IBIA-INV-' || v_year || '-' || v_padded_number);
    new.receipt_number := coalesce(new.receipt_number, 'IBIA-RCPT-' || v_year || '-' || v_padded_number);
  end if;
  new.merchant_name := coalesce(nullif(trim(new.merchant_name), ''), 'IB IA Review');
  return new;
end;
$function$;
