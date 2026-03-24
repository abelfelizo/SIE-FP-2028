# VERIFICACIÓN DE MOTORES - DATASET 2024

**Fecha**: 2026-03-07  
**Estado**: LISTO PARA VERIFICACIÓN  
**Dataset**: 2024 (ACTIVO)

---

## 1. MOTOR DHONDT_ENGINE.JS

### Modo: REPLAY (No recalcular)

**Función**: Cargar y visualizar curules históricas de 2024  
**Dataset base**: `data/curules_resultado_2024.json`

**Verificación de ruta**:
```javascript
// ✅ CORRECTO (después de migración):
import curules from '../data/curules_resultado_2024.json';

// ❌ INCORRECTO (antes de migración):
// import curules from './curules_resultado_2024.json';
// import curules from '../legacy/curules_resultado_2024.json';
```

**Validación de datos**:
- Senadores: 32 (1 por provincia)
- Diputados territoriales: 178 (45 circunscripciones)
- Diputados nacionales: 5
- Diputados exterior: 7 (3 circunscripciones)
- **TOTAL: 222 escaños**

**Test 1 - Presidencial**:
```javascript
// Verificar que no intenta calcular escaños (es nacional)
const resultado = dhondt.calcularPresidencial(resultados_2024);
console.assert(resultado.escaños === 1, "Presidencial debe ser 1 escaño");
```

**Test 2 - Senadores**:
```javascript
// Verificar 32 provincias, 1 escaño cada una
const resultado = dhondt.calcularSenadores(resultados_2024, territorios_catalogo);
console.assert(resultado.length === 32, "Debe haber 32 provincias");
console.assert(resultado.every(r => r.escaños === 1), "Cada provincia 1 escaño");
```

**Test 3 - Diputados (45 circunscripciones)**:
```javascript
// Verificar D'Hondt por cada circunscripción
const resultado = dhondt.calcularDiputados(resultados_2024, territorios_catalogo);
console.assert(resultado.length === 45, "Debe haber 45 circunscripciones");

// Validar suma total
const totalEscaños = resultado.reduce((sum, circ) => sum + circ.escaños, 0);
console.assert(totalEscaños === 178, "Total debe ser 178 diputados territoriales");
```

**Test 4 - Exterior (3 circunscripciones)**:
```javascript
// Verificar 3 circunscripciones exterior
const resultado = dhondt.calcularExterior(resultados_2024);
console.assert(resultado.length === 3, "Debe haber 3 circunscripciones exterior");
console.assert(resultado[0].escaños === 3, "Circ 1: 3 escaños");
console.assert(resultado[1].escaños === 2, "Circ 2: 2 escaños");
console.assert(resultado[2].escaños === 2, "Circ 3: 2 escaños");
console.assert(resultado.reduce((sum, c) => sum + c.escaños, 0) === 7, "Total 7");
```

---

## 2. MOTOR SIMULADOR2028.JS

### Modo: CÁLCULO (Simula escenarios)

**Función**: Simular cambios de voto y recalcular escaños  
**Datasets base**: 
- `data/resultados_2024.json` (votos actuales)
- `data/padron_2024.json` (inscritos)

**Verificación de ruta**:
```javascript
// ✅ CORRECTO:
import resultados from '../data/resultados_2024.json';
import padron from '../data/padron_2024.json';

// ❌ INCORRECTO:
// import resultados from './results_2020.json';
// import padron from '../legacy/padron_2020.json';
```

**Test 1 - Padrón nacional**:
```javascript
// Verificar que carga padrón correcto
console.assert(padron.niveles.nacional.inscritos === 8145548, "Padrón debe ser 8,145,548");
```

**Test 2 - Simular Δpp en presidencial**:
```javascript
// Simular +2pp para PRM
const delta = 2;
const escenario = simulador.simularPresidencial(resultados_2024, delta);

// Verificar que suma al 100%
const suma = Object.values(escenario.resultados).reduce((sum, votos) => sum + votos, 0);
console.assert(suma === resultados_2024.niveles.presidencial.territorio.totales.votos_validos, 
  "Votos deben coincidir");
```

