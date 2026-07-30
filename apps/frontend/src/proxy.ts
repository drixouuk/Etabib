import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";

const CMS_URL =
  process.env.NEXT_PUBLIC_CMS_URL || "https://cms.etabibi.ma";

const intlMiddleware = createMiddleware(routing);

// Cache LRU borné (200 entrées max, expiration 10 min) pour la résolution de tenant.
// Un Map simple sans limite serait vulnérable à un flood de hostnames arbitraires
// via les headers Host / X-Forwarded-Host (memory leak / DoS).
const TENANT_CACHE_MAX = 200;
const TENANT_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

type CacheEntry = {
  value: { id: string; slug: string; name: string } | null;
  timestamp: number;
};

const tenantCache = new Map<
  string,
  CacheEntry
>();

function tenantCacheGet(key: string): { id: string; slug: string; name: string } | null | undefined {
  const entry = tenantCache.get(key);
  if (!entry) return undefined;
  if (Date.now() - entry.timestamp > TENANT_CACHE_TTL) {
    tenantCache.delete(key);
    return undefined;
  }
  return entry.value;
}

function tenantCacheSet(key: string, value: { id: string; slug: string; name: string } | null): void {
  if (tenantCache.size >= TENANT_CACHE_MAX) {
    // Éviction LRU : supprime la clé la plus ancienne
    const oldest = tenantCache.keys().next().value;
    if (oldest !== undefined) tenantCache.delete(oldest);
  }
  tenantCache.set(key, { value, timestamp: Date.now() });
}

async function resolveTenant(
  hostname: string,
): Promise<{ id: string; slug: string; name: string } | null> {
    // Nettoie le port si présent
  const cleanHostname = hostname.split(":")[0];

  const cached = tenantCacheGet(cleanHostname);
  if (cached !== undefined) return cached;

  try {
    const url = `${CMS_URL}/api/resolve-tenant?domain=${encodeURIComponent(cleanHostname)}`;
    const res = await fetch(url, {
      headers: { "Content-Type": "application/json" },
      next: { revalidate: 300 },
    });
    if (!res.ok) {
      tenantCacheSet(cleanHostname, null);
      return null;
    }
    const json = await res.json();
    if (json?.tenant) {
      // Sécurise le typage en forçant en String pour les en-têtes HTTP
      const tenant = {
        id: String(json.tenant.id),
        slug: json.tenant.slug || String(json.tenant.id),
        name: json.tenant.name,
      };
      tenantCacheSet(cleanHostname, tenant);
      return tenant;
    }
    tenantCacheSet(cleanHostname, null);
    return null;
  } catch {
    tenantCacheSet(cleanHostname, null);
    return null;
  }
}

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Extraction du domaine compatible avec le Reverse Proxy Coolify/Traefik
  const hostname =
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    "";

  // 2. Résolution du cabinet (tenant)
  const tenant = await resolveTenant(hostname);

  // 3. Pour les routes API, on saute la redirection i18n (localePrefix) pour
  //    ne pas casser les appels fetch POST/PATCH vers /api/auth/login ou /api/cms-proxy.
  //    On injecte juste les headers tenant dans la requête.
  if (pathname.startsWith("/api")) {
    const requestHeaders = new Headers(request.headers)
    if (tenant) {
      requestHeaders.set("x-tenant-id", tenant.id);
      requestHeaders.set("x-tenant-slug", tenant.slug);
    } else {
      requestHeaders.set("x-tenant-id", "default");
      requestHeaders.set("x-tenant-slug", "default");
    }
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  const SITE_DOMAIN = process.env.NEXT_PUBLIC_SITE_DOMAIN || 'etabibi.ma'
  const isPlatformDomain = !tenant && (hostname === SITE_DOMAIN || hostname === `www.${SITE_DOMAIN}`)
  if (isPlatformDomain && pathname === '/' && !pathname.startsWith('/landing')) {
    const locale = request.nextUrl.locale || 'fr'
    return NextResponse.redirect(new URL(`/${locale}/landing`, request.url))
  }

  // 5. Injection dans la REQUÊTE (indispensable pour headers() dans les Server Components)
  request.headers.set("x-pathname", pathname);
  if (tenant) {
    request.headers.set("x-tenant-id", tenant.id);
    request.headers.set("x-tenant-slug", tenant.slug);
  } else {
    request.headers.set("x-tenant-id", "default");
    request.headers.set("x-tenant-slug", "default");
  }

  // 5. Exécution du middleware next-intl avec la requête enrichie
  const response = intlMiddleware(request);

  // 6. Injection dans la RÉPONSE (sans cloner, pour préserver la logique interne de next-intl)
  response.headers.set("x-pathname", pathname);
  if (tenant) {
    response.headers.set("x-tenant-id", tenant.id);
    response.headers.set("x-tenant-slug", tenant.slug);
  } else {
    response.headers.set("x-tenant-id", "default");
    response.headers.set("x-tenant-slug", "default");
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next|_vercel|.*\\..*).*)"],
};
