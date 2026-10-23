// Unit inventory for the apartment selector.
//
// SAMPLE DATA. The client has not supplied the unit list yet, so the inventory
// below is generated to exercise the selector. Before launch, replace
// `buildSampleUnits()` with the real list in the same `Unit` shape (unit number,
// tower, floor, position, bedrooms, area, view, status).
import { TOWERS } from './towers'
import { pricing } from './site'

export const SAMPLE_INVENTORY = true

export type Status = 'available' | 'booked' | 'sold'
export type View = 'Valley' | 'Forest'
export type Unit = {
  id: string // e.g. "A-503"
  tower: number // index into TOWERS
  floor: number // 1 = first residential floor (ground is lobby)
  side: 'front' | 'back' // front faces the valley
  slot: number // 0..2 along the side, left to right
  beds: 1 | 2 | 3
  sqft: number
  view: View
  status: Status
}

export const TOWER_NAMES = ['Tower A', 'Tower B', 'Tower C']
export const TOWER_LETTERS = ['A', 'B', 'C']

/** Residential floors per tower (ground floor is the lobby). */
export const residentialFloors = (t: number) => TOWERS[t].floors - 1

function buildSampleUnits(): Unit[] {
  let seed = 42
  const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646
  const sizes = { 1: [520, 620], 2: [820, 940], 3: [1180, 1380] } as const
  const out: Unit[] = []
  TOWERS.forEach((_, t) => {
    const top = residentialFloors(t)
    for (let f = 1; f <= top; f++) {
      const front: (1 | 2 | 3)[] = f === top ? [3, 3, 3] : [2, 1, 2]
      const back: (1 | 2 | 3)[] = f === top ? [2, 3, 2] : [1, 3, 1]
      ;(['front', 'back'] as const).forEach((side) => {
        ;(side === 'front' ? front : back).forEach((beds, slot) => {
          const [lo, hi] = sizes[beds]
          const sqft = Math.round((lo + rand() * (hi - lo)) / 5) * 5
          // lower floors sold first in the sample, like a real launch
          const r = rand() + (f / top) * 0.35
          const status: Status = r < 0.35 ? 'sold' : r < 0.6 ? 'booked' : 'available'
          const n = side === 'front' ? slot + 1 : slot + 4
          out.push({
            id: `${TOWER_LETTERS[t]}-${f}${String(n).padStart(2, '0')}`,
            tower: t, floor: f, side, slot, beds, sqft,
            view: side === 'front' ? 'Valley' : 'Forest',
            status,
          })
        })
      })
    }
  })
  return out
}

export const UNITS: Unit[] = buildSampleUnits()

export const unitPrice = (u: Unit) => u.sqft * pricing.perSqft
export const unitBooking = (u: Unit) => unitPrice(u) * pricing.bookingShare
export const unitMonthly = (u: Unit) => (unitPrice(u) - unitBooking(u)) / pricing.months

export const floorUnits = (t: number, f: number) => UNITS.filter((u) => u.tower === t && u.floor === f)
export const availableOn = (t: number, f: number) => floorUnits(t, f).filter((u) => u.status === 'available').length