**Test 3 - Simular Δpp en senadores**:
```javascript
// Simular +3pp para FP en senadores
const escenario = simulador.simularSenadores(resultados_2024, "FP", 3);

// Verificar que produce nuevos ganadores en algunas provincias
console.assert(escenario.cambios > 0, "Debe haber cambios en ganadores");
```

**Test 4 - Simular Δpp en diputados (45 circunscripciones)**:
```javascript
// Simular +1pp uniforme en todas las circunscripciones
const escenario = simulador.simularDiputados(resultados_2024, 1);

// Verificar que total de escaños sigue siendo 178
const totalEscaños = escenario.circunscripciones.reduce((sum, c) => sum + c.escaños, 0);
console.assert(totalEscaños === 178, "Debe mantener 178 diputados territoriales");
```

---

## 3. MOTOR PIPELINE2028.JS

### Modo: ORQUESTACIÓN

**Función**: Coordinar carga de datos y llamadas a otros motores  
**Dataset central**: `data/resultados_2024.json`

**Verificación de ruta**:
```javascript
// ✅ CORRECTO:
const dataPipeline = {
  resultados: require('../data/resultados_2024.json'),
  padron: require('../data/padron_2024.json'),
  territorios: require('../data/territorios_catalogo.json'),
  partidos: require('../data/partidos.json'),
  curules: require('../data/curules_resultado_2024.json')
};

// ❌ INCORRECTO:
// const dataPipeline = require('../legacy/results_2020.json');
```

**Test 1 - Carga de todos los datasets**:
```javascript
// Verificar que carga 7 archivos correctamente
const archivos = ['resultados', 'padron', 'territorios', 'partidos', 'curules', 'alianzas'];
archivos.forEach(archivo => {
  console.assert(dataPipeline[archivo] !== null, `${archivo} debe estar cargado`);
});
```

**Test 2 - Integridad de datos**:
```javascript
// Verificar que los datos están completos
console.assert(dataPipeline.resultados.niveles.presidencial, "Presidencial debe existir");
console.assert(dataPipeline.resultados.niveles.senadores.length === 32, "32 senadores");
console.assert(dataPipeline.resultados.niveles.diputados.length === 45, "45 circunscripciones");
console.assert(dataPipeline.padron.niveles.nacional.inscritos === 8145548, "Padrón correcto");
```

---

## 4. MOTOR ENGINE.JS

### Modo: MOTOR PRINCIPAL

**Función**: Motor orquestador principal del sistema  
**Dataset**: `data/resultados_2024.json`

**Verificación de ruta**:
```javascript
// ✅ CORRECTO:
const ENGINE_DATA = {
  path: './data/',
  files: {
    resultados: 'resultados_2024.json',
    padron: 'padron_2024.json',
    territorios: 'territorios_catalogo.json',
    partidos: 'partidos.json'
  }
};

// ❌ INCORRECTO:
// const ENGINE_DATA = { path: './legacy/datasets/2020/', ... };
```

**Test 1 - Inicialización**:
```javascript
// Verificar que engine se inicializa con 2024
const engine = new SIE2028Engine();
engine.init('./data/');
console.assert(engine.dataset === '2024', "Dataset debe ser 2024");
```

---

## 5. VALIDACIONES GLOBALES

### 5.1 - Porcentajes presidencial JCE vs Dataset

**JCE Oficial 2024**:
- PRM: 48.04%
- FP: 26.42%
- PLD: 10.31%
- Otros: 15.23%

