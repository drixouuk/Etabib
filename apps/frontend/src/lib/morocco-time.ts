export function moroccoWallTimeToUTC(wallTime: string): Date {
  const naive = new Date(wallTime + 'Z')
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Africa/Casablanca',
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
  const parts = fmt
    .formatToParts(naive)
    .reduce((acc: Record<string, string>, p) => {
      if (p.type !== 'literal') acc[p.type] = p.value
      return acc
    }, {})
  const asIfUTC = Date.UTC(
    +parts.year,
    +parts.month - 1,
    +parts.day,
    +parts.hour,
    +parts.minute,
    +parts.second,
  )
  const offsetMs = asIfUTC - naive.getTime()
  return new Date(naive.getTime() - offsetMs)
}
