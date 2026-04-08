import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  const { data } = await supabase
    .from('curules')
    .select('provincia_id, circ_id, partido, bloque, escanos')
    .eq('eleccion_id', 3)
    .eq('nivel', 'diputados_ter')

  const bloqueTotals: Record<string, number> = {}
  for (const c of (data ?? [])) {
    const b = c.bloque ?? c.partido
    bloqueTotals[b] = (bloqueTotals[b] ?? 0) + c.escanos
  }

  return NextResponse.json({
    total: 178,
    bloques: bloqueTotals,
    detalle: data ?? [],
  })
}
