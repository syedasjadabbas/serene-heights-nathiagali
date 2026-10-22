import { useMemo, useRef, useState } from 'react'
import { LazyCanvas, ChapterHead, Split, pkr } from './common'
import { SelectorScene, coarsePointer, type FloorRef } from '../three/SelectorScene'
import { scrollTo } from '../lib/scroll'
import {
  UNITS, SAMPLE_INVENTORY, TOWER_NAMES, TOWER_LETTERS, floorUnits, availableOn, residentialFloors,
  unitPrice, unitBooking, unitMonthly, type Unit, type Status,
} from '../data/units'
import { TOWERS } from '../three/Towers'

const STATUS_LABEL: Record<Status, string> = { available: 'Available', booked: 'Booked', sold: 'Sold' }
const bedsLabel = (b: number) => `${b} bed`

// Hands a unit to the enquiry form further down the page.
export function enquireAbout(u: Unit) {
  window.dispatchEvent(new CustomEvent('enquire-unit', { detail: { id: u.id, beds: u.beds } }))
  scrollTo('#enquire')
}

/* ---------- floor plan: two rows of three units either side of a corridor ---------- */
function FloorPlan({ units, selected, onSelect }: { units: Unit[]; selected: string | null; onSelect: (u: Unit) => void }) {
  const W = 600, H = 300, pad = 12, corridor = 44
  const rowH = (H - pad * 2 - corridor) / 2
  const rows = (['front', 'back'] as const).map((side) => units.filter((u) => u.side === side).sort((a, b) => a.slot - b.slot))
  return (
    <svg className="plan" viewBox={`0 0 ${W} ${H + 26}`} role="group" aria-label="Floor plan">
      <text x={W / 2} y={H + 20} className="plan-cap" textAnchor="middle">VALLEY VIEW ↓ · FOREST VIEW ↑</text>
      <rect x={pad / 2} y={pad / 2} width={W - pad} height={H - pad} className="plan-shell" />
      <rect x={pad} y={pad + rowH} width={W - pad * 2} height={corridor} className="plan-corridor" />
      <text x={W / 2} y={pad + rowH + corridor / 2 + 4} textAnchor="middle" className="plan-cap">CORRIDOR · LIFTS</text>
      {rows.map((row, ri) => {
        const total = row.reduce((s, u) => s + u.sqft, 0)
        let x = pad
        // back row on top (forest), front row at the bottom (valley)
        const y = ri === 0 ? pad + rowH + corridor : pad
        return row.map((u) => {
          const w = ((W - pad * 2) * u.sqft) / total
          const cell = (
            <g key={u.id} className={`plan-unit ${u.status}${selected === u.id ? ' sel' : ''}`}
              role="button" tabIndex={0} aria-label={`${u.id}, ${bedsLabel(u.beds)}, ${u.sqft} square feet, ${STATUS_LABEL[u.status]}`}
              onClick={() => onSelect(u)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(u) } }}>
              <rect x={x + 3} y={y + 3} width={w - 6} height={rowH - 6} />
              <text x={x + 14} y={y + 26} className="plan-id">{u.id}</text>
              <text x={x + 14} y={y + 46} className="plan-sub">{bedsLabel(u.beds)} · {u.sqft} sq ft</text>
              <text x={x + 14} y={y + rowH - 16} className="plan-status">{STATUS_LABEL[u.status]}</text>
            </g>
          )
          x += w
          return cell
        })
      })}
    </svg>
  )
}

function UnitCard({ u }: { u: Unit }) {
  return (
    <div className="unit-card">
      <div className="unit-top">
        <div>
          <span className="label">{TOWER_NAMES[u.tower]} · Floor {u.floor} · {u.view} view</span>
          <h3>{u.id}</h3>
        </div>
        <span className={`pill ${u.status}`}>{STATUS_LABEL[u.status]}</span>
      </div>
      <dl>
        <dt>Bedrooms</dt><dd>{u.beds}</dd>
        <dt>Covered area</dt><dd>{u.sqft.toLocaleString('en-US')} sq ft</dd>
        <dt>Total price</dt><dd>{pkr(unitPrice(u))}</dd>
        <dt>Booking · 30%</dt><dd>{pkr(unitBooking(u))}</dd>
        <dt>36 monthly installments</dt><dd className="lamp">{pkr(unitMonthly(u))}</dd>
      </dl>
      {u.status === 'available'
        ? <button className="btn" type="button" onClick={() => enquireAbout(u)}>Enquire about {u.id}</button>
        : <button className="btn ghost" type="button" onClick={() => enquireAbout(u)}>Join the waitlist for similar units</button>}
    </div>
  )
}

/* ---------- finder ---------- */
type Filters = { beds: 0 | 1 | 2 | 3; tower: -1 | 0 | 1 | 2; view: '' | 'Valley' | 'Forest'; budget: number; onlyAvailable: boolean }
const MAX_BUDGET = Math.ceil(Math.max(...UNITS.map(unitPrice)) / 5e6) * 5e6

