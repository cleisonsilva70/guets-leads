/**
 * Guets Leads — backend em Google Apps Script.
 *
 * Como usar:
 * 1. Crie uma planilha (ou use uma existente) com duas abas:
 *
 *    "Leads" — linha 1 com estes cabeçalhos, nesta ordem:
 *      LeadID | DataHora | Nome | WhatsApp | WhatsAppNormalizado | Email |
 *      NomeLoja | Instagram | Cidade | Estado | CpfCnpj | Finalidade |
 *      Segmento | CanalVenda | FaixaInvestimento | FrequenciaCompra |
 *      LeadScore | Classificacao | Consultora | WhatsAppConsultora |
 *      UtmSource | UtmMedium | UtmCampaign | UtmContent | UtmTerm | Fbclid |
 *      LandingPage | Status
 *
 *    "Consultoras" — linha 1 com estes cabeçalhos:
 *      Nome | WhatsApp | Ativa | UltimaAtribuicao
 *      (preencha uma linha por consultora; Ativa = TRUE ou FALSE;
 *      deixe UltimaAtribuicao em branco para consultoras novas)
 *
 * 2. Na planilha: Extensões → Apps Script. Apague o conteúdo do
 *    Code.gs padrão e cole o conteúdo deste arquivo.
 * 3. Implantar → Nova implantação → tipo "App da Web".
 *    - Executar como: "Eu" (sua conta)
 *    - Quem pode acessar: "Qualquer pessoa"
 * 4. Copie a URL gerada (termina em /exec) e configure no site como
 *    a variável de ambiente GOOGLE_SHEETS_WEBHOOK_URL.
 *
 * Round Robin: escolhe sempre a consultora ATIVA com a
 * UltimaAtribuicao mais antiga (ou nunca atribuída) — equivalente a um
 * round robin puro. LockService.getScriptLock() serializa chamadas
 * concorrentes, então dois cadastros ao mesmo tempo nunca escolhem a
 * mesma consultora.
 *
 * Duplicidade: antes de rodar o Round Robin, procura na aba "Leads"
 * por WhatsAppNormalizado já existente — se achar, devolve a MESMA
 * consultora já atribuída, sem girar a fila de novo.
 */

const LEADS_SHEET_NAME = "Leads";
const CONSULTANTS_SHEET_NAME = "Consultoras";

const LEADS_HEADERS = [
  "LeadID", "DataHora", "Nome", "WhatsApp", "WhatsAppNormalizado", "Email",
  "NomeLoja", "Instagram", "Cidade", "Estado", "CpfCnpj",
  "Finalidade", "Segmento", "CanalVenda", "FaixaInvestimento", "FrequenciaCompra",
  "LeadScore", "Classificacao", "Consultora", "WhatsAppConsultora",
  "UtmSource", "UtmMedium", "UtmCampaign", "UtmContent", "UtmTerm", "Fbclid",
  "LandingPage", "Status",
];

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const payload = JSON.parse(e.postData.contents);
    const result = submitLead(payload);
    return jsonResponse(result);
  } catch (err) {
    return jsonResponse({ error: String(err && err.message ? err.message : err) }, 500);
  } finally {
    lock.releaseLock();
  }
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

function findLeadByWhatsapp(sheet, whatsappNormalizado) {
  const data = sheet.getDataRange().getValues();
  const idx = LEADS_HEADERS.indexOf("WhatsAppNormalizado");
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idx]) === String(whatsappNormalizado)) {
      return data[i];
    }
  }
  return null;
}

/** Pega a consultora ATIVA cuja última atribuição é mais antiga (ou nula). */
function pickNextConsultant() {
  const sheet = getSheet(CONSULTANTS_SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  let bestRow = -1;
  let bestTime = Infinity;

  for (let i = 1; i < data.length; i++) {
    const nome = data[i][0];
    const ativa = data[i][2];
    const ultima = data[i][3];
    if (!nome) continue;
    const isActive = ativa === true || String(ativa).toUpperCase() === "TRUE";
    if (!isActive) continue;
    const t = ultima ? new Date(ultima).getTime() : 0;
    if (t < bestTime) {
      bestTime = t;
      bestRow = i;
    }
  }

  if (bestRow === -1) return null;

  const nome = data[bestRow][0];
  const whatsapp = data[bestRow][1];
  sheet.getRange(bestRow + 1, 4).setValue(new Date().toISOString());
  return { name: nome, whatsapp: whatsapp };
}

function submitLead(payload) {
  const leadsSheet = getSheet(LEADS_SHEET_NAME);
  const existing = findLeadByWhatsapp(leadsSheet, payload.whatsappNormalizado);

  if (existing) {
    const consultoraNome = existing[LEADS_HEADERS.indexOf("Consultora")];
    const consultoraWhats = existing[LEADS_HEADERS.indexOf("WhatsAppConsultora")];
    return {
      leadId: existing[LEADS_HEADERS.indexOf("LeadID")],
      isNew: false,
      consultant: consultoraNome ? { name: consultoraNome, whatsapp: consultoraWhats } : null,
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
      case "Cidade": return payload.city || "";
      case "Estado": return payload.state || "";
      case "CpfCnpj": return payload.cpfCnpj || "";
      case "Finalidade": return payload.purchasePurposeLabel || "";
      case "Segmento": return payload.segmentLabel || "";
      case "CanalVenda": return payload.salesChannelLabel || "";
      case "FaixaInvestimento": return payload.investmentRangeLabel || "";
      case "FrequenciaCompra": return payload.purchaseFrequencyLabel || "";
      case "LeadScore": return payload.leadScore || 0;
      case "Classificacao": return payload.leadClassification || "";
      case "Consultora": return consultant ? consultant.name : "";
      case "WhatsAppConsultora": return consultant ? consultant.whatsapp : "";
      case "UtmSource": return payload.utm_source || "";
      case "UtmMedium": return payload.utm_medium || "";
      case "UtmCampaign": return payload.utm_campaign || "";
      case "UtmContent": return payload.utm_content || "";
      case "UtmTerm": return payload.utm_term || "";
      case "Fbclid": return payload.fbclid || "";
      case "LandingPage": return payload.landing_page || "";
      case "Status": return consultant ? "new" : "awaiting_assignment";
      default: return "";
    }
  });

  leadsSheet.appendRow(row);

  return {
    leadId: leadId,
    isNew: true,
    consultant: consultant ? { name: consultant.name, whatsapp: consultant.whatsapp } : null,
  };
}
