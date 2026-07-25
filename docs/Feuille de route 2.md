# Feuille de route — Espace praticien dr-tabibi

Mise à jour juillet 2026. Avant migration OVHcloud Rabat et acceptation des premiers clients.

---

## ✅ Fait et vérifié

- **Lot 0** — Fondations : liens relatifs cassés corrigés, sidebar praticien, blocage d'accès par tier, tier de Dr. Guinane corrigé (`clinique` → `dossier`)
- **Lot 1** — UX de secours (`error`/`not-found`/`loading`), `AddToQueueButton`, page `system-alerts`, `medicalSpecialty` dynamique, SEO/GEO dynamique (sitemap, robots, JSON-LD)
- **Lot 2** — Recherche/filtre patient (nom, CIN) sur la liste, grille Consultation + Ordonnance côte à côte, rattachement ordonnance → consultation
- **Lot 3** — Espace secrétaire : sections cliniques masquées (Consultation/Ordonnance/Documents), file d'attente et notes médicales restent accessibles

---

## 🟡 Prompté, en attente d'implémentation

- **Carnet vaccinal** : collections `VaccineSchedule` (référentiel PNI marocain, éditable, à valider par Dr. Guinane) + `Vaccinations`, alertes sur rappels manquants sur la fiche patient
- **Courbe de croissance** : poids/taille/périmètre crânien dans le temps (ajout de `recharts`)
- **Import/export patients CSV** : utile pour l'onboarding assisté d'une secrétaire avec une liste existante

---

## 🔵 Prochain chantier — Refonte du dashboard (redondance identifiée)

Problème trouvé : "Vue d'ensemble" et "File d'attente" pointent vers la même route, affichent exactement la même chose. À corriger avant d'aller plus loin.

- **File d'attente** devient sa propre page (`/dashboard/queue`) : la vraie liste interactive (déjà existante) avec les transitions de statut
- **Vue d'ensemble** redevient un vrai résumé, pas un doublon :
  - Recherche patient rapide (prévue dans la maquette initiale, jamais implémentée — à rattraper)
  - Stats du jour cliquables (renvoient vers la page correspondante)
  - Aperçu compact de la file (3-4 premiers + lien "voir tout")
  - Nouveau widget : rappels vaccinaux en retard cette semaine (tous patients confondus)
- **Nouvelle page "Activité"** (pas "Comptabilité" — évite la confusion avec la facturation, explicitement hors scope) :
  - Nouveaux patients enregistrés dans le temps (évolution du carnet de clientèle)
  - Consultations réalisées dans le temps (vraie mesure de l'activité — priorité business : jour/mois le plus chargé, tendance d'évolution)
  - Vue jour / semaine / mois, graphiques (réutilise `recharts`, déjà ajouté pour la courbe de croissance)

---

## Agenda Cal.com intégré (Option B validée)

Vue "Rendez-vous" dans la sidebar, lecture des réservations via l'API Cal.com v2 (`GET /v2/bookings`), rendue dans l'UI du projet — pas d'iframe (évite le problème de double authentification cross-domaine entre `drguinane.drixou.uk` et `calcom.drixou.uk`).

---

## Onboarding self-service

- Priorité `vitrine`/`rdv` d'abord (plus simple — pas de compte praticien, juste un tenant + configuration)
- `dossier`/`clinique` : démarrer assisté si le self-service s'avère trop complexe à sécuriser d'un coup, avec l'objectif de tout basculer en self-service ensuite

---

## Réactivité mobile — tranché : responsive + PWA maintenant, app native plus tard

Décision : oui pour tout l'espace praticien, avec l'ambition à terme d'une vraie app Android/iOS. Séquencement retenu, en 3 temps :

1. **Responsive web** — adapter sidebar/dashboard/formulaires pour mobile/tablette dans le navigateur. À faire en **dernier lot avant OVH**, une fois que tous les autres lots (hors "mis de côté") sont implémentés — une seule passe propre sur l'ensemble de l'espace praticien plutôt que de retoucher chaque lot au fur et à mesure.
2. **PWA (Progressive Web App)** — même app, installable sur l'écran d'accueil, icône, plein écran, notifications push web. Juste un `manifest.json` + service worker par-dessus le responsive, aucune nouvelle stack. Fait juste après le responsive.
3. **App native (Android/iOS)** — mis en pause pour l'instant. Pas le bon moment : aucun client réel en production, cœur fonctionnel pas fini, et ce serait une techno/pipeline différent du workflow actuel (Next.js/Payload + Kilo Code/DeepSeek). À reconsidérer une fois les fondations terminées et de vrais clients en usage — probablement pertinent un jour vu l'ambition SaaS, mais pas maintenant.

---

## Mis de côté (à ne pas oublier, non urgent)

- Facturation / encaissement, paiement carte bancaire
- Codage diagnostic CIM-10 (lié roadmap AMO/FSE)
- Champs cliniques enrichis (antécédents, signes vitaux détaillés, résultats d'examens structurés)
- Modèles de consultation/ordonnance réutilisables
- Base de médicaments avec autocomplete (aide à la saisie, **sans** validation de dose automatique — voir point suivant)
- Tier `clinique` réel : plusieurs médecins, files d'attente et agendas séparés par praticien
- Lien `Doctors` (fiche vitrine publique) ↔ `Users` (compte de connexion)
- Génération PDF ordonnance / certificat
- Portail patient (connexion parent, OTP)
- Lien fratrie (navigation rapide entre dossiers frères/sœurs)
- Formulaire de consultation personnalisable par spécialité (pertinent seulement si un 2e tenant non-pédiatrique arrive)
- Rappels SMS aux patients — **pas un chantier de code**, fonctionnalité native de Cal.com (Workflows), juste à activer côté config avec un fournisseur SMS
- Téléconsultation intégrée — **à ne pas construire sans confirmation explicite de Dr. Guinane** qu'elle en a un vrai usage

## ⚠️ Mis de côté, à traiter avec précaution particulière

- **Alertes de sécurité posologique** (validation automatique des doses selon le poids) : risque clinique réel (faux sentiment de sécurité si mal calibré). Ne pas construire sans cadrage clinique explicite avec Dr. Guinane, et sourcer les seuils depuis une référence pharmacologique validée, jamais générés par un agent de code.

---

## Infra / conformité (hors code applicatif, avant les vrais clients)

- Migration OVHcloud Rabat (ISO 27001 / HDS) — obligatoire loi 09-08
- Séparation `calcom-db` de l'instance Postgres partagée avec `cms-db`
- Évaluation sécurité pgAdmin avant données patient réelles
