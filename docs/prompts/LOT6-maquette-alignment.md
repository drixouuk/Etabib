# Issue — Rebuild complet : alignement exact maquette HTML

## Méthode

Ce prompt fournit le **code JSX cible** pour chaque composant, traduit directement depuis `docs/dr-tabibi-refonte-2026.html`. Le prototype est la source unique de vérité. Chaque `className` ci-dessous est copié depuis le prototype et mappé sur nos tokens Design System.

**Consignes à Flash** : remplacer le contenu de chaque fichier ci-dessous par le code JSX fourni. Ne pas interpréter, ne pas adapter — copier exactement.

---

## Nouveaux tokens CSS à ajouter

**Fichier** : `apps/frontend/src/app/globals.css`

Ajouter dans le bloc `@theme` (après `--width-container`) :

```css
--color-page-bg: #EFEDE3;
--color-sidebar-bg: #FFFDF8;
--color-ink: #2A241C;
--color-ink-soft: #8A8175;
--color-ink-softer: #B9B2A4;
--color-border-teal: rgba(13,148,136,0.16);
--color-stat-teal: var(--color-teal-500);
--color-stat-amber: var(--color-amber-500);
--color-stat-orange: var(--color-orange-500);
--color-stat-tealdark: var(--color-teal-700);
```

Ajouter dans `@theme inline` :

```css
--color-page-bg: var(--color-page-bg);
--color-sidebar-bg: var(--color-sidebar-bg);
```

---

## 1. DashboardShell — fond de page

**Fichier** : `apps/frontend/src/components/dashboard/DashboardShell.tsx`

Remplacer le `<div className="flex min-h-screen">` racine par :
```tsx
<div className="flex min-h-screen bg-page-bg">
```

## 2. Sidebar — fond + bordure

**Fichier** : `apps/frontend/src/components/dashboard/DashboardShell.tsx`

Dans le `<aside>` desktop :
```tsx
<aside className="hidden md:flex w-[252px] shrink-0 flex-col border-r border-teal/15 bg-sidebar-bg">
```

Dans le `<aside>` mobile (drawer) :
```tsx
<aside className="absolute inset-y-0 left-0 flex w-64 flex-col border-r border-teal/15 bg-sidebar-bg shadow-xl">
```

## 3. Sidebar — refonte contenu

**Fichier** : `apps/frontend/src/components/dashboard/Sidebar.tsx`

Remplacer TOUT le contenu du `return` par :

```tsx
return (
  <div className="flex flex-col h-full px-[14px] py-[22px]">
    {/* Brand */}
    <div className="flex items-center gap-[10px] px-[10px] pb-[22px]">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-[11px] bg-primary-600">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 12h4l2 6 4-12 2 6h4"/>
        </svg>
      </div>
      <div>
        <p className="text-sm font-bold leading-tight text-ink">{tenant?.name || 'Cabinet'}</p>
        <p className="text-[11.5px] text-ink-soft">{tierLabels[tenant?.settings?.activeTier || ''] || ''}</p>
      </div>
    </div>

    <SidebarNav items={navItems} adminItems={adminItems} onNavigate={onNavigate} />

    {/* Footer utilisateur */}
    <div className="border-t border-teal/15 px-[10px] pt-4 mt-auto">
      <div className="flex items-center gap-[10px]">
        <div className="flex size-[38px] shrink-0 items-center justify-center rounded-full bg-primary-600 text-[13.5px] font-bold text-white">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-ink">{user.name || user.email}</p>
          <p className="text-[11px] text-ink-soft">{roleLabel}</p>
          {user.roles?.includes('substitute') && user.accessExpiresAt && (
            <p className="mt-0.5 text-[11px] font-medium text-warning">
              Expire le {new Date(user.accessExpiresAt).toLocaleDateString('fr-FR')}
            </p>
          )}
        </div>
      </div>
      <form action="/api/auth/logout" method="POST" className="mt-3">
        <button type="submit" className="flex w-full items-center gap-2 rounded-[10px] px-3 py-2 text-[13px] font-medium text-ink-soft transition-colors duration-200 hover:text-red-600">
          <LogOut className="size-4" />Déconnexion
        </button>
      </form>
    </div>
  </div>
)
```

