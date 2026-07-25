# Handoff Infra — dr-pediatre (23 juillet 2026)

## État actuel

**Branch** : `main` — dernier commit `aa1df30` (Seed demo: Dr. Demo)
**Frontend** : Déployé sur Coolify (image `y120xmp5yr42bk1qffl5xvs1:aa1df30`)
**CMS** : Déployé sur Coolify (image `n92jeln2oa3p5i4erc2cuibi:aa1df30`)

## Infra

| Service         | URL                                        | Notes          |
| --------------- | ------------------------------------------ | -------------- |
| Frontend public | https://drguinane.drixou.uk                | Next.js 16     |
| CMS admin       | https://cms.drixou.uk/admin                | Payload CMS v3 |
| Cal.com         | https://calcom.drixou.uk                   | Auto-hébergé   |
| Coolify         | https://coolify.drixou.uk                  | v4.1.2         |
| LXC             | 192.168.1.161 (SSH: root@ via id_edd25519) | 50G disk       |

**Containers Docker** (sur LXC) : 2 apps (CMS + frontend), Postgres, Cal.com, Redis, Traefik, Garage (S3), Coolify (+ DB + Redis + Sentinel).

## Accès

- **Dr. Guinane** : `drguinane@gmail.com` / `agadir123` (tenant: Cabinet Pédiatrique Dr. Guinane Aïcha)
- **Dr. Demo** : `drdemo@gmail.com` / `demo1234` (tenant: Cabinet Dr. Demo, 25 patients seedés)
- **Superadmin** : `admin@dr-tabibi.ma` (mot de passe via SEED_SUPERADMIN_PASSWORD)

## Builds

Le dernier build (`aa1df30`) compile et s'exécute correctement. Seed demo exécuté avec succès (25 patients, 69 consultations, 349 vaccinations, etc.).

## Problèmes récurrents

1. **Disque LXC plein** — nécessite `docker system prune -af` régulièrement (remonté à 97% plusieurs fois, 30-38% après prune)
2. **Deploiements CMS longs** (~5-10 min) et parfois échouent par manque d'espace disque pendant `npm i`
3. **NaN tenant_id** — corrigé dans le dernier commit mais le CMS doit être redéployé pour prise d'effet complète (déploiement 180 en cours au moment du handoff)

## API Coolify

- Token API : `5ZjUwG2ibjjwPoy9aSeGupQG7qU997ZI8Hp4zFYXed5dae34`
- Endpoint : `https://coolify.drixou.uk/api/v1/deploy?force=true&uuid=<uuid>`
- UUID frontend : `y120xmp5yr42bk1qffl5xvs1`
- UUID CMS : `n92jeln2oa3p5i4erc2cuibi`

## Commandes utiles

```bash
# Déployer frontend
curl -X POST "https://coolify.drixou.uk/api/v1/deploy?force=true&uuid=y120xmp5yr42bk1qffl5xvs1" -H "Authorization: Bearer <token>"

# Déployer CMS
curl -X POST "https://coolify.drixou.uk/api/v1/deploy?force=true&uuid=n92jeln2oa3p5i4erc2cuibi" -H "Authorization: Bearer <token>"

# Lancer les migrations Payload
docker exec <cms_container> sh -c 'npx payload migrate'

# Nettoyer disque Docker
docker system prune -af

# Seed demo
docker exec <cms_container> sh -c 'npx tsx src/seed-demo-runner.ts'

# Voir les logs CMS
docker logs $(docker ps --filter name=n92jeln --format '{{.ID}}' | head -1)

# Voir les logs frontend
docker logs $(docker ps --filter name=y120xmp5 --format '{{.ID}}' | head -1)
```

## DB

- Postgres : `postgres://postgres:<password>@f13slj6e869gsmg044jju73h:5432/cms-db`
- Mot de passe visible dans l'env du container CMS (`docker exec <cms> env | grep DATABASE_URI`)

## Suggested skills

- **frontend-design** — si le prochain chantier touche à l'UI
- **webapp-testing** — pour tester les formulaires, uploads, rendu
