const MONTH_NAMES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

/** Aceita só "YYYY-MM" válido; qualquer outra coisa vira undefined (= total). */
export function parseMonthParam(value: string | undefined): string | undefined {
  if (!value || !/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) return undefined;
  return value;
}

/** "2026-10" -> "Outubro/2026" */
export function monthLabel(key: string): string {
  const [year, month] = key.split("-");
  const name = MONTH_NAMES[Number(month) - 1];
  return name ? `${name}/${year}` : key;
}
