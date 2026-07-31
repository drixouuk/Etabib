export const BRAND = {
  name: "Etabib",
  shortName: "Etabib",
  tagline: "Cabinet médical",
} as const;

export const SITE_DOMAIN = process.env.NEXT_PUBLIC_SITE_DOMAIN || "etabibi.ma";
export const SITE_URL = `https://${SITE_DOMAIN}`;
export const EMAIL_DOMAIN = process.env.EMAIL_FROM_DOMAIN || `mail.${SITE_DOMAIN}`;
export const SUPPORT_EMAIL =
  process.env.NEXT_PUBLIC_SUPPORT_EMAIL || `contact@${EMAIL_DOMAIN}`;
export const NOTIFICATIONS_EMAIL =
  process.env.NOTIFICATIONS_EMAIL || `rdv@${EMAIL_DOMAIN}`;
export const ADMIN_EMAIL =
  process.env.SUPERADMIN_EMAIL || `admin@${EMAIL_DOMAIN}`;
