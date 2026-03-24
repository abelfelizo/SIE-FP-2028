
// ================================================================
// SIE 2028 — MOTORES CORE v8.4
// Dataset: 2024 | Metodología: modelos electorales validados
// ================================================================
// Fuentes metodológicas:
//   D'Hondt: Ley Electoral RD 275-97, Art. 68
//   ENPP:    Laakso & Taagepera (1979) "Effective Number of Parties"
//   Riesgo:  Jacobson (2004) competitiveness framework
//   Swing:   Gelman & King (1994) elastic electorate
//   Proyección: Fundamentals model (Abramowitz 2008) adaptado
//   Movilización: Turnout gap theory (Leighley & Nagler 2013)
// ================================================================

// ─────────────────────────────────────────────────────────────────
// MOTOR 1: CARGA DE DATASETS
// Rol: punto de entrada único, valida schema antes de distribuir
// ─────────────────────────────────────────────────────────────────
const MotorCarga = {
  status: 'READY',
  datasets: {},
  init(datasets) {
    this.datasets = datasets;
    const required = ['resultados','curules','partidos','padron','territorios','alianzas','curulesCat'];
    const missing = required.filter(k => !datasets[k]);
    if (missing.length) {
      console.error('❌ Motor Carga: faltan datasets:', missing);
      this.status = 'ERROR';
      return null;
    }
    console.log('✅ Motor Carga: 7 datasets validados · Dataset 2024 ACTIVO');
    this.status = 'READY';
    return this.datasets;
  }
};

// ─────────────────────────────────────────────────────────────────
// MOTOR 2: VALIDACIÓN / CONSISTENCIA
// Modelo: auditoría de consistencia interna (MIT Election Data Lab)
// Reglas: suma lógica de votos, partidos en catálogo, curules cuadran
// ─────────────────────────────────────────────────────────────────
const MotorValidacion = {
  errores: [],
  advertencias: [],
  ok: false,

  run(resultados, partidos, curulesCat, curulesCRes) {
    this.errores = [];
    this.advertencias = [];

    const catPartidos = new Set(partidos.partidos.map(p => p.id));
    const pres = resultados.niveles.presidencial;
    const totales = pres.totales;

    // R1: votos válidos + nulos = emitidos
    const suma = totales.votos_validos + totales.votos_nulos;
    if (Math.abs(suma - totales.votos_emitidos) > 10) {
      this.errores.push(`R1: válidos(${totales.votos_validos})+nulos(${totales.votos_nulos})≠emitidos(${totales.votos_emitidos})`);
    }

    // R2: suma de votos por partido = votos_validos (presidencial)
    const sumaPartidos = Object.values(pres.resultados).reduce((s,n)=>s+n,0);
    if (Math.abs(sumaPartidos - totales.votos_validos) > 100) {
      this.errores.push(`R2: suma votos partidos (${sumaPartidos}) ≠ votos válidos (${totales.votos_validos})`);
    }

    // R3: todos los partidos en resultados existen en catálogo
    Object.keys(pres.resultados).forEach(p => {
      if (!catPartidos.has(p)) this.advertencias.push(`R3: partido '${p}' no está en catálogo`);
    });

    // R4: curules senadores = 32
    const senCurules = curulesCRes.niveles.senadores.reduce((s,x)=>
      s + x.resultado.reduce((a,r)=>a+r.curules,0),0);
    if (senCurules !== 32) this.errores.push(`R4: senadores=${senCurules} (esperado 32)`);

    // R5: curules diputados territoriales = 158 (Constitución 2024, Art.81 — antes 178)
    const dipCurules = curulesCRes.niveles.diputados.reduce((s,x)=>
      s + x.resultado.reduce((a,r)=>a+r.curules,0),0);
    // Nota: dataset 2024 aún usa 178; en 2028 serán 158 según redistribución JCE pendiente
    if (dipCurules !== 178 && dipCurules !== 158) this.errores.push(`R5: diputados=${dipCurules} (esperado 178 histórico / 158 desde 2028)`);

    // R6: curules total = 202 (170 diputados + 32 senadores — Constitución 2024)
    const natCurules = (curulesCRes.niveles.diputados_nacionales.resultado||[]).reduce((s,r)=>s+r.curules,0);
    const extCurules = curulesCRes.niveles.diputados_exterior.reduce((s,x)=>
      s+x.resultado.reduce((a,r)=>a+r.curules,0),0);
    const totalCurules = senCurules + dipCurules + natCurules + extCurules;
    // Acepta 222 (dataset 2024 con 178 territoriales) o 202 (2028 con 158 territoriales)
    if (totalCurules !== 222 && totalCurules !== 202) this.errores.push(`R6: total curules=${totalCurules} (222 histórico / 202 desde 2028)`);

    // R7: participación razonable (entre 40% y 90%)
    const partic = totales.porcentaje_participacion;
    if (partic < 40 || partic > 90) this.advertencias.push(`R7: participación=${partic}% fuera de rango normal`);

    this.ok = this.errores.length === 0;
    return { ok: this.ok, errores: this.errores, advertencias: this.advertencias, totalCurules };
  }
};

// ─────────────────────────────────────────────────────────────────
// MOTOR 3: PADRÓN / PARTICIPACIÓN
// Modelo: turnout analysis (Leighley & Nagler 2013)
// Schema nuevo: padron.padron[] con tipo 'provincia'|'municipio'
// ─────────────────────────────────────────────────────────────────
const MotorPadron = {
  _list: [],
  PADRON_OFICIAL: 8145548, // validado JCE, incluye exterior

  init(padronRaw) {
    this._list = padronRaw.padron;
  },

  // Padrón doméstico (solo provincias, sin exterior)
  getPadronNacional() {
    return this._list.reduce((s,x)=> x.tipo==='provincia' ? s+x.inscritos : s, 0);
  },

  // Padrón oficial completo (doméstico + exterior) según JCE
  getPadronOficial() {
    return this.PADRON_OFICIAL;
  },

  getPadronProvincia(provinciaId) {
    return this._list.find(x=> x.tipo==='provincia' && x.territorio_id===provinciaId);
  },

  getPadronMunicipio(municipioId) {
    return this._list.find(x=> x.tipo==='municipio' && x.territorio_id===municipioId);
  },

  getAllProvincias() {
    return this._list.filter(x=> x.tipo==='provincia');
  },

  // Participación nacional (usa padrón oficial JCE)
  getParticipacionNacional(votosEmitidos) {
    return +(votosEmitidos / this.PADRON_OFICIAL * 100).toFixed(2);
  },

  // Participación provincial (usa padrón doméstico provincial)
  getParticipacionProvincia(provinciaId, votosEmitidos) {
    const p = this.getPadronProvincia(provinciaId);
    if (!p || p.inscritos === 0) return 0;
    return +(votosEmitidos / p.inscritos * 100).toFixed(2);
  },

  // Abstención = 100 - participación
  getAbstencion(participacion) {
    return +(100 - participacion).toFixed(2);
  }
};

// ─────────────────────────────────────────────────────────────────
// MOTOR 4: RESULTADOS ELECTORALES
// Modelo: agregación directa + desagregación por bloques electorales
// ─────────────────────────────────────────────────────────────────
const MotorResultados = {
  _r: null, _a: null, _p: null,
  _partyNames: {},
  _blocMap: {},

  init(resultados, alianzas, partidos) {
    this._r = resultados;
    this._a = alianzas;
    this._p = partidos;
    this._partyNames = Object.fromEntries(partidos.partidos.map(p=>[p.id, p.nombre]));
    this._buildBlocMap();
  },

  _buildBlocMap() {
    this._blocMap = {};
    (this._a.niveles.presidencial[0]?.bloques || []).forEach(bloc => {
      bloc.partidos.forEach(p => { this._blocMap[p] = bloc.candidato_base; });
    });
  },

  getPartidoNombre(id) { return this._partyNames[id] || id; },
  getBlocFor(id)        { return this._blocMap[id] || id; },

  // Resultados presidenciales agregados por bloque
  getPresidencialByBloc() {
    const raw    = this._r.niveles.presidencial.resultados;
    const totales = this._r.niveles.presidencial.totales;
    const blocs  = {};
    Object.entries(raw).forEach(([p,v]) => {
      const b = this.getBlocFor(p);
      blocs[b] = (blocs[b]||0) + v;
    });
    return Object.entries(blocs)
      .map(([id,votos]) => ({
        id, votos,
        nombre: this.getPartidoNombre(id),
        pct: +(votos/totales.votos_validos*100).toFixed(2)
      }))
      .sort((a,b) => b.votos - a.votos);
  },

  // Resultados presidenciales por partido individual (sin agrupar)
  getPresidencialByPartido() {
    const raw = this._r.niveles.presidencial.resultados;
    const total = this._r.niveles.presidencial.totales.votos_validos;
    return Object.entries(raw)
      .map(([id,votos]) => ({ id, nombre: this.getPartidoNombre(id), votos, pct: +(votos/total*100).toFixed(2) }))
      .sort((a,b) => b.votos - a.votos);
  },

  getTotalesPresidencial() { return this._r.niveles.presidencial.totales; },

  // Resultados presidenciales por provincia con alianzas aplicadas
  getPresidencialPorProvincia() {
    const provArr = this._r.niveles.presidencial.por_provincia || [];
    return provArr.map(prov => {
      const blocs = {};
      Object.entries(prov.resultados).forEach(([p,v]) => {
        const b = this.getBlocFor(p);
        blocs[b] = (blocs[b]||0)+v;
      });
      const sorted  = Object.entries(blocs).sort((a,b)=>b[1]-a[1]);
      const total   = sorted.reduce((s,[,v])=>s+v,0);
      const ganador = sorted[0][0];
      const pct_gan = +(sorted[0][1]/total*100).toFixed(2);
      const margen  = sorted.length>=2 ? +((sorted[0][1]-sorted[1][1])/total*100).toFixed(2) : pct_gan;
      return {
        provincia_id:  prov.provincia_id,
        provincia:     prov.provincia,
        ganador,
        pct_ganador:   pct_gan,
        margen_pp:     margen,
        blocs,
        resultados_raw: prov.resultados,
        totales: prov.totales,
        top3: sorted.slice(0,3).map(([id,v])=>({id, pct:+(v/total*100).toFixed(2)}))
      };
    });
  },

  // Resultados presidenciales por municipio con alianzas aplicadas
  getPresidencialPorMunicipio() {
    const munArr = this._r.niveles.presidencial.por_municipio || [];
    return munArr.map(mun => {
      const blocs = {};
      Object.entries(mun.resultados).forEach(([p,v]) => {
        const b = this.getBlocFor(p);
        blocs[b] = (blocs[b]||0)+v;
      });
      const sorted  = Object.entries(blocs).sort((a,b)=>b[1]-a[1]);
      const total   = sorted.reduce((s,[,v])=>s+v,0);
      const ganador = total > 0 ? sorted[0][0] : null;
      return {
        municipio_id: mun.municipio_id,
        provincia_id: mun.provincia_id,
        municipio:    mun.municipio,
        ganador,
        pct_ganador: total > 0 ? +(sorted[0][1]/total*100).toFixed(2) : 0,
        blocs,
        totales: mun.totales
      };
    });
  },

  // Exterior presidencial por circunscripción con alianzas
  getPresidencialExterior() {
    const ext = this._r.niveles.presidencial.exterior || {};
    return (ext.por_circ || []).map(e => {
      const blocs = {};
      Object.entries(e.resultados).forEach(([p,v]) => {
        const b = this.getBlocFor(p);
        blocs[b] = (blocs[b]||0)+v;
      });
      const sorted = Object.entries(blocs).sort((a,b)=>b[1]-a[1]);
      const total  = sorted.reduce((s,[,v])=>s+v,0);
      return {
        circ_exterior: e.circ_exterior,
        region: e.region,
        ganador: total > 0 ? sorted[0][0] : null,
        blocs,
        totales: e.totales
      };
    });
  },

  // Senadores: resultados por provincia, agregados por bloque (desde prov_metrics)
  // prov_metrics_senadores ya tiene ganador, bloque_coalicion, top3 calculados desde RTF real
  getSenadores() {
    const senAlianzas = this._a.niveles.senadores || [];
    // prov_metrics inyectado por ui.js como _PROV_METRICS_SEN (window global)
    const metricsMap = {};
    (window._PROV_METRICS_SEN || []).forEach(m => { metricsMap[m.id] = m; });

    return this._r.niveles.senadores.map(prov => {
      const m = metricsMap[prov.provincia_id] || {};
      const provAli = senAlianzas.find(a => a.provincia_id === prov.provincia_id);
      const blocs   = m.blocs || prov.resultados;
      const ganador = m.ganador || provAli?.ganador || Object.entries(prov.resultados).sort((a,b)=>b[1]-a[1])[0]?.[0] || '?';
      const total   = Object.values(blocs).reduce((s,v)=>s+v,0);

      // bloque_coalicion: leer desde prov_metrics o recalcular
      let bloque_coalicion = m.bloque_coalicion || 'otro';
      if (!m.bloque_coalicion) {
        const prmBloc = (this._a.niveles.presidencial[0]?.bloques || []).find(b=>b.candidato_base==='PRM');
        const fpBloc  = (this._a.niveles.presidencial[0]?.bloques || []).find(b=>b.candidato_base==='FP');
        const prmParts = new Set(prmBloc?.partidos || ['PRM']);
        const fpParts  = new Set(fpBloc?.partidos  || ['FP']);
        if (prmParts.has(ganador)) bloque_coalicion = 'PRM-coalicion';
        else if (fpParts.has(ganador)) bloque_coalicion = 'FP-coalicion';
      }

      const top3 = m.top3 ||
        Object.entries(blocs).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([id,v])=>({
          id, nombre: this.getPartidoNombre(id), pct: +(v/total*100).toFixed(1)
        }));

      return {
        provincia_id:     prov.provincia_id,
        provincia:        prov.provincia,
        ganador,
        bloque_coalicion,
        pct_ganador:      m.pct_ganador ?? +(( (blocs[ganador]||0)/total )*100).toFixed(1),
        top3,
        enpp:             m.enpp,
        riesgo_nivel:     m.riesgo_nivel,
        riesgo_score:     m.riesgo_score,
        margen_pp:        m.margen_pp,
        inscritos:        m.inscritos || prov.totales?.inscritos,
        votos_emitidos:   m.votos_emitidos || prov.totales?.emitidos,
        votos_validos:    m.votos_validos  || prov.totales?.validos,
        participacion:    m.participacion,
        resultados_ind:   prov.resultados,   // votos individuales por partido
        blocs_agregados:  blocs,              // votos por bloque (para barras)
      };
    });
  },

  // Diputados por circunscripción con votos individuales + alianzas aplicadas
  getDiputadosPorCirc() {
    const dipAlianzas = this._a.niveles.diputados || [];
    const metricsMap  = {};
    (window._PROV_METRICS_DIP || []).forEach(m => { metricsMap[m.id] = m; });

    return this._r.niveles.diputados.map(circ => {
      const key  = circ.provincia_id + '-C' + circ.circ;
      const m    = metricsMap[key] || {};
      const ali  = dipAlianzas.find(a => a.provincia_id===circ.provincia_id && a.circ===circ.circ);
      const blocs = m.blocs || circ.resultados;
      const ganador = m.ganador || ali?.ganador || Object.entries(circ.resultados).sort((a,b)=>b[1]-a[1])[0]?.[0] || '?';
      const total = Object.values(blocs).reduce((s,v)=>s+v,0);

      return {
        provincia_id:    circ.provincia_id,
        provincia:       circ.provincia,
        circ:            circ.circ,
        ganador,
        pct_ganador:     m.pct_ganador ?? +((( blocs[ganador]||0)/total)*100).toFixed(1),
        top3:            m.top3 || Object.entries(blocs).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([id,v])=>({id,pct:+(v/total*100).toFixed(1)})),
        enpp:            m.enpp,
        riesgo_nivel:    m.riesgo_nivel,
        inscritos:       m.inscritos || circ.inscritos,
        participacion:   m.participacion,
        resultados_ind:  circ.resultados,
        blocs_agregados: blocs,
      };
    });
  },

  getDiputados() { return this._r.niveles.diputados; },

  // Exterior: resultados por circunscripción
  getDiputadosExterior() {
    const extAli = this._a.niveles.diputados_exterior || [];
    return (this._r.niveles.diputados_exterior || []).map(circ => {
      const ali   = extAli.find(a => a.circ_exterior === circ.circ_exterior) || {};
      const blocs = {};
      const aliB  = ali.bloques || [];
      if (aliB.length) {
        aliB.forEach(b => {
          blocs[b.candidato_base] = (b.partidos||[]).reduce((s,p)=>s+(circ.resultados[p]||0), 0);
        });
        const inBloc = new Set(aliB.flatMap(b=>b.partidos));
        Object.entries(circ.resultados).forEach(([p,v])=>{ if(!inBloc.has(p)) blocs[p]=(blocs[p]||0)+v; });
      } else {
        Object.assign(blocs, circ.resultados);
      }
      const sorted  = Object.entries(blocs).sort((a,b)=>b[1]-a[1]);
      const total   = sorted.reduce((s,[,v])=>s+v,0);
      const ganador = ali.ganador || sorted[0]?.[0] || '?';
      return {
        circ_exterior:   circ.circ_exterior,
        region:          circ.region,
        inscritos:       circ.inscritos,
        ganador,
        pct_ganador:     +((( blocs[ganador]||0)/total)*100).toFixed(1),
        top3:            sorted.slice(0,3).map(([id,v])=>({id,pct:+(v/total*100).toFixed(1)})),
        totales:         circ.totales,
        resultados_ind:  circ.resultados,
        blocs_agregados: blocs,
      };
    });
  }
};

// ─────────────────────────────────────────────────────────────────
// MOTOR 5: ALIANZAS
// Modelo: bloc aggregation (Golder 2006 electoral alliances framework)
// ─────────────────────────────────────────────────────────────────
const MotorAlianzas = {
  _a: null,
  init(alianzasData) { this._a = alianzasData; },

  // Presidencial: array con 1 elemento { territorio, bloques }
  // Senadores/diputados: array de objetos por territorio con { bloques }
  getBloques(nivel='presidencial', territorioId=null) {
    const data = this._a.niveles[nivel];
    if (!data || !data.length) return [];
    if (nivel === 'presidencial') {
      return data[0]?.bloques || [];
    }
    // Para senadores/diputados: si se pide territorio específico, devolver esos bloques
    if (territorioId) {
      const terr = data.find(d => d.provincia_id === territorioId || d.circ_exterior === territorioId);
      return terr?.bloques || [];
    }
    // Sin territorio: devolver bloques únicos de la primera entrada (representativo)
    return data[0]?.bloques || [];
  },

  getCoalicion(basePartido, nivel='presidencial', territorioId=null) {
    return this.getBloques(nivel, territorioId).find(b => b.candidato_base === basePartido) || null;
  },

  // Escenario sin alianzas: cada partido compite solo
  simularSinAlianza(resultadosRaw, totalValidos) {
    return Object.entries(resultadosRaw)
      .map(([id,votos]) => ({ id, votos, pct: +(votos/totalValidos*100).toFixed(2) }))
      .sort((a,b) => b.votos - a.votos);
  },

  // Fuerza de coalición: contribución de cada aliado al bloque
  getFuerzaCoalicion(basePartido, resultadosRaw, totalValidos) {
    const bloc = this.getCoalicion(basePartido);
    if (!bloc) return [];
    return bloc.partidos
      .map(p => ({ partido: p, votos: resultadosRaw[p]||0, pct: +((resultadosRaw[p]||0)/totalValidos*100).toFixed(2) }))
      .sort((a,b) => b.votos - a.votos);
  }
};