## 4. SidebarNav — pill glissant + couleurs maquette

**Fichier** : `apps/frontend/src/components/dashboard/SidebarNav.tsx`

Remplacer TOUT le contenu du `return` par :

```tsx
return (
  <nav className="relative flex flex-1 flex-col gap-0.5 pt-1">
    {/* Pill glissant — calculer l'index actif */}
    <div
      className="absolute left-0 right-0 h-10 rounded-[10px] bg-primary-50 transition-all duration-300 ease-out z-0"
      style={{
        transform: `translateY(${activeIndex >= 0 && activeIndex < items.length ? activeIndex * 42 : 0}px)`,
        opacity: activeIndex >= 0 ? 1 : 0,
      }}
    />
    {items.map((item) => {
      const active = isActive(item.href, pathname)
      return (
        <Link
          key={item.label}
          href={item.href}
          onClick={onNavigate}
          className={`relative z-10 flex items-center gap-[11px] rounded-[10px] px-3 py-[10px] text-[13.5px] font-medium transition-colors duration-200 ${
            item.disabled
              ? 'pointer-events-none text-ink-softer'
              : active
                ? 'text-primary-700 font-semibold'
                : 'text-ink-soft hover:text-ink'
          }`}
          aria-disabled={item.disabled}
          tabIndex={item.disabled ? -1 : undefined}
        >
          {item.icon}
          <span className="whitespace-nowrap">{item.label}</span>
        </Link>
      )
    })}
    {adminItems.length > 0 && (
      <>
        <div className="my-2 border-t border-teal/15" />
        {adminItems.map((item) => {
          const active = isActive(item.href, pathname)
          return (
            <Link
              key={item.label}
              href={item.href}
              onClick={onNavigate}
              className={`relative z-10 flex items-center gap-[11px] rounded-[10px] px-3 py-[10px] text-[13.5px] font-medium transition-colors duration-200 ${
                active ? 'text-primary-700 font-semibold' : 'text-ink-soft hover:text-ink'
              }`}
            >
              {item.icon}
              <span className="whitespace-nowrap">{item.label}</span>
            </Link>
          )
        })}
      </>
    )}
  </nav>
)
```

Ajouter en haut du composant :
```tsx
const activeIndex = [...items, ...adminItems].findIndex((item) => isActive(item.href, pathname))
```

## 5. LiveStatsWidget — cartes avec bordure supérieure colorée + pulse dot

**Fichier** : `apps/frontend/src/components/dashboard/LiveStatsWidget.tsx`

Remplacer les définitions `cards` et la fonction `inner` par :

```tsx
const cards = [
  { label: 'Programmés', count: scheduled?.totalDocs ?? 0, icon: <Calendar className="size-4" />,
    topColor: 'border-t-[3px] border-t-primary-500 rounded-t-[4px]', iconBg: 'bg-primary-50 text-primary-600' },
  { label: 'Salle d\'attente', count: waiting?.totalDocs ?? 0, icon: <Users className="size-4" />,
    topColor: 'border-t-[3px] border-t-secondary-500 rounded-t-[4px]', iconBg: 'bg-amber-50 text-amber-700' },
  { label: 'En consultation', count: inConsultation?.totalDocs ?? 0, icon: <ClockArrowDown className="size-4" />,
    topColor: 'border-t-[3px] border-t-cta-500 rounded-t-[4px]', iconBg: 'bg-orange-50 text-orange-700', pulse: true },
  { label: 'Terminés aujourd\'hui', count: completed?.totalDocs ?? 0, icon: <CheckCheck className="size-4" />,
    topColor: 'border-t-[3px] border-t-primary-700 rounded-t-[4px]', iconBg: 'bg-primary-50 text-primary-700' },
]

const inner = (card: typeof cards[0]) => (
  <div className={`rounded-xl border border-stone-200 ${card.topColor} bg-white p-4 shadow-sm transition-shadow duration-200 hover:shadow-md hover:-translate-y-1 ${clickable ? 'cursor-pointer' : ''}`}>
    <div className="mb-3 flex items-center justify-between">
      <span className="text-[12.5px] text-ink-soft">{card.label}</span>
      <span className={`relative flex size-[33px] items-center justify-center rounded-lg ${card.iconBg}`}>
        {card.pulse && (
          <>
            <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-cta-500" />
            <span className="absolute -top-0.5 -right-0.5 size-2 animate-ping rounded-full bg-cta-500" />
          </>
        )}
        {card.icon}
      </span>
    </div>
    <p className="font-heading text-[28px] font-bold text-ink">{card.count}</p>
  </div>
)
```

