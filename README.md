# Guets Leads

Funil B2B de captação e qualificação de leads de atacado (moda fitness). Substitui a
triagem manual feita hoje via WhatsApp + ManyChat: landing → quiz qualificatório →
validação do pedido mínimo → cadastro → Round Robin → WhatsApp da consultora.

## Stack

Next.js 16 (App Router) + TypeScript + Tailwind CSS 4 + React Hook Form + Zod.

O cadastro de leads (com Round Robin) e o painel `/admin` leem/escrevem
direto numa **planilha do Google**, via um Google Apps Script publicado como
Web App — ver [`google-apps-script/Code.gs`](google-apps-script/Code.gs). Não
há banco de dados tradicional na frente do site.

## Setup

1. **Planilha de leads**: crie (ou reaproveite) uma Google Sheet com as abas
   "Leads", "Consultoras" e "Eventos" — colunas exatas (cabeçalho da
   primeira linha) em
   [`google-apps-script/Code.gs`](google-apps-script/Code.gs).
2. Cole o conteúdo de `Code.gs` em Extensões → Apps Script dessa planilha.
3. Em Extensões → Apps Script → Configurações do projeto → Propriedades do
   script, adicione `ADMIN_TOKEN` com um valor secreto aleatório (o Web App
   fica público pra "Qualquer pessoa" poder chamar a URL, então esse token é
   o que impede uso não autorizado).
4. Implante como Web App ("Executar como eu", acesso "Qualquer pessoa") e
   copie a URL gerada (termina em `/exec`).
5. Copie `.env.example` para `.env.local` e preencha:
   - `GOOGLE_SHEETS_WEBHOOK_URL` — a URL do Web App do passo anterior.
   - `GOOGLE_SHEETS_TOKEN` — o mesmo valor de `ADMIN_TOKEN` do passo 3.
   - `ADMIN_PASSWORD` / `ADMIN_SESSION_SECRET` — login do painel `/admin`.
   - `NEXT_PUBLIC_META_PIXEL_ID` / `NEXT_PUBLIC_GA_ID` — opcionais, tracking só
     carrega se estiverem definidos.
   - `NEXT_PUBLIC_INSTAGRAM_URL` / `NEXT_PUBLIC_B2C_CATALOG_URL` — destinos das
     telas de desqualificação.
6. `npm install && npm run dev`
7. `npm test` roda os testes unitários (lead scoring, validação de WhatsApp e
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
  admin/                 dashboard, leads, consultoras — lê/escreve via o Apps Script da planilha
  api/leads/             endpoint único de gravação de lead (valida, calcula score, chama submitLead)
  api/events/            tracking leve de funil (grava na aba "Eventos" via Apps Script)
lib/
  config/                pedido mínimo, consentimento, links configuráveis
  lead-scoring/          pesos e classificação (nunca exposto ao usuário)
  leads/submit-lead.ts   calcula score e faz o POST pro Apps Script da planilha
  sheets/client.ts       fetch client compartilhado (GET/POST) pro Web App do Apps Script
  validation/             zod schemas, whatsapp/cpf-cnpj/instagram
  tracking/               eventos internos, Pixel/GA4, sessão + UTMs
  admin/                  queries do painel, via lib/sheets/client.ts
google-apps-script/       código que roda dentro da planilha (cadastro, Round Robin e leitura do admin)
```

## Admin

`/admin` é protegido por um cookie assinado (HMAC), gerado em
`/api/admin/login` a partir de `ADMIN_PASSWORD`. Os dados (dashboard, leads,
consultoras) vêm da mesma planilha do Google usada no cadastro, via as ações
de leitura/escrita do Apps Script (`list_leads`, `get_lead`, `list_consultants`,
`metrics`, `create_consultant`, `update_consultant`, `update_lead_status`) —
todas exigem o `GOOGLE_SHEETS_TOKEN`/`ADMIN_TOKEN` compartilhado.

## Deploy

Projeto pronto para Vercel: conectado via GitHub, cada push em `main` gera
um novo deploy automaticamente. Configure as variáveis de `.env.example` no
dashboard do projeto na Vercel.
