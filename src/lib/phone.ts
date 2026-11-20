// Normalise a phone number to E.164. Accepts +44..., 0044..., and 7-digit
// Gambian numbers (assumed +220). Returns null if it can't be a valid number.
export function normalizePhone(input: string | null | undefined): string | null {
  if (!input) return null;
  let s = input.replace(/[\s\-().]/g, "");
  if (s.startsWith("00")) s = `+${s.slice(2)}`;
  if (/^[2-9]\d{6}$/.test(s)) s = `+220${s}`;
  return /^\+[1-9]\d{6,14}$/.test(s) ? s : null;
}

export function maskPhone(phone: string) {
  return phone.length > 6 ? `${phone.slice(0, 4)} ••• ${phone.slice(-3)}` : phone;
}
