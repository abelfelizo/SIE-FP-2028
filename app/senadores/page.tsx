import { supabase } from '@/lib/supabase'
import { fmtPct, calcPct } from '@/lib/format'
import { BLOQUE_COLORS, getBloque, type Bloque } from '@/lib/bloques'

const FP_COLOR  = BLOQUE_COLORS.FP
const PRM_COLOR = BLOQUE_COLORS.PRM
const PLD_COLOR = BLOQUE_COLORS.PLD

async function getCurules() {
  const { data } = await supabase
    .from('curules')
    .select('provincia_id, partido, bloque, escanos')
    .eq('eleccion_id', 3).eq('nivel', 'senadores')
    .order('provincia_id')
  return data ?? []
}

async function getVotos() {
  const { data } = await supabase
    .from('v_votos_provincia')
    .select('provincia_id, provincia_nombre, partido, votos')
    .eq('eleccion_id', 3).eq('tipo_cargo', 'senador')
    .order('provincia_nombre')
  return data ?? []
}

async function getProvincias() {
  const { data } = await supabase.from('provincias').select('id, nombre')
  return data ?? []
}

function groupVotos(rows: any[]) {
  const m = new Map<string, { nombre: string; partidos: Record<string, number>; total: number }>()
  for (const r of rows) {
    if (!m.has(r.provincia_id)) m.set(r.provincia_id, { nombre: r.provincia_nombre, partidos: {}, total: 0 })
    const e = m.get(r.provincia_id)!
    e.partidos[r.partido] = (e.partidos[r.partido] ?? 0) + r.votos
    e.total += r.votos
  }
  return m
}

export default async function SenadoresPage() {
  const [curules, votosRows, provData] = await Promise.all([getCurules(), getVotos(), getProvincias()])
  const votosMap = groupVotos(votosRows)
  const provMap: Record<string, string> = {}
  for (const p of provData) provMap[p.id] = p.nombre

  const curulesMap: Record<string, { partido: string; bloque: string }> = {}
  const bloqueTotals: Record<string, number> = {}
  for (const c of curules) {
    curulesMap[c.provincia_id] = { partido: c.partido, bloque: c.bloque ?? 'PRM' }
    const b = c.bloque ?? 'PRM'
    bloqueTotals[b] = (bloqueTotals[b] ?? 0) + c.escanos
  }

  function pctBloque(partidos: Record<string, number>, bloque: Bloque, total: number) {
    return calcPct(Object.entries(partidos).filter(([k]) => getBloque(k) === bloque).reduce((a,[,v]) => a+v, 0), total)
  }

  const color: Record<string, string> = { FP: FP_COLOR, PRM: PRM_COLOR, PLD: PLD_COLOR }

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', gap:'.45rem', marginBottom:'.85rem' }}>
        <span style={{ fontSize:'1rem', fontWeight:600 }}>Senadores 2024</span>
        <span style={{ fontFamily:'monospace', fontSize:'.58rem', color:'#5a6185',
          background:'#1c2030', border:'1px solid #2f3550', padding:'.1rem .35rem', borderRadius:'3px' }}>
          32 PROVINCIAS
        </span>
      </div>

      {/* KPIs bloques */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'.5rem', marginBottom:'.85rem' }}>
        {(['FP','PRM','PLD'] as Bloque[]).map((b) => {
          const n = bloqueTotals[b] ?? 0
          return (
            <div key={b} style={{ background:'#141720', border:'1px solid #252a3a',
              borderRadius:'6px', padding:'.65rem .75rem', position:'relative', overflow:'hidden' }}>
              <div style={{ position:'absolute', top:0, left:0, right:0, height:'2px', background:BLOQUE_COLORS[b] }} />
              <div style={{ fontFamily:'monospace', fontSize:'.56rem', textTransform:'uppercase',
                letterSpacing:'.1em', color:'#5a6185', marginBottom:'.3rem' }}>{b}</div>
              <div style={{ fontFamily:'monospace', fontSize:'1.5rem', fontWeight:600, color:BLOQUE_COLORS[b], lineHeight:1 }}>
                {n}<span style={{ fontSize:'.7rem', color:'#5a6185' }}>/32</span>
              </div>
              <div style={{ fontSize:'.62rem', color:'#5a6185', marginTop:'.18rem' }}>senadores</div>
            </div>
          )
        })}
      </div>

      <div style={{ background:'#141720', border:'1px solid #252a3a', borderRadius:'10px', overflow:'hidden' }}>
        <div style={{ padding:'.55rem .8rem', borderBottom:'1px solid #252a3a', background:'#0e1018',
          fontFamily:'monospace', fontSize:'.63rem', fontWeight:600,
          letterSpacing:'.08em', textTransform:'uppercase', color:'#7a85b0' }}>
          Resultado por provincia
        </div>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'.74rem' }}>
          <thead>
            <tr>
              {['Provincia','FP Bloque %','PRM Bloque %','PLD %','Bloque ganador','Partido encabezador'].map((h,i) => (
                <th key={h} style={{
                  padding:'.35rem .65rem', textAlign: i<=0 ? 'left' : i>=4 ? 'center' : 'right',
                  fontFamily:'monospace', fontSize:'.58rem', fontWeight:600,
                  letterSpacing:'.08em', textTransform:'uppercase', color:'#5a6185',
                  borderBottom:'1px solid #252a3a', background:'#0e1018',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from(votosMap.entries()).sort((a,b) => a[1].nombre.localeCompare(b[1].nombre)).map(([prov_id, prov]) => {
              const fp  = pctBloque(prov.partidos, 'FP',  prov.total)
              const prm = pctBloque(prov.partidos, 'PRM', prov.total)
              const pld = pctBloque(prov.partidos, 'PLD', prov.total)
              const curul = curulesMap[prov_id]
              const bloqueColor = color[curul?.bloque] ?? '#5a6185'

              return (
                <tr key={prov_id} style={{ borderBottom:'1px solid #ffffff05' }}>
                  <td style={{ padding:'.32rem .65rem', color:'#dde1f0' }}>{prov.nombre}</td>
                  <td style={{ padding:'.32rem .65rem', textAlign:'right', fontFamily:'monospace', color:FP_COLOR  }}>{fmtPct(fp)}</td>
                  <td style={{ padding:'.32rem .65rem', textAlign:'right', fontFamily:'monospace', color:PRM_COLOR }}>{fmtPct(prm)}</td>
                  <td style={{ padding:'.32rem .65rem', textAlign:'right', fontFamily:'monospace', color:PLD_COLOR }}>{fmtPct(pld)}</td>
                  <td style={{ padding:'.32rem .65rem', textAlign:'center' }}>
                    <span style={{ fontFamily:'monospace', fontSize:'.6rem', fontWeight:600,
                      padding:'.08rem .3rem', borderRadius:'3px',
                      color: bloqueColor, background: bloqueColor+'18', border:`1px solid ${bloqueColor}40` }}>
                      {curul?.bloque ?? '—'}
                    </span>
                  </td>
                  <td style={{ padding:'.32rem .65rem', textAlign:'center' }}>
                    <span style={{ fontFamily:'monospace', fontSize:'.6rem', color:'#7a85b0',
                      background:'#1c2030', border:'1px solid #252a3a', padding:'.06rem .3rem', borderRadius:'3px' }}>
                      {curul?.partido ?? '—'}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
