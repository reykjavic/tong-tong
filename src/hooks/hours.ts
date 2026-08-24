// Opening-hours module — Google Business Profile is the single source of
// truth (GET /hours, backend/hours Lambda, ~1 call/day cached 24h):
//
//   businessStatus + regularHours + currentHours
//     ├─► weekly table (homepage)   ← regularHours (day-based week), no
//     │                              hardcoded copy; default schedule is only
//     │                              the fail-open fallback
//     ├─► live chip                 ← currentHours (special/vacation-adjusted
//     │                              next-7-days) + businessStatus
//     └─► order-polling gate        ← isEffectivelyOpen(): the 15s order poll
//                                    only runs while the restaurant is open
//                                    (gaps, Mondays, vacations = no requests)
//
// PURE logic only — the GET /hours fetch and useHours() hook live in
// src/hooks/api.ts (the single file for every request). This module holds the
// types, the schedule arithmetic and the table mapping. When the payload is
// missing or the fetch fails everything fails open to the default schedule
// (same pattern as /config).
//
// Timezone note: Places hours are in the location's timezone, and all
// comparisons here use the browser's local clock — correct for the staff and
// the site's audience (both in the restaurant's timezone), same assumption the
// default-schedule check already made.

export interface HoursWindow {
  start: string
  end: string
}

// The two windows that define "open". Display-only slots (Mittagstisch,
// buffet) live in OpeningHours and extend this.
export const HOURS_SCHEDULE: { lunch: HoursWindow; dinner: HoursWindow } = {
  lunch: { start: '11:30', end: '14:30' },
  dinner: { start: '17:30', end: '22:30' },
}

export function toMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

export function inWindow(minutes: number, { start, end }: HoursWindow): boolean {
  return minutes >= toMinutes(start) && minutes < toMinutes(end)
}

// Closed Mondays; otherwise open during lunch or dinner.
export function isRestaurantOpen(now: Date = new Date()): boolean {
  if (now.getDay() === 1) return false // Monday
  const minutes = now.getHours() * 60 + now.getMinutes()
  return inWindow(minutes, HOURS_SCHEDULE.lunch) || inWindow(minutes, HOURS_SCHEDULE.dinner)
}

// ---------------------------------------------------------------------------
// Places payload (GET /hours) — relayed verbatim by the hours Lambda.
// ---------------------------------------------------------------------------

export interface PlacePeriod {
  open?: { day: number; hour: number; minute: number; date?: { year: number; month: number; day: number } } | null
  close?: { day: number; hour: number; minute: number; date?: { year: number; month: number; day: number } } | null
}

export interface PlaceHours {
  openNow?: boolean | null
  periods?: PlacePeriod[] | null
  weekdayDescriptions?: string[] | null
}

export interface HoursPayload {
  source?: string | null
  businessStatus?: string | null // 'OPERATIONAL' | 'CLOSED_TEMPORARILY' | ...
  regularHours?: PlaceHours | null // standard week (day-based periods) -> weekly table
  currentHours?: PlaceHours | null // effective next-7-days, periods carry dates -> live chip
  fetchedAt?: string | null
}

export type HoursSnapshot = { status: 'loading' | 'ready' | 'error'; hours: HoursPayload | null }

// ---------------------------------------------------------------------------
// Effective open/closed — the one check the chip and the polling gate use.
// ---------------------------------------------------------------------------

export type OpenReason = 'open' | 'closed' | 'closedSpecial' | 'closedTemporarily'

// ---------------------------------------------------------------------------
// Weekly table (homepage) — rendered from Google's regularHours so the site
// has no hardcoded copy of the schedule. Falls back to the default schedule
// only when /hours is unavailable (fail-open).
// ---------------------------------------------------------------------------

export interface WeekRow {
  windows: { start: string; end: string }[]
}

// Mon-first (index 0 = Monday … 6 = Sunday), each row = the day's open
// windows sorted by start. A day without periods shows as closed.
export function weekRowsFromRegularHours(regular: PlaceHours | null | undefined): WeekRow[] {
  const byDay = new Map<number, { start: string; end: string }[]>()
  for (const { open, close } of regular?.periods ?? []) {
    if (!open || !close) continue
    const window = { start: fmt(open.hour, open.minute), end: fmt(close.hour, close.minute) }
    const list = byDay.get(open.day) ?? []
    list.push(window)
    byDay.set(open.day, list)
  }
  // Places day 0 = Sunday (same as Date.getDay()); display is Mon-first.
  return [1, 2, 3, 4, 5, 6, 0].map((day) => ({
    windows: (byDay.get(day) ?? []).sort((a, b) => a.start.localeCompare(b.start)),
  }))
}

// Fallback week from the hardcoded schedule (closed Mondays; lunch + dinner
// Tue–Sun) — used only while /hours has no data.
export function weekRowsFromDefaultSchedule(): WeekRow[] {
  return [1, 2, 3, 4, 5, 6, 0].map((day) => ({
    windows: day === 1 ? [] : [HOURS_SCHEDULE.lunch, HOURS_SCHEDULE.dinner],
  }))
}