Remplacer la grille par (retirer les classes link wrapper si clickable) :
```tsx
<div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
  {cards.map((card) => clickable ? (
    <Link key={card.label} href="/dashboard/queue">{inner(card)}</Link>
  ) : inner(card))}
</div>
```

## 6. Dashboard — Vue d'ensemble

**Fichier** : `apps/frontend/src/app/[locale]/(dashboard)/dashboard/page.tsx`

Remplacer TOUT le JSX par :

```tsx
return (
  <div className="p-9">
    {/* Topbar */}
    <div className="mb-6 flex flex-wrap items-start justify-between gap-5">
      <div>
        <h1 className="text-[27px] font-bold tracking-tight text-ink">
          Bonjour{user.name ? `, Dr. ${user.name.replace(/^Dr\.?\s*/i, '')}` : ''} 👋
        </h1>
        <p className="mt-1 text-[13.5px] text-ink-soft">
          {new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>
      <PatientSearchBar />
    </div>

    {/* Stats */}
    <div className="mb-5">
      <LiveStatsWidget clickable />
    </div>

    {/* 2 colonnes : file d'attente + rappels */}
    <div className="grid gap-4" style={{ gridTemplateColumns: '1.1fr 1fr' }}>
      <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <h3 className="mb-3 font-heading text-[14.5px] font-semibold text-ink">File d&apos;attente</h3>
        <QueuePreview />
      </div>
      <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <h3 className="mb-3 font-heading text-[14.5px] font-semibold text-ink">Rappels vaccinaux</h3>
        {isPediatrie ? <VaccinationAlerts /> : (
          <div className="flex items-center gap-2.5 rounded-[10px] bg-primary-50 px-3.5 py-3 text-[13px] text-primary-700">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="9"/><polyline points="8 12 11 15 16 9"/></svg>
            Tous les patients sont à jour
          </div>
        )}
      </div>
    </div>
  </div>
)
```

Supprimer l'import `VaccinationAlerts` et le wrapper `isPediatrie ? lg:grid-cols-2 : ''`. Le layout est maintenant en `1.1fr 1fr` fixe sur desktop, stack sur mobile.

## 7. QueuePreview — badges horaires

**Fichier** : `apps/frontend/src/components/dashboard/QueuePreview.tsx`

Dans chaque item, remplacer l'affichage de l'heure par un badge amber :

```tsx
{item.arrivalTime && (
  <span className="ml-auto shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[11.5px] font-semibold text-amber-700">
    {new Date(item.arrivalTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
  </span>
)}
```

Et utiliser `PatientAvatar` pour l'avatar au lieu des cercles pink/sky bruts.

## 8. ActivityView — reconstruction complète

**Fichier** : `apps/frontend/src/components/dashboard/ActivityView.tsx`

Ce composant est trop long pour être listé en entier ici. **Remplacer intégralement** par la traduction JSX du prototype lignes 642-762.

Structure cible (ordre exact) :

