/**
 * Guets Leads — backend em Google Apps Script.
 *
 * Serve três papéis:
 *   1. Recebe cadastros do site (ação "submit_lead") e roda o Round Robin.
 *   2. Serve o painel /admin do site (listar leads, métricas, gerenciar
 *      consultoras) — todas as outras ações abaixo.
 *   3. Replica cada lead novo pra planilha principal da empresa (ver
 *      MAIN_SPREADSHEET_ID/MAIN_SHEET_GID), que já alimenta o Bling.
 *
 * ── Planilha ────────────────────────────────────────────────────────────
 * Três abas:
 *
 *   "Leads" — cabeçalhos (linha 1), nesta ordem:
 *     LeadID | DataHora | Nome | WhatsApp | WhatsAppNormalizado | Email |
 *     NomeLoja | Instagram | Endereco | NumeroEndereco | Bairro | Cep |
 *     ComplementoEndereco | CpfCnpj | TipoLoja | Finalidade | Segmento |
 *     CanalVenda | FaixaInvestimento | FrequenciaCompra | LeadScore |
 *     Classificacao | ConsultoraID | Consultora | WhatsAppConsultora |
 *     UtmSource | UtmMedium | UtmCampaign | UtmContent | UtmTerm | Fbclid |
 *     LandingPage | Status
 *
 *   "Consultoras" — cabeçalhos:
 *     ID | Nome | WhatsApp | Ativa | UltimaAtribuicao
 *     (uma linha por consultora; Ativa = TRUE/FALSE; ID pode ser qualquer
 *     texto único — ao criar pelo admin do site, é gerado automaticamente)
 *
 *   "Eventos" — cabeçalhos (funil analítico, opcional mas recomendado):
 *     DataHora | EventName | SessionID | LeadID | Step | Metadata |
 *     UtmSource | UtmMedium | UtmCampaign | UtmContent | UtmTerm | Fbclid |
 *     LandingPage
 *
 * ── Implantação ─────────────────────────────────────────────────────────
 * 1. Extensões → Apps Script na planilha, cole este arquivo.
 * 2. Configurações do projeto → Propriedades do script → adicione
 *    ADMIN_TOKEN com um valor longo e aleatório (ex: gerado em
 *    https://www.uuidgenerator.net/). Guarde esse valor.
 * 3. Implantar → Nova implantação → tipo "App da Web".
 *    - Executar como: "Eu"
 *    - Quem pode acessar: "Qualquer pessoa"
 * 4. Copie a URL (termina em /exec) → vai em GOOGLE_SHEETS_WEBHOOK_URL no
 *    site. O mesmo ADMIN_TOKEN do passo 2 vai em GOOGLE_SHEETS_TOKEN.
 *
 * Todas as ações (inclusive o cadastro público) exigem esse token — quem
 * chama a URL é sempre o servidor do site, nunca o navegador do lead, então
 * isso não trava o formulário, só impede terceiros que descubram a URL de
 * lerem os dados.
 */

const LEADS_SHEET_NAME = "Leads";
const CONSULTANTS_SHEET_NAME = "Consultoras";
const EVENTS_SHEET_NAME = "Eventos";
const PAGE_SIZE = 25;

/**
 * Planilha principal da empresa (a que já alimenta o Bling via
 * ManyChat/Wix). A ordem de colunas lá é DIFERENTE da nossa — cada lead
 * novo é remapeado campo a campo em buildMainSpreadsheetRow(), não
 * reaproveita a linha da nossa planilha. Precisa que a conta que roda
 * este Apps Script tenha acesso de Editor nessa planilha (compartilhada
 * pelo administrador dela).
 *
 * Cabeçalhos de lá, nesta ordem exata:
 *   Carimbo | Nome | Instagram | CPF/CNPJ | Endereço | Número | Bairro |
 *   CEP | Complemento | E-mail | Celular | Tipo da loja | Consultora |
 *   Classificacao | Segmento | FaixaInvestimento | FrequenciaCompra |
 *   Finalidade | CanalVenda | LeadID | Status Bling | Detalhe Bling
 *
 * As duas últimas (Status Bling / Detalhe Bling) ficam em branco aqui —
 * são preenchidas pelo processo deles depois que o Bling recebe o
 * cadastro, não por nós.
 */