**Validación en código**:
```javascript
const pres = resultados_2024.niveles.presidencial;
const votos = pres.territorio.resultados;
const totales = pres.territorio.totales.votos_validos;

const porcPRM = (votos.PRM / totales * 100).toFixed(2);
const porcFP = (votos.FP / totales * 100).toFixed(2);

console.assert(porcPRM === "48.04" || Math.abs(parseFloat(porcPRM) - 48.04) < 0.5, 
  `PRM debe ser ~48.04%, es ${porcPRM}%`);
console.assert(porcFP === "26.42" || Math.abs(parseFloat(porcFP) - 26.42) < 0.5, 
  `FP debe ser ~26.42%, es ${porcFP}%`);
```

### 5.2 - Ganadores senadores por provincia

**Validación**: Verificar que ganador de senadores coincide con JCE 2024

```javascript
const senadores = resultados_2024.niveles.senadores;

senadores.forEach(prov => {
  const ganador = Object.entries(prov.resultados)
    .reduce((a, b) => a[1] > b[1] ? a : b)[0];
  
  console.log(`${prov.provincia}: ${ganador}`);
  // Comparar contra resultados JCE oficial
});
```

### 5.3 - Curules diputados por circunscripción

**Validación**: Verificar que curules coinciden con curules_resultado_2024.json

```javascript
const diputados = resultados_2024.niveles.diputados;
const curules_oficial = curules_resultado_2024.json;

diputados.forEach(circ => {
  const key = `${circ.provincia_id}_${circ.circ}`;
  const cululesEsperados = curules_oficial[key];
  
  console.assert(circ.curules === cululesEsperados, 
    `${circ.provincia} Circ ${circ.circ}: curules incorrectos`);
});
```

### 5.4 - Motor D'Hondt no recalcula

**Validación**: Verificar que D'Hondt está en modo REPLAY

```javascript
const dhondt = require('../core/dhondt_engine.js');

// Verificar que tiene flag REPLAY
console.assert(dhondt.MODE === 'REPLAY', "D'Hondt debe estar en REPLAY");
console.assert(dhondt.useHistoric === true, "Debe usar curules históricas");
console.assert(dhondt.recalculate === false, "NO debe recalcular");
```

---

## 6. CHECKLIST DE VERIFICACIÓN

```
ANTES DE DECLARAR LISTO:

□ Datasets activos copiados a data/
  □ resultados_2024.json
  □ padron_2024.json
  □ alianzas_2024.json
  □ curules_catalogo.json
  □ curules_resultado_2024.json
  □ territorios_catalogo.json
  □ partidos.json

□ Datasets antiguos movidos a legacy/
  □ results_2020.json → legacy/datasets/2020/
  □ padron_2020.json → legacy/datasets/2020/
  □ Otros temporales → legacy/datasets/temporales/
  □ Test files → legacy/datasets/test/

□ Rutas en motores verificadas
  □ dhondt_engine.js apunta a data/curules_resultado_2024.json
  □ simulador2028.js apunta a data/resultados_2024.json
  □ pipeline2028.js apunta a data/
  □ engine.js apunta a data/

□ Tests ejecutados
  □ Presidencial: Porcentajes coinciden
  □ Senadores: Ganadores coinciden
  □ Diputados: Curules coinciden
  □ D'Hondt: Modo REPLAY activo

□ Sistema operativo
  □ Dashboard carga datos
  □ Simulador corre con 2024
  □ Mapa pinta provincias
  □ Auditoría no reporta errores
```

---

## 7. COMANDOS DE PRUEBA

### Prueba 1: Verificar carga de datasets
```bash
# En consola del navegador:
console.log('Padrón:', window.DATA.padron.niveles.nacional.inscritos);
// Esperado: 8145548
```

### Prueba 2: Verificar motor D'Hondt
```bash
# En consola:
const resultado = window.engines.dhondt.calcularSenadores();
console.log('Senadores:', resultado.length);
// Esperado: 32
```

### Prueba 3: Simular cambio de voto
```bash
# En consola:
const escenario = window.engines.simulador.simularPresidencial(2); // +2pp
console.log('Nuevo resultado:', escenario);
```

---

**Estado**: ✅ LISTO PARA EJECUTAR VERIFICACIONES

