# SIE 2028 — Changelog

---

## v9.0 — Marzo 2026

### Nuevos motores estratégicos (M19–M22)
- **Motor Pivot Electoral (M19)**: identifica las provincias que deciden la elección · Score compuesto: padrón 35% + competitividad 35% + volatilidad 20% + movilización 10%
- **Motor Ruta de Victoria (M20)**: calcula la combinación mínima de provincias para alcanzar la meta electoral 2028
- **Motor Meta Electoral (M21)**: proyecta los votos necesarios para ganar en 2028 · 3 escenarios: pesimista (52%), base (54%), optimista (56%) de participación
- **Motor Prioridad Estratégica (M22)**: ranking de inversión por provincia · Score: pivot 40% + gap 30% + probabilidad de victoria 30%

### Corrección crítica de integración
- `engine_v9_nuevos_motores.js` agregado a la cadena de carga en `app.js` — estaba presente en el repositorio pero nunca se ejecutaba
- Los 4 motores nuevos ahora se registran correctamente en `window.SIE_MOTORES`
- Panel de Motores actualizado: M19–M22 aparecen como ACTIVOS
- Cache-busting actualizado a `?v=90`
- Versión actualizada a v9.0 en header, motores y consola

---



### Correcciones de sistema
- Versión actualizada a v8.9 en header, motores y cache-busting
- Motor Histórico 2020 movido de INACTIVO a ACTIVO en panel de motores
- Motor Normalización Histórica: descripción actualizada a modo COMPLETO (data 2020 integrada)
- Motor Municipal: descripción actualizada — pendiente dataset alcaldes 2020/2024

### Correcciones de UI
- `renderRiesgo()`: corregido para respetar partido seleccionado (`_RIE_PARTIDO`) — antes siempre filtraba por PRM sin importar el selector
- KPI "Total PRM" en vista Riesgo ahora es dinámico según partido activo
- `bindLevelBtns('riesgo-controls')` ahora pasa nivel y partido correctamente al handler

### Datos pendientes próxima sesión
- `alianzas_2020.json → diputados_interior`: 45 circunscripciones (Fase 0)
- Dataset alcaldes y directores municipales 2020/2024 (Fase 4)

---

# SIE 2028 — Changelog v8.0

## Resumen de cambios

### Arquitectura general
- Versión v8.0 — build final completo
- Ruta "Boleta única" eliminada del nav; funcionalidad fusionada en Simulador (tab D'Hondt)
- 8 módulos en navegación: Dashboard, Mapa, Simulador, Potencial, Movilización, Objetivo, Encuestas, Auditoría

---

### Simulador (views.js + simulacion.js)
- **Selector de territorio**: permite correr simulación para una provincia, municipio o circunscripción específica
- **Tab D'Hondt fusionado**: calcula distribución de escaños por circunscripción desde el simulador
- **Encuesta local**: si hay encuesta por territorio, aplica automáticamente; si no, usa simpatía general + arrastre presidencial
- **Definición de pp clarificada**: texto explicativo en UI — "adición aritmética al % base, renormalizada"
- **Arrastre presidencial — metodología profesional** (Feigert-Norris 1990, datos JCE 2004-2024):
  - Coeficientes k: >10pp → 0.55 | 5-10pp → 0.35 | <5pp → 0.18
  - Tope del 15% del total emitido del nivel
  - Descripción metodológica visible en UI
- **"Delta pp" renombrado a "Ajuste pp"** en toda la UI
- **Circunscripciones completas en tab D'Hondt**: DN (3 circ), La Vega (2), Pto. Plata (2), S. Cristóbal (3), Santiago (3), Sto. Domingo (6)

---

### Motor Potencial (potencial.js)
- **Corrección FP/nuevos actores**: partidos con crecimiento >80% en un ciclo (ej: FP 2020→2024, +~200%) usan "arraigo relativo" (diferencia local vs media nacional en 2024) en vez de tendencia 2020→2024 que daría resultados distorsionados
- **Nuevo componente**: Potencial de Conversión (base × reserva) — peso 20
- **Pesos calibrados**: Margen 35, Abstención 25, Conversión 20, Padrón 10, Tendencia 10
- Indicador "nuevo actor" visible en tabla

---

### Motor Objetivo (objetivo.js)
- **Plan de Acción Estratégico** (nuevo): genera recomendaciones priorizadas:
  - 📢 Movilización: si abstención >25% y votos recuperables >1,000
  - 🤝 Alianzas — ganancia residual: si hay partidos aliables (2-15% cada uno)
  - 📍 Inversión territorial selectiva: top 5 territorios por ROI
  - 🎯 Arrastre presidencial: si el partido tiene >40% presidencial
  - 🛡 Consolidación de territorios frágiles: margen <10pp
- **ROI por territorio**: eficiencia × (1 + abstención)
- **Tabla de territorios críticos mejorada**: incluye votos necesarios, ROI y tipo
- Backsolve calibrado con parámetros `ajustePP` (no `deltaPP`)

---

### Motor Movilización (simulacion.js + renderMovilizacion)
- **Techo corregido a 40%** de la abstención (antes 60% — sobreestimaba)
- Justificación: 60% de la abstención es estructural (emigrantes no depurados, fallecidos, desinterés crónico)
- Coeficientes de cascada actualizados: sen=0.88, dip=0.78, mun=0.72 (antes 0.85/0.75/0.70)

---

### Mapa (renderMapa)
- **Botón "Con aliados"**: pinta el mapa acumulando transferencia de aliados al líder de cada bloque
- **Botón "Sin aliados"**: resultado individual por partido (por defecto)
- Modo activo resaltado en UI
- Nota de circunscripción en panel de provincia para nivel diputados

---

### Criterio PP — definición formal
> pp (puntos porcentuales) = adición aritmética al porcentaje base.
> Ejemplo: PRM en 48.0% + 3 pp → 51.0%. No es un promedio.
> El sistema renormaliza todos los partidos para que sumen 100%.
> Esto es "Uniform Swing Model" estándar en análisis electoral.

---

### Corrección FP — justificación técnica
> La Fuerza del Pueblo nació de la escisión del PLD en 2019.
> En 2020 obtuvo ~7% como partido nuevo. En 2024 obtuvo ~22%.
> Ese +215% no es tendencia real: es efecto de fundación del partido.
> Usar pct_2020 como base para proyectar 2028 sobreestima el potencial.
> Solución v8: si un partido creció >80% en un solo ciclo, la tendencia
> se calcula como diferencia local vs media nacional en el año más reciente (2024).