const MAIN_SPREADSHEET_ID = "10W0tLqo2xc5QCHhZ9_HzjduB66RP91TS4Bri40LDiiQ";
const MAIN_SHEET_GID = 1992594130;

const LEADS_HEADERS = [
  "LeadID", "DataHora", "Nome", "WhatsApp", "WhatsAppNormalizado", "Email",
  "NomeLoja", "Instagram", "Endereco", "NumeroEndereco", "Bairro", "Cep",
  "ComplementoEndereco", "CpfCnpj", "TipoLoja",
  "Finalidade", "Segmento", "CanalVenda", "FaixaInvestimento", "FrequenciaCompra",
  "LeadScore", "Classificacao", "ConsultoraID", "Consultora", "WhatsAppConsultora",
  "UtmSource", "UtmMedium", "UtmCampaign", "UtmContent", "UtmTerm", "Fbclid",
  "LandingPage", "Status",
];

// CodigoAcessoHash: SHA-256 (hex) do código que a consultora usa pra entrar em
// /consultora no site. Nunca guardamos o código em si, só o hash.
const CONSULTANTS_HEADERS = ["ID", "Nome", "WhatsApp", "Ativa", "UltimaAtribuicao", "CodigoAcessoHash"];

const EVENTS_HEADERS = [
  "DataHora", "EventName", "SessionID", "LeadID", "Step", "Metadata",
  "UtmSource", "UtmMedium", "UtmCampaign", "UtmContent", "UtmTerm", "Fbclid", "LandingPage",
];

// ---------------------------------------------------------------------------
// Entradas HTTP
// ---------------------------------------------------------------------------

function doGet(e) {
  try {
    checkToken(e.parameter.token);
    const action = e.parameter.action;
    if (action === "list_leads") return jsonResponse(listLeads(e.parameter));
    if (action === "get_lead") return jsonResponse({ lead: getLeadById(e.parameter.leadId) });
    if (action === "list_consultants") return jsonResponse({ consultants: listConsultants() });
    if (action === "metrics") return jsonResponse(getMetrics(e.parameter));
    return jsonResponse({ error: "ação desconhecida: " + action }, 400);
  } catch (err) {
    return jsonResponse({ error: String(err && err.message ? err.message : err) }, 500);
  }
}

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    checkToken(payload.token);
    const action = payload.action;

    // Só submit_lead precisa do lock global (decide + grava a atribuição do
    // Round Robin de forma atômica). As outras ações não competem por esse
    // mesmo recurso, então travá-las junto só faz todo mundo esperar na fila
    // atrás de qualquer cadastro em andamento — inclusive os eventos leves de
    // tracking, que disparam a cada tela do quiz.
    if (action === "submit_lead") {
      const lock = LockService.getScriptLock();
      lock.waitLock(30000);
      try {
        return jsonResponse(submitLead(payload));
      } finally {
        lock.releaseLock();
      }
    }
    if (action === "submit_event") return jsonResponse(submitEvent(payload));
    if (action === "create_consultant") return jsonResponse(createConsultant(payload));
    if (action === "update_consultant") return jsonResponse(updateConsultant(payload));
    if (action === "update_lead_status") return jsonResponse(updateLeadStatus(payload));
    if (action === "consultant_login") return jsonResponse(consultantLogin(payload));
    return jsonResponse({ error: "ação desconhecida: " + action }, 400);
  } catch (err) {
    return jsonResponse({ error: String(err && err.message ? err.message : err) }, 500);
  }
}

/**
 * Comparação em tempo constante: um `!==` normal sai mais rápido no
 * primeiro caractere diferente, o que em teoria dá pra um atacante medir e
 * ir descobrindo o token caractere por caractere. Faz o hash dos dois lados
 * primeiro (assim o tamanho fica sempre igual, 32 bytes) e só então compara
 * byte a byte sem interromper cedo.
 */
function constantTimeEqualBytes(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

function sha256Bytes(str) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, str, Utilities.Charset.UTF_8);
}

