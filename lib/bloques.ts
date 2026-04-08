// Bloques electorales 2024 presidencial — FUENTE: JCE oficial 19 mayo 2024
// PED, GENS, OD, PRD, F.AMPLIO, PPT corrieron SOLOS — NO son PRM ni FP

export type Bloque = 'FP' | 'PRM' | 'PLD' | 'OTRO'

export const BLOQUES_2024_PRES: Record<string, Bloque> = {
  // ── Bloque FP: 1,259,427 votos (28.85%) ──
  FP: 'FP', BIS: 'FP', PQDC: 'FP', PSC: 'FP', PDI: 'FP',

  // ── Bloque PRM: 2,507,297 votos (57.44%) ──
  PRM: 'PRM', PRSC: 'PRM', ALPAIS: 'PRM', DXC: 'PRM', PUN: 'PRM',
  PHD: 'PRM', PCR: 'PRM', PRSD: 'PRM', MODA: 'PRM', APD: 'PRM',
  PP: 'PRM', PLR: 'PRM', PPC: 'PRM', UDC: 'PRM', PAL: 'PRM',
  PRI: 'PRM', PDP: 'PRM', PNVC: 'PRM', PASOVE: 'PRM', PPG: 'PRM',
  JS: 'PRM', FNP: 'PRM',

  // ── PLD solo: 453,468 votos (10.39%) ──
  PLD: 'PLD',

  // ── Partidos independientes → OTRO ──
  PED: 'OTRO', GENS: 'OTRO', OD: 'OTRO', PRD: 'OTRO',
  'F.AMPLIO': 'OTRO', PPT: 'OTRO', MA: 'OTRO', VERDE: 'OTRO',
}

// ── COLORES OFICIALES ──
// FP = VERDE (identidad visual de la herramienta)
// PRM = AZUL
// PLD = MORADO

export const BLOQUE_COLORS: Record<Bloque, string> = {
  FP:   '#16a34a',   // verde FP
  PRM:  '#1a6ae0',   // azul PRM
  PLD:  '#7c3aed',   // morado PLD
  OTRO: '#5a6185',
}

export const BLOQUE_DIM: Record<Bloque, string> = {
  FP:   '#14532d',
  PRM:  '#0e3580',
  PLD:  '#3d1a78',
  OTRO: '#252a3a',
}

export const BLOQUE_LABELS: Record<Bloque, string> = {
  FP:   'FP Bloque',
  PRM:  'PRM Bloque',
  PLD:  'PLD',
  OTRO: 'Otros',
}

// Totales oficiales JCE 19 mayo 2024 (para validación cruzada)
export const OFICIALES_2024_PRES = {
  inscritos:  8_145_548,
  emitidos:   4_429_079,
  validos:    4_365_147,
  nulos:         63_932,
  FP:    1_259_427,   // 28.85%
  PRM:   2_507_297,   // 57.44%
  PLD:     453_468,   // 10.39%
}

export function getBloque(partido: string): Bloque {
  return BLOQUES_2024_PRES[partido] ?? 'OTRO'
}

export function agruparBloques(
  rows: Array<{ partido: string; votos: number }>
): Record<Bloque, number> {
  const r: Record<Bloque, number> = { FP: 0, PRM: 0, PLD: 0, OTRO: 0 }
  for (const { partido, votos } of rows) r[getBloque(partido)] += votos
  return r
}
