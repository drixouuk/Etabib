# Prompt Kilo Code — Refonte du tier "Dossier" en "Cabinet" avec pricing par médecin

## Contexte
dr-tabibi passe de 4 tiers (vitrine / rdv / dossier / clinique) à 3 tiers (vitrine / rdv / cabinet).
Le tier `clinique` est supprimé : `cabinet` devient un seul tier technique qui scale par nombre de médecins,
au lieu de deux offres séparées avec des features différentes.

## Objectif business (ne pas coder de logique différente, juste renommer + scaler le prix)
- **Vitrine** : gratuit, inchangé
- **RDV** : 199 MAD/mois, inchangé
- **Cabinet** (remplace `dossier` et `clinique`) : 499 MAD/mois pour 1 médecin, + 199 MAD/mois par médecin supplémentaire
- Comptes secrétaire : nominatifs (login séparé par personne), inclus sans surcoût, pas de plafond dur imposé dans le code (mais prévoir un champ de config, cf. ci-dessous)

## Périmètre technique à modifier

### 1. Renommage du tier dans le schéma (Payload)
- Chercher toutes les occurrences du literal `'dossier'` et `'clinique'` dans `apps/cms/src/collections/` (probablement un champ `select` ou `enum` sur la collection `Tenants` ou équivalent gérant le tier)
- Remplacer par un seul tier `'cabinet'`
- **IMPORTANT** : ceci change le schéma → nécessite une vraie migration Payload (`npx payload migrate:create`), pas un simple renommage à la volée. Voir la procédure de migration documentée dans `.kilocode/rules.md` : créer la migration, réviser le SQL généré, appliquer, committer immédiatement le `.ts` + le snapshot `.json`.
- Prévoir une migration de données pour les tenants existants : tout tenant actuellement en `dossier` OU `clinique` doit devenir `cabinet` avec le bon nombre de médecins déjà renseigné si le champ existe, sinon défaut à 1.

### 2. Nouveau champ : nombre de médecins facturables
- Ajouter un champ numérique sur la collection Tenant (ou équivalent), ex: `doctorCount` (integer, min: 1, default: 1)
- Ce champ pilote le calcul de prix, PAS la logique d'accès aux fonctionnalités (les features du tier Cabinet restent identiques peu importe le nombre de médecins — dossier patient, file d'attente, consultation+ordonnance, carnet vaccinal, courbes de croissance)
- Le contrôle d'accès (tier-based access control de Lot 0) ne change PAS de logique : `cabinet` a accès à tout ce que `dossier` avait avant

### 3. Calcul du prix (backend + affichage)
- Créer une fonction utilitaire pure, ex. `calculateCabinetPrice(doctorCount: number): number`
  → `499 + Math.max(0, doctorCount - 1) * 199`
- Cette fonction doit être utilisée à la fois côté CMS (si affichage admin du prix du tenant) et côté frontend (page pricing publique)
- Ne PAS hardcoder ce calcul à plusieurs endroits — un seul point de vérité, importé partout où nécessaire

### 4. Comptes secrétaire nominatifs
- Vérifier la collection Users / Secretaries actuelle : s'assurer qu'elle permet déjà plusieurs comptes secrétaire liés à un même tenant (relation many-to-one tenant→secretaries), avec un login/mot de passe distinct par secrétaire
- Si ce n'est pas déjà le cas (à vérifier avant de coder quoi que ce soit), il faut faire évoluer le modèle : chaque secrétaire = un compte Users séparé avec son propre rôle `secretary`, rattaché au même `tenant`
- Ne PAS ajouter de plafond dur bloquant dans le code métier ; prévoir simplement un champ de config optionnel `maxSecretaryAccounts` (default: null = illimité) sur le tenant, non-imposé pour l'instant, juste pour permettre une limite future sans re-développement
- Vérifier que l'audit log existant (ou à défaut noter comme dette technique si absent — cf. gap identifié) trace bien l'identité de CHAQUE secrétaire individuellement, pas un compte partagé

### 5. Page pricing publique (frontend)
- Fusionner visuellement les cartes "Dossier" et "Clinique" en une seule carte "Cabinet"
- Prix affiché : "à partir de 499 MAD/mois" avec sous-texte "+199 MAD/mois par médecin supplémentaire"
- Si un sélecteur interactif du nombre de médecins est souhaité sur la carte (recalcul du prix en direct), l'implémenter en composant client-side isolé, sans appel serveur nécessaire (calcul pur, low-risk)
- Mettre à jour les JSON-LD MedicalOrganization / metadata SEO si le nom du tier ou le prix y est référencé (cf. Lot 1 - SEO/GEO dynamic metadata)
- Vérifier les 4 locales (fr/en/ar/tzm) pour les libellés du tier renommé

### 6. Points de vigilance transverses
- Chercher toute référence textuelle codée en dur à "clinique" ou "dossier" dans les emails transactionnels, la doc utilisateur embarquée dans l'app, les tooltips
- Vérifier `roadmap-espace-praticien.md` et les composants du dashboard praticien qui pourraient afficher le nom du tier actuel du tenant
- Ne PAS toucher au contrôle d'accès basé sur les rôles (docteur/secrétaire) — seul le nom du tier et le calcul du prix changent

## Ce qui ne doit PAS changer
- Aucune nouvelle fonctionnalité clinique n'est demandée dans ce lot (pas de dictée IA, pas d'audit log, pas de dashboard analytics — ce sont des lots séparés à venir)
- Le tier RDV (199 MAD) et Vitrine (gratuit) restent identiques

## Livrables attendus
1. Migration Payload committée (fichier `.ts` + snapshot `.json`)
2. Fonction `calculateCabinetPrice` centralisée + tests unitaires basiques (1 médecin = 499, 3 médecins = 897, etc.)
3. Page pricing frontend mise à jour dans les 4 locales
4. Résumé de commit précisant : tenants migrés, fichiers modifiés, tout renommage `clinique`/`dossier` restant non traité si trouvé ailleurs (pour vérification manuelle)