function checkToken(token) {
  const expected = PropertiesService.getScriptProperties().getProperty("ADMIN_TOKEN");
  if (!expected) throw new Error("ADMIN_TOKEN não configurado nas Propriedades do script.");
  const isValid = typeof token === "string" && constantTimeEqualBytes(sha256Bytes(token), sha256Bytes(expected));
  if (!isValid) throw new Error("token inválido");
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}

function getSheet(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(name);
  if (!sheet) throw new Error("Aba não encontrada: " + name);
  return sheet;
}

/** Lê uma aba inteira e devolve como array de objetos {header: valor}. */
/**
 * O Google Sheets auto-detecta o tipo da célula: um WhatsApp, CEP, número de
 * endereço ou CPF/CNPJ digitado só com dígitos vira Number, não Text. Sem
 * isso, o valor volta como number no JSON e quebra qualquer .replace()/
 * .trim() do lado do site (que espera string).
 */
function asText(value) {
  return value === null || value === undefined || value === "" ? "" : String(value);
}

/**
 * Um valor de texto começando com =, +, - ou @ é interpretado como fórmula
 * pelo Sheets — inclusive quando escrito via setValue()/appendRow() pela
 * API, não só quando digitado manualmente. Vários campos que chegam aqui
 * (nome, endereço, UTMs da própria URL) vêm de um formulário público sem
 * curadoria nenhuma, então isso é uma injeção real: alguém poderia mandar
 * "=IMPORTXML(...)" como nome da loja e a fórmula rodaria de verdade
 * quando a consultora abrisse a planilha. Prefixar com aspas simples faz o
 * Sheets tratar como texto literal, do mesmo jeito que trataria uma
 * digitação manual começando com aspas simples.
 */
function sanitizeForSheet(value) {
  if (typeof value !== "string") return value;
  if (/^[=+\-@\t\r]/.test(value)) return "'" + value;
  return value;
}

function sanitizeRow(row) {
  return row.map(sanitizeForSheet);
}

/**
 * Monta a linha no formato da planilha principal da empresa — ordem de
 * colunas totalmente diferente da nossa (ver comentário de
 * MAIN_SPREADSHEET_ID), então mapeia campo a campo em vez de reaproveitar
 * a linha da nossa planilha.
 */
function buildMainSpreadsheetRow(payload, consultant, leadId) {
  return [
    new Date(), // Carimbo
    payload.name || "", // Nome
    payload.instagram || "", // Instagram
    payload.cpfCnpj || "", // CPF/CNPJ
    payload.address || "", // Endereço
    payload.addressNumber || "", // Número
    payload.neighborhood || "", // Bairro
    payload.zipCode || "", // CEP
    payload.addressComplement || "", // Complemento
    payload.email || "", // E-mail
    payload.whatsapp || "", // Celular
    payload.storeTypeLabel || "", // Tipo da loja
    consultant ? consultant.name : "", // Consultora
    payload.leadClassification || "", // Classificacao
    payload.segmentLabel || "", // Segmento
    payload.investmentRangeLabel || "", // FaixaInvestimento
    payload.purchaseFrequencyLabel || "", // FrequenciaCompra
    payload.purchasePurposeLabel || "", // Finalidade
    payload.salesChannelLabel || "", // CanalVenda
    leadId, // LeadID
    "", // Status Bling — preenchido pelo processo deles
    "", // Detalhe Bling — preenchido pelo processo deles
  ];
}

/**
 * Replica o lead na planilha principal da empresa, pra ele seguir pro
 * Bling do mesmo jeito que os leads dos outros sites. Nunca deve derrubar
 * o cadastro em si: se a planilha principal estiver inacessível
 * (permissão revogada, aba renomeada, etc.) o lead já está salvo na nossa
 * planilha de qualquer forma, então só registra o erro e segue.
 */
function replicateToMainSpreadsheet(payload, consultant, leadId) {
  try {
    const row = sanitizeRow(buildMainSpreadsheetRow(payload, consultant, leadId));
    const mainSheet = SpreadsheetApp.openById(MAIN_SPREADSHEET_ID).getSheetById(MAIN_SHEET_GID);
    mainSheet.appendRow(row);
  } catch (err) {
    console.error("Falha ao replicar lead para a planilha principal: " + (err && err.message ? err.message : err));
  }
}