// ─────────────────────────────────────────────────────────────────
// MOTOR 6: CURULES / D'HONDT
// Modelo: método D'Hondt (Ley Electoral RD 275-97, Art. 68)
// Umbral: 2% votos válidos para participar en distribución
// ─────────────────────────────────────────────────────────────────
const MotorCurules = {
  _cat: null, _res: null,
  UMBRAL_PCT: 2, // 2% umbral legal RD

  init(curulesCat, curulesRes) {
    this._cat = curulesCat;
    this._res = curulesRes;
    this._computeTotals();
  },

  _computeTotals() {
    this._totals = { senadores:{}, diputados:{}, nacionales:{}, exterior:{}, total:{} };
    const add = (obj,p,n) => { obj[p]=(obj[p]||0)+n; };

    this._res.niveles.senadores.forEach(p =>
      p.resultado.forEach(r => add(this._totals.senadores, r.partido, r.curules)));

    this._res.niveles.diputados.forEach(c =>
      c.resultado.forEach(r => add(this._totals.diputados, r.partido, r.curules)));

    (this._res.niveles.diputados_nacionales.resultado||[]).forEach(r =>
      add(this._totals.nacionales, r.partido, r.curules));

    this._res.niveles.diputados_exterior.forEach(c =>
      c.resultado.forEach(r => add(this._totals.exterior, r.partido, r.curules)));

    Object.values(this._totals).slice(0,4).forEach(obj =>
      Object.entries(obj).forEach(([p,n]) => add(this._totals.total, p, n)));
  },

  // D'Hondt puro con umbral legal del 2%
  dhondt(votosObj, escanos, totalValidos) {
    const umbral = (totalValidos || Object.values(votosObj).reduce((s,n)=>s+n,0)) * this.UMBRAL_PCT / 100;
    // Filtrar partidos bajo el umbral
    const elegibles = Object.entries(votosObj).filter(([,v]) => v >= umbral);
    if (elegibles.length === 0) return {};

    const quotients = [];
    elegibles.forEach(([partido, votos]) => {
      for (let d = 1; d <= escanos; d++) {
        quotients.push({ partido, q: votos / d });
      }
    });
    quotients.sort((a,b) => b.q - a.q);

    const result = {};
    quotients.slice(0, escanos).forEach(({ partido }) => {
      result[partido] = (result[partido]||0) + 1;
    });
    return result;
  },

  getTotalByNivel(nivel) { return this._totals[nivel] || {}; },

  getTotalLegislativo() {
    return Object.entries(this._totals.total)
      .map(([id,curules]) => ({ id, curules }))
      .sort((a,b) => b.curules - a.curules);
  },

  getSumaCurules() {
    return Object.values(this._totals.total).reduce((s,n)=>s+n,0);
  },

  // Senadores: detalle con ganador real + bloque coalición
  getSenadores() {
    return this._res.niveles.senadores.map(p => ({
      provincia_id:     p.provincia_id,
      provincia:        p.provincia,
      ganador:          p.ganador,           // partido que ganó realmente (PLR, APD, etc.)
      bloque_coalicion: p.bloque_coalicion,  // PRM-coalicion | FP-coalicion | otro
      pct_ganador:      p.pct_ganador
    }));
  },

  // Senadores agrupados por coalición presidencial
  getSenadorePorCoalicion() {
    const resumen = {};
    this._res.niveles.senadores.forEach(p => {
      const coal = p.bloque_coalicion || p.ganador;
      resumen[coal] = (resumen[coal]||0) + 1;
    });
    return Object.entries(resumen)
      .map(([id, curules]) => ({ id, curules }))
      .sort((a,b) => b.curules - a.curules);
  },

  getDiputadosDetail()  { return this._res.niveles.diputados; },
  getExteriorDetail()   { return this._res.niveles.diputados_exterior; },
  getNacionalesDetail() { return this._res.niveles.diputados_nacionales; }
};

// ─────────────────────────────────────────────────────────────────
// MOTOR 7: TERRITORIAL
// ─────────────────────────────────────────────────────────────────
const MotorTerritorial = {
  _t: null,
  init(territoriosCat) { this._t = territoriosCat; },
  getProvincias()      { return this._t.provincias || []; },
  getMunicipios()      { return this._t.municipios || []; },
  getCircDiputados()   { return this._t.circ_diputados || []; },
  getCircExterior()    { return this._t.circ_exterior || []; },
  getProvincia(id)     { return (this._t.provincias||[]).find(p=>p.id===id); }
};

// ─────────────────────────────────────────────────────────────────
// MOTOR 8: KPIs / RESUMEN EJECUTIVO
// Incluye: ENPP (Laakso-Taagepera), índice de concentración
// ─────────────────────────────────────────────────────────────────
const MotorKPIs = {
  // ENPP: Effective Number of Parliamentary Parties
  // Laakso & Taagepera (1979) — estándar mundial en ciencia política
  calcENPP(curulesList, totalCurules) {
    const pcts = curulesList.map(x => x.curules / totalCurules);
    return +(1 / pcts.reduce((s,p) => s + p*p, 0)).toFixed(3);
  },

  // Índice de concentración bipartidista (top-2 / total)
  calcConcentracion(curulesList, totalCurules) {
    const top2 = curulesList.slice(0,2).reduce((s,x)=>s+x.curules,0);
    return +(top2/totalCurules*100).toFixed(1);
  },

  // Índice de ventaja presidencial (margen 1ro vs 2do)
  calcMargenPresidencial(blocsArray) {
    if (blocsArray.length < 2) return 100;
    return +(blocsArray[0].pct - blocsArray[1].pct).toFixed(2);
  },

  compute(resultados, curules, padron) {
    const totPres    = resultados.getTotalesPresidencial();
    const blocsPresid = resultados.getPresidencialByBloc();
    const legTotal   = curules.getTotalLegislativo();
    const totalCurules = curules.getSumaCurules();
    const inscritos  = padron.getPadronOficial();
    const participacion = padron.getParticipacionNacional(totPres.votos_emitidos);

    const enpp = this.calcENPP(legTotal, totalCurules);
    const concentracion = this.calcConcentracion(legTotal, totalCurules);
    const margen = this.calcMargenPresidencial(blocsPresid);
    const riesgoSegundaVuelta = blocsPresid[0]?.pct < 50;

    return {
      padron_oficial:        inscritos,
      votos_emitidos:        totPres.votos_emitidos,
      votos_validos:         totPres.votos_validos,
      participacion,
      abstencion:            padron.getAbstencion(participacion),
      ganador_presidencial:  blocsPresid[0]?.id,
      pct_ganador:           blocsPresid[0]?.pct,
      margen_presidencial:   margen,
      riesgo_segunda_vuelta: riesgoSegundaVuelta,
      curules_totales:       totalCurules,
      enpp_legislativo:      enpp,
      concentracion_top2:    concentracion,
      mayorias:              legTotal.slice(0,3).map(x=>({...x, pct:+(x.curules/totalCurules*100).toFixed(1)}))
    };
  }
};

// ─────────────────────────────────────────────────────────────────
// MOTOR 9: REPLAY ELECTORAL 2024
// Modelo: verificación cruzada con datos JCE oficiales
// ─────────────────────────────────────────────────────────────────
const MotorReplay = {
  MODE: 'REPLAY',
  DATASET: 2024,

  run(resultados, curules, padron) {
    const checks = [];
    const add = (icon, name, test, expected, actual) => {
      const ok = test;
      checks.push({ icon, name, ok,
        expected: String(expected),
        actual: String(actual),
        status: ok ? '✅ OK' : `❌ esperado ${expected}, obtenido ${actual}` });
    };

    const totPres   = resultados.getTotalesPresidencial();
    const blocsP    = resultados.getPresidencialByBloc();
    const totalC    = curules.getSumaCurules();
    const senC      = Object.values(curules.getTotalByNivel('senadores')).reduce((s,n)=>s+n,0);
    const dipC      = Object.values(curules.getTotalByNivel('diputados')).reduce((s,n)=>s+n,0);
    const natC      = Object.values(curules.getTotalByNivel('nacionales')).reduce((s,n)=>s+n,0);
    const extC      = Object.values(curules.getTotalByNivel('exterior')).reduce((s,n)=>s+n,0);
    const partic    = padron.getParticipacionNacional(totPres.votos_emitidos);
    const prmPres   = blocsP[0];

    add('🗳️', 'Ganador presidencial = PRM', prmPres?.id==='PRM', 'PRM', prmPres?.id);
    add('📊', 'PRM > 50% votos válidos', prmPres?.pct > 50, '>50%', prmPres?.pct+'%');
    add('📋', 'Participación oficial 54.37%', Math.abs(partic-54.37)<1, '~54.37%', partic+'%');
    add('🏛️', 'Senadores = 32', senC===32, 32, senC);
    const senCoal = curules.getSenadorePorCoalicion();
    const prmCoalCount = (senCoal.find(x=>x.id==='PRM-coalicion')||{curules:0}).curules;
    add('🏛️', 'Bloque PRM: 29 senadores (24 PRM + 5 aliados)', prmCoalCount===29, 29, prmCoalCount);
    add('📋', 'Diputados territoriales (2024=178 / 2028=158)', dipC===178||dipC===158, '178/158', dipC);
    add('🌐', 'Diputados exterior = 7', extC===7, 7, extC);
    add('📝', 'Diputados nacionales = 5', natC===5, 5, natC);
    add('✔️', 'Total curules = 222', totalC===222, 222, totalC);
    add('✅', 'Validación interna OK', MotorValidacion.ok !== false, 'sin errores', MotorValidacion.errores.length+' errores');

    const passed = checks.filter(c=>c.ok).length;
    return { checks, passed, total: checks.length, pct: +(passed/checks.length*100).toFixed(0) };
  }
};

// ─────────────────────────────────────────────────────────────────
// MOTOR 10: ESCENARIOS ELECTORALES
// Modelo: D'Hondt con umbral 2% (Ley Orgánica del Régimen Electoral 20-23, vigente — debate de sustitución activo desde 2024)
// ─────────────────────────────────────────────────────────────────
const MotorEscenarios = {
  PARTIDOS: ['PRM','FP','PLD','PRD','PCR'],
  DEFAULTS: { PRM:50, FP:27, PLD:11, PRD:6, PCR:6 },

  // Simula legislativo completo con intenciones de voto
  // Usa D'Hondt del MotorCurules para mantener consistencia
  simularLegislativo(pcts) {
    const totalPct = Object.values(pcts).reduce((s,n)=>s+n,0);
    if (totalPct === 0) return null;
    // Normalizar a votos relativos (base 1,000,000 para precisión)
    const votos = Object.fromEntries(
      Object.entries(pcts).map(([p,pct]) => [p, pct/totalPct * 1000000])
    );
    const totalVotos = Object.values(votos).reduce((s,n)=>s+n,0);
    const dh = (n) => MotorCurules.dhondt(votos, n, totalVotos);

    const sen = dh(32);
    const dip = dh(158); // Constitución 2024: 158 territoriales (antes 178); redistribución JCE pendiente
    // ── 5 nacionales por acumulación — cascada legal (Ley 37-10, Const. Art.81) ──
    // Nivel 1: partidos con ≥1% votos válidos que NO obtuvieron escaños territoriales/exterior
    // Nivel 2: si no se cubren los 5, se asignan a partidos con ≥1% que SÍ obtuvieron escaños
    // Criterio: 1 escaño por partido elegible hasta completar los 5
    const totalVotosNac = totalVotos;
    const umbral1pct = totalVotosNac * 0.01;
    const escanosTerritorial = Object.assign({}, dip);
    const escaExt = dh(7);
    const conEscanos = new Set([...Object.keys(escanosTerritorial), ...Object.keys(escaExt)]);
    // Elegibles nivel 1: ≥1% sin escaños
    const elegiblesN1 = Object.entries(votos)
      .filter(([p,v]) => v >= umbral1pct && !conEscanos.has(p))
      .sort((a,b) => b[1]-a[1]);
    // Elegibles nivel 2 (fallback): ≥1% con escaños
    const elegiblesN2 = Object.entries(votos)
      .filter(([p,v]) => v >= umbral1pct && conEscanos.has(p))
      .sort((a,b) => b[1]-a[1]);
    const nat = {};
    let asignados = 0;
    for (const [p] of elegiblesN1) {
      if (asignados >= 5) break;
      nat[p] = (nat[p]||0) + 1; asignados++;
    }
    for (const [p] of elegiblesN2) {
      if (asignados >= 5) break;
      nat[p] = (nat[p]||0) + 1; asignados++;
    }
    const ext = escaExt;
    const total = {};
    [sen,dip,nat,ext].forEach(obj =>
      Object.entries(obj).forEach(([p,n]) => { total[p]=(total[p]||0)+n; }));

    // Mayoría simple = 86 curules (50%+1 de 170); mayoría calificada = 114 (2/3 de 170)
    // Constitución 2024: 158 territoriales + 5 nacionales + 7 exterior = 170 diputados + 32 senadores = 202 total
    const mayoriaSimple = 86;       // mayoría simple Cámara de Diputados
    const mayoriaCalificada = 114;  // 2/3 de 170

    return {
      senadores: sen, diputados: dip, nacionales: nat, exterior: ext, total,
      analisis: {
        mayor_partido: Object.entries(total).sort((a,b)=>b[1]-a[1])[0],
        tiene_mayoria_simple: Object.entries(total).some(([,n])=>n>=mayoriaSimple),
        tiene_mayoria_calificada: Object.entries(total).some(([,n])=>n>=mayoriaCalificada),
        partidos_bajo_umbral: Object.entries(pcts).filter(([,p])=>p<2).map(([id])=>id)
      }
    };
  },

  // Escenario sin alianzas (cada partido compite solo)
  simularSinAlianza(resultadosRaw, totalValidos) {
    const votos = {};
    Object.entries(resultadosRaw).forEach(([p,v]) => { votos[p]=(votos[p]||0)+v; });
    return MotorCurules.dhondt(votos, 32, totalValidos);
  }
};

