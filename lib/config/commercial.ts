/**
 * Configuração comercial central do funil B2B.
 *
 * O pedido mínimo de atacado é referenciado em vários pontos (landing, quiz,
 * validação de backend, textos de desqualificação). Este é o único lugar
 * onde o valor deve ser definido — nunca hardcode o valor em outro arquivo.
 */
export const commercialConfig = {
  /**
   * Valor mínimo de pedido, em reais, para um lead ser elegível ao atendimento B2B.
   * Campanha de fim de ano: R$ 800. Valor normal (antes e depois da campanha): R$ 1.200.
   */
  minimumOrder: 800,
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

/**
 * Textos da campanha de fim de ano (pedido mínimo reduzido por tempo limitado).
 * Ao encerrar a campanha: voltar `minimumOrder` para 1200 e trocar estes textos
 * por um aviso neutro (ou apagar as linhas que os usam).
 */
export const promoName = "condição especial de final de ano";
export const promoHeadline = `Aproveite nossa ${promoName}: pedido mínimo de ${minimumOrderLabel} por tempo limitado.`;
