# Export des données dans Paramètres

## Contexte

Les boutons import/export CSV ont été retirés de la vue patients. L'export doit
être déplacé dans la page Paramètres avec une couverture complète : patients,
consultations, ordonnances.

## Proposition UX

Nouvel onglet "Export des données" dans `/dashboard/settings` avec :

| Option | Format | Contenu |
|---|---|---|
| Patients | CSV | Nom, genre, date naissance, CIN, téléphone, email, adresse |
| Consultations | CSV | Date, motif, examen clinique, poids, taille, PC, diagnostic, code acte |
| Ordonnances | CSV | Date, médicaments (nom, DCI, posologie, durée), notes |
| Export complet | ZIP | Tous les CSV + documents médicaux |

## Implémentation

### Nouvelles routes API

- `POST /api/patients/export-full` — génère un ZIP côté serveur (utiliser `archiver`)
- `POST /api/patients/export-consultations` — CSV des consultations filtré par tenant
- `POST /api/patients/export-prescriptions` — CSV des ordonnances filtré par tenant

### Composant frontend

`DataExportTab.tsx` dans le dossier settings :
- Liste des exports avec bouton "Télécharger" par type
- Bouton "Tout exporter (ZIP)" pour l'export complet
- Indicateur de progression pour les exports longs

### Notes techniques

- Authentification : utiliser le token Payload (réutiliser le CMS proxy)
- Filtre tenant : les données sont automatiquement limitées au tenant connecté
- Volume : utiliser des streams pour les gros volumes (limite 10 000 docs)
