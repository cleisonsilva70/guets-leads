# Guets Leads

Funil B2B de captação e qualificação de leads de atacado (moda fitness). Substitui a
triagem manual feita hoje via WhatsApp + ManyChat: landing → quiz qualificatório →
validação do pedido mínimo → cadastro → Round Robin → WhatsApp da consultora.

## Stack

Next.js 16 (App Router) + TypeScript + Tailwind CSS 4 + React Hook Form + Zod.

O cadastro de leads (com Round Robin) é gravado direto numa **planilha do
Google**, via um Google Apps Script publicado como Web App — ver
[`google-apps-script/Code.gs`](google-apps-script/Code.gs). Não há banco de
dados tradicional na frente do site.

> **Status do painel `/admin`**: dashboard, listagem de leads e cadastro de
> consultoras ainda estão implementados contra Supabase (arquitetura
> original antes da migração para planilha) e por isso **não funcionam**
> enquanto isso não for decidido/refeito. Ver seção "Admin" abaixo.

## Setup

1. **Planilha de leads**: crie (ou reaproveite) uma Google Sheet com as abas
   "Leads" e "Consultoras" — colunas exatas em
   [`google-apps-script/Code.gs`](google-apps-script/Code.gs).
2. Cole o conteúdo de `Code.gs` em Extensões → Apps Script dessa planilha,
   implante como Web App ("Executar como eu", acesso "Qualquer pessoa") e
   copie a URL gerada (termina em `/exec`).
3. Copie `.env.example` para `.env.local` e preencha:
   - `GOOGLE_SHEETS_WEBHOOK_URL` — a URL do Web App do passo anterior.
   - `ADMIN_PASSWORD` / `ADMIN_SESSION_SECRET` — só relevantes quando o
     painel `/admin` for reativado (ver nota acima).
   - `NEXT_PUBLIC_META_PIXEL_ID` / `NEXT_PUBLIC_GA_ID` — opcionais, tracking só
     carrega se estiverem definidos.
   - `NEXT_PUBLIC_INSTAGRAM_URL` / `NEXT_PUBLIC_B2C_CATALOG_URL` — destinos das
     telas de desqualificação.
4. `npm install && npm run dev`
5. `npm test` roda os testes unitários (lead scoring, validação de WhatsApp e
   CPF/CNPJ) com `node:test` via `tsx`.

## Regra do pedido mínimo

Centralizada em [`lib/config/commercial.ts`](lib/config/commercial.ts)
(`commercialConfig.minimumOrder`). Todo texto (landing, quiz, tela de
desqualificação) e a validação de backend (`lib/validation/schemas.ts`,
`app/api/leads/route.ts`) leem essa mesma constante — mudar o valor mínimo é
uma edição em um único arquivo.

## Round Robin

Roda inteiramente dentro do Google Apps Script (`google-apps-script/Code.gs`),
não em JS do site:

- `pickNextConsultant()` escolhe, entre as consultoras marcadas como
  **Ativa**, a que tem a coluna `UltimaAtribuicao` mais antiga (ou vazia) —
  equivalente a um round robin puro. `LockService.getScriptLock()` serializa
  chamadas concorrentes, então dois cadastros ao mesmo tempo nunca escolhem
  a mesma consultora.
- `submitLead(...)` é o ponto de entrada único: resolve duplicidade por
  `WhatsAppNormalizado` na aba "Leads" e só chama `pickNextConsultant()` se
  o lead ainda não tiver consultora. Um lead já atribuído nunca troca de
  consultora, mesmo reenviando o formulário.
- Consultoras com `Ativa = FALSE` são puladas; ao reativar, voltam a
  participar (como não têm atribuição recente, tendem a ser escolhidas logo,
  o que é o comportamento esperado ao "voltar pra fila").
- Sem consultora ativa: o lead é salvo com `Status = awaiting_assignment` em
  vez de perdido.

## Estrutura

```
app/
  page.tsx              landing
  quiz/                 quiz completo (perguntas + cadastro), state machine client-side
  sucesso/               tela final + link do WhatsApp da consultora (lê sessionStorage)
  admin/                 dashboard, leads, consultoras — hoje desconectado (ver nota acima)
  api/leads/             endpoint único de gravação de lead (valida, calcula score, chama submitLead)
  api/events/            tracking leve de funil (hoje também desconectado, ver nota acima)
lib/
  config/                pedido mínimo, consentimento, links configuráveis
  lead-scoring/          pesos e classificação (nunca exposto ao usuário)
  leads/submit-lead.ts   calcula score e faz o POST pro Apps Script da planilha
  validation/             zod schemas, whatsapp/cpf-cnpj/instagram
  tracking/               eventos internos, Pixel/GA4, sessão + UTMs
  admin/                  queries do painel (ainda em Supabase)
google-apps-script/       código que roda dentro da planilha (cadastro + Round Robin)
```

## Admin

`/admin` é protegido por um cookie assinado (HMAC), gerado em
`/api/admin/login` a partir de `ADMIN_PASSWORD`. **Hoje ele lê leads e
consultoras do Supabase, que não é mais a fonte de verdade** — a migração
para a planilha do Google cobriu só o fluxo de cadastro. Duas opções daqui
pra frente:

1. Aposentar o painel e usar a própria planilha (aba "Leads" e "Consultoras")
   para visualizar/gerenciar tudo — mais simples, zero manutenção extra.
2. Reescrever `lib/admin/*` para ler/escrever via o mesmo Apps Script
   (adicionando ações de leitura tipo `?action=list_leads`).

Da mesma forma, `lib/tracking/record-event.ts` (funil analítico) ainda grava
em Supabase e por enquanto falha silenciosamente (não quebra o cadastro, só
não registra o evento).

## Deploy

Projeto pronto para Vercel: conectado via GitHub, cada push em `main` gera
um novo deploy automaticamente. Configure as variáveis de `.env.example` no
dashboard do projeto na Vercel.
