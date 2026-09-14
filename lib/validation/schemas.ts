import { z } from "zod";
import { isValidCpfOrCnpj } from "./cpf-cnpj";
import { isValidBrazilianWhatsapp } from "./whatsapp";
import { isValidCep } from "./cep";

export const purchasePurposeSchema = z.enum([
  "reseller_physical_store",
  "reseller_online",
  "reseller_in_person",
  "starting_now",
  "personal_use",
]);

export const segmentSchema = z.enum(["fitness", "feminina", "other", "not_selling_yet"]);

export const salesChannelSchema = z.enum([
  "physical_store",
  "instagram",
  "whatsapp",
  "own_site",
  "marketplace",
  "multiple",
]);

export const investmentRangeSchema = z.enum([
  "r1200_2000",
  "r2001_3000",
  "r3001_5000",
  "r5001_10000",
  "above_10000",
]);

export const purchaseFrequencySchema = z.enum([
  "weekly",
  "biweekly",
  "monthly",
  "as_needed",
  "first_purchase",
]);

/** "Qual o tipo da sua loja?" no cadastro final — campo próprio do formulário que já alimenta o Bling, independente das perguntas de qualificação do quiz. */
export const storeTypeSchema = z.enum(["physical_store", "virtual_store", "starting_now"]);

/** Respostas de qualificação necessárias para um lead ser elegível ao B2B. */
export const qualificationSchema = z.object({
  purchasePurpose: purchasePurposeSchema,
  acceptsMinimumOrder: z.literal(true),
  segment: segmentSchema,
  salesChannel: salesChannelSchema,
  investmentRange: investmentRangeSchema,
  purchaseFrequency: purchaseFrequencySchema,
});

export const utmSchema = z.object({
  utm_source: z.string().nullable().optional(),
  utm_medium: z.string().nullable().optional(),
  utm_campaign: z.string().nullable().optional(),
  utm_content: z.string().nullable().optional(),
  utm_term: z.string().nullable().optional(),
  fbclid: z.string().nullable().optional(),
  landing_page: z.string().nullable().optional(),
});

export const registrationSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome completo"),
  whatsapp: z.string().refine(isValidBrazilianWhatsapp, "WhatsApp inválido"),
  businessName: z.string().trim().min(2, "Informe o nome da loja/negócio"),
  instagram: z.string().trim().min(1, "Informe o Instagram da loja"),
  address: z.string().trim().min(2, "Informe o endereço"),
  addressNumber: z.string().trim().min(1, "Informe o número"),
  neighborhood: z.string().trim().min(2, "Informe o bairro"),
  zipCode: z.string().refine(isValidCep, "CEP inválido"),
  addressComplement: z.string().trim().optional(),
  cpfCnpj: z.string().refine(isValidCpfOrCnpj, "CPF/CNPJ inválido"),
  email: z.string().trim().email("E-mail inválido"),
  storeType: z.array(storeTypeSchema).min(1, "Selecione ao menos uma opção"),
  consent: z.literal(true, {
    message: "É necessário aceitar os termos para continuar",
  }),
});

/** Payload completo enviado para POST /api/leads. */
export const createLeadRequestSchema = qualificationSchema
  .merge(registrationSchema)
  .merge(utmSchema)
  .extend({
    sessionId: z.string().min(1),
  });

export type CreateLeadRequest = z.infer<typeof createLeadRequestSchema>;
