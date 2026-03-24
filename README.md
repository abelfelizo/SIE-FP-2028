# SIE 2028 - Sistema de Inteligencia Electoral

**Versión**: 8.9
**Dataset Activo**: 2024 + 2020
**Estado**: ✅ Producción

## Descripción

Sistema web para análisis electoral avanzado en República Dominicana. Simula escenarios electorales, calcula distribución de escaños mediante D'Hondt y proporciona inteligencia electoral para campañas políticas.

## Características

- **Dashboard**: KPIs, top partidos, proyecciones
- **Mapa Electoral**: Visualización geográfica por provincia
- **Simulador**: Escenarios con Δpp (puntos porcentuales)
- **Potencial Electoral**: Score 0-100 por territorio
- **Motor Objetivo**: Recomendaciones estratégicas
- **Movilización**: Análisis de participación
- **D'Hondt**: Distribución de escaños
- **Auditoría**: Validaciones de integridad

## Estructura

```
SIE-2028/
├── data/                    ← Datasets 2024 (7 archivos)
├── core/                    ← Motores y lógica
├── views/                   ← Componentes UI
├── assets/                  ← CSS, JS, media
├── legacy/                  ← Datos archivados
├── docs/                    ← Documentación
└── index.html              ← Punto de entrada
```

## Cómo probar local

```bash
# 1. Clonar repo
git clone https://github.com/usuario/SIE-2028.git
cd SIE-2028

# 2. Ejecutar servidor local
python3 -m http.server 8080

# 3. Abrir navegador
http://localhost:8080
```

## Datasets activos (2024)

- `resultados_2024.json` - Votos por nivel electoral
- `padron_2024.json` - 8,145,548 inscritos
- `alianzas_2024.json` - Template para coaliciones
- `curules_catalogo.json` - 222 escaños (32+178+5+7)
- `curules_resultado_2024.json` - Curules distribuidas
- `territorios_catalogo.json` - 32 prov + 158 mun + 235 dm
- `partidos.json` - 39 partidos

## Niveles electorales

| Nivel | Territorialidad | Escaños | Status |
|-------|-----------------|---------|--------|
| Presidencial | Nacional | 1 | ✅ Activo |
| Senadores | 32 provincias | 32 | ✅ Activo |
| Diputados | 45 circunscripciones | 178 | ✅ Activo |
| Diputados Exterior | 3 circunscripciones | 7 | ✅ Activo |
| Diputados Nacionales | Nacional | 5 | ✅ Activo |
| Alcaldes | 158 municipios | - | ⏳ Inactivo |
| Directores DM | 235 distritos | - | ⏳ Inactivo |

## Validaciones 2024

- ✅ Padrón: 8,145,548 inscritos
- ✅ Presidencial: Porcentajes = JCE
- ✅ Senadores: Ganadores verificados
- ✅ Diputados: Curules coinciden
- ✅ Motor D'Hondt: Modo REPLAY

## Documentación

- `CHANGELOG_v8.md` - Cambios v8.3
- `docs/API.md` - Documentación API
- `docs/ARQUITECTURA.md` - Diseño del sistema
- `docs/MOTORES.md` - Descripción de motores

## Deploy

### GitHub Pages
1. Settings → Pages → Branch: main / (root)
2. Automático en cada push

### Docker
```bash
docker build -t sie2028 .
docker run -p 80:8080 sie2028
```

## Validación rápida en consola

```javascript
// Verificar padrón
console.log('Padrón:', window.DATA.padron.niveles.nacional.inscritos);
// Esperado: 8145548

// Verificar D'Hondt
const resultado = window.engines.dhondt.calcularSenadores();
console.log('Senadores:', resultado.length);
// Esperado: 32
```

## Roadmap 2026

- [ ] Integración datos 2020 para análisis tendencial
- [ ] Motor de proyecciones 2028
- [ ] API REST para terceros
- [ ] Matriz de transición electoral
- [ ] Encuestas de intención de voto
- [ ] Dashboard avanzado

## Licencia

Código abierto bajo licencia CC BY-NC-SA 4.0

## Autores

Equipo SIE 2028

## Soporte

Para reportar bugs o sugerir mejoras: [Issues](https://github.com/usuario/SIE-2028/issues)
