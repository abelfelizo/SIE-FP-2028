'use client'
import { useState } from 'react'
import { fmtPct } from '@/lib/format'
import { BLOQUE_COLORS } from '@/lib/bloques'

const FP_COLOR  = BLOQUE_COLORS.FP
const PRM_COLOR = BLOQUE_COLORS.PRM
const PLD_COLOR = BLOQUE_COLORS.PLD

// Base 2024 (JCE oficial)
const BASE = { PRM: 57.44, FP: 28.85, PLD: 10.39, OTROS: 3.32 }

// Curules 2024 (desde DB) — hardcoded como referencia
const CURULES_2024 = { SEN: { PRM: 29, FP: 3, PLD: 0 }, DIP: { PRM: 140, FP: 26, PLD: 12 } }

function dhondt(votos: Record<string, number>, total: number) {
  const seats: Record<string, number> = {}
  for (const k of Object.keys(votos)) seats[k] = 0
  for (let i = 0; i < total; i++) {
    let best = '', bestScore = -1
    for (const k of Object.keys(votos)) {
      const score = votos[k] / (seats[k] + 1)
      if (score > bestScore) { bestScore = score; best = k }
    }
    seats[best]++
  }
  return seats
}

const PARTIDOS = ['PRM','FP','PLD','OTROS'] as const
const COLORS: Record<string, string> = { PRM: PRM_COLOR, FP: FP_COLOR, PLD: PLD_COLOR, OTROS: '#5a6185' }
const MAYORIA_SEN = 17, MAYORIA_DIP = 90