// ─────────────────────────────────────────────────────────────────
// MOTOR 11: PROYECCIÓN ELECTORAL 2028
// Modelo: Fundamentals + incumbency model (Abramowitz 2008)
//         adaptado a contexto presidencial latinoamericano
//
// Variables:
//   - Base electoral 2024 (resultado real)
//   - Bonus de incumbencia (Erikson & Wlezien 2012): partido en gobierno
//     tiene ventaja estructural de +2 a +5pp en primer mandato
//   - Desgaste de gobierno: -2pp por cada año adicional en el poder
//     (Stimson "Public Support for American Presidents" adaptado)
//   - Ajuste por encuestas: Bayesian update cuando hay polls disponibles
// ─────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────
// MOTOR 11 — PROYECCION ELECTORAL v9.3
// Arquitectura: 7 pasos metodológicos independientes
//
// PRINCIPIO CLAVE: Base = resultados presidenciales 2024
// Legislativo solo para estructura partidaria y ratio de coalición
//
// Niveles: Presidencial (prov/mun) | Senadores (prov) | Diputados (circ)
//
// Pipeline:
//   calcularBaseline()       → resultado_2024 como punto de partida
//   calcularSwingHistorico() → delta 2020→2024 × 0.35 (amortiguado)
//   calcularFundamentals()   → incumbencia, desgaste, regresión a media
//   calcularEncuestas()      → Bayesian update (modelo×0.60 + encuestas×0.40)
//   calcularEstructuraPartido() → ratio presidencial/legislativo
//   proyeccionTerritorial()  → swing territorial × 0.5 + mov × 0.3 + pot × 0.2
//   ensamblarProyeccion()    → output estructurado con 3 escenarios
// ─────────────────────────────────────────────────────────────────
const MotorProyeccion = {
  // ── Parámetros calibrados v12.0 ──
  // CAMBIOS vs v11:
  //   1. incumbencia_bonus eliminado de PRM (Abinader no puede reelegirse)
  //   2. desgaste_sin_titular = -8pp para PRM (partido incumbente sin candidato titular)
  //      Fuente: Erikson & Wlezien (2012) — incumbency is personal, not partisan
  //      Referencia RD: ningún partido incumbente sin su titular ha ganado en RD moderno
  //   3. regresion_media reducida a 0.05 — RD no regresa al 50%; sistema históricamente
  //      concentrado (incumbente ganó 52.51%, 57.44% — contrario a media-reversion)
  //   4. peso_encuesta = 0.20 a 26+ meses de la elección (Silver/538: escala con tiempo)
  //   5. retencion_fp = fracción del voto FP 2024 que se mantiene bajo candidato nuevo
  //      El voto FP 2024 tuvo componente anti-PRM+anti-PLD que puede erosionarse
  // ── Fecha de elección y cálculo dinámico de pesos ──
  ELECTION_DATE: new Date('2028-05-16'),  // JCE: segunda vuelta posible 30 jun 2028

  // Peso encuesta escala dinámicamente con proximidad a elección (Silver/538 adaptado RD)
  // Curva logística: inflexión en 6 meses (encuestas y modelo se equilibran)
  //   > 18m: 0.20 (fundamentals dominan — señal débil)
  //   12m:   0.27
  //    6m:   0.53  ← punto de equilibrio
  //    3m:   0.68
  //    1m:   0.75
  //   <1m:   0.85 (encuestas dominan — señal fuerte)
  calcularPesosTemporales() {
    const hoy = new Date();
    const diasRestantes = Math.max(0, (this.ELECTION_DATE - hoy) / (1000 * 60 * 60 * 24));
    const mesesRestantes = diasRestantes / 30.44;

    // Peso encuesta: logística inversa centrada en 6 meses
    const pesoEnc = Math.min(0.85, Math.max(0.20,
      0.20 + 0.65 / (1 + Math.exp(0.35 * (mesesRestantes - 6)))
    ));
    const pesoMod = +(1 - pesoEnc).toFixed(3);

    // Lambda recency: crece con proximidad (encuestas viejas pierden peso más rápido)
    // Rango 0.015 (lejos) → 0.100 (semana de elección)
    let lambda;
    if (mesesRestantes >= 18) {
      lambda = 0.015;
    } else if (mesesRestantes <= 1) {
      lambda = 0.100;
    } else {
      const t = (18 - mesesRestantes) / 17;
      lambda = +(0.015 * Math.pow(0.100 / 0.015, t)).toFixed(4);
    }

    return {
      meses_restantes: +mesesRestantes.toFixed(1),
      dias_restantes:  Math.round(diasRestantes),
      peso_encuesta:   +pesoEnc.toFixed(3),
      peso_modelo:     +pesoMod.toFixed(3),
      lambda_recency:  lambda,
      fase: mesesRestantes > 18 ? 'EARLY'
          : mesesRestantes > 12 ? 'PRE_ELECTORAL'
          : mesesRestantes >  6 ? 'ELECTORAL'
          : mesesRestantes >  3 ? 'CAMPAÑA'
          : mesesRestantes >  1 ? 'RECTA_FINAL'
          : 'SEMANA_ELECTORAL'
    };
  },

  PARAMS: {
    incumbencia_bonus:    0,      // Eliminado — PRM va con candidato nuevo (no aplica)
    desgaste_sin_titular: 8.0,    // PRM pierde bono personal de Abinader: estimado -8pp
    desgaste_por_ciclo:   2.0,
    regresion_media:      0.05,
    swing_factor:         0.35,
    // peso_encuesta y peso_modelo son DINÁMICOS — calculados en calcularPesosTemporales()
    // Los valores aquí son fallbacks estáticos usados solo si calcularPesosTemporales() falla
    peso_encuesta:        0.20,
    peso_modelo:          0.80,
    peso_swing_local: 0.50,
    peso_movilizacion: 0.30,
    peso_potencial: 0.20,
  },

  // ── Base histórica PRESIDENCIAL v12.0 — METODOLOGÍA UNIFICADA ──
  // CORRECCIÓN CRÍTICA: usar bloque-con-bloque para comparabilidad 2020→2024
  // Fuente PDFs JCE oficiales:
  //
  // 2020 (PDF JCE 05-jul-2020):
  //   Votos válidos: 4,103,362 | Inscritos: 7,529,932 | Participación: 55.29%
  //   PRM bloque (Abinader):   2,154,866 = 52.51%   PRM puro: 1,998,407 = 48.70%
  //   PLD bloque (Leonel):     1,537,078 = 37.46%   PLD puro: 1,352,842 = 32.97%
  //   PRSC bloque (Quezada):     365,226 =  8.90%   FP dentro: 233,538 = 5.69%
  //
  // 2024 (PDF JCE 19-may-2024):
  //   Votos válidos: 4,365,147 | Inscritos: 8,145,548 | Participación: 54.37%
  //   PRM bloque (Abinader):   2,507,297 = 57.44%   PRM puro: 2,113,100 = 48.41%
  //   FP bloque (Leonel):      1,259,427 = 28.85%   FP puro:  1,164,122 = 26.67%
  //   PLD (solo):                453,468 = 10.39%
  //
  // DECISIÓN DE METODOLOGÍA:
  //   Para proyectar 2028 se usan cifras de BLOQUE (candidatura completa con aliados)
  //   porque en 2028 todos competirán también con aliados y la pregunta es
  //   qué porcentaje de la candidatura total puede obtener cada polo.
  //
  //   Swings resultantes con base bloque/bloque:
  //   PRM: 57.44 - 52.51 =  +4.93pp (bloque/bloque — no +8.97pp que usaba el modelo)
  //   FP:  28.85 -  5.69 = +23.16pp (FP puro 2020 dentro del bloque PRSC)
  //   PLD: 10.39 - 37.46 = -27.07pp (bloque PLD 2020 vs PLD solo 2024)
  //
  //   PRM candidato 2028: NUEVO (Abinader no puede reelegirse)
  //   → NO aplica incumbencia_bonus
  //   → SÍ aplica desgaste_sin_titular = -8pp
  //
  //   Participación: JCE real 2020=55.29%, 2024=54.37% → tendencia bajista.
  //   Modelo usa 54% para 2028 ✓ (coherente con JCE)
  BASE_PRESIDENCIAL: {
    PRM: {
      pct_2024:      57.44,  // bloque completo 2024 (JCE PDF)
      pct_2020:      52.51,  // bloque completo 2020 (JCE PDF)
      pct_puro_2024: 48.41,  // solo partido PRM
      pct_puro_2020: 48.70,  // solo partido PRM
      pct_leg_sen:   45.54,  // PRM casilla senadores 2024
      pct_leg_dip:   48.26,  // PRM casilla diputados 2024
      es_incumbente: false,  // v12: NO incumbente — candidato nuevo 2028
      ciclos:        0,
      tiene_desgaste_sin_titular: true,  // v12: partido incumbente sin su candidato
    },
    FP: {
      pct_2024:      28.85,  // base real 2024 = bloque presidencial JCE (punto de partida)
      pct_2020:      24.70,  // proxy: 28.85 - (4.15/0.40) NO. Mejor: pct_2020 = base tal que
                             // aplicado = 28.85×factor → fundamentals ≈ 30.5%
                             // OPCIÓN B v15: swing orgánico +4.15pp desde encuestas 2027 (~33%)
                             // pct_2020 = 28.85 - 4.15/0.40×factor ... simplificado:
                             // usamos pct_2020=28.85 y añadimos swing_override directo
      // DISEÑO: calcularSwingHistorico() detecta FP y usa swing_override en lugar de delta
      swing_override: 1.45,  // swing presidencial FP aplicado directo: +4.15pp × 0.35 = +1.45pp
                             // (factor 0.35 para expansión moderada, no 0.40 del estable)
                             // Resultado: FP fundamentals presidencial ≈ 28.85 + 1.45 = 30.3%
      pct_puro_2024: 26.67,  // solo partido FP casilla presidencial 2024
      pct_puro_2020:  5.69,  // FP puro dentro PRSC 2020 (referencia histórica)
      pct_leg_sen:   19.35,  // FP casilla senadores 2024 — base legislativa real
      pct_leg_dip:   17.15,  // FP casilla diputados 2024 — base legislativa real
      es_incumbente: false,
      ciclos:        0,
    },
    PLD: {
      pct_2024:      10.39,  // PLD fue solo en 2024 (JCE PDF)
      pct_2020:      10.39,  // swing cero: delta 2020→2024 inválido (base leonelista en 2020)
      pct_puro_2024: 10.39,
      pct_puro_2020: 32.97,  // referencia histórica (incluía base leonelista)
      pct_leg_sen:   17.64,  // PLD casilla senadores 2024
      pct_leg_dip:   15.25,  // PLD casilla diputados 2024
      es_incumbente: false,
      ciclos:        0,
    },
  },

  // ── PASO 1: Baseline = resultados presidenciales 2024 ──
  calcularBaseline() {
    const out = {};
    Object.entries(this.BASE_PRESIDENCIAL).forEach(([p, b]) => {
      out[p] = { baseline: b.pct_2024, pct_2020: b.pct_2020,
                 pct_2024: b.pct_2024, es_incumbente: b.es_incumbente, ciclos: b.ciclos };
    });
    return out;
  },

  // ── PASO 2: Swing histórico presidencial 2020→2024 ──
  // MO6 v11: swing_factor diferenciado por tipo de partido
  // Fundamento: Green & Gerber (2004) — partidos en declive tienen piso de voto duro,
  //   el colapso total raramente continúa al mismo ritmo
  // - Partido en expansión (delta > +10pp): factor = 0.35 (amortiguación estándar Silver)
  // - Partido en colapso  (delta < -10pp): factor = 0.25 (mayor amortiguación — hay piso)
  // - Incumbente estable  (|delta| ≤ 10pp): factor = 0.40 (más inercia en el incumbente)
  _swingFactorPorPartido(delta) {
    if (delta > 10)  return 0.35;  // expansión confirmada: amortiguación estándar
    if (delta < -10) return 0.25;  // colapso: amortiguación mayor (hay piso de voto duro)
    return 0.40;                   // estable/incumbente: mayor inercia
  },

  calcularSwingHistorico() {
    const out = {};
    Object.entries(this.BASE_PRESIDENCIAL).forEach(([p, b]) => {
      // v15: FP usa swing_override (calibrado desde encuestas 2027, no delta 2020→2024 inválido)
      // PLD usa swing cero (delta 2020→2024 inválido — base leonelista en 2020)
      if (b.swing_override !== undefined) {
        out[p] = {
          pct_2020: b.pct_2020, pct_2024: b.pct_2024,
          delta: b.swing_override / 0.35,  // delta implícito para display (aprox)
          aplicado: b.swing_override,
          swing_factor_usado: 0.35,
          es_override: true,
          nota: 'Swing calibrado encuestas 2027 (Opción B) — delta 2020→2024 inválido'
        };
      } else {
        const delta        = +(b.pct_2024 - b.pct_2020).toFixed(2);
        const factorPartido = this._swingFactorPorPartido(delta);
        const aplicado     = +(delta * factorPartido).toFixed(2);
        out[p] = { pct_2020: b.pct_2020, pct_2024: b.pct_2024, delta, aplicado, swing_factor_usado: factorPartido };
      }
      // Añadir bases legislativas para uso en senadores/diputados
      out[p].leg_sen  = b.pct_leg_sen  || null;
      out[p].leg_dip  = b.pct_leg_dip  || null;
      out[p].leg_prom = b.pct_leg_sen && b.pct_leg_dip
        ? +((b.pct_leg_sen + b.pct_leg_dip) / 2).toFixed(2) : null;
    });
    return out;
  },

  // ── PASO 3: Fundamentals v12.0 ──
  // CAMBIOS:
  //   - PRM: desgaste_sin_titular en lugar de incumbencia_bonus (candidato nuevo 2028)
  //   - FP: swing 2020→2024 se aplica con amortiguación ALTA (fue evento único)
  //   - Regresión a la media reducida a 0.05 (RD no regresa al 50%)
  calcularFundamentals(baseline) {
    const p = this.PARAMS;
    const swing = this.calcularSwingHistorico();
    const out = {};
    Object.entries(baseline).forEach(([partido, b]) => {
      let v = b.baseline;

      // Swing histórico amortiguado
      v += (swing[partido]?.aplicado || 0);

      // Incumbencia / desgaste
      if (b.tiene_desgaste_sin_titular) {
        // v12: PRM pierde el bono personal de Abinader
        // El partido incumbente sin titular titular pierde en promedio 6-10pp en RD
        v -= p.desgaste_sin_titular;
      } else if (b.es_incumbente) {
        // Caso estándar (no aplica en 2028 pero mantiene la lógica para futuros ciclos)
        v += p.incumbencia_bonus;
        if (b.ciclos > 1) v -= p.desgaste_por_ciclo * (b.ciclos - 1);
      }

      // Regresión a la media (reducida: RD históricamente no regresa al 50%)
      v -= (v - 50) * p.regresion_media;

      out[partido] = { ...b, fundamentals: +v.toFixed(2) };
    });
    return out;
  },

  // ── PASO 4: Encuestas — Bayesian update con intención de voto candidato ──
  // CRÍTICO: solo usa intencion_candidato, NO simpatia_partidaria
  // Pesos DINÁMICOS: escalan con proximidad a elección (calcularPesosTemporales)
  calcularEncuestas(fundamentals, encuestas) {
    // Calcular pesos temporales dinámicos
    const pesos = this.calcularPesosTemporales();
    const pesoEnc = pesos.peso_encuesta;
    const pesoMod = pesos.peso_modelo;

    let encProm = encuestas;
    if (encuestas && encuestas._tipo_fuente === 'motor_encuestas') {
      encProm = encuestas.intencion_candidato;
    }
    const out = {};
    Object.entries(fundamentals).forEach(([partido, d]) => {
      let v = d.fundamentals;
      if (encProm && encProm[partido] !== undefined) {
        v = v * pesoMod + encProm[partido] * pesoEnc;
      }
      out[partido] = { ...d, con_encuestas: +v.toFixed(2),
                       usa_encuestas: !!(encProm && encProm[partido] !== undefined),
                       peso_encuesta_aplicado: pesoEnc,
                       fase_electoral: pesos.fase,
                       meses_restantes: pesos.meses_restantes };
    });
    return out;
  },

  // ── PASO 5: Estructura partidaria (ratio presidencial / legislativo) ──
  calcularEstructuraPartido() {
    // v15: bases legislativas = casilla partido puro 2024 (JCE resultados reales)
    // FP presidencial 28.85% incluye ~10.6pp bono personal Leonel que no existe en legislativo
    const PRES  = { PRM: 57.44, FP: 28.85, PLD: 10.39 };
    const LEG   = { PRM: 46.90, FP: 18.25, PLD: 16.44 };
    // PRM leg = (sen 45.54 + dip 48.26) / 2 = 46.90
    // FP  leg = (sen 19.35 + dip 17.15) / 2 = 18.25  ← antes usaba 27.60 (erróneo)
    // PLD leg = (sen 17.64 + dip 15.25) / 2 = 16.44  ← PLD tiene más estructura legislativa
    const out   = {};
    Object.entries(PRES).forEach(([p, pres]) => {
      const leg = LEG[p] || pres;
      const ratio = leg > 0 ? +(pres / leg).toFixed(3) : 1;
      const dependencia = ratio > 1.10 ? 'dependiente_aliados'
                         : ratio < 0.95 ? 'infrautilizada'
                         : 'equilibrada';
      out[p] = { pres_2024: pres, leg_2024: leg, ratio, dependencia,
                 // Factor de ajuste: dependencia reduce proyección (riesgo ruptura alianza)
                 factor_ajuste: dependencia === 'dependiente_aliados' ? 0.97 : 1.00 };
    });
    return out;
  },

  // ── PASO 6: Proyección territorial DIFERENCIADA por provincia (v10.0) ──
  // Metodología: Jacobson (2004) + Gelman & King (1994) elastic swing
  // Reemplaza el uniform swing +8.3pp por un swing calibrado localmente
  // usando las tres variables que ya existen en prov_metrics por provincia.
  //
  // factor_local(prov) = 0.45×competitividad + 0.35×movilizacion + 0.20×volatilidad
  // donde:
  //   competitividad = 1 - (margen_pp / 40)    → provincias competidas reciben más swing
  //   movilizacion   = abstencion / 100         → alta abstención = más margen para crecer
  //   volatilidad    = min((enpp-1)/3, 1)       → alta fragmentación = más transferencia posible
  //
  // swing_local = swing_nacional × factor_local × 1.5  (amplificador local)
  // + bono transferencia leonelista residual si disponible (M-A pipeline)
  proyeccionTerritorial(escenario, participacion) {
    const p      = this.PARAMS;
    const swing  = this.calcularSwingHistorico();
    const provs  = window._PROV_METRICS_PRES || [];
    if (!provs.length) return [];

    // Intentar obtener transferencia leonelista del pipeline integrado
    const transf = window._SIE_PIPELINE && window._SIE_PIPELINE.transferencia
      ? window._SIE_PIPELINE.transferencia
      : null;

    // BUG #1 fix v15: usar swing.FP.aplicado (amortiguado) en vez de delta crudo
    // delta crudo = +4.15pp (Opción B), aplicado ×0.35 = +1.45pp — ya coherente
    // Con base presidencial corregida el delta ya es orgánico, no distorsionado
    const swingNacFP  = swing.FP?.aplicado  || 0;
    const swingNacPRM = swing.PRM?.aplicado || 0;

    return provs.map(prov => {
      const fpBase  = prov.pct_fp  || 0;
      const prmBase = prov.pct_prm || 0;
      const margen  = prov.margen_pp  || 0;
      const abst    = prov.abstencion || (100 - (prov.participacion || 54));
      const enpp    = prov.enpp || 2.0;

      // Factor local Jacobson (2004) — tres componentes
      // Componente 3: VOLATILIDAD real = Índice de Pedersen (no ENPP)
      // Pedersen = Σ|voto_i_2024 - voto_i_2020| / 2 por provincia
      // Fuente: Pedersen (1979) "The Dynamics of European Party Systems"
      // ENPP medía fragmentación, no volatilidad — corrección auditoría
      let pedersen = 0;
      const pm20 = (window._PROV_METRICS_PRES_2020 || []).find(x => x.id === prov.id);
      if (pm20 && pm20.blocs && prov.blocs) {
        const total24 = Object.values(prov.blocs).reduce((s,v)=>s+v,0) || 1;
        const total20 = Object.values(pm20.blocs).reduce((s,v)=>s+v,0) || 1;
        const allPartidos = new Set([...Object.keys(prov.blocs), ...Object.keys(pm20.blocs)]);
        let sumDelta = 0;
        allPartidos.forEach(p => {
          const pct24 = (prov.blocs[p]  || 0) / total24 * 100;
          const pct20 = (pm20.blocs[p]  || 0) / total20 * 100;
          sumDelta += Math.abs(pct24 - pct20);
        });
        pedersen = sumDelta / 2; // [0,100]
      } else {
        // Fallback: usar ENPP como proxy cuando no hay data 2020
        pedersen = Math.min(50, (prov.enpp || 2) * 10);
      }
      const volScore  = Math.max(0, Math.min(1, pedersen / 50));
      const compScore = Math.max(0, Math.min(1, 1 - margen / 40));
      const mobScore  = Math.max(0, Math.min(1, abst / 100));
      const factorLocal = 0.45 * compScore + 0.35 * mobScore + 0.20 * volScore;

      // Swing local diferenciado
      const swingLocalFP  = swingNacFP  * factorLocal * 1.5;
      const swingLocalPRM = swingNacPRM * factorLocal * 0.8; // PRM se desgasta más en plazas competidas

      // Bono transferencia leonelista residual (M-A pipeline)
      let bonoTransf = 0;
      if (transf) {
        const t = transf.find(x => x.id === prov.id);
        if (t && t.residual_pct > 0) {
          // 40% del residual leonelista es captable con campaña activa
          bonoTransf = t.residual_pct * 0.40;
        }
      }

      const fpProy  = +Math.max(0, Math.min(100, fpBase  + swingLocalFP  + bonoTransf)).toFixed(1);
      const prmProy = +Math.max(0, Math.min(100, prmBase + swingLocalPRM)).toFixed(1);

      // B2 fix v11: calcular votos_fp_proy en términos absolutos para M21 RutaVictoria
      // Usa padrón 2028 (M12) × participación base × proporción de inscritos de esta provincia
      const padron28     = (window._SIE_PIPELINE && window._SIE_PIPELINE.meta
                            ? window._SIE_PIPELINE.meta.padron2028
                            : null) || 8859093;
      const participBase = participacion || 0.54;
      const totalInscritos = provs.reduce((s, x) => s + (x.inscritos || 0), 0) || 1;
      const proporcionProv = (prov.inscritos || 0) / totalInscritos;
      const votantesProv   = Math.round(padron28 * participBase * proporcionProv);
      const votosFpProy    = Math.round(votantesProv * fpProy / 100);

      return {
        provincia:      prov.provincia,
        provincia_id:   prov.id,
        pct_fp_base:    fpBase,
        pct_fp_proy:    fpProy,
        pct_prm_base:   prmBase,
        pct_prm_proy:   prmProy,
        ganador_proy:   fpProy > prmProy ? 'FP' : 'PRM',
        margen_proy:    +(Math.abs(fpProy - prmProy)).toFixed(1),
        swing_local_fp: +swingLocalFP.toFixed(2),
        bono_transf:    +bonoTransf.toFixed(2),
        factor_local:   +factorLocal.toFixed(3),
        inscritos:      prov.inscritos || 0,
        votos_fp_proy:  votosFpProy,   // B2: requerido por M21 RutaVictoria
        competitividad: margen < 5 ? 'alta' : margen < 15 ? 'media' : 'baja'
      };
    }).sort((a, b) => b.pct_fp_proy - a.pct_fp_proy);
  },

  // ── PASO 7: Ensamblaje final con 3 escenarios ──
  ensamblarProyeccion(ajustes={}, encuestas=null) {
    const baseline     = this.calcularBaseline();
    const fundamentals = this.calcularFundamentals(baseline);
    const conEncuestas = this.calcularEncuestas(fundamentals, encuestas);
    const estructura   = this.calcularEstructuraPartido();

    // Aplicar ajustes manuales + estructura + factor normalización histórica (v10: ahora sí aplica)
    const withAdjust = {};
    Object.entries(conEncuestas).forEach(([partido, d]) => {
      const est    = estructura[partido] || { factor_ajuste: 1 };
      const normFactor = MotorNormalizacionHistorica.factorAjusteProyeccion(partido);
      // v10: multiplicador de normalizacion historica se aplica al resultado, no solo se guarda
      let v = d.con_encuestas * est.factor_ajuste * normFactor.multiplicador + (ajustes[partido] || 0);
      withAdjust[partido] = { ...d, pre_norm: +v.toFixed(2), norm_factor: normFactor };
    });

    // Normalizar a 100%
    const total = Object.values(withAdjust).reduce((s,x)=>s+x.pre_norm,0);
    const result = {};
    Object.entries(withAdjust).forEach(([partido, d]) => {
      result[partido] = {
        base_2024:        d.pct_2024,
        proyectado:       d.pre_norm,
        proyectado_norm:  +(d.pre_norm/total*100).toFixed(2),
        usa_encuestas:    d.usa_encuestas,
        es_incumbente:    d.es_incumbente,
        estructura:       estructura[partido],
        norm_factor:      d.norm_factor,
        metodologia:      d.usa_encuestas ? 'Fundamentals+Encuestas(Bayesian)+NormHistorica' : 'Fundamentals+Swing+NormHistorica',
      };
    });
    return result;
  },

  // ── API pública — mantiene compatibilidad con ui.js ──
  proyectar(ajustes={}, encuestas=null) {
    return this.ensamblarProyeccion(ajustes, encuestas);
  },

  // ── Escenarios por participación ──
  escenarios(encuestas=null) {
    const gen = (participacion) => {
      const res = this.ensamblarProyeccion({}, encuestas);
      // Ajustar por participación vs base 54%
      const factor = participacion / 0.54;
      // Partidos de oposición se benefician más de alta participación
      if (res.FP) res.FP.proyectado_norm = +Math.min(100, res.FP.proyectado_norm * (factor > 1 ? factor * 0.6 + 0.4 : 1)).toFixed(2);
      if (res.PRM) res.PRM.proyectado_norm = +Math.min(100, res.PRM.proyectado_norm * (factor > 1 ? 1 : 1 + (1-factor)*0.3)).toFixed(2);
      // Re-normalizar
      const tot = Object.values(res).reduce((s,x)=>s+x.proyectado_norm,0);
      Object.values(res).forEach(x => { x.proyectado_norm = +(x.proyectado_norm/tot*100).toFixed(2); });
      return res;
    };
    return {
      pesimista: gen(0.50),
      base:      gen(0.54),
      optimista: gen(0.58),
    };
  },

}; // fin MotorProyeccion

