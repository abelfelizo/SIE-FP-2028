# SIE 2028 — CHANGELOG v16.0
**Fecha:** 24 de marzo 2026  
**Versión anterior:** v15c-rediseño  
**Estado:** PRODUCCIÓN

---

## CORRECCIONES CRÍTICAS (bugs que rompían funcionalidad)

### D-1 · 26/26 archivos de datos restaurados
Todos los archivos JSON de datos estaban ausentes en la versión de rediseño. Se incorporan los 26 archivos validados (2024 + 2020), incluyendo `encuestas_sie2028.json` con 4 encuestas de muestra.

### D-2 · Replay — columna Provincia mostraba "undefined"
`getSwingPresidencial()` retornaba campo `provincia` pero el renderizador buscaba `nombre`. Fix: `r.provincia||r.nombre||r.id`.

### N-4 · Tabs de Senadores no cambiaban el contenido
`data-tab` de los botones (`sen-real`/`sen-coal`) no coincidía con los IDs de los paneles (`sen-tab-real`/`sen-tab-coal`). Además había un listener redundante que creaba conflicto. Fix: alinear IDs y eliminar listener duplicado.

### L-1 · Encuestas mostraban "undefined" en firma y porcentajes
El archivo JSON usa `firma` (mayúsculas `PRM`/`FP`/`PLD`) pero el render buscaba `empresa` (minúsculas `prm`/`fp`/`pld`). Fix: normalización bidireccional completa en `app.js` incluyendo tipo `intencion_candidato`→`candidato`.

---

## CORRECCIONES IMPORTANTES (datos incorrectos o UX rota)

### N-1 · Eliminadas vistas legado vacías
Removidos los 4 `<div>` vacíos `view-transferencia`, `view-potencial`, `view-movilizacion`, `view-oportunidades` que ya no tienen rutas activas.

### N-2 · Vista Presidencial — agregados KPIs
Se añade fila de 6 KPIs al tope de la vista Presidencial: Ganador, 2do lugar, Participación, Abstención, Margen vs 2do, Votos válidos.

### N-3 · Vista Presidencial — desglose por provincia y municipio
Dos secciones colapsables añadidas debajo de "Por partido individual":
- **Por provincia** (32): tarjetas con ganador, margen, barras de color, PRM% y FP%
- **Por municipio** (158): tarjetas con filtro por provincia

### L-2 · "Leonelista" → "PLD 2020 / peledeísta/danilista"
El motor medía la transferencia del voto de Gonzalo Castillo (PLD 2020), no del voto de Leonel que ya estaba en FP desde 2020. Corregido en todas las notas, KPIs y etiquetas de usuario.

### L-3 · Transferencia — sorter de filas agregado
La tabla de Transferencia (tab Presidencial) ahora tiene encabezados clicables para ordenar por: Provincia, PLD 2020, Migrado, Captable, Prioridad, Estado.

### L-4 · KPIs de Alianzas se actualizan al cambiar de tab
Al navegar Presidencial → Senadores → Diputados en Alianzas, los 4 KPIs del tope ahora muestran datos del nivel activo.

### L-5 · Encabezado "¿Quién encabeza?" especifica Alianza FP+PLD
Añadido label "¿Quién encabeza la Alianza FP+PLD? · Nivel presidencial" y nota explicativa del criterio Cox (1997).

### L-6 · Umbral "compiten fuerte": 30% → 40%
Con PRM promediando 55-57%, un 30% no era competencia real. Ajustado a >40%.

### L-7 · Alianza duplicada removida de Oportunidades
Los datos de impacto de alianza FP+PLD se eliminaron de la lista de Oportunidades (ya están completos en la vista Alianzas). Se añade nota con link a la sección Alianzas.

### L-8 · Labels de circunscripciones en Movilización
Eliminado el código de provincia redundante del número de circunscripción. "Bahoruco · Circ. 04-C1" → "Bahoruco · C1".

---

## MEJORAS DE CÓDIGO (deuda técnica)

### A-1 · Eliminado bloque de exports duplicado
El archivo `ui.js` tenía el bloque `window.renderXxx = typeof...` declarado 2 veces. Se eliminó el bloque temprano que ejecutaba antes de que las funciones estuvieran definidas.

### C-2 · Banner de proyección baseline
La vista Proyección 2028 ahora muestra un aviso cuando no hay encuestas 2027 activas, aclarando que la proyección es un baseline metodológico.

---

## DATOS

| Archivo | Estado |
|---------|--------|
| 26/26 archivos JSON | ✅ Presentes y validados |
| PLD 2020 nacional vs prov_metrics | ✅ 0 discrepancias |
| Ganadores senadores vs curules | ✅ 0 discrepancias |
| Curules 2024: senadores=32, diputados=178 | ✅ Correcto |

