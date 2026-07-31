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

export const LEGAL = {
  // ⚠️ TODO(driss) — Driss doit compléter ces valeurs avec les vraies informations
  // administratives avant la mise en ligne des pages légales. Ne JAMAIS inventer
  // un numéro RC/ICE ou une adresse — laisser le placeholder tel quel si l'info
  // n'est pas encore fournie, et l'afficher visuellement en évidence dans le code
  // (commentaire `// TODO(driss):`) pour qu'il ne parte pas en prod par erreur.
  raisonSociale: "TODO: Raison sociale exacte (ex. Etabib SARL)",
  formeJuridique: "TODO: ex. SARL, SARL AU, auto-entrepreneur...",
  capitalSocial: "TODO: montant en MAD, si applicable",
  rc: "TODO: numéro Registre de Commerce",
  ice: "TODO: Identifiant Commun de l'Entreprise",
  siegeSocial: "TODO: adresse complète du siège social",
  responsablePublication: "TODO: nom du responsable de publication",
  hebergeur: "Infrastructure hébergée au Maroc (conformité Loi 09-08)",
} as const;
