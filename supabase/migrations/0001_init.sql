-- Guets Leads — schema inicial do funil B2B
-- Convenção: todo acesso a estas tabelas é feito server-side com a service
-- role key (ver lib/supabase/admin.ts). RLS fica ativado e sem policies
-- públicas de propósito: nenhum cliente anônimo deve ler/gravar direto.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type purchase_purpose as enum (
  'reseller_physical_store',
  'reseller_online',
  'reseller_in_person',
  'starting_now',
  'personal_use'
);

create type lead_segment as enum (
  'fitness',
  'feminina',
  'other',
  'not_selling_yet'
);

create type sales_channel as enum (
  'physical_store',
  'instagram',
  'whatsapp',
  'own_site',
  'marketplace',
  'multiple'
);

create type investment_range as enum (
  'r1200_2000',
  'r2001_3000',
  'r3001_5000',
  'r5001_10000',
  'above_10000'
);

create type purchase_frequency as enum (
  'weekly',
  'biweekly',
  'monthly',
  'as_needed',
  'first_purchase'
);

create type lead_classification as enum ('hot', 'qualified', 'beginner');

create type lead_status as enum (
  'new',
  'contacted',
  'catalog_sent',
  'negotiation',
  'won',
  'lost',
  'awaiting_assignment'
);

-- ---------------------------------------------------------------------------
-- updated_at helper
-- ---------------------------------------------------------------------------

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- consultants
-- ---------------------------------------------------------------------------

create table consultants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  whatsapp text not null,
  active boolean not null default true,
  round_robin_order integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index consultants_round_robin_order_idx on consultants (round_robin_order);
create index consultants_active_idx on consultants (active);

create trigger consultants_set_updated_at
  before update on consultants
  for each row execute function set_updated_at();

-- Atribui automaticamente o próximo round_robin_order (final da fila) quando
-- não informado, para que cadastrar uma consultora nova nunca exija calcular
-- a ordem manualmente.
create or replace function consultants_assign_order()
returns trigger
language plpgsql
as $$
begin
  if new.round_robin_order is null then
    select coalesce(max(round_robin_order), 0) + 1 into new.round_robin_order
    from consultants;
  end if;
  return new;
end;
$$;

create trigger consultants_assign_order_trigger
  before insert on consultants
  for each row execute function consultants_assign_order();

-- ---------------------------------------------------------------------------
-- round_robin_state — linha única (singleton) que guarda o ponteiro da fila
-- ---------------------------------------------------------------------------

