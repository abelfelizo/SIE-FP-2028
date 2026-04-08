import { supabase } from '@/lib/supabase'
import { BLOQUE_COLORS } from '@/lib/bloques'

const FP_COLOR  = BLOQUE_COLORS.FP
const PRM_COLOR = BLOQUE_COLORS.PRM
const PLD_COLOR = BLOQUE_COLORS.PLD

async function getEncuestas() {
  const { data } = await supabase
    .from('encuestas')
    .select('*')
    .order('fecha', { ascending: true })
  return data ?? []
}

const TAG: Record<string, { bg: string; color: string; border: string }> = {
  A: { bg:'#10b98118', color:'#10b981', border:'#10b98130' },
  B: { bg:'#f59e0b18', color:'#f59e0b', border:'#f59e0b30' },
  C: { bg:'#ef444418', color:'#ef4444', border:'#ef444430' },
}

export default async function EncuestasPage() {
  const encuestas = await getEncuestas()

  // SVG line chart
  const W = 320, H = 140, PAD = 30
  const plotW = W - PAD * 2
  const plotH = H - PAD * 2

  // Solo encuestas con fecha y datos
  const pts = encuestas.filter(e => e.prm_pct && e.fp_pct)
  const n   = pts.length

  function x(i: number) { return PAD + (n <= 1 ? plotW / 2 : (i / (n - 1)) * plotW) }
  function y(pct: number) { return PAD + plotH - ((pct / 55) * plotH) }

  const linePoints = (field: 'prm_pct' | 'fp_pct' | 'pld_pct') =>
    pts.map((e, i) => `${x(i)},${y(e[field] ?? 0)}`).join(' ')

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'.85rem' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'.45rem' }}>
          <span style={{ fontSize:'1rem', fontWeight:600 }}>Encuestas</span>
          <span style={{ fontFamily:'monospace', fontSize:'.58rem', color:'#5a6185',
            background:'#1c2030', border:'1px solid #2f3550', padding:'.1rem .35rem', borderRadius:'3px' }}>
            {encuestas.length} REGISTROS
          </span>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:'.6rem' }}>
        {/* Tabla */}
        <div style={{ background:'#141720', border:'1px solid #252a3a', borderRadius:'10px', overflow:'hidden' }}>
          <div style={{ padding:'.55rem .8rem', borderBottom:'1px solid #252a3a', background:'#0e1018',
            fontFamily:'monospace', fontSize:'.63rem', fontWeight:600,
            letterSpacing:'.08em', textTransform:'uppercase', color:'#7a85b0' }}>
            Registro completo
          </div>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'.74rem' }}>
            <thead>
              <tr>
                {['Fecha','Firma','Tipo','PRM %','FP %','PLD %','Cal.'].map((h,i) => (
                  <th key={h} style={{ padding:'.35rem .65rem', textAlign: i<=2?'left':'right',
                    fontFamily:'monospace', fontSize:'.58rem', fontWeight:600,
                    letterSpacing:'.08em', textTransform:'uppercase', color:'#5a6185',
                    borderBottom:'1px solid #252a3a', background:'#0e1018' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...encuestas].reverse().map((e: any) => {
                const cal = e.calidad ?? '?'
                const t   = TAG[cal] ?? TAG.C
                return (
                  <tr key={e.id} style={{ borderBottom:'1px solid #ffffff05' }}>
                    <td style={{ padding:'.32rem .65rem', fontFamily:'monospace', fontSize:'.7rem', color:'#7a85b0' }}>{e.fecha}</td>
                    <td style={{ padding:'.32rem .65rem', fontWeight:600 }}>{e.firma}</td>
                    <td style={{ padding:'.32rem .65rem', color:'#7a85b0', fontSize:'.68rem' }}>
                      {e.tipo === 'intencion_candidato' ? 'Intención' : 'Simpatía'}
                    </td>
                    <td style={{ padding:'.32rem .65rem', textAlign:'right', fontFamily:'monospace', color:PRM_COLOR }}>
                      {e.prm_pct ?? '—'}%
                    </td>
                    <td style={{ padding:'.32rem .65rem', textAlign:'right', fontFamily:'monospace', color:FP_COLOR }}>
                      {e.fp_pct ?? '—'}%
                    </td>
                    <td style={{ padding:'.32rem .65rem', textAlign:'right', fontFamily:'monospace', color:PLD_COLOR }}>
                      {e.pld_pct ?? '—'}%
                    </td>
                    <td style={{ padding:'.32rem .65rem', textAlign:'right' }}>
                      <span style={{ fontFamily:'monospace', fontSize:'.6rem', fontWeight:600,
                        padding:'.06rem .28rem', borderRadius:'3px',
                        background:t.bg, color:t.color, border:`1px solid ${t.border}` }}>{cal}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Panel derecho */}
        <div style={{ display:'flex', flexDirection:'column', gap:'.6rem' }}>
          {/* Gráfico tendencia */}
          {n >= 2 && (
            <div style={{ background:'#141720', border:'1px solid #252a3a', borderRadius:'10px', overflow:'hidden' }}>
              <div style={{ padding:'.55rem .8rem', borderBottom:'1px solid #252a3a', background:'#0e1018',
                fontFamily:'monospace', fontSize:'.63rem', fontWeight:600,
                letterSpacing:'.08em', textTransform:'uppercase', color:'#7a85b0' }}>
                Tendencia intención
              </div>
              <div style={{ padding:'.75rem' }}>
                <svg viewBox={`0 0 ${W} ${H}`} style={{ width:'100%', height:'auto' }}>
                  {/* Grilla */}
                  {[20,30,40,50].map(v => (
                    <g key={v}>
                      <line x1={PAD} y1={y(v)} x2={W-PAD} y2={y(v)}
                        stroke="#252a3a" strokeWidth="1" strokeDasharray="3,3"/>
                      <text x={PAD-4} y={y(v)+4} fill="#5a6185" fontSize="7" textAnchor="end"
                        fontFamily="monospace">{v}%</text>
                    </g>
                  ))}
                  {/* Ejes */}
                  <line x1={PAD} y1={PAD} x2={PAD} y2={H-PAD} stroke="#252a3a" strokeWidth="1"/>
                  <line x1={PAD} y1={H-PAD} x2={W-PAD} y2={H-PAD} stroke="#252a3a" strokeWidth="1"/>
                  {/* Labels fechas */}
                  {pts.map((e, i) => (
                    <text key={i} x={x(i)} y={H-PAD+12} fill="#5a6185" fontSize="6"
                      textAnchor="middle" fontFamily="monospace">
                      {e.fecha?.slice(5)}
                    </text>
                  ))}
                  {/* Líneas */}
                  <polyline points={linePoints('prm_pct')} fill="none" stroke={PRM_COLOR} strokeWidth="2"/>
                  <polyline points={linePoints('fp_pct')}  fill="none" stroke={FP_COLOR}  strokeWidth="2"/>
                  <polyline points={linePoints('pld_pct')} fill="none" stroke={PLD_COLOR} strokeWidth="1.5" strokeDasharray="4,2"/>
                  {/* Puntos PRM */}
                  {pts.map((e,i) => <circle key={i} cx={x(i)} cy={y(e.prm_pct??0)} r="3" fill={PRM_COLOR}/>)}
                  {pts.map((e,i) => <circle key={i} cx={x(i)} cy={y(e.fp_pct??0)}  r="3" fill={FP_COLOR}/>)}
                  {/* Leyenda */}
                  <circle cx={W-60} cy={PAD+8}  r="4" fill={PRM_COLOR}/>
                  <text x={W-52} y={PAD+12} fill={PRM_COLOR} fontSize="8" fontFamily="monospace">PRM</text>
                  <circle cx={W-60} cy={PAD+22} r="4" fill={FP_COLOR}/>
                  <text x={W-52} y={PAD+26} fill={FP_COLOR} fontSize="8" fontFamily="monospace">FP</text>
                  <line x1={W-62} y1={PAD+33} x2={W-56} y2={PAD+33} stroke={PLD_COLOR} strokeWidth="1.5" strokeDasharray="4,2"/>
                  <text x={W-52} y={PAD+37} fill={PLD_COLOR} fontSize="8" fontFamily="monospace">PLD</text>
                </svg>
                <div style={{ fontSize:'.62rem', color:'#5a6185', textAlign:'center', marginTop:'.15rem' }}>
                  {pts[0]?.fecha?.slice(0,7)} — {pts[n-1]?.fecha?.slice(0,7)} · todas las encuestas
                </div>
              </div>
            </div>
          )}

          {/* Última encuesta */}
          {encuestas.length > 0 && (() => {
            const last = [...encuestas].sort((a,b) => b.fecha?.localeCompare(a.fecha??'')??0)[0] as any
            return (
              <div style={{ background:'#141720', border:'1px solid #252a3a', borderRadius:'10px', overflow:'hidden' }}>
                <div style={{ padding:'.55rem .8rem', borderBottom:'1px solid #252a3a', background:'#0e1018',
                  fontFamily:'monospace', fontSize:'.63rem', fontWeight:600,
                  letterSpacing:'.08em', textTransform:'uppercase', color:'#7a85b0' }}>
                  Última encuesta
                </div>
                <div style={{ padding:'.75rem' }}>
                  <div style={{ fontWeight:600, fontSize:'.78rem', marginBottom:'.15rem' }}>{last.firma}</div>
                  <div style={{ fontSize:'.65rem', color:'#5a6185', marginBottom:'.6rem' }}>
                    {last.fecha} · {last.tipo==='intencion_candidato'?'Intención':'Simpatía'}
                  </div>
                  {[
                    { label:'PRM', pct: last.prm_pct, color: PRM_COLOR },
                    { label:'FP',  pct: last.fp_pct,  color: FP_COLOR  },
                    { label:'PLD', pct: last.pld_pct, color: PLD_COLOR },
                  ].map(p => (
                    <div key={p.label} style={{ marginBottom:'.5rem' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'.18rem' }}>
                        <span style={{ fontSize:'.72rem', color:p.color, fontWeight:500 }}>{p.label}</span>
                        <span style={{ fontFamily:'monospace', fontSize:'.72rem', color:p.color }}>{p.pct}%</span>
                      </div>
                      <div style={{ height:'5px', background:'#242840', borderRadius:'99px', overflow:'hidden' }}>
                        <div style={{ height:'100%', width:`${p.pct??0}%`, background:p.color, borderRadius:'99px' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })()}
        </div>
      </div>
    </div>
  )
}
