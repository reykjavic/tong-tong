import { useEffect, useSyncExternalStore } from 'react'
import { CONFIG_API_URL } from './config'

// Opening-hours module — two layers:
//
// 1. Default schedule: pure client-side fallback (closed Mondays; lunch
//    11:30–14:30, dinner 17:30–22:30 in the browser's local time).
// 2. Real hours from the Google Business Profile: GET /hours (backend/hours
//    Lambda) relays businessStatus + regularHours + specialHours from the
//    Places API (New) — the same data the owner maintains on Google (vacation
//    days, special closures, temporary closures). isEffectivelyOpen() is the
//    single check the chip and the dashboard's order-polling gate use; when
//    the payload is missing or the fetch fails it fails open to the default
//    schedule (same pattern as /config).
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
  regularHours?: PlaceHours | null // standard week (day-based periods)
  currentHours?: PlaceHours | null // effective next-7-days, periods carry dates
  fetchedAt?: string | null
}

export type HoursSnapshot = { status: 'loading' | 'ready' | 'error'; hours: HoursPayload | null }

// Same URL derivation as AUTH_API_URL in auth.ts: strip the /config suffix.
export const HOURS_API_URL = CONFIG_API_URL.replace(/\/config$/, '/hours')

// Client refresh cadence: re-read /hours every 5 minutes. The Lambda caches
// Places for 15 min, so this mostly hits the cache — cheap, and vacation-day
// changes propagate within ~15–20 min.
const HOURS_REFRESH_MS = 5 * 60 * 1000

// Module store + promise cache (same idiom as config.ts/auth.ts).
const LOADING_SNAPSHOT: HoursSnapshot = { status: 'loading', hours: null }

let snapshot: HoursSnapshot = LOADING_SNAPSHOT
const listeners = new Set<() => void>()
let cache: Promise<HoursPayload> | null = null

function setSnapshot(next: HoursSnapshot) {
  snapshot = next
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function getSnapshot() {
  return snapshot
}

async function fetchHours(): Promise<HoursPayload> {
  const res = await fetch(HOURS_API_URL, { cache: 'no-store' })
  if (!res.ok) {
    throw new Error(`hours request failed: ${res.status}`)
  }
  return (await res.json()) as HoursPayload
}

// Fetch (deduped while one is in flight). force=true busts the module cache so
// the periodic refresh actually re-fetches. On failure the previous payload is
// kept — the site falls back to its default schedule only when there is none.
export function refreshHours(force = false): void {
  if (force) cache = null
  cache ??= fetchHours()
    .then((hours) => {
      setSnapshot({ status: 'ready', hours })
      return hours
    })
    .catch((err) => {
      cache = null
      console.error('Failed to load opening hours:', err)
      setSnapshot({ status: 'error', hours: snapshot.hours })
      throw err
    })
}

export function useHours(): HoursSnapshot {
  const snap = useSyncExternalStore(subscribe, getSnapshot)

  useEffect(() => {
    refreshHours()
    const interval = setInterval(() => refreshHours(true), HOURS_REFRESH_MS)
    return () => clearInterval(interval)
  }, [])

  return snap
}

// ---------------------------------------------------------------------------
// Effective open/closed — the one check the chip and the polling gate use.
// ---------------------------------------------------------------------------

export type OpenReason = 'open' | 'closed' | 'closedSpecial' | 'closedTemporarily'

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
    // Closed today per Google. If the regular week would normally be open on
    // this weekday, the closure is a vacation/special override.
    const regularOpenToday = payload.regularHours?.periods?.some(
      (p) => p.open?.day === now.getDay(),
    )
    return regularOpenToday
      ? { isOpen: false, reason: 'closedSpecial' }
      : { isOpen: false, reason: 'closed' }
  }

  // No current view (data gap) -> the plain weekly hours from Google.
  if (payload.regularHours?.periods && payload.regularHours.periods.length > 0) {
    return openInPeriods(now, payload.regularHours.periods)
      ? { isOpen: true, reason: 'open' }
      : { isOpen: false, reason: 'closed' }
  }

  // Nothing at all -> the site's default schedule (fail-open).
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

// Weekday-based check for regularHours periods (day 0 = Sunday, same as
// Date.getDay()). Overnight periods (close.day > open.day) wrap past midnight,
// so a period also applies on the close day before the close time.
function openInPeriods(now: Date, periods: PlacePeriod[]): boolean {
  const today = now.getDay()
  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  return periods.some(({ open, close }) => {
    if (!open || !close) return false
    const openMinutes = open.hour * 60 + open.minute
    const closeMinutes = close.hour * 60 + close.minute
    if (open.day === today) {
      if (close.day === today) return nowMinutes >= openMinutes && nowMinutes < closeMinutes
      return nowMinutes >= openMinutes // overnight: open since X today, wraps at midnight
    }
    if (close.day === today && close.day !== open.day) {
      return nowMinutes < closeMinutes // overnight tail: closes today at X
    }
    return false
  })
}
