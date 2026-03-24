# HANDOFF — SIE 2028 v9.0

## QUÉ SE HIZO (Pasos Pasados)

**Fecha:** 9 de Marzo, 2026  
**Versión anterior:** v8.9-pre  
**Versión nueva:** v9.0  
**Estado:** PRODUCCIÓN  

### 1. BASE DE OPERACIÓN
- Tomada la versión v8.9-pre exactamente como estaba
- Sin cambios en estructura de carpetas
- Sin modificaciones a index.html
- Sin alteraciones a assets, vistas, datos

### 2. MODIFICACIÓN ÚNICA
**Archivo modificado:** `core/engine.js`

Se agregaron 5 nuevos motores al final del archivo, ANTES de los exports globales:

#### Motor 1: MotorPivotElectoral
- **Líneas:** ~20
- **Función:** Calcula pivot_score para identificar provincias decisivas
- **Fórmula:** (peso×0.35) + (competitividad×0.35) + (volatilidad×0.20) + (movilización×0.10)
- **Salida:** topFive, allScores, summary
- **Referencia:** Jacobson 2004

#### Motor 2: MotorRutaVictoria
- **Líneas:** ~15
- **Función:** Calcula combinaciones mínimas de provincias para ganar
- **Algoritmo:** Greedy optimization
- **Salida:** minimalRoute, provinciasCriticas, estrategia (CONCENTRADA/DISTRIBUIDA)
- **Referencia:** Teoría de Decisión

#### Motor 3: MotorMetaElectoral
- **Líneas:** ~18
- **Función:** Calcula meta de votos para 2028
- **Fórmula:** (padrón × participación) × 0.501
- **Salida:** meta (con 3 escenarios: pesimista, base, optimista), gap, evaluación
- **Referencia:** Leighley-Nagler 2013

#### Motor 4: MotorPrioridadEstrategica
- **Líneas:** ~18
- **Función:** Ranking de provincias por prioridad de inversión
- **Fórmula:** (pivot×0.40) + (gap×0.30) + (probabilidad×0.30)
- **Salida:** ranking, topTen, resumen (MÁXIMA/ALTA/MEDIA/BAJA)
- **Referencia:** Saaty 1977

#### Motor 5: MotorNormalizacionHistoricav9
- **Líneas:** ~25
- **Función:** Normaliza proyecciones por madurez organizativa del partido
- **Fórmula:** (años_fundación / 8) × √(ratio_votos), límites 0.95-1.12
- **Salida:** factor, interpretación, proyección ajustada
- **Referencia:** Panebianco 1988
- **Estado:** ACTIVADO (era esqueleto en v8.9)

### 3. REGISTROS GLOBALES
Se agregaron 5 líneas en window.SIE_MOTORES para registrar los nuevos motores:

```javascript
window.SIE_MOTORES.PivotElectoral = MotorPivotElectoral;
window.SIE_MOTORES.RutaVictoria = MotorRutaVictoria;
window.SIE_MOTORES.MetaElectoral = MotorMetaElectoral;
window.SIE_MOTORES.PrioridadEstrategica = MotorPrioridadEstrategica;
window.SIE_MOTORES.NormalizacionHistoricav9 = MotorNormalizacionHistoricav9;
```

### 4. ARCHIVOS ACTUALIZADOS
- **MANIFEST.json:** Versión 9.0, nuevos motores documentados
- **core/engine.js:** +~100 líneas de código (5 motores)
- **HANDOFF.md:** Este documento

### 5. ARCHIVOS SIN CAMBIOS
✅ index.html (idéntico)
✅ app.js (idéntico)
✅ core/ui.js (idéntico)
✅ assets/ (idéntico)
✅ data/ (idéntico)
✅ views/ (idéntico)
✅ docs/ (idéntico)
✅ README.md (idéntico)

### 6. ESTADÍSTICAS
- **Líneas de código nuevas:** ~100
- **Motores antes:** 18
- **Motores después:** 23 (+5)
- **Cambios breaking:** 0
- **Compatibilidad backward:** 100%
- **Interfaz modificada:** NO

### 7. CÓMO ACCEDER A LOS NUEVOS MOTORES

En navegador (consola):
```javascript
// Motor Pivot
window.SIE_MOTORES.PivotElectoral.calculate(provincesArray)

// Motor Ruta
window.SIE_MOTORES.RutaVictoria.calculate(votesPerProvinceObject)

// Motor Meta
window.SIE_MOTORES.MetaElectoral.calculate(padron, participacion, votosActuales)

// Motor Prioridad
window.SIE_MOTORES.PrioridadEstrategica.calculate(provincesArray)

// Motor Normalización
window.SIE_MOTORES.NormalizacionHistoricav9.normalize_projection(partido, yearsFounded, votesInitial, votesCurrent)
```

### 8. REFERENCIAS ACADÉMICAS
- Jacobson, Gary C. (2004) — "The Politics of Congressional Elections"
- Leighley, Jan H.; Nagler, Jonathan (2013) — "Who Votes Now?"
- Saaty, Thomas L. (1977) — "A Scaling Method for Priorities in Hierarchical Structures"
- Panebianco, Angelo (1988) — "Political Parties: Organization and Power"

### 9. VALIDACIÓN
✅ Código sintácticamente correcto
✅ Sin errores de lógica en fórmulas
✅ Motores registrados en window.SIE_MOTORES
✅ No rompe funcionalidad existente
✅ App v8.9 sigue funcionando 100% igual

### 10. ESTADO FINAL
- v9.0 = v8.9 + 5 nuevos motores
- Interfaz idéntica
- Funcionalidad idéntica
- Nuevas capacidades analíticas disponibles

