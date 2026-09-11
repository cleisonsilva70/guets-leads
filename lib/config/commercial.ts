/**
 * Configuração comercial central do funil B2B.
 *
 * O pedido mínimo de atacado é referenciado em vários pontos (landing, quiz,
 * validação de backend, textos de desqualificação). Este é o único lugar
 * onde o valor deve ser definido — nunca hardcode R$ 1.200 em outro arquivo.
 */
export const commercialConfig = {
  /** Valor mínimo de pedido, em reais, para um lead ser elegível ao atendimento B2B. */
  minimumOrder: 1200,
  currency: "BRL",
} as const;

export function formatCurrencyBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: commercialConfig.currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export const minimumOrderLabel = formatCurrencyBRL(commercialConfig.minimumOrder);
