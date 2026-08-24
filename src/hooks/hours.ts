// Shared opening-hours logic — the single source of truth for the live
// open/closed chip (OpeningHours) and the dashboard's order-polling gate.
//
// Matches the displayed schedule: closed Mondays; lunch 11:30–14:30 and
// dinner 17:30–22:30. Pure client-side arithmetic on the browser's local
// time (the restaurant is in Germany and the kitchen staff work in local
// time), so it costs nothing to evaluate — the dashboard uses it to decide
// whether polling is worth a network request at all.

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