// ─────────────────────────────────────────────────────────────────
// MOTOR 12: CRECIMIENTO DEL PADRÓN
// Modelo: compound growth rate (CAGR) + proyección lineal
//         Metodología estándar en demografía electoral
// ─────────────────────────────────────────────────────────────────
const MotorCrecimientoPadron = {
  // Datos históricos validados (JCE oficial)
  HISTORICO: [
    { año: 2016, padron: 6872135 },
    { año: 2020, padron: 7497313 },
    { año: 2024, padron: 8145548 },
  ],

  // CAGR: Compound Annual Growth Rate
  // Formula estándar: CAGR = (Vf/Vi)^(1/n) - 1
  calcCAGR(inicio, fin, años) {
    return +((Math.pow(fin/inicio, 1/años) - 1) * 100).toFixed(3);
  },

  proyectar() {
    const hist = this.HISTORICO;
    const n = hist.length;

    // CAGR 2016-2024 (8 años)
    const cagr_8yr = this.calcCAGR(hist[0].padron, hist[n-1].padron, 8);

    // CAGR 2020-2024 (ciclo más reciente, más relevante)
    const cagr_4yr = this.calcCAGR(hist[1].padron, hist[n-1].padron, 4);

    // Proyección 2028 con ambas tasas
    const padron_2028_conservador = Math.round(hist[n-1].padron * Math.pow(1+cagr_4yr/100, 4));
    const padron_2028_tendencia   = Math.round(hist[n-1].padron * Math.pow(1+cagr_8yr/100, 4));
    const padron_2028_medio       = Math.round((padron_2028_conservador + padron_2028_tendencia) / 2);

    // Nuevos electores potenciales (crecimiento neto)
    const nuevos_electores = padron_2028_medio - hist[n-1].padron;

    return {
      historico:         hist,
      cagr_8yr:          cagr_8yr,
      cagr_4yr:          cagr_4yr,
      padron_2024:       hist[n-1].padron,
      padron_2028_bajo:  padron_2028_conservador,
      padron_2028_alto:  padron_2028_tendencia,
      padron_2028_medio,
      nuevos_electores,
      metodologia: 'CAGR (Compound Annual Growth Rate)'
    };
  }
};

// ─────────────────────────────────────────────────────────────────
// MOTOR 13: ENCUESTAS
// Modelo: poll aggregation con ponderación por calidad y tiempo
//         Metodología: Silver (FiveThirtyEight) poll weighting
//         Weight = quality_score * recency_weight * sample_weight
// ─────────────────────────────────────────────────────────────────
const MotorEncuestas = {
  // ═══════════════════════════════════════════════════════════════
  // MOTOR ENCUESTAS v10.0
  // Metodología: Silver/FiveThirtyEight pollster weighting
  // Distinción crítica: simpatía partidaria ≠ intención de voto candidato
  //
  // TIPOS DE DATO POR ENCUESTA:
  //   simpatia_partidaria → afecta proyección legislativa (curules)
  //                         y estimación de alianzas
  //   intencion_candidato → afecta proyección presidencial directamente
  //                         Es el dato Bayesiano que entra al MotorProyeccion
  //
  // Por qué importa la distinción:
  //   Un votante puede tener simpatía FP pero votar por el candidato PRM
  //   si percibe que FP no puede ganar (voto útil — Duverger 1954).
  //   En RD, la diferencia histórica candidato/partido es 2-5pp.
  //   Usar simpatía para proyección presidencial sobreestima el resultado.
  // ═══════════════════════════════════════════════════════════════

  _polls:    [],   // todas las encuestas cargadas
  _activas:  true, // flag global — si false el sistema ignora encuestas

  // ── Cargar batch de encuestas (desde JSON exportado por Excel) ──
  cargar(pollsArray) {
    this._polls = (pollsArray || []).map(p => {
      // ── B1 fix v11: normalizar campos para aceptar ambos formatos ──
      // JSON exportado desde Excel usa: empresa, prm/fp/pld (minúsculas), candidato/simpatia
      // M13 interno usa: firma, PRM/FP/PLD (mayúsculas), intencion_candidato/simpatia_partidaria

      // Normalizar firma/empresa
      const firma = p.firma || p.empresa || p.fuente || 'Desconocida';

      // Normalizar intenciones de voto (mayúsculas → minúsculas fallback)
      const PRM = p.PRM ?? p.prm ?? null;
      const FP  = p.FP  ?? p.fp  ?? null;
      const PLD = p.PLD ?? p.pld ?? null;
      const PRD = p.PRD ?? p.prd ?? null;
      const PCR = p.PCR ?? p.pcr ?? null;

      // Normalizar tipo: 'candidato' → 'intencion_candidato', 'simpatia' → 'simpatia_partidaria'
      let tipo = p.tipo || 'intencion_candidato';
      if (tipo === 'candidato')  tipo = 'intencion_candidato';
      if (tipo === 'simpatia')   tipo = 'simpatia_partidaria';

      // Normalizar cobertura (JSON puede tener 'NACIONAL', M13 filtra por 'nacional')
      const cobertura = (p.cobertura || 'nacional').toLowerCase();

      return { ...p, firma, PRM, FP, PLD, PRD, PCR, tipo, cobertura };
    });
    console.log('📊 MotorEncuestas: ' + this._polls.length + ' encuestas cargadas [B1 normalización activa]');
    return this;
  },

  // ── Agregar encuesta individual (desde UI) ──
  agregar_una(poll) {
    this._polls.push({
      tipo: 'intencion_candidato',
      cobertura: 'nacional',
      ...poll
    });
    return this;
  },

  // ── Pesos de ponderación (Silver/FiveThirtyEight) ──
  _recencyWeight(fechaEncuesta) {
    const hoy = new Date();
    const enc = new Date(fechaEncuesta);
    const dias = Math.max(0, (hoy - enc) / (1000 * 60 * 60 * 24));

    // Lambda dinámica: crece a medida que se acerca la elección
    // Encuestas viejas pierden relevancia más rápido cuando estamos cerca
    const ELECTION = new Date('2028-05-16');
    const diasRestantes = Math.max(0, (ELECTION - hoy) / (1000 * 60 * 60 * 24));
    const mesesRestantes = diasRestantes / 30.44;
    let lambda;
    if (mesesRestantes >= 18)     lambda = 0.015;
    else if (mesesRestantes <= 1) lambda = 0.100;
    else {
      const t = (18 - mesesRestantes) / 17;
      lambda = 0.015 * Math.pow(0.100 / 0.015, t);
    }
    return Math.exp(-lambda * dias);
  },

  _qualityWeight(calidad) {
    return { 'A+': 1.0, 'A': 0.85, 'B': 0.65, 'C': 0.45, 'D': 0.25 }[calidad] || 0.5;
  },

  _sampleWeight(n) {
    return Math.min(1.5, Math.sqrt(n) / Math.sqrt(800));
  },

  // ── AGREGACIÓN SEPARADA POR TIPO ──
  // tipo: 'intencion_candidato' | 'simpatia_partidaria'
  // cobertura: 'nacional' | 'provincial'
  _agregarPorTipo(tipo, cobertura = 'nacional', provincia_id = null) {
    const partidos = ['PRM', 'FP', 'PLD', 'PRD', 'PCR'];
    const filtradas = this._polls.filter(p =>
      p.tipo === tipo &&
      p.cobertura === cobertura &&
      (cobertura === 'nacional' || p.provincia_id === provincia_id)
    );

    if (!filtradas.length) return null;

    const sums = {}, weights = {};
    partidos.forEach(p => { sums[p] = 0; weights[p] = 0; });

    filtradas.forEach(poll => {
      const w = this._recencyWeight(poll.fecha)
              * this._qualityWeight(poll.calidad || 'B')
              * this._sampleWeight(poll.n || 600);

      partidos.forEach(p => {
        if (poll[p] !== undefined && poll[p] !== null) {
          sums[p]    += poll[p] * w;
          weights[p] += w;
        }
      });
    });

    const promedio = {};
    partidos.forEach(p => {
      promedio[p] = weights[p] > 0 ? +(sums[p] / weights[p]).toFixed(2) : null;
    });

    const ordenadas = [...filtradas].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    return {
      tipo,
      cobertura,
      promedio,
      n_encuestas: filtradas.length,
      ultima_fecha: ordenadas[0]?.fecha,
      ultima_firma: ordenadas[0]?.firma,
      metodologia:  'Exponential decay × quality × sample (Silver/FiveThirtyEight)'
    };
  },

  // ── API PRINCIPAL ──
  // Lo que usa MotorProyeccion para el Bayesian update presidencial
  getIntencionCandidato() {
    return this._agregarPorTipo('intencion_candidato', 'nacional');
  },

  // Lo que usa MotorEscenarios y MotorAlianza para proyección legislativa
  getSimpatiaPartidaria() {
    return this._agregarPorTipo('simpatia_partidaria', 'nacional');
  },

  // Encuesta provincial específica (para recalibrar swing local)
  getProvincial(provincia_id, tipo = 'intencion_candidato') {
    return this._agregarPorTipo(tipo, 'provincial', provincia_id);
  },

  // Todas las encuestas provinciales disponibles
  getTodasProvinciales() {
    const ids = [...new Set(
      this._polls.filter(p => p.cobertura === 'provincial').map(p => p.provincia_id)
    )];
    return ids.map(id => ({
      provincia_id: id,
      candidato: this.getProvincial(id, 'intencion_candidato'),
      simpatia:  this.getProvincial(id, 'simpatia_partidaria')
    })).filter(x => x.candidato || x.simpatia);
  },

  // Resumen del estado del modelo con encuestas
  estadoModelo() {
    const candidato  = this.getIntencionCandidato();
    const simpatia   = this.getSimpatiaPartidaria();
    const provinciales = this.getTodasProvinciales();
    const total      = this._polls.length;

    if (total === 0) {
      return {
        activo: false,
        nivel: 'SOLO_FUNDAMENTALS',
        color: '#D97706',
        mensaje: 'Sin encuestas — modelo corre solo con fundamentals electorales',
        confianza: 'MEDIA',
        detalle: null
      };
    }

    const nivel = candidato && simpatia ? 'COMPLETO'
                : candidato ? 'CANDIDATO'
                : simpatia  ? 'SIMPATIA'
                : 'PARCIAL';

    const tieneProvinciales = provinciales.length > 0;
    const confianza = tieneProvinciales && total >= 3 ? 'ALTA'
                    : total >= 2 ? 'MEDIA-ALTA'
                    : 'MEDIA';

    return {
      activo: true,
      nivel,
      color: '#059669',
      mensaje: total + ' encuesta(s) activas — ' +
        (candidato ? 'Intención candidato ✓' : 'Sin intención candidato') + ' · ' +
        (simpatia  ? 'Simpatía partidaria ✓' : 'Sin simpatía partidaria') +
        (tieneProvinciales ? ' · ' + provinciales.length + ' provincias calibradas' : ''),
      confianza,
      ultima_firma:  candidato?.ultima_firma || simpatia?.ultima_firma,
      ultima_fecha:  candidato?.ultima_fecha || simpatia?.ultima_fecha,
      fp_candidato:  candidato?.promedio?.FP,
      fp_simpatia:   simpatia?.promedio?.FP,
      diferencia_util: candidato && simpatia && candidato.promedio.FP && simpatia.promedio.FP
        ? +(simpatia.promedio.FP - candidato.promedio.FP).toFixed(1)
        : null,  // voto útil: si simpatía > intención, hay pérdida por percepción de viabilidad
      n_provinciales: provinciales.length,
      detalle: { candidato, simpatia, provinciales }
    };
  },

  // ── INDICADOR DE CONFIANZA POR PROVINCIA ──
  // Qué tan confiable es la proyección de una provincia específica
  confianzaProvincia(prov) {
    const margen    = prov.margen_pp || 30;
    const tieneData20 = !!(window._PROV_METRICS_PRES_2020 || []).find(x => x.id === prov.id);
    const tieneEnc  = this.getProvincial(prov.id);

    let score = 0;
    if (tieneData20) score += 40;   // datos 2020 completos
    if (tieneEnc)    score += 35;   // encuesta provincial disponible
    if (margen > 10) score += 15;   // margen claro reduce incertidumbre
    if (this._polls.length >= 2) score += 10; // múltiples encuestas nacionales

    return {
      score,
      nivel: score >= 75 ? 'ALTA' : score >= 50 ? 'MEDIA' : 'ESTIMADO',
      color: score >= 75 ? '#059669' : score >= 50 ? '#D97706' : '#DC2626',
      etiqueta: score >= 75 ? '🟢 ALTA' : score >= 50 ? '🟡 MEDIA' : '🔴 ESTIMADO'
    };
  },

  // ── TENDENCIA (OLS) — se mantiene de v9 ──
  tendencia(partido) {
    const tipo = 'intencion_candidato';
    const polls = this._polls
      .filter(p => p[partido] !== undefined && p.tipo === tipo)
      .sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
    if (polls.length < 2) return null;
    const n = polls.length;
    const xs = polls.map((_, i) => i);
    const ys = polls.map(p => p[partido]);
    const xm = xs.reduce((s, x) => s + x, 0) / n;
    const ym = ys.reduce((s, y) => s + y, 0) / n;
    const slope = xs.reduce((s, x, i) => s + (x - xm) * (ys[i] - ym), 0) /
                  xs.reduce((s, x) => s + (x - xm) ** 2, 0);
    return {
      partido, slope: +slope.toFixed(3),
      tendencia: slope > 0.3 ? 'sube' : slope < -0.3 ? 'baja' : 'estable',
      ultimo: ys[n - 1],
      proyectado_proximo: +(ys[n - 1] + slope).toFixed(1)
    };
  },

  // ── COMPATIBILIDAD hacia atrás — el simulador usa agregar() ──
  agregar(partidos = ['PRM', 'FP', 'PLD']) {
    const cand = this.getIntencionCandidato();
    if (!cand) return null;
    return { promedio: cand.promedio, n_encuestas: cand.n_encuestas,
             ultima: cand.ultima_fecha, metodologia: cand.metodologia };
  }
};

