# Guets Leads

Funil B2B de captação e qualificação de leads de atacado (moda fitness). Substitui a
triagem manual feita hoje via WhatsApp + ManyChat: landing → quiz qualificatório →
validação do pedido mínimo → cadastro → Round Robin → WhatsApp da consultora.

## Stack

Next.js 16 (App Router) + TypeScript + Tailwind CSS 4 + Supabase (Postgres) +
React Hook Form + Zod.

## Setup

1. Crie um projeto no [Supabase](https://supabase.com).
2. Rode as migrations em `supabase/migrations/0001_init.sql` (SQL Editor do
   Supabase, ou `supabase db push` se estiver usando a CLI).
3. Opcionalmente rode `supabase/seed.sql` para criar 3 consultoras de exemplo
   (ou cadastre pelo painel `/admin/consultoras` depois do deploy).
4. Copie `.env.example` para `.env.local` e preencha:
   - `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` — do projeto Supabase.
   - `ADMIN_PASSWORD` — senha do painel `/admin`.
   - `ADMIN_SESSION_SECRET` — string aleatória longa (ex: `openssl rand -hex 32`).
   - `NEXT_PUBLIC_META_PIXEL_ID` / `NEXT_PUBLIC_GA_ID` — opcionais, tracking só
     carrega se estiverem definidos.
   - `NEXT_PUBLIC_INSTAGRAM_URL` / `NEXT_PUBLIC_B2C_CATALOG_URL` — destinos das
     telas de desqualificação.
5. `npm install && npm run dev`
6. `npm test` roda os testes unitários (lead scoring, validação de WhatsApp e
   CPF/CNPJ) com `node:test` via `tsx`.

## Regra do pedido mínimo

Centralizada em [`lib/config/commercial.ts`](lib/config/commercial.ts)
(`commercialConfig.minimumOrder`). Todo texto (landing, quiz, tela de
desqualificação) e a validação de backend (`lib/validation/schemas.ts`,
`app/api/leads/route.ts`) leem essa mesma constante — mudar o valor mínimo é
uma edição em um único arquivo.

## Round Robin

Implementado inteiramente no Postgres (não em JS), em
`supabase/migrations/0001_init.sql`:

- `pick_and_advance_consultant()` faz `SELECT ... FOR UPDATE` na linha única
  de `round_robin_state`, o que serializa chamadas concorrentes — duas
  submissões simultâneas nunca escolhem a mesma consultora.
- `submit_lead(...)` é o ponto de entrada único do cadastro: resolve
  duplicidade por `whatsapp_normalized` (também com `FOR UPDATE`) e só chama
  o Round Robin se o lead ainda não tiver consultora. Um lead já atribuído
  nunca troca de consultora, mesmo reenviando o formulário.
- Consultoras inativas são puladas automaticamente; ao reativar, voltam a
  participar sem quebrar a sequência (a posição é `round_robin_order`, fixa
  por consultora).
- Sem consultora ativa: o lead é salvo com `status = 'awaiting_assignment'`
  em vez de perdido.

## Estrutura

```
app/
  page.tsx              landing
  quiz/                 quiz completo (perguntas + cadastro), state machine client-side
  sucesso/[leadId]/      tela final + link do WhatsApp da consultora
  admin/                 dashboard, leads, consultoras (protegido por cookie)
  api/leads/             endpoint único de gravação de lead (valida, calcula score, chama submit_lead)
  api/events/            tracking leve de funil (funnel_events)
lib/
  config/                pedido mínimo, consentimento, links configuráveis
  lead-scoring/          pesos e classificação (nunca exposto ao usuário)
  round-robin/           wrapper da RPC assign_next_consultant
  leads/                 submit-lead (orquestra score + submit_lead) e get-lead
  validation/             zod schemas, whatsapp/cpf-cnpj/instagram
  tracking/               eventos internos, Pixel/GA4, sessão + UTMs
  admin/                  queries usadas pelo painel
supabase/migrations/      schema completo + funções do Round Robin
```

## Admin

`/admin` é protegido por um cookie assinado (HMAC), gerado em
`/api/admin/login` a partir de `ADMIN_PASSWORD`. Não há contas individuais
por consultora ainda — está listado como evolução futura no briefing
original.

## Deploy

Projeto pronto para Vercel: `vercel deploy`, configurando as mesmas
variáveis de `.env.example` no dashboard do projeto.
