// constants/theme.ts — Gelato Flow Design System "Ink & Mint"

export const colors = {
  // ── Brand ──────────────────────────────────────────────────
  primary:     '#3ECFB2',   // Mint — acción principal, precios, highlights
  primaryDark: '#0D9E84',   // Mint oscuro — pressed states
  primaryLight:'#E8FAF7',   // Mint claro — fondos de chips activos

  // ── Ink (reemplaza el negro puro — más sofisticado) ────────
  ink:         '#1A1A2E',   // Headers, texto display, backgrounds oscuros
  inkMid:      '#4A4A6A',   // Texto cuerpo, labels
  inkMuted:    '#9898B0',   // Texto secundario, placeholders

  // ── Surfaces ───────────────────────────────────────────────
  background:  '#FAFAF8',   // Fondo general — cream cálido
  surface:     '#FFFFFF',   // Tarjetas, modales
  border:      'rgba(26,26,46,0.08)', // Bordes sutiles

  // ── Semánticos ─────────────────────────────────────────────
  accent:      '#F56B5C',   // Rose — errores, alertas, baja de stock
  success:     '#3ECFB2',   // Mismo mint = éxito
  amber:       '#F5A623',   // Warnings

  // ── Aliases (compatibilidad con código existente) ──────────
  text:        '#1A1A2E',
  muted:       '#9898B0',
}

export const fonts = {
  heading: 'System',
  body:    'System',
}

export const radius = {
  sm:  8,
  md:  12,
  lg:  16,
  xl:  24,
  pill: 100,
}

export const shadow = {
  sm: {
    shadowColor: '#1A1A2E',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  card: {
    shadowColor: '#1A1A2E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  header: {
    shadowColor: '#1A1A2E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
}