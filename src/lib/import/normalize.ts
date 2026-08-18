export function normalizePhone(
  phone: string | null | undefined
): string | null {
  if (!phone) return null;

  const value = String(phone)
    .replace(/[^\d]/g, "")
    .trim();

  return value || null;
}

export function normalizeText(text: string) {
  return text
    .trim()
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک");
}