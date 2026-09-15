import "server-only";

/**
 * Compara dois segredos (senha, assinatura de sessão) sem vazar tempo de
 * execução proporcional a onde os textos divergem — um `===`/`!==` normal
 * sai mais rápido no primeiro caractere diferente, o que em teoria dá pra
 * medir e ir descobrindo o segredo aos poucos. Faz hash dos dois lados
 * primeiro (assim o tamanho da comparação final é sempre igual, 32 bytes)
 * e só então compara byte a byte sem interromper cedo.
 */
export async function constantTimeEqual(a: string, b: string): Promise<boolean> {
  const [hashA, hashB] = await Promise.all([sha256(a), sha256(b)]);
  if (hashA.length !== hashB.length) return false;
  let diff = 0;
  for (let i = 0; i < hashA.length; i++) diff |= hashA[i] ^ hashB[i];
  return diff === 0;
}

async function sha256(value: string): Promise<Uint8Array> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return new Uint8Array(digest);
}
