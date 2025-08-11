import { startOfDay } from 'date-fns'

export type SummaryMode = 'countries' | 'impressions'

export type BookingItem = {
  basis_dt: string // 'YYYY-MM-DD'
  screen_id: string
  country_nm?: string | null
  guaranteed_exposure?: number | null
}

export type Span = { start: string; span: number; value: string }

export function buildDailySummary(
  bookings: BookingItem[],
  days: Date[],
  mode: SummaryMode,
  screenIds: string[],
  maxTokens = 6,
  normalizeId?: (s: string) => string
): { byDate: Record<number, string | number>; spans: Span[] } {
  const byDate: Record<number, string | number> = {}
  const dayKeys = days.map((d) => +startOfDay(d))
  const dayKeySet = new Set(dayKeys)
  const toId = (v: string) => (normalizeId ? normalizeId(String(v || '')) : String(v || ''))
  const screenSet = new Set(screenIds.map(toId))

  const bucket: Record<number, BookingItem[]> = {}
  for (const b of bookings) {
    const k = +startOfDay(new Date(b.basis_dt))
    if (!dayKeySet.has(k)) continue
    if (!screenSet.has(toId(b.screen_id))) continue
    ;(bucket[k] ||= []).push(b)
  }

  for (const k of dayKeys) {
    const rows = bucket[k] || []
    if (mode === 'impressions') {
      byDate[k] = rows.reduce((acc, r) => acc + (r.guaranteed_exposure ?? 0), 0)
    } else {
      // countries: preserve original tokens; split only by comma/space, keep '/'
      const seen = new Set<string>()
      const ordered: string[] = []
      rows.forEach((r) => {
        const raw = (r.country_nm ?? '').trim()
        if (!raw) return
        raw
          .split(/[_,\s]+|(?<=,),?\s*/)
          .map((t) => t.trim())
          .filter(Boolean)
          .forEach((t) => {
            if (!seen.has(t)) {
              seen.add(t)
              ordered.push(t)
            }
          })
      })
      const pack = (arr: string[], max = maxTokens) =>
        arr.length <= max ? arr.join(', ') : `${arr.slice(0, max).join(', ')} 외 ${arr.length - max}개`
      byDate[k] = ordered.length ? pack(ordered) : '—'
    }
  }

  const spans: Span[] = []
  for (let i = 0; i < dayKeys.length; ) {
    const v = byDate[dayKeys[i]]
    const start = dayKeys[i]
    let j = i + 1
    while (j < dayKeys.length && byDate[dayKeys[j]] === v) j++
    spans.push({ start: new Date(start).toISOString(), span: j - i, value: String(v ?? '') })
    i = j
  }
  return { byDate, spans }
}


