/**
 * Guets Leads — backend em Google Apps Script.
 *
 * Serve dois papéis:
 *   1. Recebe cadastros do site (ação "submit_lead") e roda o Round Robin.
 *   2. Serve o painel /admin do site (listar leads, métricas, gerenciar
 *      consultoras) — todas as outras ações abaixo.
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

const LEADS_HEADERS = [
  "LeadID", "DataHora", "Nome", "WhatsApp", "WhatsAppNormalizado", "Email",
  "NomeLoja", "Instagram", "Endereco", "NumeroEndereco", "Bairro", "Cep",
  "ComplementoEndereco", "CpfCnpj", "TipoLoja",
  "Finalidade", "Segmento", "CanalVenda", "FaixaInvestimento", "FrequenciaCompra",
  "LeadScore", "Classificacao", "ConsultoraID", "Consultora", "WhatsAppConsultora",
  "UtmSource", "UtmMedium", "UtmCampaign", "UtmContent", "UtmTerm", "Fbclid",
  "LandingPage", "Status",
];

const CONSULTANTS_HEADERS = ["ID", "Nome", "WhatsApp", "Ativa", "UltimaAtribuicao"];

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
    if (action === "metrics") return jsonResponse(getMetrics());
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
    };
  });
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
      return { ok: true };
    }
  }
  throw new Error("Consultora não encontrada: " + payload.id);
}

// ---------------------------------------------------------------------------
// Leads (admin)
// ---------------------------------------------------------------------------

function leadRowToObject(l) {
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
  const pageLeads = leads.slice(start, start + PAGE_SIZE).map(leadRowToObject);

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
  return found ? leadRowToObject(found) : null;
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

function getMetrics() {
  const leads = sheetToObjects(getSheet(LEADS_SHEET_NAME), LEADS_HEADERS);
  const events = sheetToObjects(getSheet(EVENTS_SHEET_NAME), EVENTS_HEADERS);
  const consultants = listConsultants();

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  function countSince(date) {
    return leads.filter(function (l) {
      return new Date(l.DataHora).getTime() >= date.getTime();
    }).length;
  }

  function countByClassification(label) {
    return leads.filter(function (l) {
      return l.Classificacao === label;
    }).length;
  }

  function countEvents(eventName) {
    return events.filter(function (ev) {
      return ev.EventName === eventName;
    }).length;
  }

  const minimumOrderAccepted = countEvents("minimum_order_accepted");
  const minimumOrderRejected = countEvents("minimum_order_disqualified");
  const totalResponses = minimumOrderAccepted + minimumOrderRejected;

  return {
    leadsToday: countSince(startOfDay),
    leads7d: countSince(sevenDaysAgo),
    leadsMonth: countSince(startOfMonth),
    hot: countByClassification("Lead Quente"),
    qualified: countByClassification("Lead Qualificado"),
    beginner: countByClassification("Lead Iniciante"),
    minimumOrderAccepted: minimumOrderAccepted,
    minimumOrderRejected: minimumOrderRejected,
    minimumOrderAcceptanceRate: totalResponses > 0 ? Math.round((minimumOrderAccepted / totalResponses) * 100) : 0,
    leadsByConsultant: consultants.map(function (c) {
      return {
        consultantId: c.id,
        consultantName: c.name,
        active: c.active,
        leadCount: c.leadCount,
      };
    }),
  };
}