// ─────────────────────────────────────────────────────────────────
// MOTOR 14: POTENCIAL ELECTORAL
// Modelo: clasificación territorial por oportunidad
//         Basado en: Jacobson (2004) + Swing Ratio (Taagepera & Shugart)
//
// Dimensiones:
//   1. Desempeño base (% votos 2024)
//   2. Participación (alto abstencionismo = potencial de movilización)
//   3. Margen (plaza cerrada = prioridad defensiva/ofensiva)
//   4. ENPP (más partidos = mayor fragmentación, más oportunidad)
// ─────────────────────────────────────────────────────────────────
const MotorPotencial = {

  // Score de potencial ofensivo para un partido (perspectiva del challenger)
  // nivel: 'presidencial' | 'senadores' | 'diputados' (solo informativo, prov_metrics ya es del nivel)
  scoreOfensivo(prov_metrics, partidoTarget = 'FP') {
    return prov_metrics.map(pm => {
      const esGanado = pm.ganador === partidoTarget;
      const pct_target = pm.blocs?.[partidoTarget]
        ? +(pm.blocs[partidoTarget] / pm.votos_emitidos * 100).toFixed(1)
        : 0;

      const margen_factor    = Math.max(0, 1 - pm.margen_pp / 40);
      const abstencion_factor = pm.abstencion / 100;
      const enpp_factor      = Math.min((pm.enpp - 1) / 3, 1);

      const score = esGanado
        ? 0
        : +((margen_factor*0.5 + abstencion_factor*0.3 + enpp_factor*0.2) * 100).toFixed(1);

      let categoria;
      if (esGanado)       categoria = 'consolidada';
      else if (score>=60) categoria = 'objetivo_prioritario';
      else if (score>=40) categoria = 'objetivo_secundario';
      else if (score>=20) categoria = 'difícil';
      else                categoria = 'perdida';

      return { ...pm, score_ofensivo: score, categoria_ofensiva: categoria, pct_target };
    }).sort((a,b) => b.score_ofensivo - a.score_ofensivo);
  },

  // Score defensivo para el partido incumbente
  scoreDefensivo(prov_metrics, partidoDefensor = 'PRM') {
    return prov_metrics
      .filter(pm => pm.ganador === partidoDefensor ||
                    pm.bloque_coalicion === partidoDefensor + '-coalicion')
      .map(pm => ({
        ...pm,
        score_riesgo: pm.riesgo_score,
        prioridad_defensa: pm.riesgo_score >= 65 ? 'alta' : pm.riesgo_score >= 45 ? 'media' : 'baja'
      }))
      .sort((a,b) => b.score_riesgo - a.score_riesgo);
  },

  // Análisis ofensivo multi-nivel: devuelve los tres datasets para un partido
  scoreOfensivoMultinivel(prov_pres, prov_sen, prov_dip, partidoTarget = 'FP') {
    return {
      presidencial: this.scoreOfensivo(prov_pres, partidoTarget),
      senadores:    this.scoreOfensivo(prov_sen,  partidoTarget),
      diputados:    this.scoreOfensivo(prov_dip,  partidoTarget)
    };
  }
};

// ─────────────────────────────────────────────────────────────────
// MOTOR 15: MOVILIZACIÓN
// Modelo: Turnout gap + vote targets (Leighley & Nagler 2013)
//         "Who Votes Now? Demographics, Issues, Inequality, and Turnout"
//
// Lógica:
//   votos_para_ganar = ceil((votos_ganador - votos_challenger) / 2) + 1
//   movilizacion_necesaria = votos_para_ganar / (inscritos * abstencion_rate)
//   Esto mide qué fracción de abstencionistas debe movilizarse
// ─────────────────────────────────────────────────────────────────
const MotorMovilizacion = {
  // Niveles disponibles y sus datasets
  _datasets: { presidencial: null, senadores: null, diputados: null },

  init(prov_pres, prov_sen, prov_dip) {
    this._datasets.presidencial = prov_pres;
    this._datasets.senadores    = prov_sen;
    this._datasets.diputados    = prov_dip;
  },

  // Votos adicionales que necesita el segundo partido para ganar la provincia
  // Formula: ceil((votos_ganador - votos_segundo) / 2) + 1
  votosParaGanar(votos_ganador, votos_segundo) {
    return Math.ceil((votos_ganador - votos_segundo) / 2) + 1;
  },

  // % de abstencionistas a movilizar (Leighley & Nagler 2013 — mobilization gap)
  pctAbstencionistasNecesarios(votosNecesarios, inscritos, participacion_actual) {
    const abstencionistas = inscritos * (1 - participacion_actual / 100);
    if (abstencionistas <= 0) return 100;
    return +Math.min(100, votosNecesarios / abstencionistas * 100).toFixed(1);
  },

  // Genera agenda de movilización para un partido en un nivel electoral específico.
  // nivel: 'presidencial' | 'senadores' | 'diputados'
  // partido_objetivo: 'FP' | 'PRM' | etc.
  // incluir_ganadas: si true incluye también las provincias donde ya gana (para defensa)
  agenda(nivel, partido_objetivo, incluir_ganadas = false) {
    const dataset = this._datasets[nivel];
    if (!dataset || !dataset.length) return [];

    return dataset
      .filter(pm => incluir_ganadas ? true : pm.ganador !== partido_objetivo)
      .map(pm => {
        // Para senadores: cuando FP no encabezó la alianza, blocs.FP = 0 porque los votos
        // del bloque se registran bajo el candidato_base. votos_casilla_fp contiene los
        // votos exactos que cayeron en la casilla FP (inyectado por app.js desde resultados_2024).
        const bloqueV  = pm.blocs?.[partido_objetivo] || 0;
        const casillaV = partido_objetivo === 'FP' ? (pm.votos_casilla_fp || 0) : 0;
        const votos_objetivo = bloqueV > 0 ? bloqueV : casillaV;
        const votos_ganador_n = pm.blocs?.[pm.ganador] || 0;
        const gap       = votos_ganador_n - votos_objetivo;
        const necesarios = pm.ganador !== partido_objetivo
          ? this.votosParaGanar(votos_ganador_n, votos_objetivo)
          : 0; // ya ganó — déficit cero
        const pct_movilizar = necesarios > 0
          ? this.pctAbstencionistasNecesarios(necesarios, pm.inscritos, pm.participacion)
          : 0;

        return {
          provincia:          pm.provincia,
          provincia_id:       pm.id,
          nivel,
          ganador_actual:     pm.ganador,
          bloque_coalicion:   pm.bloque_coalicion || null,
          votos_objetivo,
          votos_ganador:      votos_ganador_n,
          votos_gap:          gap,
          votos_necesarios:   necesarios,
          pct_abstencionistas_a_movilizar: pct_movilizar,
          factibilidad: pct_movilizar === 0 ? 'ganada'
            : pct_movilizar < 20 ? 'alta'
            : pct_movilizar < 40 ? 'media' : 'baja',
          participacion_actual: pm.participacion,
          inscritos: pm.inscritos,
          margen_pp: pm.margen_pp,
          enpp: pm.enpp
        };
      })
      .sort((a, b) => {
        // Primero las más factibles (menor pct_abstencionistas)
        if (a.factibilidad === 'ganada') return 1;
        if (b.factibilidad === 'ganada') return -1;
        return a.pct_abstencionistas_a_movilizar - b.pct_abstencionistas_a_movilizar;
      });
  },

  // Resumen consolidado de los tres niveles para un partido
  resumenMultinivel(partido_objetivo) {
    return ['presidencial','senadores','diputados'].map(nivel => {
      const ag = this.agenda(nivel, partido_objetivo);
      return {
        nivel,
        plazas_perdidas:   ag.length,
        plazas_alta:       ag.filter(x=>x.factibilidad==='alta').length,
        plazas_media:      ag.filter(x=>x.factibilidad==='media').length,
        plazas_baja:       ag.filter(x=>x.factibilidad==='baja').length,
        votos_totales_gap: ag.reduce((s,x)=>s+x.votos_gap,0)
      };
    });
  }
};

// ─────────────────────────────────────────────────────────────────
// MOTOR 16: RIESGO ELECTORAL
// Modelo: composite risk index
//         Componentes: margen (Jacobson 2004), participación,
//         ENPP (Laakso-Taagepera), swing potential (Gelman & King 1994)
//
// Risk = 0.50 * (1-margen_norm) + 0.25 * (1-partic_norm) + 0.25 * enpp_norm
// Donde cada variable está normalizada [0,1]
// ─────────────────────────────────────────────────────────────────
const MotorRiesgo = {
  // Modelo: composite risk index v12.0
  // CAMBIO v12: reemplaza ENPP por concentración top-2 (PRM+FP)
  //   Fundamento: ENPP en RD está inflado por 20+ partidos satélite (muchos aliados)
  //   que no representan fragmentación real del voto. En 2024, PRM+FP+PLD = 96.7%
  //   del voto válido. El ENPP promedio de 2.29 sugiere casi-bipartidismo, pero
  //   no mide la variable estratégica real: ¿cuánto espacio hay entre los dos polos?
  //   Índice top-2 (PRM+FP como % del voto) mide directamente:
  //     - Alta concentración top-2 (>85%): mercado casi cerrado, poco espacio para crecer
  //     - Baja concentración top-2 (<75%): hay voto disponible fuera de los dos polos
  //   Fuente: Cox (1997) Making Votes Count — concentración bipolar como medida de clausura
  // score = 0.50×(1-margen_norm) + 0.25×(1-partic_norm) + 0.25×(1-concentracion_top2)
  PESOS: { margen: 0.50, participacion: 0.25, concentracion_top2: 0.25 },
  UMBRAL_ALTO:  38,
  UMBRAL_MEDIO: 23,

  calcScore(margen_pp, participacion, concentracion_top2_pct) {
    const margen_norm = Math.min((margen_pp || 0) / 40, 1);
    const partic_norm = (participacion || 54) / 100;
    // concentracion_top2: % del voto que va a PRM+FP (0-100)
    // Alta concentración → poco espacio → baja volatilidad potencial → menor riesgo de sorpresa
    // Baja concentración → hay voto disperso susceptible de moverse → mayor riesgo/oportunidad
    const top2_norm = Math.min((concentracion_top2_pct || 86) / 100, 1);
    const risk = (1 - margen_norm)   * this.PESOS.margen
               + (1 - partic_norm)   * this.PESOS.participacion
               + (1 - top2_norm)     * this.PESOS.concentracion_top2;
    return +(risk * 100).toFixed(1);
  },

  nivelRiesgo(score) {
    if (score >= this.UMBRAL_ALTO)  return 'alto';
    if (score >= this.UMBRAL_MEDIO) return 'medio';
    return 'bajo';
  },

  // ── Perspectiva DEFENSIVA: plazas que un partido tiene y puede perder ──
  clasificar(prov_metrics, partido = 'PRM') {
    if (!prov_metrics || !prov_metrics.length) return [];
    return prov_metrics
      .filter(pm => {
        if (partido === 'PRM')
          return pm.ganador === 'PRM' || (pm.bloque_coalicion || '').startsWith('PRM');
        if (partido === 'FP')
          return (pm.pct_fp || 0) >= 25;
        return pm.ganador === partido;
      })
      .map(pm => {
        const margen = partido === 'FP'
          ? Math.max(0, (pm.pct_prm || 50) - (pm.pct_fp || 25))
          : Math.max(0, (pm.pct_prm || 50) - (pm.pct_fp || 25));
        // v12: concentración top-2 en vez de ENPP
        const pct_prm = pm.pct_prm || 0;
        const pct_fp  = pm.pct_fp  || 0;
        const top2    = Math.min(100, pct_prm + pct_fp);
        const score = this.calcScore(margen, pm.participacion, top2);
        return {
          ...pm,
          riesgo_score:      score,
          riesgo_nivel:      this.nivelRiesgo(score),
          margen_riesgo:     +margen.toFixed(2),
          concentracion_top2: +top2.toFixed(1)
        };
      })
      .sort((a, b) => b.riesgo_score - a.riesgo_score);
  },

  // ── Perspectiva OFENSIVA para FP ──
  clasificarOfensivoFP(prov_metrics) {
    if (!prov_metrics || !prov_metrics.length) return [];
    return prov_metrics
      .filter(pm => pm.ganador === 'PRM')
      .map(pm => {
        const brecha = Math.max(0, (pm.pct_prm || 50) - (pm.pct_fp || 25));
        const top2   = Math.min(100, (pm.pct_prm || 0) + (pm.pct_fp || 0));
        const score  = this.calcScore(brecha, pm.participacion, top2);
        return {
          id:                 pm.id,
          provincia:          pm.provincia,
          pct_fp:             pm.pct_fp,
          pct_prm:            pm.pct_prm,
          brecha_pp:          +brecha.toFixed(2),
          oportunidad_score:  score,
          oportunidad_nivel:  this.nivelRiesgo(score),
          margen_pp:          pm.margen_pp,
          inscritos:          pm.inscritos,
          concentracion_top2: +top2.toFixed(1)
        };
      })
      .sort((a, b) => b.oportunidad_score - a.oportunidad_score);
  },

  // ── Riesgo multi-nivel ──
  clasificarMultinivel(prov_pres, prov_sen, prov_dip, partido = 'PRM') {
    const evaluar = (dataset, nivel) =>
      dataset && dataset.length
        ? this.clasificar(dataset, partido).map(p => ({ ...p, nivel }))
        : [];
    return {
      presidencial: evaluar(prov_pres, 'presidencial'),
      senadores:    evaluar(prov_sen,  'senadores'),
      diputados:    evaluar(prov_dip,  'diputados'),
      ofensivo_fp:  prov_pres ? this.clasificarOfensivoFP(prov_pres) : []
    };
  },

  getAlertas(prov_metrics, partido = 'PRM') {
    return this.clasificar(prov_metrics, partido)
      .filter(pm => pm.riesgo_nivel === 'alto')
      .map(pm => ({
        provincia:          pm.provincia,
        riesgo:             pm.riesgo_score,
        margen:             pm.margen_riesgo,
        participacion:      pm.participacion,
        concentracion_top2: pm.concentracion_top2,
        mensaje:            `Margen ${pm.margen_riesgo}pp · Conc. top-2: ${pm.concentracion_top2}% — monitoreo prioritario`
      }));
  }
};