// ---------------------------------------------------------------------------
// The table-mapping function: weekly periods -> the homepage table's rows.
// This is the seam between Google's raw data and the site's labeled markup.
//
// Positional rule: a day's 1st window = Mittag, 2nd = Abend. Day CHECKMARKS
// are derived from the data (a day change on Google propagates to the table);
// the merchandising rows (Mittagstisch, buffet) keep static day rules — Google
// can't express them — intersected with the derived open days. Only the
// buffet-evening TIME is static: Google models "when are we open", not
// "buffet until 22:00". The labels themselves are the site's vocabulary and
// live in the component (i18n), not here.
// ---------------------------------------------------------------------------

export interface OpeningRow {
  key: 'noon' | 'evening' | 'lunch' | 'buffet-noon' | 'buffet-evening'
  time: { start: string; end: string }
  days: boolean[] // Mon..Sun + holiday (8 columns, matching the table)
}

const BUFFET_EVENING = { start: '18:00', end: '22:00' }

// Mon-first day masks (index 0 = Monday) for the merchandising rows' day rules.
const MASK = {
  tueFri: [false, true, true, true, true, false, false], // Mittagstisch
  sun: [false, false, false, false, false, false, true], // Buffet Mittags
  friSun: [false, false, false, false, true, true, true], // Buffet Abends
} as const

const andMasks = (a: readonly boolean[], b: readonly boolean[]) => a.map((v, i) => v && b[i])

export function buildOpeningRows(week: WeekRow[]): OpeningRow[] {
  const hasFirst = week.map((w) => w.windows.length >= 1)
  const hasSecond = week.map((w) => w.windows.length >= 2)
  // The displayed time for a row = the first day that has that window
  // (fallback: the default schedule, so a data gap never shows "—").
  const lunch = week.find((w) => w.windows[0])?.windows[0] ?? HOURS_SCHEDULE.lunch
  const dinner = week.find((w) => w.windows[1])?.windows[1] ?? HOURS_SCHEDULE.dinner

  return [
    { key: 'noon', time: lunch, days: [...hasFirst, true] },
    { key: 'evening', time: dinner, days: [...hasSecond, true] },
    { key: 'lunch', time: lunch, days: [...andMasks(MASK.tueFri, hasFirst), false] },
    { key: 'buffet-noon', time: lunch, days: [...andMasks(MASK.sun, hasFirst), true] },
    { key: 'buffet-evening', time: BUFFET_EVENING, days: [...andMasks(MASK.friSun, hasSecond), true] },
  ]
}

function fmt(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

export function isEffectivelyOpen(
  now: Date,
  payload: HoursPayload | null,
): { isOpen: boolean; reason: OpenReason } {
  if (!payload) {
    return isRestaurantOpen(now) ? { isOpen: true, reason: 'open' } : { isOpen: false, reason: 'closed' }
  }

  // Temporary/permanent closure on the Business Profile beats everything.
  if (payload.businessStatus && payload.businessStatus !== 'OPERATIONAL') {
    return {
      isOpen: false,
      reason: payload.businessStatus === 'CLOSED_TEMPORARILY' ? 'closedTemporarily' : 'closed',
    }
  }

  // currentHours is the special/vacation-adjusted view for the next 7 days —
  // every period carries an explicit date, so a vacation day shows up as a
  // missing period for that date. That lets us both answer "open now?" and
  // explain WHY (special closure vs. a normal closed day like Monday).
  const current = payload.currentHours
  if (current?.periods && current.periods.length > 0) {
    const todayKey = dateKey(now)
    const todayPeriods = current.periods.filter(({ open, close }) => {
      return periodDateKey(open?.date) === todayKey || periodDateKey(close?.date) === todayKey
    })
    if (todayPeriods.length > 0) {
      return openInDatePeriods(now, todayPeriods)
        ? { isOpen: true, reason: 'open' }
        : { isOpen: false, reason: 'closed' }
    }
    // No period for today = closed. Distinguish a vacation/special closure
    // from a normal day off via the site's own schedule: the owner only
    // changes special hours on Google (the regular week matches the hardcoded
    // schedule), so a missing period on a normal operating weekday (Tue-Sun)
    // is a special closure; on Monday it's just the regular closed day.
    return now.getDay() === 1
      ? { isOpen: false, reason: 'closed' }
      : { isOpen: false, reason: 'closedSpecial' }
  }

  // No effective view (data gap) -> the site's default schedule (fail-open).
  return isRestaurantOpen(now) ? { isOpen: true, reason: 'open' } : { isOpen: false, reason: 'closed' }
}

function dateKey(now: Date): string {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function periodDateKey(date: { year: number; month: number; day: number } | null | undefined): string | null {
  if (!date) return null
  const m = String(date.month).padStart(2, '0')
  const d = String(date.day).padStart(2, '0')
  return `${date.year}-${m}-${d}`
}

// Date-based check for currentHours periods (explicit dates). Handles
// overnight periods via the close date.
function openInDatePeriods(now: Date, periods: PlacePeriod[]): boolean {
  const todayKey = dateKey(now)
  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  return periods.some(({ open, close }) => {
    if (!open || !close) return false
    const openMinutes = open.hour * 60 + open.minute
    const closeMinutes = close.hour * 60 + close.minute
    if (periodDateKey(open.date) === todayKey) {
      if (periodDateKey(close.date) === todayKey) return nowMinutes >= openMinutes && nowMinutes < closeMinutes
      return nowMinutes >= openMinutes // overnight: wraps at midnight
    }
    if (periodDateKey(close.date) === todayKey && periodDateKey(open.date) !== todayKey) {
      return nowMinutes < closeMinutes // overnight tail: closes today
    }
    return false
  })
}
