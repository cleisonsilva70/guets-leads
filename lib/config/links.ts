/**
 * Destinos configuráveis para os fluxos de desqualificação (uso próprio /
 * não atingiu o pedido mínimo). Trocar via variáveis de ambiente sem
 * precisar mexer em código — ver .env.example.
 */
export const linksConfig = {
  instagramUrl: process.env.NEXT_PUBLIC_INSTAGRAM_URL || "https://instagram.com/guets",
  b2cCatalogUrl: process.env.NEXT_PUBLIC_B2C_CATALOG_URL || "",
} as const;
