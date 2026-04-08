import { supabase } from '@/lib/supabase'
import { fmtNum, fmtPct, calcPct } from '@/lib/format'
import { agruparBloques, BLOQUE_COLORS, BLOQUE_LABELS, OFICIALES_2024_PRES, type Bloque } from '@/lib/bloques'
import Link from 'next/link'

async function getPresidencial() {
  const { data } = await supabase
    .from('v_votos_nacional')
    .select('partido, votos')
    .eq('eleccion_id', 3)
    .eq('tipo_cargo', 'presidente')
  return data ?? []
}

async function getSenadores() {
  const { data } = await supabase
    .from('curules')
    .select('bloque, escanos')
    .eq('eleccion_id', 3)
    .eq('nivel', 'senadores')
  const totals: Record<string, number> = {}
  for (const c of (data ?? [])) {
    const b = c.bloque ?? 'PRM'
    totals[b] = (totals[b] ?? 0) + c.escanos
  }
  return totals
}

async function getDiputados() {
  const { data } = await supabase
    .from('curules')
    .select('bloque, escanos')
    .eq('eleccion_id', 3)
    .eq('nivel', 'diputados_ter')
  const totals: Record<string, number> = {}
  for (const c of (data ?? [])) {
    const b = c.bloque ?? 'PRM'
    totals[b] = (totals[b] ?? 0) + c.escanos
  }
  return totals
}

async function getEncuestas() {
  const { data } = await supabase
    .from('encuestas')
    .select('id, fecha, firma, tipo, calidad, prm_pct, fp_pct, pld_pct')
    .order('fecha', { ascending: false })
    .limit(3)
  return data ?? []
}

const FP_COLOR  = BLOQUE_COLORS.FP   // verde
const PRM_COLOR = BLOQUE_COLORS.PRM  // azul
const PLD_COLOR = BLOQUE_COLORS.PLD  // morado