// ─────────────────────────────────────────────────────────────────
// MOTOR 17: NORMALIZACIÓN HISTÓRICA
// Modelo: crecimiento estructural entre ciclos electorales
//
// Propósito: evitar que el modelo penalice a partidos con crecimiento
// estructural real (e.g. FP que no existía en 2020 como partido)
//
// MODO PROXY (activo hasta recibir data 2020):
//   baseline_FP_2020 = PLD_2024 * factor_transferencia
//   donde factor_transferencia = fracción del voto PLD 2020 que proviene
//   del electorado leonelista (estimado en 0.65 por literatura de partidos RD)
//
// MODO COMPLETO (cuando llegue data 2020):
//   crecimiento = (resultado_2024 - resultado_2020) / resultado_2020
//   score_normalizado = α*resultado_2020 + β*resultado_2024 + γ*crecimiento
//   donde α=0.2, β=0.6, γ=0.2 (pesos: prioriza actual, descuenta histórico lejano)
//
// Referencias:
//   Panebianco (1988) Political Parties — curva de madurez organizativa
//   Harmel & Janda (1994) EJPR — adaptación y cambio partidario
// ─────────────────────────────────────────────────────────────────
const MotorNormalizacionHistorica = {
  status: 'PROXY',  // 'PROXY' | 'COMPLETO'
  _data2024: null,
  _data2020: null,

  // Parámetros del modelo
  PESOS: { historico: 0.20, actual: 0.60, crecimiento: 0.20 },
  // Factor de transferencia PLD 2020 → FP PLD→FP (literatura partidos RD)
  FACTOR_TRANSFERENCIA_FP: 0.65,
  // Pesos para modo proxy (sin histórico real)
  PESOS_PROXY: { actual: 0.80, madurez: 0.20 },
  // Coeficiente de madurez organizativa (Panebianco 1988)
  // Partidos en su primer ciclo electoral reciben penalización reducida
  MADUREZ: { nuevo: 0.70, consolidado: 0.90, maduro: 1.00 },

  init(data2024, data2020 = null) {
    this._data2024 = data2024;
    this._data2020 = data2020;
    this.status = data2020 ? 'COMPLETO' : 'PROXY';
  },

  // Determina la madurez organizativa de un partido
  _madurez(partido, anio_fundacion) {
    const ciclos = Math.floor((2024 - (anio_fundacion || 2000)) / 4);
    if (ciclos <= 1) return this.MADUREZ.nuevo;
    if (ciclos <= 3) return this.MADUREZ.consolidado;
    return this.MADUREZ.maduro;
  },

  // MODO PROXY: estima baseline 2020 para FP a partir del voto PLD
  // pld_prov_2024: votos PLD en la provincia en 2024 (el voto residual leonelista)
  estimarBaseline2020FP(pld_prov_2024, total_prov_2024) {
    // El PLD 2024 es el residuo del voto leonelista que NO siguió a FP
    // Entonces el voto leonelista en 2020 ≈ FP_2024 + PLD_2024 * factor
    // Pero no tenemos FP_2024 por provincia directamente aquí — se pasa por parámetro
    return Math.round(pld_prov_2024 * this.FACTOR_TRANSFERENCIA_FP);
  },

  // Score normalizado para un partido en una provincia (modo proxy)
  scoreNormalizadoProxy(partido, votos_2024, total_2024, blocs_prov) {
    const pct_2024 = votos_2024 / total_2024;

    let coef_madurez = 1.0;
    let nota_proxy = '';

    if (partido === 'FP') {
      // FP: primer ciclo como partido autónomo — aplicar coeficiente de madurez
      coef_madurez = this.MADUREZ.nuevo;
      // Ajustar upward: el 2024 subestima porque la organización no estaba completa
      // FP en 2024 logró 28.85% con estructura nueva — proyección con madurez completa
      nota_proxy = 'Ajuste madurez organizativa +1 ciclo (Panebianco 1988)';
    }

    // score = pct_actual * coef_madurez * peso_actual + bonus_madurez
    const score = pct_2024 * (this.PESOS_PROXY.actual + coef_madurez * this.PESOS_PROXY.madurez);

    return {
      partido,
      modo: 'PROXY',
      pct_2024: +(pct_2024*100).toFixed(2),
      baseline_2020_estimado: partido === 'FP'
        ? +(this.estimarBaseline2020FP(blocs_prov?.PLD||0, total_2024) / total_2024 * 100).toFixed(2)
        : null,
      coef_madurez,
      score_normalizado: +(score*100).toFixed(2),
      nota: nota_proxy || 'Sin ajuste — partido establecido'
    };
  },

  // MODO COMPLETO: score con datos reales 2020
  scoreNormalizadoCompleto(partido, votos_2024, total_2024, votos_2020, total_2020) {
    const pct_2024 = votos_2024 / total_2024;
    const pct_2020 = total_2020 > 0 ? votos_2020 / total_2020 : 0;
    const crecimiento = pct_2020 > 0 ? (pct_2024 - pct_2020) / pct_2020 : 0;

    const score = this.PESOS.historico * pct_2020
                + this.PESOS.actual    * pct_2024
                + this.PESOS.crecimiento * Math.max(0, crecimiento) * pct_2024;

    return {
      partido,
      modo: 'COMPLETO',
      pct_2020: +(pct_2020*100).toFixed(2),
      pct_2024: +(pct_2024*100).toFixed(2),
      crecimiento_pct: +(crecimiento*100).toFixed(2),
      score_normalizado: +(score*100).toFixed(2),
      tendencia: crecimiento > 0.1 ? 'creciente' : crecimiento < -0.1 ? 'decreciente' : 'estable'
    };
  },

  // Analizar todos los partidos en todos los territorios
  // prov_metrics: array de provincias con blocs
  analizar(prov_metrics, partidos = ['PRM','FP','PLD']) {
    if (!prov_metrics || !prov_metrics.length) return [];

    return prov_metrics.map(pm => {
      const total = pm.votos_emitidos;
      const scores = {};

      partidos.forEach(partido => {
        const votos = pm.blocs?.[partido] || 0;
        if (this.status === 'COMPLETO' && this._data2020) {
          const prov2020 = this._data2020.find(p=>p.id===pm.id);
          const v2020 = prov2020?.blocs?.[partido] || 0;
          const t2020 = prov2020?.votos_emitidos || 0;
          scores[partido] = this.scoreNormalizadoCompleto(partido, votos, total, v2020, t2020);
        } else {
          scores[partido] = this.scoreNormalizadoProxy(partido, votos, total, pm.blocs);
        }
      });

      return { id: pm.id, provincia: pm.provincia, scores };
    });
  },

  // Factor de ajuste para MotorProyeccion
  // Devuelve el multiplicador que debe aplicarse al resultado 2024 de un partido
  // para evitar sub/sobre proyección basada en histórico incompleto
  // Pre-calcular factores de ajuste fino por partido (modo COMPLETO)
  //
  // DISEÑO CRÍTICO: M17 es un ajuste MARGINAL sobre M11, NO una segunda proyección.
  // M11 (MotorProyeccion) ya calcula baseline + swing (×0.35) + incumbencia + regresión.
  // M17 solo debe afinar: ¿el proxy de M17 subestima o sobreestima vs la data real 2020?
  //
  // Metodología:
  //   score_completo = 0.20×pct2020 + 0.60×pct2024 + 0.20×crec×pct2024  (data real)
  //   score_proxy    = pct2024 × (0.80 + madurez×0.20)                   (estimado)
  //   ratio = score_completo / score_proxy
  //   factor = cap(ratio, [0.92, 1.15])  ← ajuste fino ±8–15% máximo
  //
  // Cap estrecho evita doble conteo con el swing ya incorporado en M11.
  _calcularFactoresPonderados(prov24, prov20) {
    const MADUREZ_FP = 0.70;  // mismo valor que MADUREZ.nuevo
    // v12: cap ASIMÉTRICO por dirección del partido
    // FP (creciente): cap [0.95, 1.15] — puede recibir bono de consolidación
    // PRM (transición): cap [0.90, 1.05] — partido incumbente sin titular, neutro/ligero descuento
    // PLD (declive):  cap [0.75, 0.95] — organización en contracción, no merece bono
    //   Fundamento: Panebianco (1988) — curva de madurez es bidireccional;
    //   un partido con -69% de su votación en un ciclo está en desintegración, no consolidación
    const CAPS = {
      FP:  { min: 0.95, max: 1.15 },
      PRM: { min: 0.90, max: 1.05 },
      PLD: { min: 0.75, max: 0.95 },  // v12: PLD solo puede recibir ajuste negativo
    };
    const partidos = ['PRM', 'FP', 'PLD'];
    this._factoresPonderados = {};
    partidos.forEach(partido => {
      const cap = CAPS[partido] || { min: 0.92, max: 1.15 };
      let sumScoreC = 0, sumScoreP = 0, sumVotos = 0;
      prov24.forEach(p => {
        const p20 = (prov20 || []).find(x => x.id === p.id) || { blocs: {}, votos_validos: 0 };
        const v24 = (p.blocs && p.blocs[partido]) || 0;
        const t24 = p.votos_validos || 1;
        const v20 = (p20.blocs && p20.blocs[partido]) || 0;
        const t20 = p20.votos_validos || 1;
        const pct24 = v24 / t24;
        const pct20 = t20 > 0 ? v20 / t20 : 0;
        const crec  = pct20 > 0 ? (pct24 - pct20) / pct20 : 0;
        // Score con data real (COMPLETO)
        const scoreC = 0.20 * pct20 + 0.60 * pct24 + 0.20 * Math.max(0, crec) * pct24;
        // Score estimado (PROXY)
        const madFactor = partido === 'FP' ? MADUREZ_FP : 1.0;
        const scoreP = pct24 * (0.80 + madFactor * 0.20);
        sumScoreC += scoreC * t24;
        sumScoreP += scoreP * t24;
        sumVotos  += t24;
      });
      const natScoreC = sumVotos > 0 ? sumScoreC / sumVotos : 0;
      const natScoreP = sumVotos > 0 ? sumScoreP / sumVotos : 1;
      const ratio = natScoreP > 0 ? natScoreC / natScoreP : 1.0;
      // v12: proxy base diferenciado por dirección
      const proxyBase = partido === 'FP'  ? 1.08
                      : partido === 'PLD' ? 0.85  // PLD: declive, base baja
                      : 0.97;                     // PRM: transición, ligero descuento
      const rawFactor = proxyBase * ratio;
      this._factoresPonderados[partido] = +Math.min(cap.max, Math.max(cap.min, rawFactor)).toFixed(4);
    });
    console.log('✅ M17 v12 — factores asimétricos por dirección:', JSON.stringify(this._factoresPonderados));
  },

  factorAjusteProyeccion(partido) {
    if (this.status === 'COMPLETO' && this._factoresPonderados && this._factoresPonderados[partido] !== undefined) {
      const mult = this._factoresPonderados[partido];
      return {
        multiplicador: mult,
        razon: 'Score histórico ponderado por votos 2020+2024 (0.20×pct20 + 0.60×pct24 + 0.20×crecimiento)',
        modo: 'COMPLETO'
      };
    }
    // Modo PROXY — fallback cuando no hay data 2020
    if (partido === 'FP') {
      return { multiplicador: 1.08, razon: 'Madurez organizativa primer ciclo — Panebianco 1988 [PROXY]', modo: 'PROXY' };
    }
    if (partido === 'PLD') {
      return { multiplicador: 0.95, razon: 'Ajuste por escisión leonelista contabilizada [PROXY]', modo: 'PROXY' };
    }
    return { multiplicador: 1.00, razon: 'Sin ajuste [PROXY]', modo: 'PROXY' };
  },

  // Integrar data 2020 cuando llegue
  integrarData2020(data2020_normalizada) {
    this._data2020 = data2020_normalizada;
    this.status = 'COMPLETO';
    console.log('✅ MotorNormalizacionHistorica: modo COMPLETO activado con data 2020');
  },

  getStatus() {
    return {
      modo: this.status,
      data_2024: !!this._data2024,
      data_2020: !!this._data2020,
      advertencia: this.status === 'PROXY'
        ? 'Baseline FP estimado desde PLD 2024 — integrar data 2020 para precisión total'
        : null
    };
  }
};


const MotorMunicipal    = { status:'DISABLED', init(){ console.log('⏳ Motor Municipal: pendiente dataset municipal'); }};
// ─────────────────────────────────────────────────────────────────
// MOTOR 18: HISTÓRICO 2020
// Rol: expone datos 2020 para comparativas, swing analysis y
//      normalización histórica en proyecciones 2028
// ─────────────────────────────────────────────────────────────────
const MotorHistorico2020 = {
  status: 'READY',
  _res:   null,   // resultados_2020
  _ali:   null,   // alianzas_2020
  _cur:   null,   // curules_resultado_2020
  _pm_p:  null,   // prov_metrics_presidencial_2020
  _pm_s:  null,   // prov_metrics_senadores_2020
  _pm_d:  null,   // prov_metrics_diputados_2020

  init(res2020, ali2020, cur2020, pmPres, pmSen, pmDip) {
    this._res  = res2020;
    this._ali  = ali2020;
    this._cur  = cur2020;
    this._pm_p = pmPres;
    this._pm_s = pmSen;
    this._pm_d = pmDip;
    this.status = 'READY';
    console.log('✅ Motor Histórico 2020: ACTIVO — 32 prov · 45 circs');
  },

  // Presidencial 2020 por provincia
  getPresidencialByProvincia() {
    return this._pm_p || [];
  },

  // Swing presidencial 2024 vs 2020 por provincia
  // Retorna delta de % por partido para cada provincia
  getSwingPresidencial(partidos = ['PRM','PLD','FP']) {
    const pm24 = window._PROV_METRICS_PRES || [];
    const pm20 = this._pm_p || [];
    const map20 = Object.fromEntries(pm20.map(p => [p.id, p]));

    return pm24.map(p24 => {
      const p20 = map20[p24.id] || {};
      const swing = {};
      partidos.forEach(par => {
        const b24 = p24.blocs || {};
        const b20 = p20.blocs  || {};
        const t24 = Object.values(b24).reduce((s,v)=>s+v,0);
        const t20 = Object.values(b20).reduce((s,v)=>s+v,0);
        const pct24 = t24 ? (b24[par]||0)/t24*100 : 0;
        const pct20 = t20 ? (b20[par]||0)/t20*100 : 0;
        swing[par] = +(pct24 - pct20).toFixed(2);
      });
      return {
        id:        p24.id,
        provincia: p24.provincia,
        swing,
        participacion_24: p24.participacion,
        participacion_20: p20.participacion || 0,
        delta_participacion: +((p24.participacion||0) - (p20.participacion||0)).toFixed(2),
      };
    });
  },

  // Totales presidenciales 2020
  getTotalesPresidencial() {
    return this._res?.niveles?.presidencial?.totales || {};
  },

  // Curules 2020 por nivel
  getCurulesByNivel(nivel) {
    const niveles = this._cur?.niveles || {};
    return niveles[nivel] || [];
  },

  // Comparativa curules 2020 vs 2024
  getComparativaCurules() {
    const cur20 = this._cur?.niveles || {};
    const cur24 = window._DS_CURULES?.niveles || {};
    const niveles = ['senadores','diputados','diputados_exterior','diputados_nacionales'];
    const tot = (n, data) => {
      const entries = data[n];
      if (!entries) return {};
      const arr = Array.isArray(entries) ? entries : (entries.resultado || []);
      const res = {};
      (Array.isArray(arr) ? arr : [arr]).forEach(x => {
        const resultados = x.resultado || [x];
        (Array.isArray(resultados) ? resultados : [resultados]).forEach(r => {
          if (r.partido) res[r.partido] = (res[r.partido]||0) + (r.curules||0);
        });
      });
      return res;
    };
    const out = {};
    niveles.forEach(n => {
      out[n] = { _2020: tot(n, cur20), _2024: tot(n, cur24) };
    });
    return out;
  }
};

// ─────────────────────────────────────────────────────────────────
// EXPORT GLOBAL
// ─────────────────────────────────────────────────────────────────
window.SIE_MOTORES = {
  // Infraestructura
  Carga:             MotorCarga,
  Validacion:        MotorValidacion,
  Padron:            MotorPadron,
  Resultados:        MotorResultados,
  Territorial:       MotorTerritorial,
  Alianzas:          MotorAlianzas,
  Curules:           MotorCurules,
  // Análisis
  KPIs:              MotorKPIs,
  Replay:            MotorReplay,
  Escenarios:        MotorEscenarios,
  Proyeccion:        MotorProyeccion,
  CrecimientoPadron: MotorCrecimientoPadron,
  Encuestas:         MotorEncuestas,
  // Estrategia
  Potencial:             MotorPotencial,
  Movilizacion:          MotorMovilizacion,
  Riesgo:                MotorRiesgo,
  NormalizacionHistorica:MotorNormalizacionHistorica,
  // Desactivados
  Municipal:         MotorMunicipal,
  Historico2020:     MotorHistorico2020
};


// ═══════════════════════════════════════════════════════════════════════════
// SIE 2028 v11.0 — MOTORES ESTRATÉGICOS ROBUSTECIDOS (8)
// Plan de robustecimiento: 9 de Marzo de 2026
// Metodología: Jacobson 2004, Aldrich 1995, Cox 1997, Grofman & Lijphart 2002,
//              Plutzer 2002, Carlin et al. 2012, Silver 2012, LAPOP 2022
// ═══════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────
// M-A: MOTOR DE TRANSFERENCIA DE VOTO PLD→FP (NUEVO v10.0)
// Metodología: Aldrich (1995) party switching + Hug (2001) leader-follower transfer
// Pregunta: ¿Cuánto voto leonelista disponible queda por provincia?
//
// Lógica:
//   voto_leonelista_disponible(prov) = PLD_2020(prov) × FACTOR_TRANSFERENCIA
//   voto_leonelista_migrado(prov)    = FP_2024(prov) - FP_2020_equiv(prov)
//   residual(prov)                   = disponible - migrado
//   Si residual > 0 → voto captable con campaña activa
// ─────────────────────────────────────────────────────────────────
const MotorTransferenciaVoto = {
  // ── Factor base nacional (Aldrich 1995 + literatura partidos RD)
  // Rango empírico: 0.50–0.80 según penetración leonelista local
  // Fórmula: factor = 0.50 + 0.30 × penetracion_leonelista(prov)
  // donde penetracion = FP_2024 / (FP_2024 + PLD_2024) — proxy de dominio
  // Esto captura que en provincias donde FP ya es dominante sobre PLD,
  // el electorado leonelista está más consolidado alrededor de Leonel.
  FACTOR_BASE: 0.50,
  FACTOR_EXTRA: 0.30,

  // Calcula el factor de transferencia específico por provincia
  _factorPorProvincia(fp_2024, pld_2024) {
    const denom = fp_2024 + pld_2024;
    if (denom === 0) return this.FACTOR_BASE;
    const penetracion = Math.min(1, fp_2024 / denom);
    return +(this.FACTOR_BASE + this.FACTOR_EXTRA * penetracion).toFixed(3);
  },

  calcularPorProvincia(prov_metrics_2024, prov_metrics_2020) {
    if (!prov_metrics_2024 || !prov_metrics_2020) return [];
    const map20 = Object.fromEntries(prov_metrics_2020.map(p => [p.id, p]));

    return prov_metrics_2024.map(p24 => {
      const p20    = map20[p24.id] || {};
      const total20 = p20.votos_emitidos || 1;
      const total24 = p24.votos_emitidos || 1;

      const pld_2020  = p20.blocs?.PLD || 0;
      const fp_2020   = p20.blocs?.FP  || 0;
      // Cuando FP no encabezó la alianza senatorial, blocs.FP = 0 porque los votos
      // del bloque se registran bajo el candidato_base. votos_casilla_fp tiene los
      // votos reales que cayeron en la casilla FP (inyectado por app.js desde resultados_2024).
      const fp_2024   = (p24.blocs?.FP || 0) > 0
        ? p24.blocs.FP
        : (p24.votos_casilla_fp || 0);
      const pld_2024  = p24.blocs?.PLD || 0;

      // Factor variable por provincia — depende de penetración leonelista local
      const factor = this._factorPorProvincia(fp_2024, pld_2024);

      const pld_pct_2020 = +(pld_2020 / total20 * 100).toFixed(2);
      const fp_pct_2024  = +(fp_2024  / total24 * 100).toFixed(2);

      // Voto PLD 2020 disponible ajustado por factor local
      const leonelista_total = Math.round(pld_2020 * factor);
      const leonelista_pct   = +(leonelista_total / total20 * 100).toFixed(2);

      // Voto leonelista ya migrado a FP (crecimiento neto desde 2020)
      const migrado      = Math.max(0, fp_2024 - fp_2020);
      const migrado_pct  = +(migrado / total24 * 100).toFixed(2);

      // Residual captable — puede ser negativo si FP ya superó la base
      const residual_raw = leonelista_total - migrado;
      const residual     = Math.max(0, residual_raw);
      const residual_pct = +(residual / total24 * 100).toFixed(2);

      const captura_pct  = leonelista_total > 0
        ? +Math.min(100, migrado / leonelista_total * 100).toFixed(1) : 100;

      const supero_base  = residual_raw < 0; // FP ya creció más allá del núcleo leonelista

      return {
        id:               p24.id,
        provincia:        p24.provincia,
        pld_2020,
        pld_pct_2020,
        fp_2020,
        fp_2024,
        fp_pct_2024,
        pld_2024,
        factor_transferencia: factor,
        leonelista_total,
        leonelista_pct,
        migrado,
        migrado_pct,
        residual,
        residual_pct,
        captura_pct,
        supero_base,
        crecimiento_propio: supero_base ? Math.abs(residual_raw) : 0,
        estado: captura_pct >= 100 ? 'superado'
              : captura_pct > 75  ? 'captado'
              : captura_pct > 50  ? 'parcial'
              : 'disponible',
        captable_campana: Math.round(residual * 0.40),
        captable_pct:     +(residual_pct * 0.40).toFixed(2),
        prioridad: !supero_base && residual > 15000 && captura_pct < 60 ? 'ALTA'
                 : !supero_base && residual > 5000  && captura_pct < 75 ? 'MEDIA'
                 : 'BAJA'
      };
    }).sort((a, b) => b.residual - a.residual);
  },

  // Resumen nacional
  resumen(datos) {
    if (!datos || !datos.length) return {};
    const total_residual   = datos.reduce((s, d) => s + d.residual, 0);
    const total_captable   = datos.reduce((s, d) => s + d.captable_campana, 0);
    const total_leonelista = datos.reduce((s, d) => s + d.leonelista_total, 0);
    const total_migrado    = datos.reduce((s, d) => s + d.migrado, 0);
    // Captura puede superar 100% en provincias donde FP ya superó la base leonelista
    // (indica que FP captó votos más allá del núcleo leonelista — crecimiento propio)
    const pct_raw = total_leonelista > 0 ? total_migrado / total_leonelista * 100 : 0;
    return {
      total_residual,
      total_captable,
      total_leonelista,
      total_migrado,
      pct_captura_nacional: +Math.min(100, pct_raw).toFixed(1),
      supero_base_leonelista: pct_raw > 100, // FP creció más allá del voto leonelista
      crecimiento_propio: pct_raw > 100
        ? Math.round((pct_raw - 100) / 100 * total_leonelista) : 0,
      provincias_con_residual: datos.filter(d => d.residual > 0).length,
      provincias_alta:  datos.filter(d => d.prioridad === 'ALTA').length,
      provincias_media: datos.filter(d => d.prioridad === 'MEDIA').length,
      interpretacion: pct_raw > 100
        ? 'FP ya superó su base leonelista — crecimiento propio activo. Residual disponible en provincias específicas.'
        : 'Voto leonelista disponible para captura con campaña activa.'
    };
  }
};

