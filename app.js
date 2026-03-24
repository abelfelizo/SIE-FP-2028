// ================================================================
// SIE 2028 — ENTRY POINT v9.3
// Carga datasets 2024 + 2020, expone globals para engine + UI
// ================================================================

(async function boot() {
  const root = document.getElementById('view');

  function setMsg(msg, sub) {
    if (!root) return;
    root.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;
                  height:60vh;gap:1rem;color:var(--muted);">
        <div style="font-size:2rem">⚡</div>
        <div style="font-size:.9rem">${msg}</div>
        <div style="font-size:.75rem;color:var(--muted);text-align:center">${sub||''}</div>
      </div>`;
  }

  function setError(msg) {
    if (!root) return;
    root.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;
                  height:60vh;gap:1rem;">
        <div style="font-size:2rem">⚠️</div>
        <div style="font-size:.9rem;color:var(--red)">${msg}</div>
        <div style="font-size:.75rem;color:var(--muted);text-align:center;line-height:1.6">
          Verifica que estás sirviendo desde servidor local.<br>
          Usa: <code style="background:var(--bg3);padding:.1rem .4rem;border-radius:.3rem">python3 -m http.server 8080</code>
        </div>
      </div>`;
  }

  // ── Datasets 2024 ────────────────────────────────────────────
  const DS_2024 = [
    { key: '_DS_RESULTADOS',         file: 'resultados_2024.json'                 },
    { key: '_DS_RESULTADOS_PRES',    file: 'resultados_presidencial_2024.json'    },
    { key: '_DS_ALIANZAS',           file: 'alianzas_2024.json'                   },
    { key: '_DS_CURULES',            file: 'curules_resultado_2024.json'           },
    { key: '_DS_CURULES_CAT',        file: 'curules_catalogo.json'                },
    { key: '_DS_PARTIDOS',           file: 'partidos.json'                        },
    { key: '_DS_TERRITORIOS',        file: 'territorios_catalogo.json'            },
    { key: '_DS_PADRON',             file: 'padron_2024.json'                     },
    { key: '_DS_PADRON_PROV',        file: 'padron_provincial_2024.json'          },
    { key: '_DS_PADRON_CIRC',        file: 'padron_circ_2024.json'                },
    { key: '_DS_PADRON_EXT',         file: 'padron_exterior_2024.json'            },
    { key: '_PROV_METRICS_PRES',     file: 'prov_metrics_presidencial_2024.json'  },
    { key: '_PROV_METRICS_SEN',      file: 'prov_metrics_senadores_2024.json'     },
    { key: '_PROV_METRICS_DIP',      file: 'prov_metrics_diputados_2024.json'     },
    { key: '_PROV_METRICS',          file: 'prov_metrics_presidencial_2024.json'  },
    { key: '_PROV_PRES_32',          file: 'prov_pres_2024.json'                  },
    { key: '_PROV_SEN_32',           file: 'prov_sen_2024.json'                   },
    { key: '_PROV_DIP_32',           file: 'prov_dip_2024.json'                   },
    { key: '_DS_ALIANZAS',           file: 'alianzas_2024.json'                   },
  ];

  // ── Datasets 2020 ────────────────────────────────────────────
  const DS_2020 = [
    { key: '_DS_RESULTADOS_2020',        file: 'resultados_2020.json'                  },
    { key: '_DS_ALIANZAS_2020',          file: 'alianzas_2020.json'                    },
    { key: '_DS_CURULES_2020',           file: 'curules_resultado_2020.json'            },
    { key: '_DS_PADRON_PROV_2020',       file: 'padron_provincial_2020.json'           },
    { key: '_DS_PADRON_CIRC_2020',       file: 'padron_circ_2020.json'                 },
    { key: '_DS_PADRON_EXT_2020',        file: 'padron_exterior_2020.json'             },
    { key: '_PROV_METRICS_PRES_2020',    file: 'prov_metrics_presidencial_2020.json'   },
    { key: '_PROV_METRICS_SEN_2020',     file: 'prov_metrics_senadores_2020.json'      },
    { key: '_PROV_METRICS_DIP_2020',     file: 'prov_metrics_diputados_2020.json'      },
  ];

  const ALL_DS = [...DS_2024, ...DS_2020];
  const TOTAL_DS = ALL_DS.length;

  setMsg('Cargando datasets…', '');

  let loaded = 0;
  for (const ds of ALL_DS) {
    setMsg('Cargando ' + ds.file + '…', loaded + '/' + TOTAL_DS + ' archivos');
    try {
      const resp = await fetch('./data/' + ds.file);
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      window[ds.key] = await resp.json();
      loaded++;
    } catch (err) {
      setError('Error cargando ' + ds.file + ': ' + err.message);
      return;
    }
  }

  // ── Aliases 2024 — usar datasets de 32 provincias para motores estratégicos ──
  // _PROV_METRICS_* son los archivos detallados (45 circs para dip, con blocs)
  // _PROV_*_32 son los archivos por provincia (32 provincias, para riesgo/objetivo/movilizacion)
  window._PROV_PRES = window._PROV_METRICS_PRES;  // 32 prov, tiene pct_fp/pct_prm/bloque_coalicion
  window._PROV_SEN  = window._PROV_METRICS_SEN;   // 32 prov, tiene bloque_coalicion
  window._PROV_DIP  = window._PROV_METRICS_DIP;   // 45 circs, tiene pct_fp/pct_prm (fixed)
  // Exponer niveles de alianzas para simuladores D'Hondt y senadores
  window._DS_ALIANZAS_SEN = window._DS_ALIANZAS?.niveles?.senadores || [];
  window._DS_ALIANZAS_DIP = window._DS_ALIANZAS?.niveles?.diputados  || [];
  // Exponer resultados de curules 2024 para simulación D'Hondt 2028
  window._DS_CURULES_RES  = window._DS_CURULES || null;

  // ── votos_casilla_fp para transferencia leonelista senatorial ──
  // En 15 provincias FP no encabezó la alianza (blocs.FP === 0 en prov_metrics)
  // pero sí obtuvo votos en su propia casilla. Esos votos están en resultados_2024.json
  // bajo niveles.senadores[prov].resultados.FP y son los únicos que reflejan la
  // transferencia leonelista real recibida por FP en esa provincia.
  // Se inyecta como prov.votos_casilla_fp sin tocar blocs (que mantiene su significado
  // de votos totales del bloque del candidato que encabezó).
  if (window._PROV_METRICS_SEN && window._DS_RESULTADOS) {
    const senRes2024 = window._DS_RESULTADOS?.niveles?.senadores || [];
    window._PROV_METRICS_SEN.forEach(prov => {
      const r = senRes2024.find(s => s.provincia_id === prov.id);
      if (!r) return;
      prov.votos_casilla_fp  = r.resultados?.FP  || 0;
      prov.votos_casilla_prm = r.resultados?.PRM || 0;
      prov.votos_casilla_pld = r.resultados?.PLD || 0;
    });
  }

  // ── Encuestas: intentar cargar JSON si existe ──
  // El archivo se genera con: python3 convertir_encuestas.py
  setMsg('Buscando encuestas guardadas…', '');
  try {
    const encResp = await fetch('./data/encuestas_sie2028.json');
    if (encResp.ok) {
      const encData = await encResp.json();
      if (encData && encData.length) {
        window._ENCUESTAS_PRECARGADAS = encData;
        console.log('📊 Encuestas precargadas: ' + encData.length + ' registros');
      }
    }
  } catch (_) {
    // No existe el archivo — normal, el sistema corre sin encuestas
  }

  // ── Hook global de recalibración ──
  // Llamar window.SIE_RECALIBRAR() desde cualquier vista para
  // re-ejecutar el pipeline y actualizar todas las vistas
  window.SIE_RECALIBRAR = function(pollsArray) {
    const M = window.SIE_MOTORES;
    if (!M) return;
    if (pollsArray) M.Encuestas.cargar(pollsArray);
    if (M.Pipeline) M.Pipeline._ejecutado = false;
    if (M.Pipeline) M.Pipeline.ejecutar();
    // Re-renderizar vistas activas
    if (typeof window._safeRender === 'function') window._safeRender();
    console.log('🔄 SIE: Recalibración completa — ' + new Date().toLocaleTimeString());
  };

  setMsg('Inicializando motores…', TOTAL_DS + '/' + TOTAL_DS + ' datasets listos');

  try {
    await loadScript('./core/engine.js');

    // ── Cargar encuestas precargadas al motor antes del pipeline ──
    if (window._ENCUESTAS_PRECARGADAS && window.SIE_MOTORES.Encuestas) {
      window.SIE_MOTORES.Encuestas.cargar(window._ENCUESTAS_PRECARGADAS);
      // Sync to SIE_ENCUESTAS.lista so renderEncuestas() displays them
      window.SIE_ENCUESTAS = window.SIE_ENCUESTAS || { lista: [], activo: false };
      window._ENCUESTAS_PRECARGADAS.forEach(function(o) {
        // Normalizar campos: unificar firma/empresa, uppercase→lowercase, tipo largo→corto
        var norm = Object.assign({ activa: true }, o);
        // Unificar firma/empresa en ambas direcciones
        if (!norm.empresa && norm.firma)   norm.empresa = norm.firma;
        if (!norm.firma   && norm.empresa) norm.firma   = norm.empresa;
        // Normalizar porcentajes uppercase → lowercase
        if (norm.PRM != null && norm.prm == null) norm.prm = norm.PRM;
        if (norm.FP  != null && norm.fp  == null) norm.fp  = norm.FP;
        if (norm.PLD != null && norm.pld == null) norm.pld = norm.PLD;
        if (norm.PRD != null && norm.prd == null) norm.prd = norm.PRD;
        // Normalizar tipo: 'intencion_candidato'→'candidato', 'simpatia_partidaria'→'simpatia'
        if (norm.tipo === 'intencion_candidato') norm.tipo = 'candidato';
        if (norm.tipo === 'simpatia_partidaria') norm.tipo = 'simpatia';
        window.SIE_ENCUESTAS.lista.push(norm);
      });
      window.SIE_ENCUESTAS.activo = true;
    }

    // ── Pipeline v10.2: ejecutar después de engine, antes de UI ──
    // Esto precalcula todos los motores en cadena y expone
    // window._SIE_PIPELINE para que ui.js lo consuma directamente
    setMsg('Ejecutando pipeline estratégico v10.2…', 'Motores M-A → M-H');
    try {
      if (window.SIE_MOTORES && window.SIE_MOTORES.Pipeline) {
        window.SIE_MOTORES.Pipeline.ejecutar();
      }
    } catch (pipeErr) {
      console.warn('⚠️ Pipeline v10.2: error parcial —', pipeErr.message);
      // No es fatal — la UI carga igual con degradación graceful
    }

    await loadScript('./core/ui.js');
  } catch (err) {
    setError('Error cargando motor: ' + err.message);
    return;
  }

  console.log('✅ SIE 2028 v10.2 · Pipeline integrado · 2024 + 2020 ACTIVOS · Boot OK');
})();

function loadScript(src) {
  return new Promise(function(resolve, reject) {
    var s = document.createElement('script');
    s.src = src + '?v=102';
    s.onload = resolve;
    s.onerror = function() { reject(new Error('No se pudo cargar ' + src)); };
    document.body.appendChild(s);
  });
}
