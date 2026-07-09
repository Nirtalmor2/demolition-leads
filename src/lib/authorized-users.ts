export const ALLOWED_EMAILS: string[] = [
  "nirtalmor2@gmail.com",
];

export const ALLOWED_DOMAINS: string[] = [];

export function isAuthorized(email?: string | null): boolean {
  if (!email) return false;
  const e = email.toLowerCase().trim();
  if (ALLOWED_EMAILS.some((a) => a.toLowerCase().trim() === e)) return true;
  const domain = e.split("@")[1] ?? "";
  return ALLOWED_DOMAINS.some((d) => d.toLowerCase().trim() === domain);
}