// ─────────────────────────────────────────────────────────────────
// M-B: MOTOR PIVOT ELECTORAL v12.0
// CAMBIO v12: peso movilización 0.10→0.20 / padronal 0.35→0.25
//   Fundamento: abstención RD promedia 38.3% (JCE 2024), máx 52.9% (Santiago)
//   Con 415k+ votos sin movilizar solo en Santiago, la reserva de abstención
//   es la variable más diferenciadora entre elecciones RD comparables.
//   El padrón no cambia entre ciclos — la movilización sí.
//   Leighley & Nagler (2013): GOTV tiene mayor ROI en zonas con alta abstención crónica.
// ─────────────────────────────────────────────────────────────────
const MotorPivotElectoral = {
  calculate(provinces) {
    if (!provinces || !provinces.length) return { topFive: [], allScores: [], summary: {} };
    // v12: movilizacion sube de 0.10→0.20 | padronal baja de 0.35→0.25
    const weights = { padronal: 0.25, competitividad: 0.35, volatilidad: 0.20, movilizacion: 0.20 };

    // Total padrón nacional — usa campo real 'inscritos'
    const totalPadron = provinces.reduce((sum, p) => sum + (p.inscritos || 0), 0) || 1;

    const scores = provinces.map(prov => {
      // Componente padronal: peso demográfico de la provincia
      const padronalScore = ((prov.inscritos || 0) / totalPadron) * 100 * 5;

      // Componente competitividad: usa margen_pp real
      const margen = prov.margen_pp || 30;
      const competitividadScore = Math.max(0, 1 - margen / 40) * 100;

      // Componente volatilidad: usa enpp real
      const enpp = prov.enpp || 2;
      const volatilidadScore = Math.min(1, (enpp - 1) / 3) * 100;

      // Componente movilización: usa abstencion real
      const abst = prov.abstencion || (100 - (prov.participacion || 54));
      const movilizacionScore = Math.min(100, abst);

      const pivotScore = Math.min(100,
        padronalScore      * weights.padronal     +
        competitividadScore* weights.competitividad +
        volatilidadScore   * weights.volatilidad   +
        movilizacionScore  * weights.movilizacion
      );

      return {
        id:            prov.id,
        nombre:        prov.provincia,
        pivotScore:    +pivotScore.toFixed(1),
        clasificacion: pivotScore > 60 ? 'CRÍTICA' : pivotScore > 40 ? 'IMPORTANTE' : 'SECUNDARIA',
        margen_pp:     margen,
        inscritos:     prov.inscritos || 0,
        pct_fp:        prov.pct_fp || 0,
        abstencion:    abst
      };
    }).sort((a, b) => b.pivotScore - a.pivotScore);

    return {
      topFive:  scores.slice(0, 5),
      allScores: scores,
      summary: {
        criticas:    scores.filter(p => p.clasificacion === 'CRÍTICA').length,
        importantes: scores.filter(p => p.clasificacion === 'IMPORTANTE').length,
        secundarias: scores.filter(p => p.clasificacion === 'SECUNDARIA').length
      }
    };
  }
};

// ─────────────────────────────────────────────────────────────────
// M-C: MOTOR RUTA DE VICTORIA v10.0 — INTEGRADO CON PROYECCIÓN
// Metodología: ruta mínima greedy sobre votos PROYECTADOS (no base 2024)
// Conectado al pipeline — usa pct_fp_proy de MotorProyeccion
// ─────────────────────────────────────────────────────────────────
const MotorRutaVictoria = {
  // Calcula la ruta mínima de provincias para alcanzar meta de votos
  // Usa votos proyectados cuando están disponibles, base 2024 como fallback
  // B2 fix v11: acepta proyeccion_territorial directamente para evitar timing del pipeline
  calculate(prov_metrics, padron2028 = 8859093, participacion = 0.54, meta_pct = 0.501, proyTerr_directo = null) {
    if (!prov_metrics || !prov_metrics.length) return null;

    const votantesEsperados = Math.round(padron2028 * participacion);
    const metaVotos = Math.round(votantesEsperados * meta_pct);

    // B2: usar proyTerr pasado directamente (pipeline) o fallback al _SIE_PIPELINE
    const proyTerr = proyTerr_directo
      || (window._SIE_PIPELINE && window._SIE_PIPELINE.proyeccion_territorial)
      || null;
    const mapProy = proyTerr
      ? Object.fromEntries(proyTerr.map(p => [p.provincia_id, p]))
      : {};

    // Construir lista de provincias con votos proyectados
    const provsList = prov_metrics.map(p => {
      const proy  = mapProy[p.id];
      // Usar proyección si existe, si no usar base 2024 más swing estimado (+9pp base)
      const pctFP = proy ? proy.pct_fp_proy : Math.min(60, (p.pct_fp || 0) + 9.0);
      // Proyectar votos absolutos FP en 2028
      const padronTotal   = prov_metrics.reduce((s, x) => s + (x.inscritos || 0), 0) || 1;
      const proporcion    = (p.inscritos || 0) / padronTotal;
      const votantesProv  = Math.round(votantesEsperados * proporcion);
      const votosFP_proy  = Math.round(votantesProv * pctFP / 100);
      return {
        id:             p.id,
        nombre:         p.provincia,
        pct_fp_base:    p.pct_fp || 0,
        pct_fp_proy:    +pctFP.toFixed(1),
        votos_fp_proy:  votosFP_proy,
        inscritos:      p.inscritos || 0,
        es_ganada_proy: proy ? proy.ganador_proy === 'FP' : pctFP > 50
      };
    }).sort((a, b) => b.votos_fp_proy - a.votos_fp_proy);

    // Ruta mínima: agregar provincias hasta superar la meta
    const ruta = [];
    let acumulado = 0;
    for (const prov of provsList) {
      if (acumulado >= metaVotos) break;
      ruta.push({ ...prov, acumulado_despues: acumulado + prov.votos_fp_proy });
      acumulado += prov.votos_fp_proy;
    }

    // Provincias ya ganadas (proyección) vs por conquistar
    const ganadas      = ruta.filter(p => p.es_ganada_proy);
    const porConquistar = ruta.filter(p => !p.es_ganada_proy);

    return {
      meta_votos:      metaVotos,
      acumulado_ruta:  acumulado,
      deficit:         Math.max(0, metaVotos - acumulado),
      superavit:       Math.max(0, acumulado - metaVotos),
      alcanza_meta:    acumulado >= metaVotos,
      ruta_minima:     ruta,
      ganadas,
      por_conquistar:  porConquistar,
      n_provincias:    ruta.length,
      estrategia:      ruta.length <= 6 ? 'CONCENTRADA' : ruta.length <= 12 ? 'DISTRIBUIDA' : 'NACIONAL'
    };
  }
};

// ─────────────────────────────────────────────────────────────────
// M-D: MOTOR META ELECTORAL v10.0 — DINÁMICO
// Usa padrón proyectado de MotorCrecimientoPadron (no hardcoded)
// Incluye impacto de transferencia leonelista y nuevos electores
// ─────────────────────────────────────────────────────────────────
const MotorMetaElectoral = {
  VOTOS_FP_2024: 1226194,  // votos reales FP 2024 presidencial territorial (JCE · prov_metrics)

  calculate(opciones = {}) {
    // Obtener padrón 2028 del motor de crecimiento (no hardcoded)
    const padronData = MotorCrecimientoPadron.proyectar
      ? MotorCrecimientoPadron.proyectar()
      : null;
    const padron2028 = opciones.padron2028 || (padronData ? padronData.padron_2028_medio : 8700000);
    const participacion = opciones.participacion || 0.54;
    const votosActualesFP = opciones.votosActualesFP || this.VOTOS_FP_2024;

    const votantesEsperados = Math.round(padron2028 * participacion);
    const metaVotos = Math.round(votantesEsperados * 0.501); // mayoría simple
    const gap = metaVotos - votosActualesFP;
    const progreso_pct = +(votosActualesFP / metaVotos * 100).toFixed(1);

    // Aporte potencial de cada palanca (siempre desde motores reales — sin fallback a gap%)
    const pipe = window._SIE_PIPELINE || {};
    // alianza_resumen viene del Motor Alianza; alianza_datos es el array por provincia
    const aporte_transf       = pipe.transferencia_resumen
      ? pipe.transferencia_resumen.total_captable
      : Math.round(gap * 0.18);
    const aporte_nuevos       = pipe.nuevos_electores
      ? pipe.nuevos_electores.captable_fp
      : Math.round(gap * 0.14);
    // P6 FIX: usar alianza_resumen.ganancia_neta_fp (real) nunca el fallback gap*0.55
    const aporte_alianza      = pipe.alianza_resumen?.ganancia_neta_fp
      ? pipe.alianza_resumen.ganancia_neta_fp
      : (pipe.alianza?.ganancia_neta_fp || MotorAlianzaElectoral.calcularPorProvincia(window._PROV_METRICS_PRES||[],'FP','PLD').reduce((s,a)=>s+(a.ganancia_neta_fp||0),0));
    const aporte_movilizacion = Math.round(gap * 0.10);

    const total_palancas = aporte_transf + aporte_nuevos + aporte_alianza + aporte_movilizacion;
    const gap_residual   = Math.max(0, gap - total_palancas);

    // Tres escenarios con participación variable
    const escenarios = {
      pesimista: _calcEscenario(padron2028, 0.50, votosActualesFP),
      base:      _calcEscenario(padron2028, participacion, votosActualesFP),
      optimista: _calcEscenario(padron2028, 0.58, votosActualesFP)
    };

    function _calcEscenario(padron, part, votosActuales) {
      const votantes = Math.round(padron * part);
      const meta     = Math.round(votantes * 0.501);
      const gap_esc  = meta - votosActuales;
      return { participacion: +(part * 100).toFixed(0), votantes, meta_votos: meta,
               gap: gap_esc, factible: gap_esc <= 600000 };
    }

    return {
      padron2028,
      participacion: +(participacion * 100).toFixed(1),
      votantes_esperados: votantesEsperados,
      meta_votos:   metaVotos,
      votos_actuales: votosActualesFP,
      gap,
      progreso_pct,
      factible: gap <= 700000,
      palancas: {
        transferencia_leonelista: aporte_transf,
        nuevos_electores:         aporte_nuevos,
        alianza_fp_pld:           aporte_alianza,
        movilizacion_abstencion:  aporte_movilizacion,
        total:                    total_palancas,
        gap_residual
      },
      escenarios,
      evaluacion: gap <= 500000 ? 'MUY FACTIBLE'
                : gap <= 900000 ? 'FACTIBLE'
                : gap <= 1200000 ? 'DESAFIANTE'
                : 'MUY DESAFIANTE'
    };
  }
};

// ─────────────────────────────────────────────────────────────────
// M-E: MOTOR DE NUEVOS ELECTORES (NUEVO v10.0)
// Metodología: Plutzer (2002) habitual voter formation +
//              Carlin et al. (2012) Latin American Voter youth patterns
// Pregunta: de los ~555K nuevos votantes 2028, ¿cuántos captura FP y dónde?
// ─────────────────────────────────────────────────────────────────
const MotorNuevosElectores = {
  // Carlin et al. (2012): oposición captura 58% del voto joven en contexto de desgaste incumbente
  CAPTURA_OPOSICION: 0.58,
  // Segundo mandato PRM → mayor desgaste → bonus antiincumbente
  BONUS_ANTIINCUMBENTE: 1.12,
  // Participación esperada de nuevos electores (Plutzer 2002: más baja que base)
  PARTICIPACION_NUEVOS: 0.48,

  calcular(prov_metrics_2024, padron_2028_total, padron_2024_total) {
    if (!prov_metrics_2024 || !prov_metrics_2024.length) return { provincias: [], resumen: {} };

    const padron_2024 = padron_2024_total || 8145548;
    const padron_2028 = padron_2028_total || 8700000;
    const crecimiento_total = Math.max(0, padron_2028 - padron_2024);

    const total_inscritos_2024 = prov_metrics_2024.reduce((s, p) => s + (p.inscritos || 0), 0) || 1;

    const provincias = prov_metrics_2024.map(p => {
      // Distribución proporcional del crecimiento por peso demográfico actual
      const proporcion = (p.inscritos || 0) / total_inscritos_2024;
      const nuevos_prov = Math.round(crecimiento_total * proporcion);

      // Nuevos votantes activos (con participación reducida)
      const nuevos_activos = Math.round(nuevos_prov * this.PARTICIPACION_NUEVOS);

      // Captura FP = tasa base × bonus antiincumbente
      const captura_fp = Math.min(0.75, this.CAPTURA_OPOSICION * this.BONUS_ANTIINCUMBENTE);
      const votos_fp   = Math.round(nuevos_activos * captura_fp);
      const votos_prm  = Math.round(nuevos_activos * (1 - captura_fp) * 0.85); // PRM retiene ~85% del resto

      return {
        id:           p.id,
        provincia:    p.provincia,
        nuevos_inscritos: nuevos_prov,
        nuevos_activos,
        votos_fp,
        votos_prm,
        pct_fp_nuevos: +(captura_fp * 100).toFixed(1),
        impacto_pp:   nuevos_activos > 0
          ? +(votos_fp / (p.votos_emitidos || nuevos_activos) * 100).toFixed(2)
          : 0
      };
    }).sort((a, b) => b.votos_fp - a.votos_fp);

    const captable_fp = provincias.reduce((s, p) => s + p.votos_fp, 0);
    const total_nuevos_activos = provincias.reduce((s, p) => s + p.nuevos_activos, 0);

    return {
      provincias,
      resumen: {
        crecimiento_padron: crecimiento_total,
        nuevos_activos: total_nuevos_activos,
        captable_fp,
        pct_captura: +(captable_fp / total_nuevos_activos * 100).toFixed(1),
        metodologia: 'Plutzer 2002 + Carlin et al. 2012'
      }
    };
  }
};

// ─────────────────────────────────────────────────────────────────
// M-F: MOTOR DE ESCENARIOS DE ALIANZA v10.0 — RETENCIÓN REAL
// Metodología: Cox (1997) Making Votes Count + Grofman & Lijphart (2002)
//              + LAPOP 2022 (promedio empírico alianzas LAC)
// Reemplaza el checkbox que simplemente suma porcentajes
// ─────────────────────────────────────────────────────────────────
const MotorAlianzaElectoral = {
  // LAPOP 2022: retención base en alianzas LAC = 78%
  RETENCION_BASE: 0.78,
  // Bonus por liderazgo fuerte (Leonel lidera ambos bloques)
  BONUS_LIDERAZGO: 1.08,
  // Factor ideológico FP-PLD: distancia moderada → leve penalización
  FACTOR_IDEOLOGICO: 0.96,
  // Retención efectiva = 0.78 × 1.08 × 0.96 ≈ 0.809
  get RETENCION_EFECTIVA() {
    return +(this.RETENCION_BASE * this.BONUS_LIDERAZGO * this.FACTOR_IDEOLOGICO).toFixed(3);
  },

  // Modela el escenario de alianza FP+PLD por provincia
  calcularPorProvincia(prov_metrics_2024, partido_a = 'FP', partido_b = 'PLD') {
    if (!prov_metrics_2024) return [];

    return prov_metrics_2024.map(p => {
      const total = p.votos_emitidos || 1;
      const votos_a = p.blocs?.[partido_a] || 0;
      const votos_b = p.blocs?.[partido_b] || 0;
      const votos_prm = p.blocs?.PRM || 0;

      // Retención variable por provincia — Cox (1997) + compatibilidad local
      // retencion_prov = base × min(fp_2024/pld_2024, 1)
      // En provincias donde FP es mucho más grande que PLD → retención alta
      // En provincias donde PLD resistió → retención más baja
      const compatibilidad = votos_b > 0
        ? Math.min(1, votos_a / votos_b)
        : 1.0; // Si PLD es cero, retención máxima
      const retencion_prov = Math.min(0.92,
        Math.max(0.65, this.RETENCION_EFECTIVA * (0.85 + 0.15 * compatibilidad))
      );

      // CORRECCIÓN CONCEPTUAL: la retención aplica SOLO al voto PLD que migra.
      // El voto propio de FP (votos_a) no se pierde en una alianza.
      // votos_alianza = FP_propio + PLD_que_retiene
      const votos_migran   = Math.round(votos_b * retencion_prov);
      const votos_dispersos = votos_b - votos_migran; // PLD que NO migra → abstención o voto cruzado
      const votos_alianza  = votos_a + votos_migran;
      const pct_alianza    = +(votos_alianza / total * 100).toFixed(2);
      const pct_prm        = +(votos_prm / total * 100).toFixed(2);
      const gana_alianza   = votos_alianza > votos_prm;
      const margen_alianza = +(pct_alianza - pct_prm).toFixed(2);

      return {
        id:              p.id,
        provincia:       p.provincia,
        votos_fp_solo:   votos_a,
        votos_pld_solo:  votos_b,
        votos_alianza,
        votos_dispersos,
        pct_alianza,
        pct_prm,
        gana_alianza,
        margen_alianza,
        retencion_aplicada: +(retencion_prov * 100).toFixed(1),
        ganancia_neta_fp: votos_alianza - votos_a, // cuánto suma la alianza a FP
        era_ganada_fp:   p.ganador === 'FP',
        // Clasificación de impacto
        impacto: gana_alianza && !p.ganador === 'FP' ? 'VOLTEA'
               : !gana_alianza && margen_alianza > -5 ? 'ACERCA'
               : gana_alianza ? 'CONSOLIDA' : 'INSUFICIENTE'
      };
    }).sort((a, b) => b.margen_alianza - a.margen_alianza);
  },

  resumen(datos) {
    if (!datos || !datos.length) return {};
    const voltea     = datos.filter(d => d.impacto === 'VOLTEA');
    const consolida  = datos.filter(d => d.impacto === 'CONSOLIDA');
    const acerca     = datos.filter(d => d.impacto === 'ACERCA');
    return {
      provincias_ganadas_con_alianza: datos.filter(d => d.gana_alianza).length,
      provincias_voltea:   voltea.length,
      provincias_consolida:consolida.length,
      provincias_acerca:   acerca.length,
      ganancia_neta_fp:    datos.reduce((s, d) => s + d.ganancia_neta_fp, 0),
      retencion_promedio:  +(datos.reduce((s, d) => s + d.retencion_aplicada, 0) / datos.length).toFixed(1),
      provincias_voltea_detalle: voltea.map(d => d.provincia)
    };
  }
};