function sheetToObjects(sheet, headers) {
  const data = sheet.getDataRange().getValues();
  const rows = [];
  for (let i = 1; i < data.length; i++) {
    if (!data[i][0]) continue; // linha vazia
    const obj = {};
    headers.forEach(function (h, col) {
      obj[h] = data[i][col];
    });
    obj.__row = i + 1; // linha real na planilha (1-based), útil pra update
    rows.push(obj);
  }
  return rows;
}

// ---------------------------------------------------------------------------
// Cadastro + Round Robin (chamado pelo site público, via servidor)
// ---------------------------------------------------------------------------

function findLeadByWhatsapp(sheet, whatsappNormalizado) {
  const data = sheet.getDataRange().getValues();
  const idx = LEADS_HEADERS.indexOf("WhatsAppNormalizado");
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idx]) === String(whatsappNormalizado)) return data[i];
  }
  return null;
}

/** Escolhe a consultora ATIVA cuja última atribuição é mais antiga (ou nula). */
function pickNextConsultant() {
  const sheet = getSheet(CONSULTANTS_SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  let bestRow = -1;
  let bestTime = Infinity;

  for (let i = 1; i < data.length; i++) {
    const id = data[i][0];
    const ativa = data[i][3];
    const ultima = data[i][4];
    if (!id) continue;
    const isActive = ativa === true || String(ativa).toUpperCase() === "TRUE";
    if (!isActive) continue;
    const t = ultima ? new Date(ultima).getTime() : 0;
    if (t < bestTime) {
      bestTime = t;
      bestRow = i;
    }
  }

  if (bestRow === -1) return null;

  const consultant = { id: asText(data[bestRow][0]), name: data[bestRow][1], whatsapp: asText(data[bestRow][2]) };
  sheet.getRange(bestRow + 1, 5).setValue(new Date().toISOString());
  return consultant;
}

function submitLead(payload) {
  const leadsSheet = getSheet(LEADS_SHEET_NAME);
  const existing = findLeadByWhatsapp(leadsSheet, payload.whatsappNormalizado);

  if (existing) {
    const consultoraId = existing[LEADS_HEADERS.indexOf("ConsultoraID")];
    const consultoraNome = existing[LEADS_HEADERS.indexOf("Consultora")];
    const consultoraWhats = existing[LEADS_HEADERS.indexOf("WhatsAppConsultora")];
    return {
      leadId: asText(existing[LEADS_HEADERS.indexOf("LeadID")]),
      isNew: false,
      consultant: consultoraNome
        ? { id: asText(consultoraId), name: consultoraNome, whatsapp: asText(consultoraWhats) }
        : null,
    };
  }

  const consultant = pickNextConsultant();
  const leadId = Utilities.getUuid();

  const row = LEADS_HEADERS.map(function (header) {
    switch (header) {
      case "LeadID": return leadId;
      case "DataHora": return new Date();
      case "Nome": return payload.name || "";
      case "WhatsApp": return payload.whatsapp || "";
      case "WhatsAppNormalizado": return payload.whatsappNormalizado || "";
      case "Email": return payload.email || "";
      case "NomeLoja": return payload.businessName || "";
      case "Instagram": return payload.instagram || "";
      case "Endereco": return payload.address || "";
      case "NumeroEndereco": return payload.addressNumber || "";
      case "Bairro": return payload.neighborhood || "";
      case "Cep": return payload.zipCode || "";
      case "ComplementoEndereco": return payload.addressComplement || "";
      case "CpfCnpj": return payload.cpfCnpj || "";
      case "TipoLoja": return payload.storeTypeLabel || "";
      case "Finalidade": return payload.purchasePurposeLabel || "";
      case "Segmento": return payload.segmentLabel || "";
      case "CanalVenda": return payload.salesChannelLabel || "";
      case "FaixaInvestimento": return payload.investmentRangeLabel || "";
      case "FrequenciaCompra": return payload.purchaseFrequencyLabel || "";
      case "LeadScore": return payload.leadScore || 0;
      case "Classificacao": return payload.leadClassification || "";
      case "ConsultoraID": return consultant ? consultant.id : "";
      case "Consultora": return consultant ? consultant.name : "";
      case "WhatsAppConsultora": return consultant ? consultant.whatsapp : "";
      case "UtmSource": return payload.utm_source || "";
      case "UtmMedium": return payload.utm_medium || "";
      case "UtmCampaign": return payload.utm_campaign || "";
      case "UtmContent": return payload.utm_content || "";
      case "UtmTerm": return payload.utm_term || "";
      case "Fbclid": return payload.fbclid || "";
      case "LandingPage": return payload.landing_page || "";
      case "Status": return consultant ? "Novo" : "Aguardando atribuição";
      default: return "";
    }
  });

  leadsSheet.appendRow(sanitizeRow(row));
  replicateToMainSpreadsheet(payload, consultant, leadId);

  return {
    leadId: leadId,
    isNew: true,
    consultant: consultant ? { id: consultant.id, name: consultant.name, whatsapp: consultant.whatsapp } : null,
  };
}

// ---------------------------------------------------------------------------
// Eventos (funil analítico leve)
// ---------------------------------------------------------------------------

function submitEvent(payload) {
  const sheet = getSheet(EVENTS_SHEET_NAME);
  const row = EVENTS_HEADERS.map(function (header) {
    switch (header) {
      case "DataHora": return new Date();
      case "EventName": return payload.eventName || "";
      case "SessionID": return payload.sessionId || "";
      case "LeadID": return payload.leadId || "";
      case "Step": return payload.step || "";
      case "Metadata": return payload.metadata ? JSON.stringify(payload.metadata) : "";
      case "UtmSource": return payload.utm_source || "";
      case "UtmMedium": return payload.utm_medium || "";
      case "UtmCampaign": return payload.utm_campaign || "";
      case "UtmContent": return payload.utm_content || "";
      case "UtmTerm": return payload.utm_term || "";
      case "Fbclid": return payload.fbclid || "";
      case "LandingPage": return payload.landing_page || "";
      default: return "";
    }
  });
  sheet.appendRow(sanitizeRow(row));
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Consultoras (admin)
// ---------------------------------------------------------------------------

function listConsultants() {
  const consultants = sheetToObjects(getSheet(CONSULTANTS_SHEET_NAME), CONSULTANTS_HEADERS);
  const leads = sheetToObjects(getSheet(LEADS_SHEET_NAME), LEADS_HEADERS);

  return consultants.map(function (c) {
    const leadCount = leads.filter(function (l) {
      return l.ConsultoraID === c.ID;
    }).length;
    return {
      id: c.ID,
      name: c.Nome,
      whatsapp: asText(c.WhatsApp),
      active: c.Ativa === true || String(c.Ativa).toUpperCase() === "TRUE",
      lastAssignedAt: c.UltimaAtribuicao || null,
      leadCount: leadCount,
      hasAccessCode: !!c.CodigoAcessoHash,
    };
  });
}

/**
 * Login da consultora no site: recebe o SHA-256 (hex) do código digitado e
 * compara com o hash guardado, em tempo constante. Só consultoras ativas
 * entram. Devolve {consultant: {id, name}} ou {consultant: null}.
 */
function consultantLogin(payload) {
  const given = String(payload.accessCodeHash || "").trim().toLowerCase();
  if (!given) return { consultant: null };
  const givenBytes = sha256Bytes(given);
  const consultants = sheetToObjects(getSheet(CONSULTANTS_SHEET_NAME), CONSULTANTS_HEADERS);
  let found = null;
  consultants.forEach(function (c) {
    const stored = String(c.CodigoAcessoHash || "").trim().toLowerCase();
    if (!stored) return;
    const isActive = c.Ativa === true || String(c.Ativa).toUpperCase() === "TRUE";
    if (constantTimeEqualBytes(givenBytes, sha256Bytes(stored)) && isActive) {
      found = { id: asText(c.ID), name: c.Nome };
    }
  });
  return { consultant: found };
}

function createConsultant(payload) {
  const sheet = getSheet(CONSULTANTS_SHEET_NAME);
  const id = Utilities.getUuid();
  sheet.appendRow(sanitizeRow([id, payload.name || "", payload.whatsapp || "", true, ""]));
  return { ok: true, id: id };
}

function updateConsultant(payload) {
  const sheet = getSheet(CONSULTANTS_SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(payload.id)) {
      const rowNum = i + 1;
      if (payload.name !== undefined) sheet.getRange(rowNum, 2).setValue(sanitizeForSheet(payload.name));
      if (payload.whatsapp !== undefined) sheet.getRange(rowNum, 3).setValue(sanitizeForSheet(payload.whatsapp));
      if (payload.active !== undefined) sheet.getRange(rowNum, 4).setValue(payload.active === true);
      if (payload.accessCodeHash !== undefined) {
        const col = CONSULTANTS_HEADERS.indexOf("CodigoAcessoHash") + 1;
        sheet.getRange(1, col).setValue("CodigoAcessoHash");
        sheet.getRange(rowNum, col).setValue(String(payload.accessCodeHash));
      }
      return { ok: true };
    }
  }
  throw new Error("Consultora não encontrada: " + payload.id);
}

// ---------------------------------------------------------------------------
// Leads (admin)
// ---------------------------------------------------------------------------

/**
 * Ids dos leads que clicaram (ou tiveram aberto automaticamente) o botão de
 * WhatsApp da tela de sucesso. É o único momento em que a consultora recebe
 * o contato: é o lead quem manda a mensagem. Conta lead único.
 */
function buildClickedLeadIds(eventRows) {
  const ids = {};
  (eventRows || readEventRows()).forEach(function (row) {
    // row = [DataHora, EventName, SessionID, LeadID]
    if (row[1] === "whatsapp_clicked" && row[3]) ids[String(row[3])] = true;
  });
  return ids;
}

/**
 * Lê só as 4 primeiras colunas da aba Eventos (DataHora, EventName,
 * SessionID, LeadID), que são as únicas que as métricas usam. A aba passa de
 * 24 mil linhas e as demais colunas (Metadata, UTMs, Fbclid...) são textos
 * longos: ler tudo e montar um objeto por linha levava mais de 30s.
 */
function readEventRows() {
  const sheet = getSheet(EVENTS_SHEET_NAME);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  return sheet.getRange(2, 1, lastRow - 1, 4).getValues().filter(function (row) {
    return row[0];
  });
}

function leadRowToObject(l, clickedLeadIds) {
  return {
    id: l.LeadID,
    createdAt: l.DataHora instanceof Date ? l.DataHora.toISOString() : String(l.DataHora),
    name: l.Nome,
    whatsapp: asText(l.WhatsApp),
    email: l.Email,
    businessName: l.NomeLoja,
    instagram: l.Instagram,
    address: l.Endereco,
    addressNumber: asText(l.NumeroEndereco),
    neighborhood: l.Bairro,
    zipCode: asText(l.Cep),
    addressComplement: l.ComplementoEndereco,
    cpfCnpj: asText(l.CpfCnpj),
    storeTypeLabel: l.TipoLoja,
    purchasePurposeLabel: l.Finalidade,
    segmentLabel: l.Segmento,
    salesChannelLabel: l.CanalVenda,
    investmentRangeLabel: l.FaixaInvestimento,
    purchaseFrequencyLabel: l.FrequenciaCompra,
    leadScore: l.LeadScore,
    classification: l.Classificacao,
    consultantId: l.ConsultoraID || null,
    consultantName: l.Consultora || null,
    consultantWhatsapp: l.WhatsAppConsultora ? asText(l.WhatsAppConsultora) : null,
    utmSource: l.UtmSource,
    utmMedium: l.UtmMedium,
    utmCampaign: l.UtmCampaign,
    utmContent: l.UtmContent,
    utmTerm: l.UtmTerm,
    fbclid: l.Fbclid,
    landingPage: l.LandingPage,
    status: l.Status,
    whatsappClicked: !!(clickedLeadIds && clickedLeadIds[String(l.LeadID)]),
  };
}

function listLeads(params) {
  let leads = sheetToObjects(getSheet(LEADS_SHEET_NAME), LEADS_HEADERS);

  if (params.consultantId) leads = leads.filter((l) => l.ConsultoraID === params.consultantId);
  if (params.classification) leads = leads.filter((l) => l.Classificacao === params.classification);
  if (params.investmentRange) leads = leads.filter((l) => l.FaixaInvestimento === params.investmentRange);
  if (params.status) leads = leads.filter((l) => l.Status === params.status);
  if (params.campaign) {
    const needle = String(params.campaign).toLowerCase();
    leads = leads.filter((l) => String(l.UtmCampaign || "").toLowerCase().indexOf(needle) !== -1);
  }

  leads.sort(function (a, b) {
    return new Date(b.DataHora).getTime() - new Date(a.DataHora).getTime();
  });

  const total = leads.length;
  const page = params.page ? parseInt(params.page, 10) : 1;
  const start = (page - 1) * PAGE_SIZE;
  const clicked = buildClickedLeadIds();
  const pageLeads = leads.slice(start, start + PAGE_SIZE).map(function (l) {
    return leadRowToObject(l, clicked);
  });

  return {
    leads: pageLeads,
    total: total,
    page: page,
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

function getLeadById(leadId) {
  const leads = sheetToObjects(getSheet(LEADS_SHEET_NAME), LEADS_HEADERS);
  const found = leads.find(function (l) {
    return l.LeadID === leadId;
  });
  return found ? leadRowToObject(found, buildClickedLeadIds()) : null;
}

function updateLeadStatus(payload) {
  const sheet = getSheet(LEADS_SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  const idIdx = LEADS_HEADERS.indexOf("LeadID");
  const statusIdx = LEADS_HEADERS.indexOf("Status");
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idIdx]) === String(payload.leadId)) {
      sheet.getRange(i + 1, statusIdx + 1).setValue(payload.status);
      return { ok: true };
    }
  }
  throw new Error("Lead não encontrado: " + payload.leadId);
}