create table round_robin_state (
  id boolean primary key default true,
  last_consultant_id uuid references consultants (id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint round_robin_state_singleton check (id)
);

insert into round_robin_state (id, last_consultant_id) values (true, null);

-- ---------------------------------------------------------------------------
-- leads
--
-- Só entra aqui quem concluiu o cadastro comercial completo (perfil B2B +
-- aceitou o pedido mínimo + consentimento). Leads desqualificados (uso
-- próprio ou não aceitou o mínimo) ficam apenas em funnel_events.
-- ---------------------------------------------------------------------------

create table leads (
  id uuid primary key default gen_random_uuid(),

  name text not null,
  whatsapp_raw text not null,
  whatsapp_normalized text not null,
  email text not null,
  business_name text not null,
  instagram text,
  city text not null,
  state text not null,
  cpf_cnpj text not null,

  purchase_purpose purchase_purpose not null,
  accepts_minimum_order boolean not null default true,
  segment lead_segment not null,
  sales_channel sales_channel not null,
  investment_range investment_range not null,
  purchase_frequency purchase_frequency not null,

  lead_score integer not null default 0,
  lead_classification lead_classification not null default 'beginner',
  consultant_id uuid references consultants (id),

  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  fbclid text,
  landing_page text,

  consent boolean not null default false,
  consent_timestamp timestamptz,
  consent_version text,

  status lead_status not null default 'new',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint leads_consent_required check (consent = true),
  constraint leads_accepts_minimum_order_required check (accepts_minimum_order = true)
);

create unique index leads_whatsapp_normalized_idx on leads (whatsapp_normalized);
create index leads_consultant_id_idx on leads (consultant_id);
create index leads_created_at_idx on leads (created_at);
create index leads_status_idx on leads (status);
create index leads_lead_classification_idx on leads (lead_classification);
create index leads_investment_range_idx on leads (investment_range);
create index leads_utm_campaign_idx on leads (utm_campaign);

create trigger leads_set_updated_at
  before update on leads
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- lead_assignments — histórico de atribuição (auditoria do Round Robin)
-- ---------------------------------------------------------------------------

create table lead_assignments (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads (id) on delete cascade,
  consultant_id uuid not null references consultants (id),
  assigned_at timestamptz not null default now(),
  assignment_method text not null default 'round_robin'
);

create index lead_assignments_lead_id_idx on lead_assignments (lead_id);
create index lead_assignments_consultant_id_idx on lead_assignments (consultant_id);

-- ---------------------------------------------------------------------------
-- funnel_events — rastreamento leve de todo o funil, incluindo quem foi
-- desqualificado (uso próprio / não aceitou o pedido mínimo) sem gerar lead.
-- ---------------------------------------------------------------------------

create table funnel_events (
  id uuid primary key default gen_random_uuid(),
  event_name text not null,
  session_id text not null,
  lead_id uuid references leads (id) on delete set null,
  step text,
  metadata jsonb not null default '{}'::jsonb,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  fbclid text,
  landing_page text,
  created_at timestamptz not null default now()
);

create index funnel_events_event_name_idx on funnel_events (event_name);
create index funnel_events_session_id_idx on funnel_events (session_id);
create index funnel_events_created_at_idx on funnel_events (created_at);

-- ---------------------------------------------------------------------------
-- pick_and_advance_consultant — núcleo do Round Robin, seguro contra
-- concorrência.
--
-- security definer + o SELECT ... FOR UPDATE sobre a linha singleton de
-- round_robin_state faz com que chamadas concorrentes sejam serializadas: a
-- segunda só consegue o lock depois que a primeira já commitou (update do
-- ponteiro), então duas nunca podem escolher a mesma consultora para dois
-- leads diferentes. Função interna — não atualiza `leads`/`lead_assignments`
-- sozinha, isso é responsabilidade de quem a chama (assign_next_consultant
-- e submit_lead), sempre dentro da mesma transação que já segura o lock.
-- ---------------------------------------------------------------------------

create or replace function pick_and_advance_consultant()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_last_order integer;
  v_next_consultant_id uuid;
begin
  perform 1 from round_robin_state where id = true for update;

  select c.round_robin_order
    into v_last_order
    from round_robin_state s
    join consultants c on c.id = s.last_consultant_id
   where s.id = true;

  -- Próxima consultora ativa após a última posição usada.
  select c.id
    into v_next_consultant_id
    from consultants c
   where c.active = true
     and (v_last_order is null or c.round_robin_order > v_last_order)
   order by c.round_robin_order asc
   limit 1;

  -- Chegou ao fim da fila: volta para a primeira consultora ativa.
  if v_next_consultant_id is null then
    select c.id
      into v_next_consultant_id
      from consultants c
     where c.active = true
     order by c.round_robin_order asc
     limit 1;
  end if;

  if v_next_consultant_id is not null then
    update round_robin_state
       set last_consultant_id = v_next_consultant_id,
           updated_at = now()
     where id = true;
  end if;

  return v_next_consultant_id;
end;
$$;

-- RPC standalone (usada pelo admin para atribuir/reatribuir manualmente um
-- lead que ficou `awaiting_assignment`). O fluxo normal de cadastro usa
-- submit_lead, abaixo, que já inclui isso na mesma transação.
create or replace function assign_next_consultant(p_lead_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_next_consultant_id uuid;
begin
  v_next_consultant_id := pick_and_advance_consultant();

  if v_next_consultant_id is null then
    update leads set status = 'awaiting_assignment', updated_at = now() where id = p_lead_id;
    return null;
  end if;

  update leads
     set consultant_id = v_next_consultant_id,
         updated_at = now()
   where id = p_lead_id;

  insert into lead_assignments (lead_id, consultant_id, assignment_method)
  values (p_lead_id, v_next_consultant_id, 'round_robin');

  return v_next_consultant_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- submit_lead — ponto de entrada único do cadastro público.
--
-- Resolve duplicidade (por whatsapp_normalized) e Round Robin na mesma
-- transação:
--   1. SELECT ... FOR UPDATE do lead pelo whatsapp normalizado (serializa
--      duas submissões simultâneas do mesmo número).
--   2. Se não existe, insere; se existe, atualiza os dados cadastrais e de
--      qualificação SEM mexer em consultant_id nem nos UTMs originais
--      (primeiro toque de campanha é preservado).
--   3. Só chama pick_and_advance_consultant() se o lead ainda não tem
--      consultora (novo, ou reenviado enquanto esperava atribuição) — um
--      lead já atribuído nunca troca de consultora (seção 33 do briefing).
-- ---------------------------------------------------------------------------

create or replace function submit_lead(
  p_name text,
  p_whatsapp_raw text,
  p_whatsapp_normalized text,
  p_email text,
  p_business_name text,
  p_instagram text,
  p_city text,
  p_state text,
  p_cpf_cnpj text,
  p_purchase_purpose purchase_purpose,
  p_segment lead_segment,
  p_sales_channel sales_channel,
  p_investment_range investment_range,
  p_purchase_frequency purchase_frequency,
  p_lead_score integer,
  p_lead_classification lead_classification,
  p_utm_source text,
  p_utm_medium text,
  p_utm_campaign text,
  p_utm_content text,
  p_utm_term text,
  p_fbclid text,
  p_landing_page text,
  p_consent_version text
)
returns table (lead_id uuid, consultant_id uuid, is_new boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lead_id uuid;
  v_consultant_id uuid;
  v_is_new boolean := false;
begin
  select l.id, l.consultant_id
    into v_lead_id, v_consultant_id
    from leads l
   where l.whatsapp_normalized = p_whatsapp_normalized
   for update;

  if v_lead_id is null then
    v_is_new := true;

    insert into leads (
      name, whatsapp_raw, whatsapp_normalized, email, business_name, instagram,
      city, state, cpf_cnpj, purchase_purpose, accepts_minimum_order, segment,
      sales_channel, investment_range, purchase_frequency, lead_score,
      lead_classification, utm_source, utm_medium, utm_campaign, utm_content,
      utm_term, fbclid, landing_page, consent, consent_timestamp, consent_version
    ) values (
      p_name, p_whatsapp_raw, p_whatsapp_normalized, p_email, p_business_name, p_instagram,
      p_city, p_state, p_cpf_cnpj, p_purchase_purpose, true, p_segment,
      p_sales_channel, p_investment_range, p_purchase_frequency, p_lead_score,
      p_lead_classification, p_utm_source, p_utm_medium, p_utm_campaign, p_utm_content,
      p_utm_term, p_fbclid, p_landing_page, true, now(), p_consent_version
    )
    returning id into v_lead_id;
  else
    update leads set
      name = p_name,
      whatsapp_raw = p_whatsapp_raw,
      email = p_email,
      business_name = p_business_name,
      instagram = p_instagram,
      city = p_city,
      state = p_state,
      cpf_cnpj = p_cpf_cnpj,
      purchase_purpose = p_purchase_purpose,
      segment = p_segment,
      sales_channel = p_sales_channel,
      investment_range = p_investment_range,
      purchase_frequency = p_purchase_frequency,
      lead_score = p_lead_score,
      lead_classification = p_lead_classification,
      consent = true,
      consent_timestamp = now(),
      consent_version = p_consent_version,
      updated_at = now()
    where id = v_lead_id;
  end if;

  if v_consultant_id is null then
    v_consultant_id := pick_and_advance_consultant();

    if v_consultant_id is not null then
      update leads
         set consultant_id = v_consultant_id,
             updated_at = now()
       where id = v_lead_id;

      insert into lead_assignments (lead_id, consultant_id, assignment_method)
      values (v_lead_id, v_consultant_id, 'round_robin');
    else
      update leads
         set status = 'awaiting_assignment',
             updated_at = now()
       where id = v_lead_id;
    end if;
  end if;

  return query select v_lead_id, v_consultant_id, v_is_new;
end;
$$;

-- ---------------------------------------------------------------------------
-- RLS — habilitado, sem policies. Todo acesso passa pela service role key
-- em código server-side (nunca pelo client com a anon key).
-- ---------------------------------------------------------------------------

alter table consultants enable row level security;
alter table leads enable row level security;
alter table lead_assignments enable row level security;
alter table funnel_events enable row level security;
alter table round_robin_state enable row level security;
