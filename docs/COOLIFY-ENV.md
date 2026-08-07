# Variables d'environnement — Coolify (CNSS)

## NEXT_PUBLIC_CNSS_PORTAL_URL (services : frontend — build-time)

URL du portail CNSS des professionnels de santé (FSE) utilisé par le
composant `CnssPortalEmbed` (dashboard → dossier patient → historique des
consultations → bouton « Portail CNSS (FSE) »).

- **Frontend (y120xmp5yr42bk1qffl5xvs1)** : `NEXT_PUBLIC_CNSS_PORTAL_URL`
  (build-time — un changement exige un **rebuild**, pas un simple restart)
- **CMS (n92jeln2oa3p5i4erc2cuibi)** : non utilisé (le check d'embeddabilité
  et le composant vivent dans le frontend). Variable optionnelle.

Défaut si absente : `https://portailps.cnss.ma/portailps/Authentification.xhtml`
(centralisé dans `apps/frontend/src/lib/brand.ts`).

Comportement : `/api/cnss-portal` lit les headers `X-Frame-Options` et
`Content-Security-Policy` (frame-ancestors) côté serveur (cache 1h) ; si le
portail bloque l'embedding, le bouton ouvre un nouvel onglet (comportement
attendu pour un portail gouvernemental — aucune donnée patient n'est jamais
transmise au portail).