function Finder({ onOpen }: { onOpen: (u: Unit) => void }) {
  const [f, setF] = useState<Filters>({ beds: 0, tower: -1, view: '', budget: MAX_BUDGET, onlyAvailable: true })
  const [limit, setLimit] = useState(8)
  const results = useMemo(() => UNITS
    .filter((u) => (!f.beds || u.beds === f.beds) && (f.tower < 0 || u.tower === f.tower) && (!f.view || u.view === f.view)
      && unitPrice(u) <= f.budget && (!f.onlyAvailable || u.status === 'available'))
    .sort((a, b) => unitPrice(a) - unitPrice(b)), [f])
  const set = (p: Partial<Filters>) => { setF({ ...f, ...p }); setLimit(8) }
  return (
    <div className="finder">
      <div className="finder-head">
        <h3>Apartment finder</h3>
        <span className="label">{results.length} {results.length === 1 ? 'unit' : 'units'} match</span>
      </div>
      <div className="filters">
        <div className="seg" role="group" aria-label="Bedrooms">
          {([0, 1, 2, 3] as const).map((b) => <button key={b} type="button" aria-pressed={f.beds === b} onClick={() => set({ beds: b })}>{b ? `${b} bed` : 'Any'}</button>)}
        </div>
        <div className="seg" role="group" aria-label="Tower">
          {([-1, 0, 1, 2] as const).map((t) => <button key={t} type="button" aria-pressed={f.tower === t} onClick={() => set({ tower: t })}>{t < 0 ? 'All towers' : TOWER_LETTERS[t]}</button>)}
        </div>
        <div className="seg" role="group" aria-label="View">
          {(['', 'Valley', 'Forest'] as const).map((v) => <button key={v || 'any'} type="button" aria-pressed={f.view === v} onClick={() => set({ view: v })}>{v || 'Any view'}</button>)}
        </div>
        <label className="budget">
          <span className="label">Up to {pkr(f.budget)}</span>
          <input id="finder-budget" type="range" min={15e6} max={MAX_BUDGET} step={1e6} value={f.budget} onChange={(e) => set({ budget: +e.target.value })} />
        </label>
        <label className="check"><input id="finder-avail" type="checkbox" checked={f.onlyAvailable} onChange={(e) => set({ onlyAvailable: e.target.checked })} /> Available only</label>
      </div>
      <div className="results" role="table" aria-label="Matching units">
        <div className="r-row r-head" role="row">
          <span role="columnheader">Unit</span><span role="columnheader">Floor</span><span role="columnheader">Beds</span>
          <span role="columnheader">Area</span><span role="columnheader">View</span><span role="columnheader">Price</span><span role="columnheader">Status</span>
        </div>
        {results.slice(0, limit).map((u) => (
          <button key={u.id} type="button" className="r-row" role="row" onClick={() => onOpen(u)}>
            <span role="cell" className="c-id"><b>{u.id}</b></span><span role="cell" className="c-x">{u.floor}</span><span role="cell" className="c-x">{u.beds}</span>
            <span role="cell" className="c-x">{u.sqft.toLocaleString('en-US')} sq ft</span><span role="cell" className="c-x">{u.view}</span>
            <span role="cell" className="c-price">{pkr(unitPrice(u))}</span><span role="cell" className="c-status"><i className={`dot ${u.status}`} />{STATUS_LABEL[u.status]}</span>
            <span className="c-meta" aria-hidden="true">Floor {u.floor} · {u.beds} bed · {u.sqft.toLocaleString('en-US')} sq ft · {u.view} view</span>
          </button>
        ))}
        {results.length === 0 && <p className="empty">No units match. Try a higher budget or another tower.</p>}
      </div>
      {results.length > limit && <button type="button" className="btn ghost more" onClick={() => setLimit(limit + 12)}>Show {Math.min(12, results.length - limit)} more</button>}
    </div>
  )
}