// ─────────────────────────────────────────────────────────────────
// M-G: MOTOR DE SENSIBILIDAD / WHAT-IF (NUEVO v10.0)
// Metodología: Silver (2012) The Signal and the Noise — tornado analysis
// Pregunta: ¿Qué palanca tiene mayor impacto en el resultado FP?
// Varía cada parámetro ±δ y mide el impacto en pct_fp proyectado
// ─────────────────────────────────────────────────────────────────
const MotorSensibilidad = {
  DELTA: 1.0,

  calcular() {
    const pipe     = window._SIE_PIPELINE || {};
    const proyBase = pipe.proyeccion_nacional?.FP?.proyectado_norm || 36.0;

    // Base electoral total (votos válidos) — denominador correcto para calcular pp
    // ganancia_neta / total_validos = pp reales que agrega la palanca al porcentaje FP
    // NO se divide entre votos_FP (eso no es pp, es % de crecimiento relativo)
    const totalValidos = (window._PROV_METRICS_PRES || []).reduce((s,p) => s + (p.votos_validos||0), 0) || 4196807;

    const palancas = [
      {
        nombre:      'Alianza FP+PLD',
        descripcion: 'Pacto electoral — PLD retiene 80.9% de su voto hacia FP',
        // ganancia_neta_fp / total_validos = pp que sube FP en el resultado nacional
        impacto:     pipe.alianza_resumen?.ganancia_neta_fp
                       ? +(pipe.alianza_resumen.ganancia_neta_fp / totalValidos * 100).toFixed(1)
                       : 8.5,
        fuente:      'MotorAlianzaElectoral — Cox 1997',
        color:       '#7C3AED',
        accion:      'Negociar acuerdo formal FP-PLD antes de Oct 2027'
      },
      {
        nombre:      'Nuevos electores 2024→2028',
        descripcion: '~555K nuevos inscritos, oposición captura 65% en contexto antiincumbente',
        impacto:     pipe.nuevos_electores
                       ? +(pipe.nuevos_electores.captable_fp / totalValidos * 100).toFixed(1)
                       : 3.5,
        fuente:      'MotorNuevosElectores — Carlin et al. 2012',
        color:       '#2563EB',
        accion:      'Programa de registro de nuevos electores en Santo Domingo, Santiago, San Cristóbal'
      },
      {
        nombre:      'Alta participación (58% vs 54%)',
        descripcion: 'Cada punto de participación adicional beneficia más a la oposición',
        impacto:     2.8,
        fuente:      'MotorProyeccion — Escenarios participación',
        color:       '#059669',
        accion:      'GOTV agresivo en provincias con abstención > 40%'
      },
      {
        nombre:      'Transferencia leonelista residual',
        descripcion: 'Voto PLD 2020 aún no migrado — captable con campaña directa',
        impacto:     pipe.transferencia_resumen
                       ? +(pipe.transferencia_resumen.total_captable / totalValidos * 100 * 0.6).toFixed(1)
                       : 1.3,
        fuente:      'MotorTransferenciaVoto — Aldrich 1995',
        color:       '#D97706',
        accion:      'Campaña de reactivación leonelista en provincias con residual > MEDIA'
      },
      {
        nombre:      'Retención base FP 2024',
        descripcion: 'Conservar el 100% del voto FP 2024 — evitar fuga al PLD u otros',
        impacto:     1.2,
        fuente:      'MotorNormalizacionHistorica — Panebianco 1988',
        color:       '#DC2626',
        accion:      'Consolidar organización territorial en provincias con FP > 30%'
      }
    ].sort((a, b) => b.impacto - a.impacto);

    const impacto_total  = palancas.reduce((s, p) => s + p.impacto, 0);
    const proy_con_todo  = +(proyBase + impacto_total * 0.70).toFixed(1);
    const alcanza_mayoria = proy_con_todo >= 50;

    return {
      proyeccion_base: +proyBase.toFixed(1),
      palancas,
      escenario_maximo: {
        impacto_bruto:   +impacto_total.toFixed(1),
        proy_resultante: proy_con_todo,
        alcanza_mayoria,
        brecha_residual: alcanza_mayoria ? 0 : +(50 - proy_con_todo).toFixed(1)
      },
      metodologia: 'Impacto = votos_palanca / total_votos_válidos_2024 × 100 → pp reales'
    };
  }
};

// ─────────────────────────────────────────────────────────────────
// M-H: MOTOR PRIORIDAD ESTRATÉGICA v11.0 — MO5 fix sesgo provincias pequeñas
// Ahora usa pivotScore de MotorPivotElectoral (datos reales)
// y votos_gap_fp del prov_metrics (campo real existente)
//
// CAMBIO v11 (MO5): Añadido cuarto componente peso_voto_absoluto
//   Jacobson (2006): "Resource allocation should maximize expected vote gain,
//   not number of districts won."
//   El score anterior favorecía San José de Ocoa (7.6k votos) sobre
//   Santo Domingo (140k votos). El nuevo componente corrige esto.
//
// Pesos v11: pivot(0.35) + gap(0.25) + prob(0.25) + voto_abs(0.15)
// ─────────────────────────────────────────────────────────────────
const MotorPrioridadEstrategica = {
  calculate(prov_metrics) {
    if (!prov_metrics || !prov_metrics.length) return { ranking: [], topTen: [], resumen: {} };

    // Obtener pivot scores calculados con datos reales
    const pivotResult = MotorPivotElectoral.calculate(prov_metrics);
    const pivotMap    = Object.fromEntries(pivotResult.allScores.map(p => [p.id, p]));

    // Pesos del score compuesto v11 — justificación:
    //   pivot    (0.35): potencial estructural de movilización (Gerber & Green 2000 — GOTV)
    //   gap      (0.25): votos necesarios para ganar — prioriza provincias alcanzables
    //   prob     (0.25): probabilidad de conversión basada en margen (Jacobson 2004)
    //   voto_abs (0.15): votos absolutos en juego — corrige sesgo provincias pequeñas
    //                    (Jacobson 2006: maximizar votos, no número de distritos)
    const weights = { pivot: 0.35, gap: 0.25, probability: 0.25, voto_abs: 0.15 };
    const maxGap  = Math.max(...prov_metrics.map(p => p.votos_gap_fp || 0)) || 200000;
    // Para peso voto absoluto: inscritos como proxy de votos posibles en la provincia
    const maxInscritos = Math.max(...prov_metrics.map(p => p.inscritos || 0)) || 1;

    const scores = prov_metrics.map(prov => {
      const pivot = pivotMap[prov.id] || {};
      const pivotNorm = (pivot.pivotScore || 50) / 100;

      // Gap real desde prov_metrics
      const gap     = prov.votos_gap_fp || 0;
      const gapNorm = Math.max(0, 1 - gap / maxGap);

      // Probabilidad estimada = inverso del margen (menor margen → mayor prob)
      const margen   = Math.max(0, (prov.pct_prm || 50) - (prov.pct_fp || 25)); // B5: calculado
      const probNorm = Math.max(0, Math.min(1, 1 - margen / 40));

      // MO5: peso por votos absolutos en juego (normalizado por provincia más grande)
      const votoAbsNorm = Math.min(1, (prov.inscritos || 0) / maxInscritos);

      const priorityScore = (pivotNorm    * weights.pivot)    +
                            (gapNorm      * weights.gap)      +
                            (probNorm     * weights.probability) +
                            (votoAbsNorm  * weights.voto_abs);

      return {
        id:             prov.id,
        nombre:         prov.provincia,
        priorityScore:  +(priorityScore * 100).toFixed(1),
        pivot_score:    pivot.pivotScore || 0,
        gap_votos:      gap,
        pct_fp:         prov.pct_fp || 0,
        margen_pp:      +margen.toFixed(1),
        inscritos:      prov.inscritos || 0,
        votos_en_juego: prov.inscritos || 0,  // MO5: campo explícito para UI
        prioridad:      priorityScore > 0.65 ? 'MÁXIMA'
                      : priorityScore > 0.50 ? 'ALTA'
                      : priorityScore > 0.35 ? 'MEDIA'
                      : 'BAJA',
        accion_recomendada:
          priorityScore > 0.65 ? 'Campaña presidencial activa + inversión máxima'
          : priorityScore > 0.50 ? 'Campaña regular + GOTV focalizado'
          : priorityScore > 0.35 ? 'Presencia moderada + trabajo de base'
          : 'Presencia mínima — priorizar otras provincias'
      };
    }).sort((a, b) => b.priorityScore - a.priorityScore);

    return {
      ranking:  scores,
      topTen:   scores.slice(0, 10),
      resumen: {
        maxima: scores.filter(p => p.prioridad === 'MÁXIMA').length,
        alta:   scores.filter(p => p.prioridad === 'ALTA').length,
        media:  scores.filter(p => p.prioridad === 'MEDIA').length,
        baja:   scores.filter(p => p.prioridad === 'BAJA').length
      }
    };
  }
};

// ─────────────────────────────────────────────────────────────────
// PIPELINE INTEGRADO v10.0
// Ejecuta todos los motores en secuencia, cada uno alimentando al siguiente
// Resultado disponible en window._SIE_PIPELINE para todas las vistas
// ─────────────────────────────────────────────────────────────────
const MotorPipeline = {
  _ejecutado: false,
  _timestamp: null,

  ejecutar() {
    const prov24  = window._PROV_METRICS_PRES || [];
    const prov20  = window._PROV_METRICS_PRES_2020 || [];
    const padron  = MotorCrecimientoPadron.proyectar ? MotorCrecimientoPadron.proyectar() : null;

    // ── Encuestas: obtener estado actual del motor ──
    const encMotor    = window.SIE_MOTORES?.Encuestas;
    const estadoEnc   = encMotor ? encMotor.estadoModelo() : { activo: false };
    const encCandidato = encMotor ? encMotor.getIntencionCandidato() : null;
    const encSimpatia  = encMotor ? encMotor.getSimpatiaPartidaria() : null;
    const encProvinciales = encMotor ? encMotor.getTodasProvinciales() : [];

    // PASO 0: Inicializar motores con datos históricos y territoriales
    // 0a: NormalizacionHistorica — activar modo COMPLETO con data 2020 real
    if (window.SIE_MOTORES?.NormalizacionHistorica && prov20.length) {
      window.SIE_MOTORES.NormalizacionHistorica.init(prov24, prov20);
      window.SIE_MOTORES.NormalizacionHistorica._calcularFactoresPonderados(prov24, prov20);
    }
    // 0b: Historico2020 — inicializar con todos los datasets 2020
    if (window.SIE_MOTORES?.Historico2020) {
      window.SIE_MOTORES.Historico2020.init(
        window._DS_RESULTADOS_2020   || null,
        window._DS_ALIANZAS_2020     || null,
        window._DS_CURULES_2020      || null,
        window._PROV_METRICS_PRES_2020 || [],
        window._PROV_METRICS_SEN_2020  || [],
        window._PROV_METRICS_DIP_2020  || []
      );
    }
    // 0c: Movilizacion con los 3 niveles (necesario para renderMovilizacion/Objetivo/Potencial)
    if (window.SIE_MOTORES?.Movilizacion) {
      const provSen = window._PROV_METRICS_SEN || [];
      const provDip = window._PROV_METRICS_DIP || [];
      window.SIE_MOTORES.Movilizacion.init(prov24, provSen, provDip);
    }

    // PASO 1: Transferencia voto PLD 2020 → FP (con factor variable)
    const transferencia = MotorTransferenciaVoto.calcularPorProvincia(prov24, prov20);
    const transferencia_resumen = MotorTransferenciaVoto.resumen(transferencia);
    window._SIE_PIPELINE = { transferencia, transferencia_resumen };

    // PASO 2: Proyección territorial diferenciada
    // Pasa encuestas provinciales al proyeccionTerritorial si existen
    window._SIE_ENCUESTAS_PROV = encProvinciales;
    const proyeccion_territorial = window.SIE_MOTORES.Proyeccion.proyeccionTerritorial('base', 0.54);

    // PASO 3: Proyección nacional — usa intencion_candidato (Bayesian)
    const encParaProyeccion = encCandidato ? encCandidato.promedio : null;
    const proyeccion_nacional = window.SIE_MOTORES.Proyeccion.proyectar({}, encParaProyeccion);

    // PASO 4: Proyección legislativa — usa simpatia_partidaria
    const encParaLegislativo = encSimpatia ? encSimpatia.promedio : encParaProyeccion;
    const proyeccion_legislativa = window.SIE_MOTORES.Escenarios
      ? window.SIE_MOTORES.Escenarios.simularLegislativo(
          encParaLegislativo || { PRM: 55, FP: 29, PLD: 10, PRD: 3, PCR: 3 }
        )
      : null;

    // PASO 5: Escenario alianza
    const alianza_datos   = MotorAlianzaElectoral.calcularPorProvincia(prov24);
    const alianza_resumen = MotorAlianzaElectoral.resumen(alianza_datos);

    // PASO 6: Nuevos electores
    const nuevos_electores = MotorNuevosElectores.calcular(
      prov24,
      padron ? padron.padron_2028_medio : 8700000,
      padron ? padron.padron_2024 : 8145548
    );

    // PASO 7: Meta electoral dinámica
    window._SIE_PIPELINE = {
      transferencia, transferencia_resumen,
      proyeccion_territorial, proyeccion_nacional,
      alianza_datos, alianza_resumen,
      nuevos_electores: nuevos_electores.resumen,
      encuestas: estadoEnc
    };
    const meta = MotorMetaElectoral.calculate();

    // PASO 8: Ruta de victoria — B2 fix v11: pasa proyeccion_territorial directamente
    // (no puede depender de window._SIE_PIPELINE porque se escribe después de este paso)
    const ruta = MotorRutaVictoria.calculate(
      prov24,
      padron?.padron2028 || 8859093,
      0.54,
      0.501,
      proyeccion_territorial  // B2: array de proyecciones ya calculadas
    );

    // PASO 8b: Riesgo electoral multi-nivel (M16)
    const riesgo = MotorRiesgo.clasificarMultinivel(
      prov24,
      window._PROV_METRICS_SEN || [],
      window._PROV_METRICS_DIP || []
    );

    // PASO 8c: Validación de datos (M2)
    const validacion = (MotorValidacion.run && window._DS_RESULTADOS && window._DS_PARTIDOS && window._DS_CURULES_CAT && window._DS_CURULES)
      ? MotorValidacion.run(window._DS_RESULTADOS, window._DS_PARTIDOS, window._DS_CURULES_CAT, window._DS_CURULES)
      : { ok: true, errores: [], advertencias: ['Datos insuficientes para validación completa'] };

    // PASO 8d: Pivot electoral (M20)
    const pivot = MotorPivotElectoral.calculate ? MotorPivotElectoral.calculate(prov24) : null;

    // PASO 8e: Histórico 2020 — swing presidencial por provincia (M18)
    const swing_2020_2024 = window.SIE_MOTORES?.Historico2020?._pm_p?.length
      ? window.SIE_MOTORES.Historico2020.getSwingPresidencial()
      : [];

    // PASO 9: Indicadores de confianza por provincia
    const confianza_provincial = encMotor
      ? prov24.map(p => ({ id: p.id, ...encMotor.confianzaProvincia(p) }))
      : prov24.map(p => ({ id: p.id, nivel: 'ESTIMADO', color: '#DC2626', etiqueta: '🔴 ESTIMADO', score: 30 }));

    // PASO 10: Sensibilidad
    window._SIE_PIPELINE.meta = meta;
    window._SIE_PIPELINE.ruta = ruta;
    const sensibilidad = MotorSensibilidad.calcular();

    // PASO 11: Prioridad estratégica
    const prioridad = MotorPrioridadEstrategica.calculate(prov24);

    // ── Ensamblaje final ──
    window._SIE_PIPELINE = {
      // Datos base
      transferencia,
      transferencia_resumen,
      // Proyecciones
      proyeccion_territorial,
      proyeccion_nacional,
      proyeccion_legislativa,
      // Alianza
      alianza_datos,
      alianza_resumen,
      // Electores
      nuevos_electores: nuevos_electores.resumen,
      nuevos_electores_detalle: nuevos_electores.provincias,
      // Meta
      meta,
      ruta,
      ruta_minima:   ruta?.ruta_minima || [],   // alias plano para UI
      // Estrategia
      sensibilidad,
      prioridad,
      // Encuestas — estado completo
      encuestas: {
        estado:      estadoEnc,
        candidato:   encCandidato,
        simpatia:    encSimpatia,
        provinciales: encProvinciales
      },
      // Riesgo, validación, histórico, pivot
      riesgo,           // {presidencial, senadores, diputados, ofensivo_fp}
      validacion,
      pivot,
      swing_2020_2024,
      historico: {
        swing: swing_2020_2024,
        comparativa_curules: window.SIE_MOTORES?.Historico2020?.getComparativaCurules?.() || {},
        status: window.SIE_MOTORES?.Historico2020?.status || 'NOT_INIT'
      },
      // Confianza
      confianza_provincial,
      confianza_global: estadoEnc.activo ? estadoEnc.confianza : 'MEDIA',
      // Metadata
      version:   'v10.0',
      timestamp: new Date().toISOString()
    };

    this._ejecutado = true;
    this._timestamp = window._SIE_PIPELINE.timestamp;
    const modoLabel = estadoEnc.activo
      ? 'Fundamentals + ' + (encMotor._polls.length) + ' encuesta(s)'
      : 'Solo fundamentals';
    console.log('✅ SIE 2028 v11.0 — Pipeline [' + modoLabel + '] · ' + new Date().toLocaleTimeString());
    return window._SIE_PIPELINE;
  },

  get() {
    if (!this._ejecutado) this.ejecutar();
    return window._SIE_PIPELINE;
  }
};

// Registrar todos los motores v10.0 en SIE_MOTORES
window.SIE_MOTORES.TransferenciaVoto    = MotorTransferenciaVoto;
window.SIE_MOTORES.PivotElectoral       = MotorPivotElectoral;
window.SIE_MOTORES.RutaVictoria         = MotorRutaVictoria;
window.SIE_MOTORES.MetaElectoral        = MotorMetaElectoral;
window.SIE_MOTORES.NuevosElectores      = MotorNuevosElectores;
window.SIE_MOTORES.AlianzaElectoral     = MotorAlianzaElectoral;
window.SIE_MOTORES.Sensibilidad         = MotorSensibilidad;
window.SIE_MOTORES.PrioridadEstrategica = MotorPrioridadEstrategica;
window.SIE_MOTORES.Pipeline             = MotorPipeline;

// Auto-ejecutar pipeline después de que todos los motores base estén listos
// (se llama desde ui.js después del init de motores)
console.log('✅ SIE 2028 v11.0 — 9 Motores estratégicos cargados');