export default async function DashboardPage() {
  const [presRows, senadores, diputados, encuestas] = await Promise.all([
    getPresidencial(), getSenadores(), getDiputados(), getEncuestas(),
  ])

  const bloques    = agruparBloques(presRows as any)
  const totalValid = Object.values(bloques).reduce((a, b) => a + b, 0)

  // KPIs oficiales
  const fpPct  = calcPct(OFICIALES_2024_PRES.FP,  OFICIALES_2024_PRES.validos)
  const prmPct = calcPct(OFICIALES_2024_PRES.PRM, OFICIALES_2024_PRES.validos)
  const pldPct = calcPct(OFICIALES_2024_PRES.PLD, OFICIALES_2024_PRES.validos)

  const fpSen  = senadores['FP']  ?? 0
  const prmSen = senadores['PRM'] ?? 0
  const fpDip  = diputados['FP']  ?? 0
  const prmDip = diputados['PRM'] ?? 0
  const pldDip = diputados['PLD'] ?? 0

  const kpis = [
    { label: 'FP Bloque',    value: fmtPct(fpPct),          sub: fmtNum(OFICIALES_2024_PRES.FP) + ' votos',    color: FP_COLOR },
    { label: 'PRM Bloque',   value: fmtPct(prmPct),         sub: fmtNum(OFICIALES_2024_PRES.PRM) + ' votos',   color: PRM_COLOR },
    { label: 'PLD',          value: fmtPct(pldPct),         sub: fmtNum(OFICIALES_2024_PRES.PLD) + ' votos',   color: PLD_COLOR },
    { label: 'Senadores FP', value: `${fpSen}/32`,          sub: `PRM ${prmSen}`,                              color: FP_COLOR },
    { label: 'Diputados FP', value: `${fpDip}/178`,         sub: `PRM ${prmDip} · PLD ${pldDip}`,              color: FP_COLOR },
    { label: 'Margen FP-PRM',value: fmtPct(prmPct-fpPct) + 'pp', sub: 'Brecha a cerrar 2028',               color: '#ef4444' },
  ]

  const BLOQUES_ORDER: Bloque[] = ['PRM','FP','PLD','OTRO']

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'.85rem' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'.45rem' }}>
          <span style={{ fontSize:'1rem', fontWeight:600 }}>Dashboard</span>
          <span style={{ fontFamily:'monospace', fontSize:'.58rem', color:'#5a6185',
            background:'#1c2030', border:'1px solid #2f3550', padding:'.1rem .35rem', borderRadius:'3px' }}>
            ELECCIONES 2024
          </span>
        </div>
        <Link href="/presidencial" style={{ padding:'0 .65rem', height:'26px', background:'#1c2030',
          border:'1px solid #2f3550', borderRadius:'5px', color:'#7a85b0', fontSize:'.72rem',
          textDecoration:'none', display:'flex', alignItems:'center' }}>Ver presidencial →</Link>
      </div>

      {/* KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:'.5rem', marginBottom:'.85rem' }}>
        {kpis.map((k) => (
          <div key={k.label} style={{ background:'#141720', border:'1px solid #252a3a',
            borderRadius:'6px', padding:'.65rem .75rem', position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', top:0, left:0, right:0, height:'2px', background:k.color }} />
            <div style={{ fontFamily:'monospace', fontSize:'.56rem', textTransform:'uppercase',
              letterSpacing:'.1em', color:'#5a6185', marginBottom:'.3rem' }}>{k.label}</div>
            <div style={{ fontFamily:'monospace', fontSize:'1.1rem', fontWeight:600, color:k.color, lineHeight:1 }}>
              {k.value}
            </div>
            <div style={{ fontSize:'.62rem', color:'#5a6185', marginTop:'.18rem' }}>{k.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'3fr 1fr', gap:'.6rem' }}>
        <div style={{ display:'flex', flexDirection:'column', gap:'.6rem' }}>

          {/* Presidencial 2024 */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'.6rem' }}>
            <div style={{ background:'#141720', border:'1px solid #252a3a', borderRadius:'10px', overflow:'hidden' }}>
              <div style={{ display:'flex', justifyContent:'space-between', padding:'.55rem .8rem',
                borderBottom:'1px solid #252a3a', background:'#0e1018' }}>
                <span style={{ fontFamily:'monospace', fontSize:'.63rem', fontWeight:600,
                  letterSpacing:'.08em', textTransform:'uppercase', color:'#7a85b0' }}>
                  Presidencial 2024
                </span>
                <span style={{ fontFamily:'monospace', fontSize:'.58rem', color:'#5a6185',
                  background:'#1c2030', border:'1px solid #252a3a', padding:'.06rem .35rem', borderRadius:'3px' }}>
                  JCE oficial
                </span>
              </div>
              <div style={{ padding:'.75rem' }}>
                {([
                  { b:'PRM' as Bloque, v: OFICIALES_2024_PRES.PRM, lbl: 'PRM · Abinader' },
                  { b:'FP'  as Bloque, v: OFICIALES_2024_PRES.FP,  lbl: 'FP · Leonel' },
                  { b:'PLD' as Bloque, v: OFICIALES_2024_PRES.PLD,  lbl: 'PLD · Castillo' },
                ] as Array<{b:Bloque;v:number;lbl:string}>).map(({ b, v, lbl }) => {
                  const pct = calcPct(v, OFICIALES_2024_PRES.validos)
                  return (
                    <div key={b} style={{ marginBottom:'.55rem' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'.18rem' }}>
                        <span style={{ fontSize:'.73rem', fontWeight:500, color:BLOQUE_COLORS[b] }}>{lbl}</span>
                        <span style={{ fontFamily:'monospace', fontSize:'.7rem', color:'#7a85b0' }}>{fmtPct(pct)}</span>
                      </div>
                      <div style={{ height:'5px', background:'#242840', borderRadius:'99px', overflow:'hidden' }}>
                        <div style={{ height:'100%', width:`${pct}%`, background:BLOQUE_COLORS[b], borderRadius:'99px' }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Balance legislativo */}
            <div style={{ background:'#141720', border:'1px solid #252a3a', borderRadius:'10px', overflow:'hidden' }}>
              <div style={{ padding:'.55rem .8rem', borderBottom:'1px solid #252a3a', background:'#0e1018',
                fontFamily:'monospace', fontSize:'.63rem', fontWeight:600,
                letterSpacing:'.08em', textTransform:'uppercase', color:'#7a85b0' }}>
                Balance legislativo 2024
              </div>
              <div style={{ padding:'.75rem' }}>
                {/* Senado */}
                <div style={{ fontSize:'.6rem', fontFamily:'monospace', textTransform:'uppercase',
                  letterSpacing:'.08em', color:'#5a6185', marginBottom:'.3rem' }}>SENADO (32)</div>
                {[
                  { partido:'PRM Bloque', escanos: prmSen, color: PRM_COLOR },
                  { partido:'FP',         escanos: fpSen,  color: FP_COLOR  },
                ].map(r => (
                  <div key={r.partido} style={{ display:'flex', justifyContent:'space-between', marginBottom:'.25rem' }}>
                    <span style={{ fontSize:'.72rem', color:r.color }}>{r.partido}</span>
                    <span style={{ fontFamily:'monospace', fontSize:'.72rem', fontWeight:600, color:r.color }}>
                      {r.escanos}
                    </span>
                  </div>
                ))}
                <div style={{ height:'1px', background:'#252a3a', margin:'.5rem 0' }} />
                {/* Diputados */}
                <div style={{ fontSize:'.6rem', fontFamily:'monospace', textTransform:'uppercase',
                  letterSpacing:'.08em', color:'#5a6185', marginBottom:'.3rem' }}>DIPUTADOS TER. (178)</div>
                {[
                  { partido:'PRM Bloque', escanos: prmDip, color: PRM_COLOR },
                  { partido:'FP',         escanos: fpDip,  color: FP_COLOR  },
                  { partido:'PLD',        escanos: pldDip, color: PLD_COLOR },
                ].map(r => (
                  <div key={r.partido} style={{ display:'flex', justifyContent:'space-between', marginBottom:'.25rem' }}>
                    <span style={{ fontSize:'.72rem', color:r.color }}>{r.partido}</span>
                    <span style={{ fontFamily:'monospace', fontSize:'.72rem', fontWeight:600, color:r.color }}>
                      {r.escanos}
                    </span>
                  </div>
                ))}
                <div style={{ marginTop:'.5rem' }}>
                  <Link href="/senadores" style={{ fontSize:'.65rem', color:'#7a85b0', textDecoration:'none' }}>
                    Ver detalle →
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Accesos rápidos */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:'.4rem' }}>
            {[
              { href:'/presidencial', icon:'▣', label:'Presidencial', sub:'32 provincias' },
              { href:'/senadores',    icon:'▢', label:'Senadores',    sub:'32 ganadores' },
              { href:'/diputados',    icon:'▦', label:'Diputados',    sub:'45 circs' },
              { href:'/alcaldes',     icon:'◧', label:'Alcaldes',     sub:'158 municipios' },
              { href:'/historico',    icon:'◌', label:'Histórico',    sub:'Swing 2020→24' },
            ].map((l) => (
              <Link key={l.href} href={l.href} style={{
                display:'block', padding:'.55rem .6rem', borderRadius:'8px',
                background:'#1c2030', border:'1px solid #2f3550', textDecoration:'none',
              }}>
                <div style={{ fontSize:'.85rem', marginBottom:'.2rem' }}>{l.icon}</div>
                <div style={{ fontSize:'.72rem', color:'#dde1f0', fontWeight:500 }}>{l.label}</div>
                <div style={{ fontSize:'.6rem', color:'#7a85b0', marginTop:'.1rem' }}>{l.sub}</div>
              </Link>
            ))}
          </div>
        </div>

        {/* Encuestas */}
        <div style={{ background:'#141720', border:'1px solid #252a3a', borderRadius:'10px', overflow:'hidden' }}>
          <div style={{ display:'flex', justifyContent:'space-between', padding:'.55rem .8rem',
            borderBottom:'1px solid #252a3a', background:'#0e1018', alignItems:'center' }}>
            <span style={{ fontFamily:'monospace', fontSize:'.63rem', fontWeight:600,
              letterSpacing:'.08em', textTransform:'uppercase', color:'#7a85b0' }}>
              Encuestas recientes
            </span>
            <Link href="/encuestas" style={{ fontFamily:'monospace', fontSize:'.55rem', color:FP_COLOR, textDecoration:'none' }}>
              Ver todas →
            </Link>
          </div>
          {encuestas.map((e: any) => {
            const total = (e.prm_pct ?? 0) + (e.fp_pct ?? 0) + (e.pld_pct ?? 0)
            const cal   = e.calidad ?? '?'
            return (
              <div key={e.id} style={{ padding:'.6rem .75rem', borderBottom:'1px solid #252a3a' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'.2rem' }}>
                  <span style={{ fontSize:'.78rem', fontWeight:600 }}>{e.firma}</span>
                  <span style={{ fontFamily:'monospace', fontSize:'.55rem', padding:'.05rem .28rem', borderRadius:'3px',
                    background: cal==='A' ? '#10b98118' : '#f59e0b18',
                    color: cal==='A' ? '#10b981' : '#f59e0b',
                    border: `1px solid ${cal==='A' ? '#10b98130' : '#f59e0b30'}` }}>{cal}</span>
                </div>
                <div style={{ fontSize:'.63rem', color:'#5a6185', marginBottom:'.3rem' }}>
                  {e.fecha} · {e.tipo === 'intencion_candidato' ? 'Intención' : 'Simpatía'}
                </div>
                <div style={{ display:'flex', gap:'3px', height:'3px', marginBottom:'.3rem' }}>
                  <div style={{ flex: (e.prm_pct??0)/total, background: PRM_COLOR, borderRadius:'2px' }} />
                  <div style={{ flex: (e.fp_pct??0)/total,  background: FP_COLOR,  borderRadius:'2px' }} />
                  <div style={{ flex: (e.pld_pct??0)/total, background: PLD_COLOR, borderRadius:'2px' }} />
                </div>
                <div style={{ display:'flex', gap:'.5rem', fontFamily:'monospace', fontSize:'.6rem' }}>
                  <span style={{ color: PRM_COLOR }}>PRM {e.prm_pct}%</span>
                  <span style={{ color: FP_COLOR  }}>FP {e.fp_pct}%</span>
                  <span style={{ color: PLD_COLOR }}>PLD {e.pld_pct}%</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