/* ---------- section ---------- */
export function Selector() {
  const [tower, setTower] = useState<number | null>(null)
  const [floor, setFloor] = useState<number | null>(null)
  const [unitId, setUnitId] = useState<string | null>(null)
  const [hover, setHover] = useState<FloorRef | null>(null)
  const labelEls = useRef<(HTMLButtonElement | null)[]>([])
  const spin = useRef(0.19)
  const stage = useRef<HTMLDivElement>(null)

  const pickTower = (t: number | null) => { setTower(t); setFloor(null); setUnitId(null) }
  const pickFloor = ({ tower: t, floor: f }: FloorRef) => { setTower(t); setFloor(f); setUnitId(null) }
  const openUnit = (u: Unit) => {
    setTower(u.tower); setFloor(u.floor); setUnitId(u.id)
    if (stage.current) scrollTo(stage.current)
  }
  const units = tower !== null && floor ? floorUnits(tower, floor) : []
  const unit = units.find((u) => u.id === unitId) ?? null
  const available = UNITS.filter((u) => u.status === 'available').length

  return (
    <section className="band deco" id="select">
      <div className="wrap">
        <ChapterHead left="Choose your apartment" right={`${available} of ${UNITS.length} available`} />
        <div className="sel-head">
          <Split text="Pick a tower. Pick a floor. Pick your view." em="Pick your view" />
          <p>Turn the model, click a floor to open its plan, then choose an apartment to see its price and installments.</p>
        </div>
        {SAMPLE_INVENTORY && <p className="sample-note" role="note">Sample inventory for review. Unit numbers, sizes and availability will be replaced with the live list before launch.</p>}

        <div className="sel-stage" ref={stage}>
          <div className="sel-canvas">
            <LazyCanvas dpr={[1, 1.75]} camera={{ fov: 36, position: [4, 8.5, 21] }} gl={{ antialias: true }}>
              <SelectorScene spin={spin} tower={tower} floor={floor} hover={hover} onHover={setHover} onPick={pickFloor} onTower={(t) => pickTower(t)} labelEls={labelEls} />
            </LazyCanvas>
            <div className="sel-labels">
              {TOWER_NAMES.map((n, t) => (
                <button key={n} type="button" ref={(el) => { labelEls.current[t] = el }} className={`tower-tag${tower === t ? ' on' : ''}`} onClick={() => pickTower(t)}>
                  {n}<small>{TOWERS[t].floors - 1} floors · {UNITS.filter((u) => u.tower === t && u.status === 'available').length} available</small>
                </button>
              ))}
            </div>
            <div className="sel-hint label">
              {hover ? `${TOWER_NAMES[hover.tower]} · Floor ${hover.floor} · ${availableOn(hover.tower, hover.floor)} of ${floorUnits(hover.tower, hover.floor).length} available` : coarsePointer ? 'Tap a floor' : 'Drag to turn · Click a floor'}
            </div>
            {coarsePointer && (
              <div className="turn">
                <button type="button" aria-label="Turn the model left" onClick={() => { spin.current -= Math.PI / 4 }}>←</button>
                <button type="button" aria-label="Turn the model right" onClick={() => { spin.current += Math.PI / 4 }}>→</button>
              </div>
            )}
          </div>

          <aside className="sel-panel" aria-live="polite">
            <div className="seg tabs" role="group" aria-label="Tower">
              <button type="button" aria-pressed={tower === null} onClick={() => pickTower(null)}>All</button>
              {TOWER_LETTERS.map((l, t) => <button key={l} type="button" aria-pressed={tower === t} onClick={() => pickTower(t)}>Tower {l}</button>)}
            </div>

            {tower === null && (
              <div className="panel-empty">
                <h3>Three towers, {UNITS.length} apartments.</h3>
                <p>Choose a tower above or click any floor on the model. Floors in copper are fully sold.</p>
              </div>
            )}

            {tower !== null && !floor && (
              <div className="floors">
                <span className="label">{TOWER_NAMES[tower]} · choose a floor</span>
                <ol>
                  {Array.from({ length: residentialFloors(tower) }, (_, i) => residentialFloors(tower) - i).map((f) => {
                    const total = floorUnits(tower, f).length, av = availableOn(tower, f)
                    return (
                      <li key={f}>
                        <button type="button" disabled={av === 0} onClick={() => pickFloor({ tower, floor: f })}
                          onMouseEnter={() => setHover({ tower, floor: f })} onMouseLeave={() => setHover(null)}>
                          <span>Floor {f}{f === residentialFloors(tower) ? ' · Top' : ''}</span>
                          <i className="bar"><i style={{ width: `${(av / total) * 100}%` }} /></i>
                          <span className="label">{av ? `${av} of ${total} available` : 'Sold out'}</span>
                        </button>
                      </li>
                    )
                  })}
                </ol>
              </div>
            )}

            {tower !== null && floor && (
              <div className="floor-view">
                <div className="fv-head">
                  <button type="button" className="back" onClick={() => { setFloor(null); setUnitId(null) }}>← {TOWER_NAMES[tower]}</button>
                  <span className="label">Floor {floor} · {availableOn(tower, floor)} of {units.length} available</span>
                </div>
                <FloorPlan units={units} selected={unitId} onSelect={(u) => setUnitId(u.id)} />
                <ul className="unit-list">
                  {units.map((u) => (
                    <li key={u.id}>
                      <button type="button" aria-pressed={unitId === u.id} onClick={() => setUnitId(u.id)}>
                        <b>{u.id}</b><span>{bedsLabel(u.beds)} · {u.sqft} sq ft · {u.view}</span><i className={`dot ${u.status}`} aria-label={STATUS_LABEL[u.status]} />
                      </button>
                    </li>
                  ))}
                </ul>
                {unit ? <UnitCard u={unit} /> : <p className="fine">Select an apartment on the plan.</p>}
              </div>
            )}
          </aside>
        </div>

        <Finder onOpen={openUnit} />
      </div>
    </section>
  )
}
