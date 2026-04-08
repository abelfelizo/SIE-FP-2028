'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const FP_COLOR = '#16a34a'  // verde FP

const SECTIONS = [
  { label: 'Campaña FP', items: [
    { href:'/dashboard',       icon:'◈', label:'Dashboard' },
    { href:'/objetivo',        icon:'◉', label:'Objetivo 2028' },
  ]},
  { label: 'Base Electoral', items: [
    { href:'/presidencial',    icon:'▣', label:'Presidencial' },
    { href:'/senadores',       icon:'▢', label:'Senadores',     badge:'32' },
    { href:'/diputados',       icon:'▦', label:'Diputados',     badge:'45c' },
    { href:'/alcaldes',        icon:'◧', label:'Alcaldes',      badge:'158' },
    { href:'/historico',       icon:'◌', label:'Histórico 2020' },
    { href:'/encuestas',       icon:'◑', label:'Encuestas',     badge:'6' },
  ]},
  { label: 'Inteligencia FP', items: [
    { href:'/centro-analisis', icon:'◈', label:'Centro de Análisis' },
    { href:'/alianzas',        icon:'◐', label:'Alianzas' },
  ]},
  { label: 'Simulación', items: [
    { href:'/simulador',       icon:'⊕', label:'Simulador' },
  ]},
]

export function Sidebar() {
  const path = usePathname()

  return (
    <nav style={{ width:'192px', background:'#0e1018', borderRight:'1px solid #252a3a',
      display:'flex', flexDirection:'column', overflowY:'auto', flexShrink:0, scrollbarWidth:'none' }}>
      {SECTIONS.map((sec) => (
        <div key={sec.label}>
          <div style={{ padding:'.9rem .75rem .25rem', fontFamily:'monospace', fontSize:'.56rem',
            fontWeight:600, letterSpacing:'.12em', textTransform:'uppercase', color:'#5a6185' }}>
            {sec.label}
          </div>
          {sec.items.map((item) => {
            const active = path === item.href || (item.href !== '/' && path.startsWith(item.href))
            return (
              <Link key={item.href} href={item.href} style={{
                display:'flex', alignItems:'center', gap:'.45rem', padding:'.3rem .75rem', fontSize:'.76rem',
                color:           active ? '#dde1f0' : '#7a85b0',
                borderLeft:      `2px solid ${active ? FP_COLOR : 'transparent'}`,
                background:      active ? FP_COLOR + '0a' : 'transparent',
                fontWeight:      active ? 500 : 400,
                textDecoration:  'none',
              }}>
                <span style={{ fontSize:'.8rem', width:'16px', textAlign:'center', opacity: active ? 1 : 0.7 }}>
                  {item.icon}
                </span>
                <span style={{ flex:1 }}>{item.label}</span>
                {'badge' in item && item.badge && (
                  <span style={{ fontFamily:'monospace', fontSize:'.55rem',
                    background: active ? FP_COLOR : '#242840',
                    border: `1px solid ${active ? FP_COLOR : '#2f3550'}`,
                    color: active ? '#fff' : '#7a85b0',
                    padding:'.06rem .3rem', borderRadius:'3px' }}>
                    {item.badge}
                  </span>
                )}
              </Link>
            )
          })}
        </div>
      ))}
      <div style={{ marginTop:'auto', padding:'.75rem', borderTop:'1px solid #252a3a' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'.35rem', background:'#1c2030',
          border:'1px solid #2f3550', borderRadius:'5px', padding:'.35rem .55rem',
          fontSize:'.66rem', color:'#7a85b0' }}>
          <div style={{ width:'5px', height:'5px', borderRadius:'50%', background:'#10b981', flexShrink:0 }} />
          DB 2024+2020 activa
        </div>
      </div>
    </nav>
  )
}
