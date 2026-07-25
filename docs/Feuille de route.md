Roadmap espace praticien · MD
# Feuille de route — Espace praticien dr-tabibi
 
Consolidée à l'issue de l'audit de code + discussion UX (juillet 2026), avant migration OVHcloud Rabat et acceptation des premiers clients.
 
---
 
## Lot 0 — Fondations (bloquant, à faire en premier)
 
Rien d'autre n'est vraiment utilisable tant que ce lot n'est pas fait — le dashboard actuel n'est navigable qu'en tapant les URL à la main.
 
- Tous les liens relatifs cassés → chemins absolus + `Link` locale-aware (`@/i18n/navigation`) :
  - `dashboard/page.tsx` : nav `./patients`, `./audit-logs`, `./system-alerts`
  - `patients/page.tsx` : `./new`, `./${p.id}`
- Nouvelle coquille sidebar (maquette validée) remplaçant le header/footer vitrine hérité de `[locale]/layout.tsx` sur toutes les routes `(dashboard)`
- Blocage d'accès réel par tier : `dossier`/`clinique` → accès à l'espace praticien ; `vitrine`/`rdv` → aucun accès (pas juste masqué visuellement)
- Correction du tier de Dr. Guinane dans `seed.ts` : `clinique` → `dossier` (définition corrigée : dossier = médecin solo + secrétaire, la norme au Maroc ; clinique = plusieurs médecins/agendas/files en parallèle)
## Lot 1 — UX de secours et petits fixes ✅ Fait
 
- `error.tsx` / `not-found.tsx` / `loading.tsx` au niveau `[locale]`
- `AddToQueueButton.tsx` : lien locale-aware
- Page `system-alerts` (superadmin uniquement)
- `medicalSpecialty` dynamique dans le JSON-LD
- SEO/GEO dynamique (`sitemap.ts`, `robots.ts`, canonical, JSON-LD `MedicalOrganization`)
Commits : `a8da5a1`, `acb8c3c`, `7a102f7`, `c88522f`, `c0175bc`
 
## Lot 2 — Recherche patient et vue consultation unifiée
 
- Recherche/filtre patient (nom, CIN) sur la liste
- Fusionner Consultation + Ordonnance dans une vue unique côte à côte (inspiré TabibDoc Pro), au lieu des boutons séparés actuels qui ouvrent des formulaires déconnectés
## Lot 3 — Espace secrétaire
 
Vue allégée : file d'attente + check-in patient + fiche patient basique. Masque les sections consultation/ordonnance/document (déjà bloquées côté CMS, mais visibles et trompeuses côté UI aujourd'hui).
 
## Lot 4 — Agenda Cal.com intégré
 
Vue "Rendez-vous" dans la sidebar, lecture des réservations via l'API Cal.com v2 (`GET /v2/bookings`), rendue dans l'UI du projet plutôt qu'embarquée en iframe.
 
## Lot 5 — Courbe de croissance
 
Visualisation poids/taille/périmètre crânien dans le temps sur la fiche patient, à partir des données déjà capturées par `Consultations`. Priorité pédiatrie.
 
## Lot 6 — Import/export patients CSV
 
Utile pour l'onboarding assisté d'une secrétaire qui a déjà une liste existante (Excel, papier).
 
## Lot 7 — Onboarding self-service
 
- Priorité : tier `vitrine`/`rdv` d'abord (plus simple — pas de compte praticien à créer, juste un tenant + configuration)
- Tier `dossier`/`clinique` : commencer assisté si le self-service s'avère trop complexe à sécuriser d'un coup, avec l'objectif de tout basculer en self-service ensuite
## Lot 8 — Mis de côté (à ne pas oublier, non urgent)
 
- Facturation / encaissement
- Codage diagnostic CIM-10 (lié roadmap AMO/FSE)
- Champs cliniques enrichis (antécédents, signes vitaux détaillés, résultats d'examens structurés)
- Modèles de consultation/ordonnance réutilisables
- Tier `clinique` réel : plusieurs médecins, files d'attente et agendas séparés par praticien (aujourd'hui `QueueItems` est mutualisé au niveau du cabinet, sans notion de praticien)
- Lien `Doctors` (fiche vitrine publique) ↔ `Users` (compte de connexion)
- Génération PDF ordonnance / certificat
- Portail patient (connexion parent, OTP)
---
 
## Infra / conformité (hors code applicatif, à faire avant les vrais clients)
 
- Migration OVHcloud Rabat (ISO 27001 / HDS) — obligatoire loi 09-08
- Séparation `calcom-db` de l'instance Postgres partagée avec `cms-db`
- Évaluation sécurité pgAdmin avant données patient réelles