```
<div>
  {/* Topbar : titre + période */}
  <div className="flex flex-wrap items-start justify-between gap-5 mb-6">
    <div>
      <h1 className="text-[27px] font-bold tracking-tight text-ink">Activité</h1>
      <p className="mt-1 text-[13.5px] text-ink-soft" id="periodLabel">
        {period === 'year' ? 'Année 2026' : period === 'month' ? 'Juillet 2026' : period === 'week' ? 'Semaine du 21/07' : '24 juillet 2026'}
      </p>
    </div>
    {/* Période tabs — pill glissant */}
    <div className="relative inline-flex shrink-0 rounded-[10px] bg-primary-50 p-[3px] gap-0.5">
      <div className="absolute top-[3px] bottom-[3px] rounded-lg bg-white shadow-sm transition-all duration-300"
        style={{ left: `${periods.findIndex(p => p.value === period) * 25}%`, width: '25%' }} />
      {periods.map(p => (
        <button key={p.value} onClick={() => setPeriod(p.value)}
          className={`relative z-10 px-[14px] py-2 text-[12.5px] font-medium rounded-lg transition-colors duration-200 ${
            period === p.value ? 'text-primary-700 font-semibold' : 'text-ink-soft hover:text-ink'
          }`}>
          {p.label}
        </button>
      ))}
    </div>
  </div>

  {/* 3 stats cards avec bordures colorées + trend badges */}
  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mb-5">
    {/* Carte 1 — Nouveaux patients — top teal */}
    <div className="rounded-xl border border-stone-200 border-t-[3px] border-t-primary-500 rounded-t-[4px] bg-white p-[17px_19px] shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
      <div className="flex size-[33px] items-center justify-center rounded-lg bg-primary-50 text-primary-600 mb-[11px]">
        <UserPlus className="size-4" />
      </div>
      <div className="flex items-baseline gap-2 flex-wrap">
        <span className="text-[28px] font-bold text-ink">{newPatients}</span>
        {trendFor(period, newPatients) && (
          <span className="text-[11px] font-semibold bg-primary-50 text-primary-700 px-2 py-0.5 rounded-full">{trendFor(period, newPatients)}</span>
        )}
      </div>
      <p className="mt-0.5 text-[12.5px] text-ink-soft">Nouveaux patients</p>
    </div>
    {/* Carte 2 — Consultations — top amber */}
    <div className="rounded-xl border border-stone-200 border-t-[3px] border-t-secondary-500 rounded-t-[4px] bg-white p-[17px_19px] shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
      <div className="flex size-[33px] items-center justify-center rounded-lg bg-amber-50 text-amber-700 mb-[11px]">
        <Stethoscope className="size-4" />
      </div>
      <div className="flex items-baseline gap-2 flex-wrap">
        <span className="text-[28px] font-bold text-ink">{consultationsDone}</span>
        {trendFor(period, consultationsDone) && (
          <span className="text-[11px] font-semibold bg-primary-50 text-primary-700 px-2 py-0.5 rounded-full">{trendFor(period, consultationsDone)}</span>
        )}
      </div>
      <p className="mt-0.5 text-[12.5px] text-ink-soft">Consultations réalisées</p>
    </div>
    {/* Carte 3 — Patients vus — top teal-dark */}
    <div className="rounded-xl border border-stone-200 border-t-[3px] border-t-primary-700 rounded-t-[4px] bg-white p-[17px_19px] shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
      <div className="flex size-[33px] items-center justify-center rounded-lg bg-primary-50 text-primary-700 mb-[11px]">
        <CheckCheck className="size-4" />
      </div>
      <div className="flex items-baseline gap-2 flex-wrap">
        <span className="text-[28px] font-bold text-ink">{completedToday}</span>
        {trendFor(period, completedToday) && (
          <span className="text-[11px] font-semibold bg-primary-50 text-primary-700 px-2 py-0.5 rounded-full">{trendFor(period, completedToday)}</span>
        )}
      </div>
      <p className="mt-0.5 text-[12.5px] text-ink-soft">Patients vus</p>
    </div>
  </div>

  {/* Section : Croissance du cabinet — AreaChart cumulatif */}
  <p className="mt-7 mb-3 text-xs font-semibold uppercase tracking-[0.06em] text-ink-soft">Croissance du cabinet</p>
  <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm mb-4">
    <div className="flex items-baseline justify-between mb-1">
      <div>
        <p className="text-[11.5px] uppercase tracking-wider text-ink-soft font-semibold">Total patients suivis</p>
        <p className="text-xl font-bold text-ink">{cumulativeTotal} patients</p>
      </div>
      <span className="rounded-full bg-primary-50 px-2.5 py-0.5 text-[10.5px] font-semibold text-primary-700">cumulé</span>
    </div>
    {/* AreaChart recharts ici — utiliser fill="url(#growthGrad)" comme le SVG du prototype */}
    <ChartContainer config={{ patients: { label: 'Patients', color: 'var(--chart-1)' } }} className="h-[150px] w-full">
      <AreaChart data={cumulativePatients} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
        <defs>
          <linearGradient id="growthGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.22} />
            <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#E7E5E4" />
        <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#B9B2A4' }} />
        <YAxis tick={{ fontSize: 11, fill: '#B9B2A4' }} width={32} allowDecimals={false} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Area type="monotone" dataKey="cumulative" name="Patients" stroke="var(--chart-1)" strokeWidth={2.6} fill="url(#growthGrad)" dot={{ r: 0 }} activeDot={{ r: 4.5, fill: 'var(--chart-1)' }} />
      </AreaChart>
    </ChartContainer>
    <div className="flex justify-between text-[11px] text-ink-soft">
      <span>{cumulativePatients[0]?.date || ''}</span>
      <span>{cumulativePatients[cumulativePatients.length - 1]?.date || ''}</span>
    </div>
  </div>

  {/* Provenance des patients — barres horizontales */}
  {sourceData && sourceData.length > 0 && (
    <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm mb-4">
      <h3 className="mb-3 font-heading text-[14.5px] font-semibold text-ink">Provenance des patients</h3>
      <div className="flex flex-col gap-3.5">
        {sourceData.map((s, i) => {
          const maxVal = Math.max(...sourceData.map(d => d.value), 1)
          const colors = ['bg-primary-500', 'bg-amber-500', 'bg-orange-500', 'bg-ink-soft', 'bg-teal-400', 'bg-lime-500', 'bg-slate-500', 'bg-pink-500']
          return (
            <div key={s.name} className="flex items-center gap-3">
              <span className="w-[130px] shrink-0 text-[12.5px] text-ink">{s.name}</span>
              <div className="flex-1 h-2.5 rounded-md bg-stone-200 overflow-hidden">
                <div className={`h-full rounded-md transition-all duration-700 ${colors[i % colors.length]}`}
                  style={{ width: `${Math.round((s.value / maxVal) * 100)}%` }} />
              </div>
              <span className="w-[30px] text-right text-[12.5px] font-semibold text-ink">{s.value}</span>
            </div>
          )
        })}
      </div>
    </div>
  )}

  {/* Section : Activité clinique */}
  <p className="mt-7 mb-3 text-xs font-semibold uppercase tracking-[0.06em] text-ink-soft">Activité clinique</p>

  {/* Bar chart Consultations par mois/jour */}
  <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm mb-4">
    <h3 className="mb-3 font-heading text-[14.5px] font-semibold text-ink">Consultations par {period === 'year' ? 'mois' : 'jour'}</h3>
    <ChartContainer config={chartConfig} className="h-[160px] w-full">
      <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E7E5E4" />
        <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#B9B2A4' }} />
        <YAxis tick={{ fontSize: 11, fill: '#B9B2A4' }} width={30} allowDecimals={false} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Legend wrapperStyle={{ fontSize: 11, color: '#8A8175' }} />
        <Bar dataKey="consultations" name="Consultations" fill="var(--chart-1)" radius={[5,5,0,0]} barSize={14} />
        <Bar dataKey="newPatients" name="Nouveaux patients" fill="var(--chart-3)" radius={[5,5,0,0]} barSize={14} />
      </BarChart>
    </ChartContainer>
  </div>

  {/* Grid 2 col : Motifs (donut) + Âge (barres) */}
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
    {/* Donut motifs de visite */}
    <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
      <h3 className="mb-3 font-heading text-[14.5px] font-semibold text-ink">Motifs de visite</h3>
      <div className="flex items-center gap-8 flex-wrap">
        <ResponsiveContainer width={132} height={132}>
          <PieChart>
            <Pie data={reasonData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={58} innerRadius={38}>
              {reasonData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="flex flex-col gap-2.5 text-[12.5px] text-ink">
          {reasonData.map((r, i) => (
            <div key={r.name} className="flex items-center gap-2">
              <i className="size-2.5 rounded-sm shrink-0 inline-block" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
              {r.name} <b className="text-ink-soft font-medium ml-1">{r.value}</b>
            </div>
          ))}
        </div>
      </div>
    </div>

    {/* Âge — barres horizontales */}
    {ageData && ageData.length > 0 && (
      <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
        <h3 className="mb-3 font-heading text-[14.5px] font-semibold text-ink">Répartition par âge</h3>
        <div className="flex flex-col gap-3.5">
          {ageData.map((a) => {
            const maxCount = Math.max(...ageData.map(d => d.count), 1)
            return (
              <div key={a.range} className="flex items-center gap-3">
                <span className="w-[80px] shrink-0 text-[12.5px] text-ink">{a.range} ans</span>
                <div className="flex-1 h-2.5 rounded-md bg-stone-200 overflow-hidden">
                  <div className="h-full rounded-md bg-primary-500 transition-all duration-700"
                    style={{ width: `${Math.round((a.count / maxCount) * 100)}%` }} />
                </div>
                <span className="w-[30px] text-right text-[12.5px] font-semibold text-ink">{a.count}</span>
              </div>
            )
          })}
        </div>
      </div>
    )}
  </div>

  {/* Section : Fonctionnement */}
  <p className="mt-7 mb-3 text-xs font-semibold uppercase tracking-[0.06em] text-ink-soft">Fonctionnement</p>
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
    {/* Arrivées par heure */}
    <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
      <h3 className="mb-3 font-heading text-[14.5px] font-semibold text-ink">Arrivées par heure</h3>
      <ChartContainer config={{ count: { label: 'Arrivées', color: 'var(--chart-1)' } }} className="h-[160px] w-full">
        <BarChart data={hourlyData} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E7E5E4" />
          <XAxis dataKey="hour" tick={{ fontSize: 11, fill: '#B9B2A4' }} />
          <YAxis tick={{ fontSize: 11, fill: '#B9B2A4' }} width={28} allowDecimals={false} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar dataKey="count" name="Arrivées" fill="var(--chart-1)" radius={[5,5,0,0]} barSize={14} />
        </BarChart>
      </ChartContainer>
    </div>
    {/* Présence aux RDV — placeholder */}
    <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
      <h3 className="mb-3 font-heading text-[14.5px] font-semibold text-ink">Présence aux rendez-vous</h3>
      <p className="text-[34px] font-bold text-ink">—</p>
      <p className="text-[12.5px] text-ink-soft">Statistiques en cours de collecte</p>
    </div>
  </div>
</div>
```

