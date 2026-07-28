# Handoff — Coolify API 500

## Contexte

Coolify 4.1.2 auto-hébergé sur le LXC (192.168.1.161). L'API REST `/api/v1/deploy` retourne 500 avec le message `in_array(): Argument #2 ($haystack) must be of type array, null given`. Les déploiements automatiques (webhooks GitHub) et manuels (API) sont bloqués.

## Endpoints

| Service | URL | Status |
|---------|-----|--------|
| Dashboard | https://coolify.drixou.uk | OK |
| API health | https://coolify.drixou.uk/api/v1/health | 200 (interne) / 502 (externe via Traefik) |
| API deploy | `POST /api/v1/deploy?force=true&uuid=<uuid>` | 500 |
| Traefik | coolify-proxy | Running, ports 80/443 |

## Ce qui a été tenté

1. **Pull latest image** (`ghcr.io/coollabsio/coolify:latest`) — l'image v4.2+ nécessite Redis auth (`NOAUTH Authentication required`), pas compatible avec la config existante (pas de REDIS_PASSWORD dans l'env de Coolify, seulement dans `.env`)
2. **Rollback à 4.1.2** — fonctionne en interne (healthcheck 200 de l'intérieur du container) mais Traefik retourne 502 car le container a perdu ses labels Traefik lors du recreate manuel
3. **Ajout manuel des labels Traefik** — le container est joignable depuis Traefik (curl 200), mais le routeur Traefik ne semble pas actif (l'API `/api/http/routers` ne retourne rien)

## Problème probable

L'erreur PHP `in_array()` vient probablement d'une valeur null passée dans un paramètre de déploiement (UUID, tag, etc.). La cause racine est inconnue — soit un état corrompu dans la BDD Coolify, soit un bug de 4.1.2.

## Déploiements manuels effectués

Les 2 containers ont été rebuildés et restartés manuellement via SSH en contournant Coolify :

| App | Commande | Image actuelle |
|-----|----------|----------------|
| CMS | `docker build -f Dockerfile.cms ...` | `n92jeln2oa3p5i4erc2cuibi:22985e0...` |
| Frontend | `docker build -f Dockerfile.frontend ...` | `y120xmp5yr42bk1qffl5xvs1:e2b7b39` |

## Recommandations

1. **Upgrade Coolify** en réparant la config Redis : monter le `.env` dans le container (il contient `REDIS_PASSWORD`) et utiliser `docker compose -f docker-compose.prod.yml up -d` avec la dernière image
2. **Ou réparer 4.1.2** : dump de la BDD Coolify, reset des deployments stuck via `php artisan queue:clear`, ou réinstallation propre
3. **Contournement** : les déploiements peuvent être faits via SSH (les commandes sont dans `handoff-infra.md`)
