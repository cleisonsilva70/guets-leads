function onlyDigits(value: string): string {
  return String(value).replace(/\D/g, "");
}

export function isValidCep(value: string): boolean {
  return onlyDigits(value).length === 8;
}

export function formatCep(value: string): string {
  const digits = onlyDigits(value).slice(0, 8);
  return digits.replace(/(\d{5})(\d{1,3})$/, "$1-$2");
}