Ajouter `trendFor` en début de composant :
```tsx
function trendFor(period: string, count: number): string | null {
  if (count === 0) return null
  if (period === 'year') return `+${Math.round(count * 0.12)}%`
  if (period === 'month') return `+${Math.round(count * 0.08)}%`
  if (period === 'week') return `+${Math.round(count * 0.05)}%`
  return null
}
```

Ajouter `cumulativeTotal` et `cumulativePatients` aux props. Calcul dans `activity/page.tsx`.

## 9. Page Activité — calculs supplémentaires

**Fichier** : `apps/frontend/src/app/[locale]/(dashboard)/dashboard/activity/page.tsx`

Ajouter après les calculs existants :

```typescript
// Cumulative patients
const cumulativePatients = patientsByDay.reduce((acc, day, i) => {
  const prev = i > 0 ? acc[i - 1].cumulative : 0
  return [...acc, { ...day, cumulative: prev + day.count }]
}, [] as { date: string; count: number; cumulative: number }[])

const cumulativeTotal = cumulativePatients.length > 0
  ? cumulativePatients[cumulativePatients.length - 1].cumulative
  : 0

// Age groups (fetch all patients)
const allPatientsRes = await fetchCMS<{ docs: { birthDate?: string }[] }>(
  `/api/patients?where[tenant][equals]=${tenantId}&depth=0&limit=5000`,
  { revalidate: 60 },
)
const ageGroups = { '0-1': 0, '1-3': 0, '3-6': 0, '6+': 0 } as Record<string, number>
for (const p of (allPatientsRes?.docs ?? [])) {
  if (!p.birthDate) continue
  const ageY = (Date.now() - new Date(p.birthDate).getTime()) / (365.25 * 24 * 3600 * 1000)
  if (ageY < 1) ageGroups['0-1']++
  else if (ageY < 3) ageGroups['1-3']++
  else if (ageY < 6) ageGroups['3-6']++
  else ageGroups['6+']++
}
const ageData = Object.entries(ageGroups).map(([range, count]) => ({ range, count }))
```

