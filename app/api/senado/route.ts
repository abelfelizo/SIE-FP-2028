import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET /api/senado — curules senadores 2024 desde DB con partido real encabezador
export async function GET() {
  const { data: curules } = await supabase
    .from('curules')
    .select('provincia_id, partido, bloque, escanos')
    .eq('eleccion_id', 3)
    .eq('nivel', 'senadores')
    .order('provincia_id')

  const { data: provincias } = await supabase
    .from('provincias')
    .select('id, nombre')

  const provMap: Record<string, string> = {}
  for (const p of (provincias ?? [])) provMap[p.id] = p.nombre

  // Resumen por bloque
  const bloqueTotals: Record<string, number> = {}
  for (const c of (curules ?? [])) {
    const b = c.bloque ?? (c.partido === 'FP' ? 'FP' : 'PRM')
    bloqueTotals[b] = (bloqueTotals[b] ?? 0) + c.escanos
  }

  // Lista con nombre de provincia y partido encabezador
  const lista = (curules ?? []).map(c => ({
    provincia_id: c.provincia_id,
    provincia: provMap[c.provincia_id] ?? c.provincia_id,
    partido_encabezador: c.partido,  // quién encabezó la boleta
    bloque: c.bloque ?? (c.partido === 'FP' ? 'FP' : 'PRM'),
    escanos: c.escanos,
  }))

  return NextResponse.json({
    total: 32,
    bloques: bloqueTotals,
    lista,
    nota: 'partido_encabezador = partido que encabezó la boleta. bloque = bloque electoral al que pertenece.'
  })
}