// ---------------------------------------------------------------------------
// Métricas do dashboard
// ---------------------------------------------------------------------------

/** "2026-10" no fuso do script (o mesmo que define "hoje"), ou "" se a data for inválida. */
function monthKey(value) {
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return "";
  return Utilities.formatDate(d, Session.getScriptTimeZone(), "yyyy-MM");
}

/**
 * Métricas do dashboard.
 *
 * Tudo é calculado numa passada só (computeMetricsFull) e guardado em cache
 * por METRICS_CACHE_SECONDS, porque o cálculo lê as abas Leads e Eventos.
 * `months` traz a série mês a mês, com a divisão por consultora dentro de
 * cada mês: assim o painel troca de período sem fazer outra chamada.
 *
 * getMetrics() mantém o formato antigo: sem parâmetro devolve o total de
 * todos os meses; com `params.month` ("YYYY-MM") os números de classificação,
 * pedido mínimo, WhatsApp e consultoras são só daquele mês. `leadsToday`,
 * `leads7d` e `leadsMonth` são sempre "agora", independentes do filtro.
 * `params.refresh` ignora o cache.
 */
const METRICS_CACHE_KEY = "metrics_full_v2";
const METRICS_CACHE_SECONDS = 90;

function computeMetricsFull() {
  const allLeads = sheetToObjects(getSheet(LEADS_SHEET_NAME), LEADS_HEADERS);
  const eventRows = readEventRows();
  const consultantRows = sheetToObjects(getSheet(CONSULTANTS_SHEET_NAME), CONSULTANTS_HEADERS);
  const clickedLeadIds = buildClickedLeadIds(eventRows);

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const sevenDaysAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  let leadsToday = 0;
  let leads7d = 0;
  let leadsMonth = 0;

  // Série mês a mês: leads/classificação/WhatsApp pelo mês do cadastro, pedido
  // mínimo pelo mês do evento.
  const byMonth = {};
  function bucket(key) {
    if (!byMonth[key]) {
      byMonth[key] = {
        month: key, leads: 0, hot: 0, qualified: 0, beginner: 0,
        whatsappOpened: 0, minimumOrderAccepted: 0, minimumOrderRejected: 0,
        byConsultant: {},
      };
    }
    return byMonth[key];
  }

  allLeads.forEach(function (l) {
    const t = new Date(l.DataHora).getTime();
    if (t >= startOfDay) leadsToday++;
    if (t >= sevenDaysAgo) leads7d++;
    if (t >= startOfMonth) leadsMonth++;

    const key = monthKey(l.DataHora);
    if (!key) return;
    const b = bucket(key);
    const clicked = !!clickedLeadIds[String(l.LeadID)];
    b.leads++;
    if (l.Classificacao === "Lead Quente") b.hot++;
    if (l.Classificacao === "Lead Qualificado") b.qualified++;
    if (l.Classificacao === "Lead Iniciante") b.beginner++;
    if (clicked) b.whatsappOpened++;

    const consultantId = String(l.ConsultoraID || "");
    if (consultantId) {
      if (!b.byConsultant[consultantId]) b.byConsultant[consultantId] = { leadCount: 0, whatsappClicks: 0 };
      b.byConsultant[consultantId].leadCount++;
      if (clicked) b.byConsultant[consultantId].whatsappClicks++;
    }
  });

  eventRows.forEach(function (row) {
    const name = row[1];
    if (name !== "minimum_order_accepted" && name !== "minimum_order_disqualified") return;
    const key = monthKey(row[0]);
    if (!key) return;
    const b = bucket(key);
    if (name === "minimum_order_accepted") b.minimumOrderAccepted++;
    else b.minimumOrderRejected++;
  });

  return {
    generatedAt: now.toISOString(),
    leadsToday: leadsToday,
    leads7d: leads7d,
    leadsMonth: leadsMonth,
    consultants: consultantRows
      .filter(function (c) { return c.ID; })
      .map(function (c) {
        return {
          consultantId: asText(c.ID),
          consultantName: c.Nome,
          active: c.Ativa === true || String(c.Ativa).toUpperCase() === "TRUE",
        };
      }),
    months: Object.keys(byMonth).sort().reverse().map(function (key) {
      return byMonth[key];
    }),
  };
}