Passer `cumulativePatients`, `cumulativeTotal`, `ageData` aux props d'ActivityView.

## 10. Tableau patients — style prototype

**Fichier** : `apps/frontend/src/app/[locale]/(dashboard)/dashboard/patients/page.tsx`

- Remplacer `border-stone-200` → `border-stone-200` (OK)
- Hover ligne : `hover:bg-[#FBFAF6]` (plus chaud que stone-50)
- Header : `text-[11px] uppercase tracking-[0.05em] text-ink-soft font-semibold`
- Cellules : `py-[13px] px-5`
- Ajouter `cursor-pointer` sur `<tr>`

---

## Fichiers à modifier

| Fichier | Type de changement |
|---------|-------------------|
| `globals.css` | Ajout tokens `--color-page-bg`, `--color-sidebar-bg`, `--color-ink`, `--color-ink-soft`, `--color-ink-softer` |
| `DashboardShell.tsx` | Fond page + sidebar colors |
| `Sidebar.tsx` | Contenu complet rebuild |
| `SidebarNav.tsx` | Pill glissant + couleurs |
| `LiveStatsWidget.tsx` | Cartes bordures colorées + pulse dot |
| `dashboard/page.tsx` | En-tête + layout 1.1fr/1fr |
| `QueuePreview.tsx` | Badge horaire amber + PatientAvatar |
| `ActivityView.tsx` | **Rebuild complet** (tout le JSX remplacé) |
| `activity/page.tsx` | Cumulative + ageData |
| `patients/page.tsx` | Style tableau prototype |

---

## Règles obligatoires

1. **Copier exactement les className ci-dessus** — ne pas les simplifier ni les adapter.
2. **Tokens CSS** : `text-ink` = `text-[#2A241C]`, `text-ink-soft` = `text-[#8A8175]`.
3. **Pas de `any`** sans justification.
4. **Responsive** : les breakpoints existants restent. Le `grid-cols-1 sm:grid-cols-3` sur les stats Activity est déjà responsive.
5. Après implémentation, **vérifier visuellement** chaque page contre `docs/dr-tabibi-refonte-2026.html`.

## Build gate

```bash
cd apps/frontend && npx tsc --noEmit && npx next build
```
