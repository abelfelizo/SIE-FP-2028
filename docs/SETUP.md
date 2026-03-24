# SIE 2028 — SETUP

## Uso inmediato (standalone)

Abre `SIE-2028-v84.html` directamente en el browser. No requiere servidor.

---

## Proyecto modular (desarrollo)

El proyecto modular requiere servidor HTTP local porque hace `fetch()` a los datasets.

### Opción 1 — Python
```bash
cd SIE-2028-GITHUB
python3 -m http.server 8080
# Abre: http://localhost:8080
```

### Opción 2 — Node.js
```bash
npx serve .
```

### Opción 3 — VS Code
Instala la extensión "Live Server" y haz click en "Go Live".

---

## Estructura del proyecto

```
SIE-2028-GITHUB/
├── index.html          ← Entry point
├── app.js              ← Boot: carga datasets, inyecta globals, lanza engine+UI
├── core/
│   ├── engine.js       ← 16 motores electorales (window.SIE_MOTORES)
│   └── ui.js           ← Vistas, navegación, render de componentes
├── assets/
│   └── css/styles.css  ← Estilos completos
├── data/               ← 7 datasets JCE 2024
└── docs/               ← Documentación
```

## Flujo de boot

```
index.html → app.js
  → fetch() 7 datasets → window._DS_*
  → loadScript(core/engine.js) → window.SIE_MOTORES
  → loadScript(core/ui.js) → inicia motores + renderiza
```

## ¿Por qué no funciona con doble-click en index.html?

Los browsers bloquean `fetch()` desde el filesystem local (`file://`) por CORS.
Siempre usa un servidor HTTP local.