export default function SimuladorPage() {
  // SLIDERS INDEPENDIENTES — cada uno tiene su propio estado
  const [pcts, setPcts] = useState<Record<string, number>>({ ...BASE })

  function handleSlider(partido: string, val: number) {
    // Sliders independientes: cambio afecta solo al partido seleccionado
    // Los demás partidos NO cambian automáticamente
    setPcts(prev => ({ ...prev, [partido]: val }))
  }

  // Total para mostrar advertencia si suma ≠ 100
  const total = Object.values(pcts).reduce((a, b) => a + b, 0)
  const sumOk = Math.abs(total - 100) < 0.5

  // Calcular curules con D'Hondt (umbral 2% — Ley 20-23)
  const votosElec: Record<string, number> = {}
  for (const p of PARTIDOS) {
    if (pcts[p] >= 2) votosElec[p] = pcts[p]  // umbral 2%
  }

  const senProy = dhondt(votosElec, 32)
  const dipProy = dhondt(votosElec, 178)

  function ParlBar({ data, total, mayoria, label }: {
    data: Record<string, number>; total: number; mayoria: number; label: string
  }) {
    const fpGana = (data['FP']??0) >= mayoria
    return (
      <div style={{ background:'#141720', border:'1px solid #252a3a', borderRadius:'10px', overflow:'hidden' }}>
        <div style={{ padding:'.55rem .8rem', borderBottom:'1px solid #252a3a', background:'#0e1018',
          display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ fontFamily:'monospace', fontSize:'.63rem', fontWeight:600,
            letterSpacing:'.08em', textTransform:'uppercase', color:'#7a85b0' }}>
            {label} ({total})
          </span>
          {fpGana && (
            <span style={{ fontFamily:'monospace', fontSize:'.58rem', color:FP_COLOR,
              background: FP_COLOR+'18', border:`1px solid ${FP_COLOR}30`,
              padding:'.05rem .3rem', borderRadius:'3px' }}>FP mayoría</span>
          )}
        </div>
        <div style={{ padding:'.75rem' }}>
          {/* Barra proporcional */}
          <div style={{ display:'flex', gap:'2px', height:'14px', borderRadius:'6px',
            overflow:'hidden', marginBottom:'.75rem' }}>
            {PARTIDOS.map(p => (
              <div key={p} style={{ flex: data[p]??0, background: COLORS[p],
                transition:'flex .4s', minWidth: (data[p]??0)>0?'2px':'0' }} />
            ))}
          </div>
          {/* Tabla resultados */}
          {PARTIDOS.map(p => {
            const proy = data[p] ?? 0
            const base2024 = p==='PRM' ? CURULES_2024.SEN.PRM : p==='FP' ? CURULES_2024.SEN.FP : p==='PLD' ? CURULES_2024.SEN.PLD : 0
            const baseDip  = p==='PRM' ? CURULES_2024.DIP.PRM : p==='FP' ? CURULES_2024.DIP.FP : p==='PLD' ? CURULES_2024.DIP.PLD : 0
            const base = label.includes('Senado') ? base2024 : baseDip
            const diff = proy - base
            return (
              <div key={p} style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
                marginBottom:'.35rem' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'.4rem' }}>
                  <div style={{ width:'8px', height:'8px', borderRadius:'50%', background:COLORS[p] }} />
                  <span style={{ fontSize:'.72rem', color:COLORS[p], fontWeight:500 }}>{p}</span>
                </div>
                <div style={{ display:'flex', gap:'.75rem', alignItems:'center' }}>
                  <span style={{ fontFamily:'monospace', fontSize:'.65rem', color:'#5a6185' }}>2024: {base}</span>
                  <span style={{ fontFamily:'monospace', fontSize:'.85rem', fontWeight:600, color:COLORS[p],
                    minWidth:'2.5rem', textAlign:'right' }}>{proy}</span>
                  {diff !== 0 && (
                    <span style={{ fontFamily:'monospace', fontSize:'.62rem',
                      color: diff > 0 ? '#10b981' : '#ef4444' }}>
                      {diff > 0 ? '+' : ''}{diff}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
          <div style={{ fontSize:'.62rem', color:'#5a6185', marginTop:'.4rem', textAlign:'center' }}>
            Mayoría: {mayoria}+ escaños
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', gap:'.45rem', marginBottom:'.85rem' }}>
        <span style={{ fontSize:'1rem', fontWeight:600 }}>Simulador Electoral</span>
        <span style={{ fontFamily:'monospace', fontSize:'.58rem', color:'#5a6185',
          background:'#1c2030', border:'1px solid #2f3550', padding:'.1rem .35rem', borderRadius:'3px' }}>
          LEGISLATIVO 2028 · D&apos;HONDT · UMBRAL 2%
        </span>
        <button onClick={() => setPcts({...BASE})} style={{ marginLeft:'auto',
          padding:'0 .65rem', height:'26px', background:'#1c2030',
          border:'1px solid #2f3550', borderRadius:'5px', color:'#7a85b0',
          fontSize:'.72rem', cursor:'pointer', fontFamily:'inherit' }}>
          ↺ Reset 2024
        </button>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'.6rem' }}>
        {/* Sliders */}
        <div style={{ background:'#141720', border:'1px solid #252a3a', borderRadius:'10px', overflow:'hidden' }}>
          <div style={{ padding:'.55rem .8rem', borderBottom:'1px solid #252a3a', background:'#0e1018',
            fontFamily:'monospace', fontSize:'.63rem', fontWeight:600,
            letterSpacing:'.08em', textTransform:'uppercase', color:'#7a85b0' }}>
            Ajustar escenario — sliders independientes
          </div>

          {/* Indicador de suma */}
          <div style={{ padding:'.5rem .8rem', borderBottom:'1px solid #252a3a',
            display:'flex', justifyContent:'space-between', alignItems:'center',
            background: sumOk ? '#10b98108' : '#ef444408' }}>
            <span style={{ fontSize:'.68rem', color:'#7a85b0' }}>Suma total de votos</span>
            <span style={{ fontFamily:'monospace', fontSize:'.75rem', fontWeight:600,
              color: sumOk ? '#10b981' : '#ef4444' }}>
              {total.toFixed(1)}% {sumOk ? '✓' : '≠ 100%'}
            </span>
          </div>

          <div style={{ padding:'1rem' }}>
            {PARTIDOS.map((p) => (
              <div key={p} style={{ marginBottom:'1.25rem' }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'.4rem' }}>
                  <div>
                    <span style={{ fontWeight:600, color:COLORS[p] }}>{p}</span>
                    {pcts[p] < 2 && (
                      <span style={{ marginLeft:'.5rem', fontSize:'.6rem', color:'#ef4444',
                        fontFamily:'monospace' }}>bajo umbral 2%</span>
                    )}
                  </div>
                  <span style={{ fontFamily:'monospace', fontSize:'.85rem', fontWeight:600, color:COLORS[p] }}>
                    {fmtPct(pcts[p], 1)}
                  </span>
                </div>
                <input type="range" min={0} max={80} step={0.5}
                  value={parseFloat(pcts[p].toFixed(1))}
                  onChange={(e) => handleSlider(p, parseFloat(e.target.value))}
                  style={{ width:'100%', accentColor:COLORS[p], cursor:'pointer' }} />
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:'.6rem', color:'#5a6185', marginTop:'.2rem' }}>
                  <span>Base 2024: {fmtPct(BASE[p as keyof typeof BASE], 1)}</span>
                  <span style={{ color: pcts[p]>BASE[p as keyof typeof BASE] ? '#10b981' : pcts[p]<BASE[p as keyof typeof BASE] ? '#ef4444' : '#5a6185' }}>
                    {pcts[p]>BASE[p as keyof typeof BASE]?'+':''}{fmtPct(pcts[p]-BASE[p as keyof typeof BASE],1)}pp
                  </span>
                </div>
              </div>
            ))}

            <div style={{ padding:'.5rem .65rem', background:'#0e1018', borderRadius:'6px',
              fontFamily:'monospace', fontSize:'.65rem', color:'#5a6185' }}>
              Los sliders son independientes. La suma debe sumar ~100% para un escenario realista.
              Umbral D&apos;Hondt: 2% (Ley 20-23).
            </div>
          </div>
        </div>

        {/* Resultados */}
        <div style={{ display:'flex', flexDirection:'column', gap:'.6rem' }}>
          <ParlBar data={senProy} total={32}  mayoria={MAYORIA_SEN} label="Senado" />
          <ParlBar data={dipProy} total={178} mayoria={MAYORIA_DIP} label="Diputados Ter." />
        </div>
      </div>
    </div>
  )
}