function getMetricsFull(refresh) {
  const cache = CacheService.getScriptCache();
  if (!refresh) {
    const hit = cache.get(METRICS_CACHE_KEY);
    if (hit) {
      try {
        return JSON.parse(hit);
      } catch (err) {
        // cache corrompido: recalcula
      }
    }
  }
  const full = computeMetricsFull();
  try {
    cache.put(METRICS_CACHE_KEY, JSON.stringify(full), METRICS_CACHE_SECONDS);
  } catch (err) {
    // passou do limite de tamanho do cache: segue sem cache
  }
  return full;
}

function getMetrics(params) {
  params = params || {};
  const month = /^\d{4}-\d{2}$/.test(String(params.month || "")) ? String(params.month) : null;
  const full = getMetricsFull(String(params.refresh || "") === "1");

  // Recorte do período selecionado (ou soma de todos os meses).
  const picked = month
    ? full.months.filter(function (m) { return m.month === month; })
    : full.months;
  function sum(field) {
    return picked.reduce(function (acc, m) { return acc + m[field]; }, 0);
  }
  function consultantTotal(consultantId, field) {
    return picked.reduce(function (acc, m) {
      const c = m.byConsultant[consultantId];
      return acc + (c ? c[field] : 0);
    }, 0);
  }

  const minimumOrderAccepted = sum("minimumOrderAccepted");
  const minimumOrderRejected = sum("minimumOrderRejected");
  const totalResponses = minimumOrderAccepted + minimumOrderRejected;

  return {
    period: month || "all",
    generatedAt: full.generatedAt,
    total: sum("leads"),
    leadsToday: full.leadsToday,
    leads7d: full.leads7d,
    leadsMonth: full.leadsMonth,
    hot: sum("hot"),
    qualified: sum("qualified"),
    beginner: sum("beginner"),
    minimumOrderAccepted: minimumOrderAccepted,
    minimumOrderRejected: minimumOrderRejected,
    minimumOrderAcceptanceRate: totalResponses > 0 ? Math.round((minimumOrderAccepted / totalResponses) * 100) : 0,
    whatsappClicked: sum("whatsappOpened"),
    months: full.months,
    leadsByConsultant: full.consultants.map(function (c) {
      return {
        consultantId: c.consultantId,
        consultantName: c.consultantName,
        active: c.active,
        leadCount: consultantTotal(c.consultantId, "leadCount"),
        whatsappClicks: consultantTotal(c.consultantId, "whatsappClicks"),
      };
    }),
  };
}