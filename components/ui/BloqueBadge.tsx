'use client'

const CFG: Record<string, { color: string; bg: string; border: string }> = {
  FP:   { color: '#16a34a', bg: '#16a34a18', border: '#16a34a40' },
  PRM:  { color: '#1a6ae0', bg: '#1a6ae018', border: '#1a6ae040' },
  PLD:  { color: '#7c3aed', bg: '#7c3aed18', border: '#7c3aed40' },
  OTRO: { color: '#5a6185', bg: '#5a618518', border: '#5a618540' },
}

export function BloqueBadge({ partido, size = 'sm' }: { partido: string; size?: 'sm' | 'xs' }) {
  const c = CFG[partido] ?? CFG.OTRO
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      fontFamily: 'monospace', fontSize: size === 'xs' ? '.52rem' : '.6rem',
      fontWeight: 600, padding: '.08rem .35rem', borderRadius: '3px',
      color: c.color, background: c.bg, border: `1px solid ${c.border}`,
    }}>
      {partido}
    </span>
  )
}
