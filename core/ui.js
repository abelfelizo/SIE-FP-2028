(function() {

// Colors defined below in new section
// REMOVED duplicate: pc (old version)
// Init motores
var M = SIE_MOTORES;

// ── Helper: clean circunscripción label ──
function _cleanCirc(c){
  var s = String(c||'');
  s = s.replace(/^\d{2,3}-?C?/i,'');
  if(!/^C/i.test(s)) s = 'C'+s;
  return s;
}

// Fusionar resultados: nivel presidencial viene de _DS_RESULTADOS_PRES
// _DS_RESULTADOS_PRES usa la clave 'nacional' con {resultados, totales}
var _DS_MERGED = JSON.parse(JSON.stringify(_DS_RESULTADOS));
if (_DS_RESULTADOS_PRES && _DS_RESULTADOS_PRES.nacional) {
  // Normalizar totales: el JSON usa 'emitidos' pero engine espera 'votos_emitidos'
  var _rawTot = _DS_RESULTADOS_PRES.nacional.totales || {};
  var _totNorm = {
    votos_emitidos:           _rawTot.votos_emitidos   || _rawTot.emitidos         || 0,
    votos_validos:            _rawTot.votos_validos     || _rawTot.validos          || 0,
    votos_nulos:              _rawTot.votos_nulos       || _rawTot.nulos            || 0,
    inscritos:                _rawTot.inscritos                                     || 0,
    porcentaje_participacion: _rawTot.porcentaje_participacion                      || 0
  };
  _DS_MERGED.niveles.presidencial = {
    territorio:    'nacional',
    resultados:    _DS_RESULTADOS_PRES.nacional.resultados || {},
    totales:       _totNorm,
    por_provincia: _DS_RESULTADOS_PRES.por_provincia || [],
    por_municipio: _DS_RESULTADOS_PRES.por_municipio || [],
    exterior:      _DS_RESULTADOS_PRES.exterior      || {}
  };
}

// Totales nacionales de senadores (sum de 32 provincias)
var _TOTALES_SEN = (function(){
  var provs = (_DS_RESULTADOS && _DS_RESULTADOS.niveles && _DS_RESULTADOS.niveles.senadores) || [];
  var emitidos = 0, validos = 0, nulos = 0;
  provs.forEach(function(p){
    var t = p.totales||{};
    emitidos += t.votos_emitidos||t.emitidos||0;
    validos  += t.votos_validos ||t.validos ||0;
    nulos    += t.votos_nulos   ||t.nulos   ||0;
  });
  // inscritos desde padron_provincial (mismo padrón que presidencial)
  var inscritos = _DS_PADRON_PROV && _DS_PADRON_PROV.padron
    ? _DS_PADRON_PROV.padron.reduce(function(s,p){return s+(p.inscritos||0);},0)
    : (_DS_PADRON ? _DS_PADRON.total_inscritos || 0 : 0);
  return { votos_emitidos:emitidos, votos_validos:validos, votos_nulos:nulos, inscritos:inscritos,
           porcentaje_participacion: inscritos ? +(emitidos/inscritos*100).toFixed(2) : 0 };
})(); // ── cierre _TOTALES_SEN IIFE (fix A-2)


// Totales nacionales de diputados (sum de 45 circs)
var _TOTALES_DIP = (function(){
  var circs = (_DS_RESULTADOS && _DS_RESULTADOS.niveles && _DS_RESULTADOS.niveles.diputados) || [];
  var emitidos=0, validos=0, nulos=0;
  circs.forEach(function(c){
    var t=c.totales||{};
    emitidos+=t.votos_emitidos||t.emitidos||0;
    validos +=t.votos_validos ||t.validos ||0;
    nulos   +=t.votos_nulos  ||t.nulos   ||0;
  });
  var inscritos = _DS_PADRON_PROV && _DS_PADRON_PROV.padron
    ? _DS_PADRON_PROV.padron.reduce(function(s,p){return s+(p.inscritos||0);},0) : 0;
  return { votos_emitidos:emitidos, votos_validos:validos, votos_nulos:nulos, inscritos:inscritos,
           porcentaje_participacion: inscritos ? +(emitidos/inscritos*100).toFixed(2) : 0 };
})(); // cierre _TOTALES_DIP IIFE

M.Carga.init({resultados:_DS_MERGED,curules:_DS_CURULES,partidos:_DS_PARTIDOS,
              padron:_DS_PADRON,territorios:_DS_TERRITORIOS,alianzas:_DS_ALIANZAS,
              curulesCat:_DS_CURULES_CAT});
var valResult = M.Validacion.run(_DS_MERGED,_DS_PARTIDOS,_DS_CURULES_CAT,_DS_CURULES);
M.Padron.init(_DS_PADRON);
M.Resultados.init(_DS_MERGED,_DS_ALIANZAS,_DS_PARTIDOS);
M.Alianzas.init(_DS_ALIANZAS);
M.Curules.init(_DS_CURULES_CAT,_DS_CURULES);
M.Territorial.init(_DS_TERRITORIOS);
M.CrecimientoPadron.proyectar();
// Inicializar motores multi-nivel con prov_metrics por nivel (v8.7)
M.Movilizacion.init(_PROV_PRES, _PROV_SEN, _PROV_DIP);
// Motor 17: NormalizacionHistorica — modo COMPLETO ahora que tenemos data 2020
M.NormalizacionHistorica.init(_PROV_PRES, _PROV_METRICS_PRES_2020);
// Motor 18: Histórico 2020 — activo
M.Historico2020.init(
  _DS_RESULTADOS_2020,
  _DS_ALIANZAS_2020,
  _DS_CURULES_2020,
  _PROV_METRICS_PRES_2020,
  _PROV_METRICS_SEN_2020,
  _PROV_METRICS_DIP_2020
);

document.getElementById('sys-status').textContent =
  valResult.ok ? '\u2705 Sistema listo \u00b7 Dataset 2024' : '\u26a0\ufe0f ' + valResult.errores.length + ' errores';

// Nav
// Helpers
// REMOVED duplicate: fmt (old version)
// ====== COLORES OFICIALES v12.0 — calibrados de boleta JCE 2024 ======
var PC = {
  // ── Partidos principales ──
  PRM:    '#1E40AF',  // #1  Azul royal oficial PRM
  PLD:    '#7C3AED',  // #2  Violeta/morado oficial PLD
  FP:     '#00d48a',  // #3  Verde FP mejorado
  PRD:    '#B91C1C',  // #4  Rojo PRD (boleta: rojo oscuro)
  PRSC:   '#DC2626',  // #5  Rojo reformista PRSC
  // ── Aliados PRM ──
  ALPAIS: '#0EA5E9',  // #6  Celeste Alianza País
  DXC:    '#0891B2',  // #7  Azul piscina Dominicanos x el Cambio
  PUN:    '#1E3A5F',  // #8  Azul marino oscuro PUN
  BIS:    '#166534',  // #9  Verde oscuro BIS
  PHD:    '#D97706',  // #10 Amarillo dorado PHD (corregido — boleta: fondo amarillo/dorado)
  PCR:    '#C2410C',  // #11 Naranja-rojo PCR
  PRSD:   '#DB2777',  // #12 Rosa/fucsia PRSD
  MODA:   '#7F1D1D',  // #13 Rojo burdeos/granate MODA (corregido — boleta: rojo oscuro, NO rosa)
  F_AMPLIO:'#4ADE80', // #14 Verde lima Frente Amplio
  'F.AMPLIO':'#4ADE80',
  APD:    '#6B7280',  // #15 Gris medio APD (corregido — boleta: fondo gris)
  PP:     '#166534',  // #16 Verde pino País Posible
  PLR:    '#65A30D',  // #17 Verde lima PLR
  PPC:    '#EA580C',  // #18 Naranja PPC (boleta: fondo naranja)
  PQDC:   '#CA8A04',  // #19 Amarillo PQDC
  UDC:    '#1D4ED8',  // #20 Azul claro UDC
  PAL:    '#CA8A04',  // #21 Amarillo/negro PAL
  FNP:    '#111827',  // #22 Negro FNP
  PRI:    '#16A34A',  // #23 Verde claro PRI
  PDP:    '#C2410C',  // #24 Naranja oscuro PDP
  PNVC:   '#B91C1C',  // #25 Rojo PNVC
  PASOVE: '#65A30D',  // #26 Verde oliva PASOVE
  PPT:    '#DC6B19',  // #27 Naranja rojizo PPT
  GENS:   '#EC4899',  // #28 Rosa fucsia/magenta GENS (este era el color asignado erróneamente a MODA)
  OD:     '#92400E',  // #29 Marrón/café OD
  PSC:    '#991B1B',  // #30 Rojo oscuro PSC
  PDI:    '#EA580C',  // #31 Naranja PDI
  PED:    '#F59E0B',  // #32 Ámbar PED
  PPG:    '#0D9488',  // #33 Verde azulado PPG (Primero la Gente)
  JS:     '#1E293B',  // #34 Azul oscuro/negro JS (Justicia Social)
  // ── Otros que aparecen en resultados ──
  GS:     '#EC4899',  // alias GENS
  PHD_OLD:'#D97706',  // alias
  OTHER:  '#4B5563'
};
window.PC = PC;  // expose for inline onclick handlers
function pc(id){ return PC[id]||PC.OTHER; }
function fmt(n){ return Number(n).toLocaleString('es-DO'); }

// ── Helper tablas ordenables — usado en múltiples vistas ──
// Uso: sieTable({data, cols, id, defaultKey, defaultDir})
// cols: [{k, label, title, render}]
// render(row): función optional que retorna HTML para la celda; default: row[k]
window._sieSortState = {};
window.sieSort = function(tableId, key) {
  var st = window._sieSortState[tableId] || { key: key, dir: -1 };
  if (st.key === key) { st.dir = -st.dir; }
  else { st.key = key; st.dir = -1; }
  window._sieSortState[tableId] = st;
  var fn = window._sieSortRender && window._sieSortRender[tableId];
  if (fn) fn();
};
function sieMakeSortableTable(tableId, data, cols, opts) {
  opts = opts || {};
  var st = window._sieSortState[tableId];
  if (!st) {
    st = { key: opts.defaultKey || cols[0].k, dir: opts.defaultDir || -1 };
    window._sieSortState[tableId] = st;
  }
  var sorted = data.slice().sort(function(a,b){
    var va = a[st.key], vb = b[st.key];
    if (va == null) return 1; if (vb == null) return -1;
    if (typeof va === 'string') return st.dir * va.localeCompare(String(vb));
    return st.dir * ((+va||0) - (+vb||0));
  });
  var thStyle = 'style="padding:.38rem .5rem;font-size:.69rem;font-weight:700;color:var(--muted);text-align:left;border-bottom:1px solid var(--border);cursor:pointer;white-space:nowrap;user-select:none;background:var(--bg2)"';
  var tdStyle = 'style="padding:.32rem .5rem;font-size:.72rem;border-bottom:1px solid var(--border)22"';
  var hdrs = cols.map(function(c){
    var arrow = c.k === st.key ? (st.dir > 0 ? ' ↑' : ' ↓') : ' <span style="opacity:.35">⇅</span>';
    return '<th '+thStyle+' title="'+(c.title||'Ordenar por '+c.label)+'" onclick="sieSort(\''+tableId+'\',\''+c.k+'\')">'+(c.label||c.k)+arrow+'</th>';
  }).join('');
  var rows = sorted.map(function(row){
    return '<tr>'+cols.map(function(c){
      var val = c.render ? c.render(row) : (row[c.k] != null ? row[c.k] : '—');
      return '<td '+tdStyle+'>'+val+'</td>';
    }).join('')+'</tr>';
  }).join('');
  return '<table style="width:100%;border-collapse:collapse"><thead><tr>'+hdrs+'</tr></thead><tbody>'+rows+'</tbody></table>';
}
function bar(label,pct,color,sub){
  return '<div class="bar-item">'+
    '<div class="bar-hdr"><span class="bar-label">'+label+'</span><span class="bar-pct">'+pct+'%</span></div>'+
    (sub?'<div style="font-size:.68rem;color:var(--muted);margin-bottom:.15rem">'+sub+'</div>':'')+
    '<div class="bar-track"><div class="bar-fill" style="width:'+pct+'%;background:'+color+'"></div></div>'+
    '</div>';
}
function kpi(cls,label,val,sub){
  return '<div class="kpi '+cls+'"><div class="kpi-label">'+label+'</div>'+
    '<div class="kpi-val">'+val+'</div><div class="kpi-sub">'+sub+'</div></div>';
}
function rowStat(label,val,color){
  return '<div class="flex jb" style="padding:.3rem 0;border-bottom:1px solid var(--border)">'+
    '<span class="text-sm">'+label+'</span>'+
    '<strong style="font-size:.81rem;'+(color?'color:'+color:'')+'">' +val+'</strong></div>';
}

// ================================================================
// NOTAS INTERPRETATIVAS v1.0
// nota(lectura, ejecutiva, accion, motor, accionTipo)
// ================================================================
function nota(lectura, ejecutiva, accion, motor, accionTipo) {
  var ac = accionTipo==='warn' ? ' warn' : accionTipo==='danger' ? ' danger' : '';
  var warnColor = accionTipo==='warn'?'var(--gold)':accionTipo==='danger'?'var(--red)':'var(--fp)';
  var mHTML = '';
  if (motor) {
    mHTML =
      '<div style="margin-top:.45rem;border-top:1px solid var(--border);padding-top:.35rem">'+
      '<button class="nota-tecnica-toggle" onclick="(function(b){b.classList.toggle(&apos;open&apos;);b.nextElementSibling.classList.toggle(&apos;open&apos;)})(this)">'+
      '⚙ '+(motor.nombre||'Motor')+' — metodología<span class="nt-arrow">▾</span></button>'+
      '<div class="nota-tecnica-body">'+
      (motor.desc?'<div>'+motor.desc+'</div>':'')+
      (motor.formula?'<pre style="margin:.3rem 0;font-size:.66rem;background:var(--bg2);padding:.3rem .5rem;border-radius:.25rem;overflow-x:auto">'+motor.formula+'</pre>':'')+
      (motor.refs?'<div style="color:var(--muted);font-style:italic;font-size:.66rem;margin-top:.2rem">'+motor.refs+'</div>':'')+
      '</div></div>';
  }
  return '<div class="nota-blk">'+
    (lectura?'<div style="font-size:.7rem;color:var(--muted);margin-bottom:.3rem">'+lectura+'</div>':'')+
    (ejecutiva?'<div style="font-size:.76rem;font-weight:600;color:var(--text);line-height:1.5">'+ejecutiva+'</div>':'')+
    (accion?'<div style="font-size:.72rem;color:'+warnColor+';margin-top:.28rem">'+accion+'</div>':'')+
    mHTML+
    '</div>';
}

function _getProvDS(nivel){
  if(nivel==='senadores') return _PROV_SEN || _PROV_METRICS_SEN || [];
  if(nivel==='diputados') return _PROV_DIP || _PROV_METRICS_DIP || [];
  return _PROV_PRES || _PROV_METRICS_PRES || [];
}

// Parliament arc
function drawParliament(canvasId, data, total){
  var cv = document.getElementById(canvasId); if(!cv) return;
  var ctx = cv.getContext('2d');
  var W=cv.width,H=cv.height,cx=W/2,cy=H-15,R1=75,R2=145;
  ctx.clearRect(0,0,W,H);
  ctx.strokeStyle='#1E2A40'; ctx.lineWidth=1;
  [R1,R2].forEach(function(r){ctx.beginPath();ctx.arc(cx,cy,r,Math.PI,0);ctx.stroke();});
  var cursor=Math.PI;
  data.forEach(function(item){
    var id=item.id, curules=item.curules;
    var span=(curules/total)*Math.PI;
    ctx.fillStyle=pc(id);
    for(var i=0;i<curules;i++){
      var a=cursor+(i+0.5)*(span/curules);
      var row=i%3;
      var rr=R1+(row+0.5)*((R2-R1)/3);
      var x=cx+rr*Math.cos(a), y=cy+rr*Math.sin(a);
      ctx.beginPath();ctx.arc(x,y,3.5,0,Math.PI*2);ctx.fill();
    }
    cursor+=span;
  });
}

// ====== DASHBOARD ======
function renderDashboard(){
  var pipe  = window._SIE_PIPELINE || {};
  var M = window.SIE_MOTORES || {}; // guard against pre-init call
  var meta  = pipe.meta || {};
  var sens  = pipe.sensibilidad || {};
  var blocsP= M.Resultados.getPresidencialByBloc();
  var legT  = M.Curules.getTotalLegislativo();
  var total = M.Curules.getSumaCurules();
  var fpB   = blocsP.find(function(b){return b.id==='FP' ;})||{pct:29.22,votos:1226194};
  var prmB  = blocsP.find(function(b){return b.id==='PRM';})||{pct:57.44,votos:2507297};
  var fpV   = meta.votos_actuales || fpB.votos || 1226194;
  var metaV = meta.meta_votos || 2396739;
  var gap   = meta.gap || 1170545;
  var pad28 = meta.padron2028 || 8859093;
  var pctP  = meta.progreso_pct || +(fpV/metaV*100).toFixed(1); // auto-derived
  var pal   = meta.palancas || {};
  var ev    = meta.evaluacion || 'DESAFIANTE';
  var encEst= pipe.encuestas && pipe.encuestas.estado ? pipe.encuestas.estado : null;

  // Banner modelo — UI2 v11: expandido, informativo y accionable
  var banner = '';
  var proy28pre = pipe.proyeccion_nacional || {};
  var fp28pre = proy28pre.FP ? proy28pre.FP.proyectado_norm : 40.65;
  if(encEst && encEst.activo){
    // 🟢 Bayesiano activo
    var fpFund=40.65, fpBay=fp28pre;
    var diffBay=+(fpBay-fpFund).toFixed(1);
    banner='<div style="background:rgba(0,212,138,.08);border:1px solid #00d48a;border-radius:var(--r);padding:.6rem .85rem;margin-bottom:.75rem">'+
      '<div style="display:flex;align-items:center;gap:.5rem;margin-bottom:.35rem">'+
      '<span>🟢</span><span style="color:#00d48a;font-weight:800;font-size:.78rem">Modo Bayesiano activo</span>'+
      '<span style="color:var(--muted);font-size:.68rem;margin-left:auto">'+(encEst.ultima_firma||'—')+' · '+(encEst.n_encuestas||'?')+' encuesta(s)</span></div>'+
      '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:.35rem;font-size:.7rem">'+
      '<div>Fundamentals: <strong>'+fpFund+'%</strong></div>'+
      '<div>Bayesiano: <strong style="color:var(--fp)">'+fpBay+'%</strong></div>'+
      '<div>Ajuste: <strong style="color:'+(diffBay>=0?'var(--fp)':'var(--red)')+'">'+
      (diffBay>=0?'+':'')+diffBay+'pp</strong></div></div></div>';
  } else {
    // 🟡 Solo fundamentals — mostrar instrucciones
    banner='<div style="background:rgba(217,119,6,.07);border:1px solid #D97706;border-radius:var(--r);padding:.6rem .85rem;margin-bottom:.75rem">'+
      '<div style="display:flex;align-items:center;gap:.5rem;margin-bottom:.3rem">'+
      '<span>🟡</span><span style="color:#D97706;font-weight:800;font-size:.78rem">Solo fundamentals — sin encuestas activas</span></div>'+
      '<div style="font-size:.7rem;color:var(--muted);margin-bottom:.35rem">'+
      'Para activar el modo Bayesiano (60% modelo + 40% encuestas) y mejorar la precisión de la proyección:</div>'+
      '<div style="font-size:.7rem;color:var(--fg);background:var(--bg3);padding:.3rem .5rem;border-radius:.25rem;font-family:monospace">'+
      '① Ir a tab Encuestas → ② Cargar JSON → ③ Seleccionar <strong>encuestas_sie2028.json</strong></div>'+
      '<div style="font-size:.67rem;color:var(--muted);margin-top:.25rem">'+
      '6 encuestas disponibles (ene–mar 2026) · 3 firmas · calidad A y B</div></div>';
  }
  var el=document.getElementById('dash-modelo-banner'); if(el) el.innerHTML=banner;

  // KPIs — UI5 v11: proyección 2028 visible al inicio
  var proy28 = pipe.proyeccion_nacional || {};
  var fp28pct  = proy28.FP  ? proy28.FP.proyectado_norm  : 40.65;
  var prm28pct = proy28.PRM ? proy28.PRM.proyectado_norm : 49.46;
  var pld28pct = proy28.PLD ? proy28.PLD.proyectado_norm : 9.89;
  var brecha28 = +(prm28pct - fp28pct).toFixed(1);
  var modoModelo = pipe.encuestas && pipe.encuestas.estado && pipe.encuestas.estado.activo ? '🟢 Bayesiano' : '🟡 Fundamentals';

  document.getElementById('kpi-section').innerHTML=
    // Fila 1: proyección 2028 (lo más importante)
    kpi('fp',     'FP 2028 ('+modoModelo+')', fp28pct+'%',  'proyectado · vs '+fp28pct+'% base')
    +kpi('blue',  'PRM 2028',        prm28pct+'%',           'proyectado · incumbente')
    +kpi('red',   'Brecha 2028',     brecha28+'pp',          'PRM−FP · cerrar con palancas')
    +kpi('gold',  'Meta 2028',       fmt(metaV),             '50.1% · padrón '+fmt(pad28))
    // Fila 2: situación actual y palancas
    +kpi('red',   'Gap a cerrar',    fmt(gap),               ev+' · '+pctP+'% del objetivo')
    +kpi('fp',    'FP votos 2024',   fmt(fpV),               fpB.pct+'% · base de partida')
    +kpi('green', 'Palanca alianza', fmt(pal.alianza_fp_pld||407702), 'FP+PLD · retención 80.9%')
    +kpi('blue',  'Nuevos electores',fmt(pal.nuevos_electores||222490),'captables 2028');

  // Presidencial barras
  document.getElementById('pres-bar-list').innerHTML=
    blocsP.slice(0,4).map(function(b){
      var isF=b.id==='FP';
      return '<div style="'+(isF?'background:var(--bg3);border-radius:var(--r);padding:.35rem .5rem;margin-bottom:.15rem':'')+'">'+
        '<div class="bar-hdr"><span class="bar-label" style="'+(isF?'color:var(--fp);font-weight:800':'')+'">'+
        b.id+(isF?' ★':'')+' · '+b.nombre.substring(0,22)+'</span><span class="bar-pct">'+b.pct+'%</span></div>'+
        '<div style="font-size:.67rem;color:var(--muted);margin-bottom:.12rem">'+fmt(b.votos)+' votos</div>'+
        '<div class="bar-track"><div class="bar-fill" style="width:'+b.pct+'%;background:'+pc(b.id)+'"></div></div>'+
        '</div>';
    }).join('');


  var _n=document.getElementById('nota-dash-pres');if(_n)_n.innerHTML=nota(
    'C\u00f3mo leer estas barras: Cada barra representa el % de votos v\u00e1lidos de cada bloque electoral. La longitud es proporcional. Los votos v\u00e1lidos excluyen nulos y en blanco.',
    'El PRM gan\u00f3 con <strong style="color:var(--prm)">57.44%</strong> \u2014 mayor\u00eda absoluta sin segunda vuelta. FP obtuvo <strong style="color:var(--fp)">28.85%</strong>, quedando <strong style="color:var(--red)">28.6 puntos abajo</strong>. Esa brecha es el punto de partida 2028.',
    '<strong>Implicaci\u00f3n 2028:</strong> FP necesita casi duplicar su votaci\u00f3n. Requiere alianza PLD + captaci\u00f3n de abstencionistas (el 45.6% no vot\u00f3 en 2024).',
    {id:'M4+M5',nombre:'Motor Resultados + Alianzas',desc:'Votos agrupados por bloque electoral. Cada partido aliado suma al bloque del candidato principal.',formula:'bloque_FP = votos_FP + aliados_FP\npct = votos_bloque / total_validos x 100',refs:'JCE 2024 \u00b7 Golder (2006) Pre-Electoral Coalition Formation'}
    ,'danger');
  // Parlamento — solo gráfico
  setTimeout(function(){ try{ drawParliament('parl-canvas',legT,total); }catch(e){} },80);
  document.getElementById('parl-legend').innerHTML=
    legT.map(function(x){
      return '<div style="display:flex;align-items:center;gap:.3rem;font-size:.72rem">'+
        '<div style="width:8px;height:8px;border-radius:50%;background:'+pc(x.id)+'"></div>'+
        '<span>'+x.id+': <strong>'+x.curules+'</strong></span></div>';
    }).join('');

  // Progreso
  document.getElementById('dash-progreso').innerHTML=
    '<div style="margin-bottom:.65rem">'+
    '<div style="display:flex;justify-content:space-between;font-size:.68rem;color:var(--muted);margin-bottom:.3rem">'+
    '<span>FP 2024: '+fmt(fpV)+'</span><span>Meta: '+fmt(metaV)+'</span></div>'+
    '<div class="meta-progress-track"><div class="meta-progress-fill" style="width:'+Math.min(100,pctP)+'%;background:var(--fp)"></div></div>'+
    '<div style="font-size:.7rem;color:var(--fp);font-weight:700;margin-top:.2rem">'+pctP+'% completado</div>'+
    '</div>'+
    [rowStat('Padrón 2028 proyectado',fmt(pad28)),
     rowStat('Gap a la meta',fmt(gap),gap>600000?'var(--red)':'var(--gold)'),
     rowStat('Evaluación',ev,gap>700000?'var(--red)':'var(--gold)'),
     rowStat('FP proyectado 2028',(pipe.proyeccion_nacional&&pipe.proyeccion_nacional.FP?pipe.proyeccion_nacional.FP.proyectado_norm:38.03)+'%','var(--fp)'),
    ].join('');

  // Palancas
  var totalPal=pal.total||0, gapRes=pal.gap_residual!=null?pal.gap_residual:gap-totalPal;
  document.getElementById('dash-palancas').innerHTML=
    [rowStat('① Alianza FP+PLD (80.9%)',fmt(pal.alianza_fp_pld||407702),'var(--fp)'),
     rowStat('② Nuevos electores',fmt(pal.nuevos_electores||222490),'var(--accent)'),
     rowStat('③ Movilización abstención',fmt(pal.movilizacion_abstencion||74128),'var(--gold)'),
     rowStat('④ Transferencia PLD → FP',fmt(pal.transferencia_pld||pal.transferencia_leonelista||37191),'var(--muted)'),
     rowStat('Total identificado',fmt(totalPal),totalPal>=gap?'var(--green)':'var(--gold)'),
     rowStat('Gap residual',fmt(Math.max(0,gapRes)),gapRes<=0?'var(--green)':'var(--red)'),
    ].join('');

  // Tornado
  var palS=sens.palancas||[];
  document.getElementById('dash-tornado').innerHTML=
    (palS.length?palS.map(function(p,i){
      var w=Math.min(100,p.impacto/15*100);
      return '<div style="padding:.4rem 0;border-bottom:1px solid var(--border)">'+
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.18rem">'+
        '<span style="font-size:.75rem;font-weight:700">'+(i+1)+'. '+p.nombre+'</span>'+
        '<span style="font-size:.85rem;font-weight:800;color:'+(p.color||'var(--fp)')+'">+'+p.impacto+'pp</span></div>'+
        '<div style="height:4px;background:var(--bg3);border-radius:2px">'+
        '<div style="height:100%;width:'+w+'%;background:'+(p.color||'var(--fp)')+';border-radius:2px"></div></div>'+
        '<div style="font-size:.63rem;color:var(--muted);margin-top:.12rem">'+p.accion+'</div></div>';
    }).join('')
    :'<div style="color:var(--muted);font-size:.75rem;padding:.5rem">Pipeline calculando...</div>')+
    '<p class="note">FP base: '+(sens.proyeccion_base||38.03)+'%</p>';
}

// ====== OBJETIVO 2028 ======
function renderObjetivo(nivel){
  nivel = nivel || _OBJ_NIVEL || 'presidencial';
  _OBJ_NIVEL = nivel;
  var pipe = window._SIE_PIPELINE||{};
  var meta = pipe.meta||{};
  var pal  = meta.palancas||{};
  var ds   = _getProvDS(nivel);
  var agenda = M.Movilizacion.agenda(nivel,'FP')||[];
  var fpGana = ds.filter(function(p){return p.ganador==='FP'||p.bloque_coalicion==='FP-coalicion';}).length;
  var totalPlazas = nivel==='presidencial'?1:nivel==='senadores'?32:nivel==='diputados'?158:7;

  var kpisEl = document.getElementById('obj-kpis');
  if(!kpisEl) return;

  if(nivel==='presidencial'){
    var metaV=meta.meta_votos||2396739, fpV=meta.votos_actuales||1226194;
    var gap=meta.gap||1170545, pad28=meta.padron2028||8859093;
    kpisEl.innerHTML=
      kpi('fp',   'Meta votos 2028', fmt(metaV), '50.1% padrón 2028 · Primera vuelta')
     +kpi('red',  'Gap a cerrar',    fmt(gap),   meta.evaluacion||'DESAFIANTE')
     +kpi('gold', 'FP base 2024',    fmt(fpV),   (+(fpV/metaV*100).toFixed(1))+'% del objetivo')
     +kpi('green','Padrón 2028',     fmt(pad28), 'proyección CAGR histórico');
  } else {
    var res=M.Movilizacion.resumenMultinivel('FP').find(function(r){return r.nivel===nivel;})||{};
    kpisEl.innerHTML=
      kpi('fp',   'Meta '+nivel,     nivel==='senadores'?'17/32':nivel==='diputados'?'86/170':'4/7', 'mayoría simple')
     +kpi('red',  'Por recuperar',   res.plazas_perdidas||agenda.length,   'FP no gana actualmente')
     +kpi('green','FP ya gana',      fpGana+'/'+totalPlazas,               '2024')
     +kpi('gold', 'Gap votos total', fmt(res.votos_totales_gap||0),        'suma de brechas');
  }


  var _n=document.getElementById('nota-objetivo');if(_n)_n.innerHTML=nota(
    'C\u00f3mo leer: META = votos que necesita FP para ganar (50.1% del padr\u00f3n proyectado). GAP = diferencia entre meta y votos actuales. La Ruta m\u00ednima muestra qu\u00e9 provincias ganar para llegar a la meta.',
    'FP necesita <strong style="color:var(--red)">+1,170,545 votos</strong> \u2014 casi duplicar 2024. El sistema califica DESAFIANTE porque supera lo que hist\u00f3ricamente logra un partido opositor en un ciclo.',
    '<strong>Lectura de la ruta:</strong> La lista de provincias no garantiza la presidencia si se pierden otras, pero es el camino m\u00e1s corto. Combina esto con el Potencial para priorizar inversi\u00f3n.',
    {id:'M21+M22',nombre:'Motor Meta + Ruta de Victoria',desc:'Meta = padron_2028 x participacion_base x 0.501. Ruta m\u00ednima = algoritmo greedy que combina provincias por votos proyectados hasta alcanzar meta.',formula:'meta = 8,859,093 x 0.54 x 0.501 = 2,396,739\ngap = meta - votos_FP_2024 = 1,170,545',refs:'Leighley & Nagler (2013) \u00b7 CAGR JCE 2016-2024'}
    );
  var metaDet = document.getElementById('obj-meta-detalle');
  if(metaDet){
    if(nivel==='presidencial'){
      var mV=meta.meta_votos||2396739,fV=meta.votos_actuales||1226194,g=meta.gap||1170545,p28=meta.padron2028||8859093,ev=meta.evaluacion||'DESAFIANTE';
      metaDet.innerHTML=
        [rowStat('Padrón 2028 proyectado',fmt(p28)),
         rowStat('Meta (50.1%)',fmt(mV),'var(--fp)'),
         rowStat('FP votos actuales (2024)',fmt(fV)),
         rowStat('Brecha a cerrar',fmt(g),g>700000?'var(--red)':'var(--gold)'),
         rowStat('Evaluación',ev,g>700000?'var(--red)':'var(--gold)'),
        ].join('')+
        '<div class="divider"></div>'+
        '<div style="font-size:.72rem;color:var(--muted);font-weight:700;margin-bottom:.3rem">Escenarios participación</div>'+
        [55,60,65].map(function(pt){
          var vt=Math.round(p28*(pt/100));
          return rowStat('Participación '+pt+'%',fmt(vt)+' votos',fV/vt>=0.5?'var(--green)':'var(--muted)');
        }).join('');
    } else {
      var res2=M.Movilizacion.resumenMultinivel('FP').find(function(r){return r.nivel===nivel;})||{};
      metaDet.innerHTML=
        [rowStat('FP gana actualmente',fpGana,'var(--green)'),
         rowStat('Por recuperar',res2.plazas_perdidas||0),
         rowStat('Alta factibilidad',res2.plazas_alta||0,'var(--green)'),
         rowStat('Media factibilidad',res2.plazas_media||0,'var(--gold)'),
         rowStat('Baja factibilidad',res2.plazas_baja||0,'var(--red)'),
         rowStat('Votos gap total',fmt(res2.votos_totales_gap||0)),
        ].join('');
    }
  }

  var rutaEl = document.getElementById('obj-ruta');
  if(rutaEl){
    if(nivel==='presidencial'){
      var ruta=(pipe.ruta&&pipe.ruta.ruta_minima)||[];
      var mVr=meta.meta_votos||2396739;
      var acumFinal=pipe.ruta&&pipe.ruta.acumulado_ruta||0;
      var alcanza=pipe.ruta&&pipe.ruta.alcanza_meta;
      var deficit=pipe.ruta&&pipe.ruta.deficit||0;

      if(!ruta.length){
        rutaEl.innerHTML='<div style="color:var(--muted);font-size:.75rem;padding:.5rem">Pipeline calculando ruta mínima...</div>';
      } else {
        // UI3 v11: tabla con progreso acumulativo visual
        var html='<div style="margin-bottom:.5rem">'+
          '<div style="display:flex;justify-content:space-between;font-size:.68rem;color:var(--muted);margin-bottom:.25rem">'+
          '<span>'+ruta.length+' provincias en ruta</span>'+
          '<span>Acumulado: <strong style="color:'+(alcanza?'var(--green)':'var(--fp)')+'">'+fmt(acumFinal)+'</strong> / meta '+fmt(mVr)+'</span></div>'+
          // Barra de progreso acumulativo
          '<div style="height:6px;background:var(--bg3);border-radius:3px;overflow:hidden;margin-bottom:.15rem">'+
          '<div style="height:100%;width:'+Math.min(100,+(acumFinal/mVr*100).toFixed(1))+'%;background:'+(alcanza?'var(--green)':'var(--fp)')+';border-radius:3px;transition:width .3s"></div></div>'+
          '<div style="font-size:.66rem;color:'+(alcanza?'var(--green)':'var(--orange)')+'">'+
          (alcanza?'✅ La ruta alcanza la meta':'⚠️ Déficit: '+fmt(deficit)+' votos — necesita palancas adicionales')+
          '</div></div>'+
          // Tabla
          '<div style="display:grid;grid-template-columns:1.2rem 1fr 3.5rem 4rem 3.5rem;gap:.1rem;font-size:.62rem;color:var(--muted);padding:.2rem 0;border-bottom:1px solid var(--border);font-weight:700">'+
          '<span>#</span><span>Provincia</span><span style="text-align:right">FP 28%</span><span style="text-align:right">Votos</span><span style="text-align:right">Acum%</span></div>'+
          ruta.map(function(p,i){
            var vproy=p.votos_fp_proy||0, acum=p.acumulado_despues||0, pct=+(acum/mVr*100).toFixed(0);
            var isLast=pct>=100, ganada=p.es_ganada_proy;
            var bg=i%2===0?'':'background:var(--bg3)';
            return '<div style="display:grid;grid-template-columns:1.2rem 1fr 3.5rem 4rem 3.5rem;gap:.1rem;font-size:.68rem;padding:.28rem 0;border-bottom:1px solid var(--border);align-items:center;'+bg+'">'+
              '<span style="color:var(--muted);font-size:.6rem">'+(i+1)+'</span>'+
              '<span style="font-weight:'+(ganada?'700':'400')+';color:'+(ganada?'var(--fp)':'var(--fg)')+'">'+
              (p.nombre||'—')+(ganada?' ✓':'')+'</span>'+
              '<span style="text-align:right;color:var(--fp)">'+(p.pct_fp_proy||0).toFixed(1)+'%</span>'+
              '<span style="text-align:right;font-weight:700">'+fmt(vproy)+'</span>'+
              '<span style="text-align:right;font-weight:700;color:'+(pct>=100?'var(--green)':'var(--muted)')+'">'+pct+'%'+(isLast?' ✅':'')+'</span>'+
              '</div>';
          }).join('')+
          '<div style="font-size:.65rem;color:var(--muted);padding:.35rem 0;font-style:italic">'+
          '✓ = provincia ya ganada en proyección 2028</div>';
        rutaEl.innerHTML=html;
      }
    } else {
      rutaEl.innerHTML=agenda.length?agenda.map(function(a){
        var cF=a.factibilidad==='alta'?'var(--green)':a.factibilidad==='media'?'var(--gold)':'var(--red)';
        var lbl=a.provincia+(a.circ?' '+_cleanCirc(a.circ):'');
        return '<div style="padding:.38rem 0;border-bottom:1px solid var(--border)">'+
          '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.1rem">'+
          '<span style="font-size:.78rem;font-weight:700">'+lbl+'</span>'+
          '<span style="font-size:.7rem;font-weight:700;color:'+cF+'">'+a.factibilidad.toUpperCase()+'</span></div>'+
          '<div style="display:flex;justify-content:space-between;font-size:.65rem;color:var(--muted)">'+
          '<span>Ganador: <strong style="color:'+pc(a.ganador_actual)+'">'+a.ganador_actual+'</strong> · Gap: '+fmt(a.votos_gap)+'</span>'+
          '<span>Nec: <strong style="color:'+cF+'">'+fmt(a.votos_necesarios)+'</strong></span></div></div>';
      }).join(''):'<div style="color:var(--green);font-size:.8rem;padding:.75rem;text-align:center">✅ FP gana todas las plazas de '+nivel+'</div>';
    }
  }

  var palEl = document.getElementById('obj-palancas');
  if(palEl){
    if(nivel==='presidencial'){
      palEl.innerHTML=
        [rowStat('① Alianza FP+PLD (80.9%)',fmt(pal.alianza_fp_pld||407702),'var(--fp)'),
         rowStat('② Nuevos electores 2028',fmt(pal.nuevos_electores||222490),'var(--accent)'),
         rowStat('③ Movilización abstención',fmt(pal.movilizacion_abstencion||74128),'var(--gold)'),
         rowStat('④ Transferencia PLD → FP',fmt(pal.transferencia_pld||pal.transferencia_leonelista||37191),'var(--muted)'),
         '<div class="divider"></div>',
         rowStat('Total identificado',fmt(pal.total||741511),(pal.total||0)>=(meta.gap||1170545)?'var(--green)':'var(--gold)'),
         rowStat('Gap residual',fmt(Math.max(0,(meta.gap||1170545)-(pal.total||0))),(meta.gap||1170545)-(pal.total||0)<=0?'var(--green)':'var(--orange)'),
        ].join('');
    } else {
      var resM=M.Movilizacion.resumenMultinivel('FP');
      palEl.innerHTML='<div style="font-size:.72rem;color:var(--muted);font-weight:700;margin-bottom:.35rem">Resumen multinivel FP</div>'+
        resM.map(function(r){
          var activo=r.nivel===nivel;
          return '<div style="padding:.28rem 0;border-bottom:1px solid var(--border)'+(activo?';background:var(--fp)11':'')+'">'+
            '<div style="display:flex;justify-content:space-between;font-size:.74rem;font-weight:'+(activo?'700':'400')+'">'+
            '<span style="color:'+(activo?'var(--fp)':'var(--text)')+'">'+r.nivel+'</span>'+
            '<span>'+r.plazas_perdidas+' plazas · '+fmt(r.votos_totales_gap||0)+' gap</span></div>'+
            '<div style="font-size:.63rem;color:var(--muted)">Alta:'+r.plazas_alta+' Media:'+r.plazas_media+' Baja:'+r.plazas_baja+'</div></div>';
        }).join('');
    }
  }

  var prioEl = document.getElementById('obj-prioridad');
  if(prioEl){
    var rankSrc = nivel==='presidencial'
      ? ((pipe.prioridad&&pipe.prioridad.ranking)||[])
      : agenda.slice().sort(function(a,b){
          var ord={alta:0,media:1,baja:2};
          return (ord[a.factibilidad]||2)-(ord[b.factibilidad]||2)||(a.votos_necesarios||0)-(b.votos_necesarios||0);
        });
    prioEl.innerHTML=rankSrc.slice(0,25).map(function(pm,i){
      if(nivel==='presidencial'){
        var col=pm.prioridad==='MÁXIMA'?'var(--red)':pm.prioridad==='ALTA'?'var(--gold)':pm.prioridad==='MEDIA'?'var(--orange)':'var(--muted)';
        return '<div style="padding:.35rem 0;border-bottom:1px solid var(--border)">'+
          '<div style="display:flex;justify-content:space-between;align-items:center">'+
          '<span style="font-size:.78rem;font-weight:700"><span style="color:var(--muted);font-size:.65rem">'+(i+1)+'</span> '+pm.nombre+'</span>'+
          '<div style="display:flex;gap:.25rem">'+
          '<span style="font-size:.65rem;font-weight:700;padding:.06rem .26rem;border-radius:.18rem;background:'+col+'22;color:'+col+'">'+pm.prioridad+'</span>'+
          '<span style="font-size:.66rem;color:var(--accent);font-weight:700">'+pm.priorityScore+'</span></div></div>'+
          '<div style="font-size:.64rem;color:var(--muted)">FP: '+pm.pct_fp+'% · Gap: '+fmt(pm.gap_votos||0)+'</div></div>';
      } else {
        var lbl2=pm.provincia+(pm.circ?' '+_cleanCirc(pm.circ):'');
        var cF2=pm.factibilidad==='alta'?'var(--green)':pm.factibilidad==='media'?'var(--gold)':'var(--red)';
        return '<div style="padding:.35rem 0;border-bottom:1px solid var(--border)">'+
          '<div style="display:flex;justify-content:space-between;align-items:center">'+
          '<span style="font-size:.78rem;font-weight:700"><span style="color:var(--muted);font-size:.65rem">'+(i+1)+'</span> '+lbl2+'</span>'+
          '<span style="font-size:.65rem;font-weight:700;color:'+cF2+'">'+pm.factibilidad.toUpperCase()+'</span></div>'+
          '<div style="font-size:.64rem;color:var(--muted)">Ganador: '+(pm.ganador_actual||'—')+' · Gap: '+fmt(pm.votos_gap||0)+' · Nec: '+fmt(pm.votos_necesarios||0)+'</div></div>';
      }
    }).join('');
  }
}

// ====== PRESIDENCIAL ======
function renderPresidencial(){
  var blocsP = M.Resultados.getPresidencialByBloc();
  var byPart = M.Resultados.getPresidencialByPartido();
  var totP   = M.Resultados.getTotalesPresidencial();
  var porProv = M.Resultados.getPresidencialPorProvincia ? M.Resultados.getPresidencialPorProvincia() : [];
  var porMuni = M.Resultados.getPresidencialPorMunicipio ? M.Resultados.getPresidencialPorMunicipio() : [];

  var _pEmitidos = totP.votos_emitidos || 0;
  var _pInscritos = M.Padron.getPadronOficial() || 1;
  var _pParticJCE = totP.porcentaje_participacion || +(_pEmitidos/_pInscritos*100).toFixed(2);
  var ganador = blocsP[0] || {};
  var segundo = blocsP[1] || {};
  var margenPP = segundo.pct ? +(ganador.pct - segundo.pct).toFixed(2) : ganador.pct;

  // ── N-2: KPIs ──
  var kpiEl = document.getElementById('pres-kpis');
  if(kpiEl) kpiEl.innerHTML =
    kpi('blue',  'Ganador',          ganador.id||'—', 'Luis Abinader · '+( ganador.pct||0)+'%')
   +kpi('purple','2do lugar',        segundo.id||'—', (segundo.pct||0)+'%')
   +kpi('green', 'Participación',    _pParticJCE+'%', fmt(_pEmitidos)+' emitidos')
   +kpi('orange','Abstención',       +(100-_pParticJCE).toFixed(2)+'%', fmt(_pInscritos-_pEmitidos)+' no votaron')
   +kpi('gold',  'Margen vs 2do',    margenPP+'pp',   blocsP[0]&&blocsP[0].pct>=50?'No ballotage':'Ballotage')
   +kpi('red',   'Votos válidos',    fmt(totP.votos_validos||0), fmt(totP.votos_nulos||0)+' nulos');

  document.getElementById('pres-blocs-bars').innerHTML =
    blocsP.map(function(b){return bar(b.id+' \u00b7 '+b.nombre,b.pct,pc(b.id),fmt(b.votos)+' votos');}).join('');

  document.getElementById('pres-stats').innerHTML = [
    rowStat('Padr\u00f3n oficial',fmt(_pInscritos),'var(--text)'),
    rowStat('Votos emitidos',fmt(_pEmitidos),'var(--text)'),
    rowStat('Votos v\u00e1lidos',fmt(totP.votos_validos||0)),
    rowStat('Votos nulos',fmt(totP.votos_nulos||0)),
    rowStat('Participaci\u00f3n',_pParticJCE+'%','var(--green)'),
    rowStat('Abstenci\u00f3n',+(100-_pParticJCE).toFixed(2)+'%','var(--gold)'),
    rowStat('Ganador',ganador.id?ganador.id+' \u00b7 Luis Abinader':'','var(--prm)'),
    rowStat('% ganador (bloque)',ganador.pct?ganador.pct+'%':'','var(--prm)'),
    rowStat('Margen vs 2do',margenPP+'pp'),
    rowStat('Ballotage',ganador.pct>=50?'No \u2014 1ra vuelta':'S\u00ed \u2014 2da vuelta'),
  ].join('');

  var _n=document.getElementById('nota-pres-barras');if(_n)_n.innerHTML=nota(
    'C\u00f3mo leer: Barras por bloque electoral con alianzas aplicadas. Haz clic en Por partido individual para ver cada partido sin agrupar.',
    'PRM gan\u00f3 con <strong style="color:var(--prm)">'+( ganador.pct||'57.44')+'%</strong>. FP obtuvo <strong style="color:var(--fp)">'+(segundo.id==='FP'?segundo.pct:'28.85')+'%</strong> como bloque. Participaci\u00f3n: '+_pParticJCE+'% \u2014 el '+(100-_pParticJCE).toFixed(1)+'% no vot\u00f3.',
    '<strong>Nota:</strong> El voto de casilla pura de FP fue menor que el bloque \u2014 parte vino de aliados. La proyecci\u00f3n 2028 trabaja con la base real del partido.',
    {id:'M4',nombre:'Motor Resultados',desc:'Agrupaci\u00f3n por bloque electoral desde datos JCE oficiales.',formula:'pct_bloque = sum(votos_aliados) / total_validos x 100',refs:'JCE 2024 \u00b7 Ley Electoral RD 275-97'}
    );

  document.getElementById('pres-all-parties').innerHTML =
    '<table style="width:100%;border-collapse:collapse">'+
    '<thead><tr>'+
    '<th style="padding:.22rem .4rem;font-size:.63rem;font-weight:700;color:var(--muted);text-align:left;border-bottom:1px solid var(--border);position:sticky;top:0;background:var(--bg2)">Partido</th>'+
    '<th style="padding:.22rem .4rem;font-size:.63rem;font-weight:700;color:var(--muted);text-align:right;border-bottom:1px solid var(--border);position:sticky;top:0;background:var(--bg2)">Votos</th>'+
    '<th style="padding:.22rem .4rem;font-size:.63rem;font-weight:700;color:var(--muted);text-align:right;border-bottom:1px solid var(--border);position:sticky;top:0;background:var(--bg2)">%</th>'+
    '</tr></thead><tbody>'+
    byPart.map(function(p){
      return '<tr>'+
        '<td style="padding:.2rem .4rem;font-size:.75rem"><strong style="color:'+pc(p.id)+'">'+p.id+'</strong></td>'+
        '<td style="padding:.2rem .4rem;font-size:.72rem;text-align:right;color:var(--muted)">'+fmt(p.votos)+'</td>'+
        '<td style="padding:.2rem .4rem;font-size:.75rem;text-align:right;font-weight:700">'+p.pct+'%</td>'+
        '</tr>';
    }).join('')+
    '</tbody></table>';

  // ── N-3: Por provincia ──
  window._presPorProv = porProv;
  window._presPorMuni = porMuni.filter(function(m){return !m.exterior;});
  _renderPresProvGrid(porProv);

  // Populate municipio filter from actual muni data
  var sel = document.getElementById('pres-muni-filter');
  if(sel && sel.options.length <= 1){
    var provMap = {};
    porMuni.forEach(function(m){
      var key = m.provincia_id||'';
      var name = m.provincia||m.provincia_id||'';
      if(!provMap[key]) provMap[key] = {name: name, count: 0};
      provMap[key].count++;
    });
    Object.keys(provMap).sort(function(a,b){ return provMap[a].name.localeCompare(provMap[b].name); }).forEach(function(pid){
      var opt = document.createElement('option');
      opt.value = pid;
      opt.textContent = provMap[pid].name + ' (' + provMap[pid].count + ')';
      sel.appendChild(opt);
    });
  }
}

function _renderPresProvGrid(provData){
  var el = document.getElementById('pres-prov-grid');
  if(!el) return;
  if(!(provData||[]).length){
    el.innerHTML='<div style="padding:.8rem;color:var(--muted);font-size:.78rem">Sin datos</div>';
    return;
  }

  // Sort by FP% desc
  var sorted = (provData||[]).slice().sort(function(a,b){
    var ta = Object.values(a.blocs||{}).reduce(function(s,v){return s+v;},0)||1;
    var tb = Object.values(b.blocs||{}).reduce(function(s,v){return s+v;},0)||1;
    return (b.blocs.FP||0)/tb - (a.blocs.FP||0)/ta;
  });

  var thS = 'padding:.28rem .45rem;font-size:.62rem;font-weight:700;color:var(--muted);border-bottom:2px solid var(--border);position:sticky;top:0;background:var(--bg2);white-space:nowrap';
  var rows = sorted.map(function(p){
    var blocs = p.blocs||{};
    var total  = Object.values(blocs).reduce(function(s,v){return s+v;},0)||1;
    var sorted2= Object.entries(blocs).sort(function(a,b){return b[1]-a[1];});
    var winner = sorted2[0]||['—',0];
    var second = sorted2[1]||['—',0];
    var margen = +((winner[1]-second[1])/total*100).toFixed(1);
    var fpPct  = +((blocs.FP||0)/total*100).toFixed(1);
    var prmPct = +((blocs.PRM||0)/total*100).toFixed(1);
    var pldPct = +((blocs.PLD||0)/total*100).toFixed(1);
    var winCol = winner[0]==='FP'?'var(--fp)':winner[0]==='PRM'?'var(--prm)':'var(--pld)';
    var fpCol  = fpPct > prmPct ? 'var(--fp)' : 'var(--muted)';
    var tdS = 'padding:.24rem .45rem;font-size:.74rem;border-bottom:1px solid var(--border)22';
    var tdR = tdS+';text-align:right';
    // mini bar
    var barW = Math.round(fpPct);
    var bar2 = '<div style="height:3px;background:var(--bg3);border-radius:2px;margin-top:.18rem">'+
      '<div style="height:100%;width:'+barW+'%;background:var(--fp);border-radius:2px"></div></div>';
    return '<tr>'+
      '<td style="'+tdS+'"><strong style="font-size:.76rem">'+p.provincia+'</strong>'+bar2+'</td>'+
      '<td style="'+tdR+'"><strong style="color:'+winCol+'">'+winner[0]+'</strong></td>'+
      '<td style="'+tdR+';color:'+fpCol+'">'+fpPct+'%</td>'+
      '<td style="'+tdR+'">'+prmPct+'%</td>'+
      '<td style="'+tdR+';color:var(--muted);font-size:.66rem">'+pldPct+'%</td>'+
      '<td style="'+tdR+';color:var(--muted);font-size:.66rem">'+margen+'pp</td>'+
      '</tr>';
  }).join('');

  el.innerHTML =
    '<div style="overflow-x:auto">'+
    '<table style="width:100%;border-collapse:collapse">'+
    '<thead><tr>'+
    '<th style="'+thS+';text-align:left">Provincia</th>'+
    '<th style="'+thS+';text-align:right">Ganó</th>'+
    '<th style="'+thS+';text-align:right">FP%</th>'+
    '<th style="'+thS+';text-align:right">PRM%</th>'+
    '<th style="'+thS+';text-align:right">PLD%</th>'+
    '<th style="'+thS+';text-align:right">Margen</th>'+
    '</tr></thead><tbody>'+rows+'</tbody></table></div>';
}

window.renderPresidencialMuniFiltered = function(){
  var sel = document.getElementById('pres-muni-filter');
  var filterVal = sel ? sel.value : '';
  var munis = window._presPorMuni||[];
  var filtered = filterVal
    ? munis.filter(function(m){ return (m.provincia_id||'')==filterVal || (m.provincia||'')==filterVal; })
    : munis;
  var el = document.getElementById('pres-muni-grid');
  if(!el) return;

  if(!filtered.length){
    el.innerHTML = '<div style="padding:1rem;color:var(--muted);font-size:.8rem">Sin datos</div>';
    return;
  }

  // Compact table — no scroll, shows all in sorted table
  var th = 'style="padding:.3rem .5rem;font-size:.65rem;font-weight:700;color:var(--muted);text-align:left;border-bottom:2px solid var(--border);white-space:nowrap;position:sticky;top:0;background:var(--bg2)"';
  var thR= 'style="padding:.3rem .5rem;font-size:.65rem;font-weight:700;color:var(--muted);text-align:right;border-bottom:2px solid var(--border);white-space:nowrap;position:sticky;top:0;background:var(--bg2)"';

  // Sort by FP% descending
  var sorted_munis = filtered.slice().sort(function(a,b){
    var ta = Object.values(a.blocs||{}).reduce(function(s,v){return s+v;},0)||1;
    var tb = Object.values(b.blocs||{}).reduce(function(s,v){return s+v;},0)||1;
    return (b.blocs&&b.blocs.FP||0)/tb - (a.blocs&&a.blocs.FP||0)/ta;
  });

  var rows = sorted_munis.map(function(m){
    var blocs = m.blocs||{};
    var total = Object.values(blocs).reduce(function(s,v){return s+v;},0)||1;
    var fpPct  = +((blocs.FP||0)/total*100).toFixed(1);
    var prmPct = +((blocs.PRM||0)/total*100).toFixed(1);
    var pldPct = +((blocs.PLD||0)/total*100).toFixed(1);
    var ganador = m.ganador||'—';
    var ganCol  = ganador==='FP'?'var(--fp)':ganador==='PRM'?'var(--prm)':'var(--pld)';
    var margen  = m.margen_pp != null ? m.margen_pp : Math.abs(fpPct-prmPct).toFixed(1);
    var fpCol   = fpPct > prmPct ? 'var(--fp)' : 'var(--muted)';
    var td = 'style="padding:.28rem .5rem;font-size:.75rem;border-bottom:1px solid var(--border)22"';
    var tdR= 'style="padding:.28rem .5rem;font-size:.75rem;text-align:right;border-bottom:1px solid var(--border)22"';
    return '<tr>'+
      '<td '+td+'><span style="font-weight:600">'+m.municipio+'</span>'+
      (m.provincia?'<br><span style="font-size:.62rem;color:var(--muted)">'+m.provincia+'</span>':'')+
      '</td>'+
      '<td '+tdR+'><strong style="color:'+ganCol+'">'+ganador+'</strong></td>'+
      '<td '+tdR+'><span style="color:'+fpCol+'">'+fpPct+'%</span></td>'+
      '<td '+tdR+'>'+prmPct+'%</td>'+
      '<td '+tdR+' style="color:var(--muted)">'+pldPct+'%</td>'+
      '<td '+tdR+' style="font-size:.65rem;color:var(--muted)">'+margen+'pp</td>'+
      '</tr>';
  }).join('');

  var count = '<div style="font-size:.65rem;color:var(--muted);margin-bottom:.4rem">'+filtered.length+' municipios'+
    (filterVal?' · filtrado':'')+'</div>';

  el.innerHTML = count+
    '<div style="overflow-x:auto">'+
    '<table style="width:100%;border-collapse:collapse">'+
    '<thead><tr>'+
    '<th '+th+'>Municipio</th>'+
    '<th '+thR+'>Ganador</th>'+
    '<th '+thR+'>FP %</th>'+
    '<th '+thR+'>PRM %</th>'+
    '<th '+thR+'>PLD %</th>'+
    '<th '+thR+'>Margen</th>'+
    '</tr></thead><tbody>'+rows+'</tbody></table></div>';
};

// ── Toggle expand/collapse ──
window.togglePresDesglose = function(tipo){
  var panel = document.getElementById('pres-'+tipo+'-panel');
  var badge = document.getElementById('pres-'+tipo+'-badge');
  if(!panel) return;
  var open = panel.style.display !== 'none';
  panel.style.display = open ? 'none' : '';
  if(badge) badge.textContent = open ? '\u25b6 Expandir \u00b7 '+(tipo==='prov'?'32 provincias':''+((window._presPorMuni||[]).length)+' municipios') : '\u25bc Colapsar';
  if(!open && tipo==='muni') window.renderPresidencialMuniFiltered();
};

// ====== SENADORES ======
function renderSenadores(){
  var senData = M.Resultados.getSenadores();
  var senC    = M.Curules.getTotalByNivel('senadores');
  var senCoal = M.Curules.getSenadorePorCoalicion();

  var prmCoal = (senCoal.find(function(x){return x.id==='PRM-coalicion';})||{curules:0}).curules;
  var fpCoal  = (senCoal.find(function(x){return x.id==='FP-coalicion';})||{curules:0}).curules;
  var otros   = 32 - prmCoal - fpCoal;
  var prmReal = senC['PRM']||0;
  var fpReal  = senC['FP']||0;

  var _senPartic = _TOTALES_SEN.porcentaje_participacion || 0;
  var _senEmitidos = _TOTALES_SEN.votos_emitidos || 0;
  document.getElementById('sen-kpis').innerHTML =
    kpi('blue','PRM directo',prmReal,'bloque PRM: '+prmCoal+' (+'+(prmCoal-prmReal)+' aliados)')
    +kpi('purple','FP directo',fpReal,'bloque FP: '+fpCoal+' (+'+(fpCoal-fpReal)+' aliados)')
    +kpi('red','Otros partidos',otros,'partidos aliados ganadores')
    +kpi('gold','Total','32','1 senador por provincia')
    +kpi('green','Participaci\u00f3n',_senPartic+'%',fmt(_senEmitidos)+' emitidos')
    +kpi('orange','Abstenci\u00f3n',+(100-_senPartic).toFixed(1)+'%',fmt((_TOTALES_SEN.inscritos||0)-_senEmitidos)+' abstencionistas');


  var _n=document.getElementById('nota-sen-grid');if(_n)_n.innerHTML=nota(
    'C\u00f3mo leer estas tarjetas: Cada tarjeta es una provincia. El color muestra qui\u00e9n gan\u00f3 el senador. La mini-barra muestra proporci\u00f3n de votos. ENPP = n\u00famero efectivo de partidos.',
    'El bloque PRM controla <strong style="color:var(--prm)">29 senadur\u00edas</strong>. FP controla <strong style="color:var(--fp)">3</strong>. Las provincias con margen <15pp son objetivos volteables.',
    '<strong>Estrategia 2028:</strong> FP necesita 17+ senadores. Con alianza FP+PLD, Santiago, La Vega y Puerto Plata son los objetivos principales.',
    {id:'M4+M16',nombre:'Motor Resultados + Motor Riesgo',desc:'Ganador real (qui\u00e9n present\u00f3 candidatura JCE) + bloque_coalicion. Riesgo = margen(50%) + participaci\u00f3n(25%) + ENPP(25%).',formula:'riesgo = margen x 0.50 + participacion x 0.25 + enpp x 0.25',refs:'Laakso & Taagepera (1979) ENPP \u00b7 Jacobson (2004)'}
    );
  document.getElementById('sen-prov-grid').innerHTML = senData.map(function(prov){
    var rn = prov.riesgo_nivel||'';
    var rs = prov.riesgo_score||'';
    var esAliadoPRM = prov.ganador !== 'PRM' && prov.bloque_coalicion === 'PRM-coalicion';
    var esAliadoFP  = prov.ganador !== 'FP'  && prov.bloque_coalicion === 'FP-coalicion';
    var coalbadge = esAliadoPRM
      ? '<span style="font-size:.65rem;background:rgba(37,99,235,.15);color:var(--accent);padding:.1rem .35rem;border-radius:.25rem;margin-left:.3rem">aliado PRM</span>'
      : (esAliadoFP ? '<span style="font-size:.65rem;background:rgba(124,58,237,.15);color:#7C3AED;padding:.1rem .35rem;border-radius:.25rem;margin-left:.3rem">aliado FP</span>' : '');
    var partBars = (prov.top3||[]).map(function(t){
      return '<div style="flex:'+t.pct+';background:'+pc(t.id)+';height:100%"></div>';
    }).join('');
    var ind = prov.resultados_ind || {};
    var topInd = Object.entries(ind).sort(function(a,b){return b[1]-a[1];}).slice(0,4);
    var totalInd = Object.values(ind).reduce(function(s,v){return s+v;},0);
    var indHtml = topInd.map(function(e){
      return '<div style="display:flex;justify-content:space-between;font-size:.63rem;padding:.07rem 0">'
        +'<span style="color:'+pc(e[0])+';font-weight:700">'+e[0]+'</span>'
        +'<span style="color:var(--muted)">'+fmt(e[1])+'&nbsp;<strong style="color:var(--text)">'+(totalInd?+(e[1]/totalInd*100).toFixed(1):0)+'%</strong></span></div>';
    }).join('');
    var winCol = prov.ganador==='FP'?'var(--fp)':prov.ganador==='PRM'?'var(--prm)':'var(--pld)';
    return '<div class="prov-card" style="border-left-color:'+winCol+'">'+
      '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:.2rem">'+
      '<div class="prov-name">'+prov.provincia+'</div>'+
      (rn&&(rn==='alta'||rn==='media')?'<span class="risk-badge risk-'+rn+'" style="font-size:.6rem">'+rn.toUpperCase()+'</span>':'')+
      '</div>'+
      '<div style="display:flex;align-items:center;gap:.35rem;margin-bottom:.15rem">'+
      '<span style="font-weight:700;font-size:.8rem;color:'+pc(prov.ganador)+'">'+prov.ganador+'</span>'+
      coalbadge+
      '<span style="font-size:.72rem;color:var(--muted)">'+prov.pct_ganador+'%</span>'+
      '</div>'+
      '<div class="prov-bar">'+partBars+'</div>'+
      '<div style="font-size:.62rem;color:var(--muted);margin-top:.18rem">Part. '+(prov.participacion||'?')+'% · Margen '+(prov.margen_pp||'?')+'pp</div>'+
      '</div>';
  }).join('');

  // ── Tab coalición: participación real por bloque ──
  var coalData = M.Curules.getSenadorePorCoalicion ? M.Curules.getSenadorePorCoalicion() : [];
  var coalHtml = coalData.length ? coalData.map(function(c){
    var col = c.id==='PRM-coalicion'?'var(--prm)':c.id==='FP-coalicion'?'var(--fp)':'var(--muted)';
    return '<div style="display:flex;align-items:center;gap:.75rem;padding:.6rem 0;border-bottom:1px solid var(--border)">'
      +'<div style="flex:1"><div style="font-size:.85rem;font-weight:700;color:'+col+'">'+c.id+'</div>'
      +'<div style="font-size:.7rem;color:var(--muted)">'+
      (c.partidos?c.partidos.join(', '):'')+'</div></div>'
      +'<div style="text-align:right"><div style="font-size:1.5rem;font-weight:800;color:'+col+'">'+c.curules+'</div>'
      +'<div style="font-size:.68rem;color:var(--muted)">senadores</div></div></div>';
  }).join('') : '<p class="text-muted text-sm" style="padding:.75rem 0">Datos de coalición no disponibles.</p>';

  var senCoalDetail = document.getElementById('sen-coal-detail');
  if(senCoalDetail) senCoalDetail.innerHTML =
    '<div style="margin-bottom:.75rem">'
    +kpi('blue','PRM coalición',prmCoal,'de 32 senadores')
    +kpi('purple','FP coalición',fpCoal,'de 32 senadores')
    +'</div>'
    +coalHtml;
}


// ====== DIPUTADOS ======
function renderDiputados(){
  if(!document.getElementById('dip-kpis')) return;
  var dipC=M.Curules.getTotalByNivel('diputados');
  var natC=M.Curules.getTotalByNivel('nacionales');
  var extC=M.Curules.getTotalByNivel('exterior');
  var combined={};
  [dipC,natC,extC].forEach(function(obj){
    Object.entries(obj).forEach(function(e){combined[e[0]]=(combined[e[0]]||0)+e[1];});
  });
  var sortedC=Object.entries(combined).sort(function(a,b){return b[1]-a[1];});
  var totalC=sortedC.reduce(function(s,e){return s+e[1];},0);

  document.getElementById('dip-kpis').innerHTML =
    kpi('blue','PRM Territoriales',dipC.PRM||0,'de 158 escaños (2028) / 178 (2024)')
    +kpi('purple','FP Territoriales',dipC.FP||0,'')
    +kpi('red','PLD Territoriales',dipC.PLD||0,'')
    +kpi('gold','Total C\u00e1mara Baja',totalC,'Terr.+Nac.+Ext.');

  document.getElementById('dip-bar-list').innerHTML =
    sortedC.map(function(e){
      return bar(e[0]+' \u00b7 '+M.Resultados.getPartidoNombre(e[0]).substring(0,24),+(e[1]/totalC*100).toFixed(1),pc(e[0]),e[1]+' curules');
    }).join('');

  var ext=M.Curules.getExteriorDetail();
  document.getElementById('ext-detail').innerHTML = (ext||[]).map(function(c){
    return '<div style="display:flex;justify-content:space-between;padding:.4rem 0;border-bottom:1px solid var(--border);font-size:.8rem">'
      +'<span>'+(c.region||'Exterior')+'</span>'
      +'<strong style="color:'+pc(c.resultado&&c.resultado[0]&&c.resultado[0].partido)+'">'+
      (c.resultado||[]).map(function(r){return r.partido+':'+r.curules;}).join(', ')+'</strong></div>';
  }).join('');

  var nat=M.Curules.getNacionalesDetail();
  document.getElementById('nat-detail').innerHTML =
    '<div class="text-muted" style="font-size:.7rem;margin-bottom:.4rem">'+(nat.criterio||'Lista cerrada bloqueada')+'</div>'
    +(nat.resultado||[]).map(function(r){
      return '<div style="display:flex;justify-content:space-between;padding:.35rem 0;border-bottom:1px solid var(--border);font-size:.8rem">'
        +'<span>'+r.partido+'</span>'
        +'<strong style="color:'+pc(r.partido)+'">'+r.curules+' curul'+(r.curules>1?'es':'')+'</strong></div>';
    }).join('');

  var circData = M.Resultados.getDiputadosPorCirc();

  var _n=document.getElementById('nota-dip');if(_n)_n.innerHTML=nota(
    'C\u00f3mo leer: Diputados elegidos por D\'Hondt por circunscripci\u00f3n. Los votos de cada partido se dividen entre 1, 2, 3... y se asignan los esca\u00f1os a los cocientes m\u00e1s altos. Un partido con 30% en 3 esca\u00f1os puede ganar 1.',
    'PRM tiene <strong style="color:var(--prm)">171 de 222 curules</strong> totales. FP tiene <strong style="color:var(--fp)">31</strong>. La c\u00e1mara est\u00e1 fragmentada en partidos peque\u00f1os.',
    '<strong>Meta 2028:</strong> FP necesita 96 diputados para mayor\u00eda. Con alianza FP+PLD la meta es m\u00e1s alcanzable en circunscripciones de 3+ esca\u00f1os.',
    {id:'M6',nombre:'Motor Curules / D\'Hondt',desc:'M\u00e9todo D\'Hondt con umbral legal 2% (Ley 20-23). Los partidos bajo el 2% no participan.',formula:'cociente = votos_partido / divisor (1,2,3...)\nSe asignan los N cocientes m\u00e1s altos',refs:'Ley 20-23 Art. 68 \u00b7 D\'Hondt (1878)'}
    );
  document.getElementById('dip-circ-grid').innerHTML =
    '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:.4rem">'
    +circData.map(function(c){
      var ind = c.resultados_ind || {};
      var topInd = Object.entries(ind).sort(function(a,b){return b[1]-a[1];}).slice(0,3);
      var totalInd = Object.values(ind).reduce(function(s,v){return s+v;},0);
      var indRows = topInd.map(function(e){
        return '<div style="display:flex;justify-content:space-between;font-size:.67rem;padding:.08rem 0">'
          +'<span style="color:'+pc(e[0])+'">'+e[0]+'</span>'
          +'<span>'+fmt(e[1])+' <strong>'+(totalInd?+(e[1]/totalInd*100).toFixed(1):0)+'%</strong></span></div>';
      }).join('');
      var curulesDetail = M.Curules.getDiputadosDetail().find(function(d){
        return d.provincia_id===c.provincia_id && d.circ===c.circ;
      }) || {};
      var curulesHtml = (curulesDetail.resultado||[]).map(function(r){
        return '<span style="background:'+pc(r.partido)+'22;border:1px solid '+pc(r.partido)+'44;border-radius:.2rem;padding:.06rem .25rem;font-size:.66rem;font-weight:700;color:'+pc(r.partido)+'">'+r.partido+':'+r.curules+'</span>';
      }).join('');
      return '<div style="background:var(--bg3);border:1px solid var(--border);border-radius:var(--r);padding:.55rem .75rem">'
        +'<div style="font-size:.76rem;font-weight:700;margin-bottom:.1rem">'+c.provincia+' '+_cleanCirc(c.circ)+'</div>'
        +'<div style="font-size:.68rem;color:var(--muted);margin-bottom:.2rem">'
          +'Part: '+(c.participacion||'?')+'% \u00b7 Inscritos: '+fmt(c.inscritos||0)+'</div>'
        +'<div style="font-size:.7rem;font-weight:700;color:'+pc(c.ganador)+';margin-bottom:.15rem">'
          +c.ganador+' '+c.pct_ganador+'%</div>'
        +'<div style="margin-bottom:.3rem">'+indRows+'</div>'
        +'<div style="display:flex;gap:.2rem;flex-wrap:wrap">'+curulesHtml+'</div>'
        +'</div>';
    }).join('')
    +'</div>';
}


// ====== EXTERIOR ======
function renderExterior(){
  if(!document.getElementById('ext-kpis')) return;
  var extVotos   = M.Resultados.getDiputadosExterior();
  var extCurules = M.Curules.getExteriorDetail();
  var padExt     = _DS_PADRON_EXT && _DS_PADRON_EXT.padron ? _DS_PADRON_EXT.padron : [];
  var totalInsExt= _DS_PADRON_EXT ? (_DS_PADRON_EXT.total_inscrito_exterior||0) : 0;
  var totalEmit  = extVotos.reduce(function(s,c){return s+(c.totales&&c.totales.emitidos||0);},0);
  var partExt    = totalInsExt ? +(totalEmit/totalInsExt*100).toFixed(1) : 0;

  // ── Exterior presidential data (separate from diputados) ──
  var extPres = _DS_RESULTADOS_PRES && _DS_RESULTADOS_PRES.exterior || {};
  var extPresPorCirc = extPres.por_circ || [];
  var fpExtPres=0, prmExtPres=0, totalExtPres=0;
  extPresPorCirc.forEach(function(c){
    fpExtPres+=(c.resultados&&c.resultados.FP||0);
    prmExtPres+=(c.resultados&&c.resultados.PRM||0);
    totalExtPres+=Object.values(c.resultados||{}).reduce(function(s,v){return s+v;},0);
  });

  document.getElementById('ext-kpis').innerHTML =
    kpi('blue','Inscritos Exterior',fmt(totalInsExt),'en 3 circunscripciones')
    +kpi('gold','Participación Diputados',partExt+'%',fmt(totalEmit)+' emitidos')
    +kpi('prm','PRM Diputados Ext.',(M.Curules.getTotalByNivel('exterior').PRM||0)+' cur.','de 7 curules totales')
    +kpi('fp','FP Pres. Ext.',totalExtPres>0?+(fpExtPres/totalExtPres*100).toFixed(1)+'%':'—',
        totalExtPres>0?fmt(fpExtPres)+' votos pres.':'ver nota abajo');

  // ── Banner explicativo ──
  var bannerEl=document.getElementById('ext-circs');
  var notaBanner='<div style="background:var(--gold)11;border:1px solid var(--gold)44;border-radius:var(--r);padding:.6rem .85rem;margin-bottom:.65rem;font-size:.72rem;color:var(--muted)">'+
    '<strong style="color:var(--gold)">⚠ Los datos de cada circunscripción son de Diputados al Exterior</strong> — no de la presidencial. '+
    'El voto presidencial exterior se agrega a nivel nacional (no se desglosa por circunscripción en el dataset JCE disponible). '+
    (totalExtPres>0
      ? 'Resumen presidencial exterior: PRM <strong style="color:var(--prm)">'+(+(prmExtPres/totalExtPres*100).toFixed(1))+'%</strong> · FP <strong style="color:var(--fp)">'+(+(fpExtPres/totalExtPres*100).toFixed(1))+'%</strong> ('+fmt(totalExtPres)+' votos).'
      : 'El dataset no incluye totales presidenciales exterior desglosados por circunscripción.')+
    '</div>';

  document.getElementById('ext-circs').innerHTML = notaBanner + extVotos.map(function(circ){
    var padC = padExt.find(function(p){return p.circ_exterior===circ.circ_exterior;})||{};
    var curC = (extCurules||[]).find(function(c){return c.circ_exterior===circ.circ_exterior;})||{};
    var ind  = circ.resultados_ind||{};
    var topInd  = Object.entries(ind).sort(function(a,b){return b[1]-a[1];}).slice(0,5);
    var totalInd= Object.values(ind).reduce(function(s,v){return s+v;},0);
    var indRows = topInd.map(function(e){
      return '<div style="display:flex;justify-content:space-between;padding:.2rem 0;border-bottom:1px solid var(--border);font-size:.78rem">'
        +'<span style="color:'+pc(e[0])+';font-weight:700">'+e[0]+'</span>'
        +'<span>'+fmt(e[1])+' \u00b7 <strong>'+(totalInd?+(e[1]/totalInd*100).toFixed(2):0)+'%</strong></span></div>';
    }).join('');
    var curulesHtml = (curC.resultado||[]).map(function(r){
      return '<span style="background:'+pc(r.partido)+'22;border:1px solid '+pc(r.partido)+'44;border-radius:.2rem;padding:.06rem .28rem;font-size:.72rem;font-weight:700;color:'+pc(r.partido)+'">'+r.partido+': '+r.curules+' cur.</span>';
    }).join('');
    return '<div style="background:var(--bg3);border:1px solid var(--border);border-radius:var(--r);padding:.8rem 1rem;margin-bottom:.5rem">'
      +'<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:.5rem">'
        +'<div>'
          +'<div style="font-weight:700;font-size:.9rem">Circ. '+circ.circ_exterior+' \u2014 '+circ.region+'</div>'
          +'<div style="font-size:.74rem;color:var(--muted)">'+fmt(padC.inscritos||circ.inscritos||0)+' inscritos \u00b7 <strong style=\"color:var(--gold)\">Diputados al Exterior 2024</strong></div>'
        +'</div>'
        +'<div style="text-align:right">'
          +'<div style="font-weight:700;color:'+pc(circ.ganador)+'">'+circ.ganador+' '+circ.pct_ganador+'%</div>'
          +'<div style="font-size:.7rem;color:var(--muted)">'+fmt(circ.totales&&circ.totales.emitidos||0)+' votos</div>'
        +'</div>'
      +'</div>'
      +'<div style="margin-bottom:.4rem">'+indRows+'</div>'
      +(curulesHtml?'<div style="display:flex;gap:.25rem;flex-wrap:wrap;margin-top:.35rem">'+curulesHtml+'</div>':'')
      +'</div>';
  }).join('');
}


// ====== HISTÓRICO 2020 ======
function renderHistorico(){
  if(!document.getElementById('hist-kpis')) return;
  var H    = M.Historico2020;
  var tot  = H.getTotalesPresidencial();
  var pm20 = H.getPresidencialByProvincia();
  var pm24 = _PROV_METRICS_PRES || [];
  var swing= H.getSwingPresidencial(['PRM','PLD','FP']);

  // ── KPIs ──────────────────────────────────────────────────────
  var ins20  = tot.inscritos || 0;
  var emit20 = tot.votos_emitidos || 0;
  var par20  = ins20 ? +(emit20/ins20*100).toFixed(1) : 0;
  var res20  = _DS_RESULTADOS_2020 && _DS_RESULTADOS_2020.niveles.presidencial.resultados || {};
  var val20  = tot.votos_validos || 0;
  var ganador20 = Object.entries(res20).sort(function(a,b){return b[1]-a[1];})[0];

  document.getElementById('hist-kpis').innerHTML =
    kpi('blue','Ganador 2020', ganador20?ganador20[0]:'?',
        ganador20?+(ganador20[1]/val20*100).toFixed(2)+'%':'')
    +kpi('green','Padrón 2020', fmt(ins20+595879), 'Dom. '+fmt(ins20)+' + Ext. 595,879')
    +kpi('gold','Participación 2020', par20+'%', fmt(emit20)+' emitidos')
    +kpi('red','PLD 2020', +((_DS_RESULTADOS_2020&&res20.PLD||0)/val20*100).toFixed(1)+'%',
        'vs PLD cas. pres. 2024: '+fmt((window._DS_RESULTADOS&&window._DS_RESULTADOS.niveles&&window._DS_RESULTADOS.niveles.presidencial&&window._DS_RESULTADOS.niveles.presidencial.resultados&&window._DS_RESULTADOS.niveles.presidencial.resultados.PLD)||0)+' votos');

  // ── Barras presidencial 2020 ──────────────────────────────────
  var sorted20 = Object.entries(res20).sort(function(a,b){return b[1]-a[1];}).slice(0,8);
  document.getElementById('hist-pres-bars').innerHTML =
    sorted20.map(function(e){
      var pct = val20 ? +(e[1]/val20*100).toFixed(2) : 0;
      return bar(e[0]+' \u00b7 '+M.Resultados.getPartidoNombre(e[0]).substring(0,22),
                 pct, pc(e[0]), fmt(e[1])+' votos');
    }).join('');

  // ── Comparativa curules ───────────────────────────────────────
  var comp = H.getComparativaCurules();
  var NIVELES_COMP = [
    {key:'senadores',          label:'Senadores',     total:32},
    {key:'diputados',          label:'Diputados',     total:158},
    {key:'diputados_nacionales',label:'Nacionales',   total:5},
    {key:'diputados_exterior', label:'Exterior',      total:7},
  ];
  var compRows = NIVELES_COMP.map(function(n){
    var d20 = comp[n.key] && comp[n.key]._2020 || {};
    var d24 = comp[n.key] && comp[n.key]._2024 || {};
    var partidos = Array.from(new Set([
      ...Object.keys(d20),...Object.keys(d24)
    ])).sort(function(a,b){return (d24[b]||0)-(d24[a]||0);}).slice(0,4);
    return '<div style="margin-bottom:.7rem">'
      +'<div style="font-size:.78rem;font-weight:700;margin-bottom:.3rem;color:var(--accent)">'+n.label+' ('+n.total+')</div>'
      +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:.25rem">'
      +partidos.map(function(p){
        var c20 = d20[p]||0, c24 = d24[p]||0, delta = c24-c20;
        return '<div style="display:flex;justify-content:space-between;font-size:.75rem;padding:.2rem .4rem;background:var(--bg3);border-radius:.25rem">'
          +'<span style="color:'+pc(p)+';font-weight:700">'+p+'</span>'
          +'<span>2020: <strong>'+c20+'</strong> &rarr; 2024: <strong>'+c24+'</strong> '
          +'<span style="color:'+(delta>0?'var(--green)':delta<0?'var(--red)':'var(--muted)')+'">('+(delta>0?'+':'')+delta+')</span></span>'
          +'</div>';
      }).join('')
      +'</div></div>';
  }).join('');
  document.getElementById('hist-curules-comp').innerHTML = compRows;

  // ── Swing grid ────────────────────────────────────────────────
  document.getElementById('hist-swing-grid').innerHTML =
    '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:.35rem">'
    +swing.map(function(p){
      var prm = p.swing.PRM||0, pld = p.swing.PLD||0, fp = p.swing.FP||0;
      var dprt = p.delta_participacion;
      return '<div style="background:var(--bg3);border:1px solid var(--border);border-radius:var(--r);padding:.45rem .65rem">'
        +'<div style="font-size:.74rem;font-weight:700;margin-bottom:.25rem">'+p.provincia+'</div>'
        +'<div style="font-size:.68rem;display:flex;flex-direction:column;gap:.1rem">'
        +['PRM','PLD','FP'].map(function(par){
          var val = p.swing[par]||0;
          return '<div style="display:flex;justify-content:space-between">'
            +'<span style="color:'+pc(par)+'">'+par+'</span>'
            +'<strong style="color:'+(val>0?'var(--green)':val<0?'var(--red)':'var(--muted)')+'">'+
            (val>0?'+':'')+val+'pp</strong></div>';
        }).join('')
        +'<div style="border-top:1px solid var(--border);margin-top:.15rem;padding-top:.15rem;display:flex;justify-content:space-between;color:var(--muted)">'
        +'<span>Part.\u0394</span><strong style="color:'+(dprt>0?'var(--green)':dprt<0?'var(--red)':'var(--muted)')+'">'+
        (dprt>0?'+':'')+dprt+'pp</strong></div>'
        +'</div></div>';
    }).join('')
    +'</div>';

  // ── Senadores 2020 grid ───────────────────────────────────────
  var pm20sen = _PROV_METRICS_SEN_2020 || [];
  document.getElementById('hist-sen-grid').innerHTML = pm20sen.map(function(prov){
    var top = prov.top3||[];
    var bars = top.map(function(t){
      return '<div style="flex:'+t.pct+';background:'+pc(t.id)+';height:100%"></div>';
    }).join('');
    return '<div class="prov-card">'
      +'<div class="prov-name">'+prov.provincia+'</div>'
      +'<div class="prov-winner" style="color:'+pc(prov.ganador)+'">'+prov.ganador+'</div>'
      +'<div class="prov-pct">'+prov.pct_ganador+'% \u00b7 ENPP '+(prov.enpp||'?')+'</div>'
      +'<div class="prov-bar">'+bars+'</div>'
      +'</div>';
  }).join('');
}


// ====== TRANSFERENCIA ======
function renderTransferencia(){
  var pipe=window._SIE_PIPELINE||{};
  var transf=pipe.transferencia||[];
  var res=pipe.transferencia_resumen||{};

  // ── KPIs ──
  document.getElementById('transf-kpis').innerHTML=
    kpi('red',  'Voto PLD no captado',  fmt(res.total_residual||92974),  'PLD 2020 → FP 2024: residual')
   +kpi('gold', 'Captable campaña',     fmt(res.total_captable||37191),  '~40% del voto PLD no capturado')
   +kpi('green','Provincias superadas', res.provincias_con_residual!=null?(32-res.provincias_con_residual):'—','FP creció más del núcleo')
   +kpi('fp',   'Provincias con oport.',res.provincias_media!=null?(res.provincias_alta+res.provincias_media):'4','prioridad ALTA+MEDIA');

  // ── Init tabs si no existen ──
  var tEl=document.getElementById('transf-tabs');
  if(tEl&&!tEl.querySelector('.tab-btn')){
    tEl.innerHTML=
      '<button class="tab-btn active" data-tab="transf-pres">Presidencial</button>'+
      '<button class="tab-btn" data-tab="transf-sen">Senadores</button>'+
      '<button class="tab-btn" data-tab="transf-dip">Diputados</button>';
    tEl.addEventListener('click',function(e){
      var btn=e.target.closest('.tab-btn'); if(!btn) return;
      tEl.querySelectorAll('.tab-btn').forEach(function(b){b.classList.remove('active');});
      btn.classList.add('active');
      ['transf-pres','transf-sen','transf-dip'].forEach(function(id){
        var p=document.getElementById(id); if(p) p.style.display='none';
      });
      var tp=document.getElementById(btn.dataset.tab); if(tp) tp.style.display='';
    });
  }

  // ── helper: render lista de alianza igual que presidencial ──
  function _renderAlianzaLista(aliData, containerEl){
    if(!containerEl) return;
    var sorted=aliData.slice().sort(function(a,b){
      return b.margen_alianza-a.margen_alianza;
    });
    var gana=sorted.filter(function(a){return a.gana_alianza;});
    var compiten=sorted.filter(function(a){return !a.gana_alianza&&a.margen_alianza>-12;});
    var lejanas=sorted.filter(function(a){return !a.gana_alianza&&a.margen_alianza<=-12;});
    containerEl.innerHTML=
      (gana.length?'<div style="font-size:.72rem;color:var(--green);font-weight:700;margin-bottom:.3rem">✅ '+gana.length+' plazas que voltea la alianza FP+PLD</div>':
       '<div style="font-size:.72rem;color:var(--muted);margin-bottom:.3rem">FP+PLD no voltea ninguna plaza en este nivel.</div>')+
      sorted.map(function(a){
        var col=a.gana_alianza?'var(--green)':a.margen_alianza>-10?'var(--gold)':'var(--muted)';
        var fpV=a.votos_fp_solo, pldV=a.votos_pld_solo;
        var total=fpV+pldV>0?fpV+pldV:1;
        var captPct=pldV>0?Math.min(100,+(( a.votos_alianza-fpV)/pldV*100).toFixed(0)):0;
        return '<div style="padding:.48rem 0;border-bottom:1px solid var(--border)">'+
          '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.22rem">'+
          '<span style="font-size:.8rem;font-weight:700">'+a.provincia+(a.circ?' · '+_cleanCirc(a.circ):'')+'</span>'+
          '<div style="display:flex;gap:.22rem">'+
          (a.gana_alianza?'<span style="font-size:.62rem;padding:.07rem .26rem;border-radius:.2rem;background:var(--green)22;color:var(--green);font-weight:700">VOLTEA</span>':'')+
          '<span style="font-size:.68rem;font-weight:700;color:'+col+'">'+(a.margen_alianza>0?'+':'')+a.margen_alianza.toFixed(1)+'pp</span></div></div>'+
          (pldV>0?'<div style="height:5px;background:var(--bg3);border-radius:3px;margin-bottom:.22rem">'+
          '<div style="height:100%;width:'+captPct+'%;background:var(--fp);border-radius:3px"></div></div>':'')+
          '<div style="display:grid;grid-template-columns:repeat(3,1fr);font-size:.64rem;color:var(--muted)">'+
          '<span>FP solo: <strong style="color:var(--fp)">'+a.pct_alianza.toFixed(1)+'%</strong></span>'+
          '<span>PRM: <strong>'+a.pct_prm.toFixed(1)+'%</strong></span>'+
          '<span>Ganancia: <strong style="color:var(--fp)">+'+fmt(a.ganancia_neta_fp||0)+'</strong></span>'+
          '</div></div>';
      }).join('');
  }

  // ── Tab Presidencial ──

  var _n=document.getElementById('nota-transferencia');if(_n)_n.innerHTML=nota(
    'C\u00f3mo leer: La barra verde muestra qu\u00e9 % del voto PLD (históricamente de Leonel, 2020) ya migr\u00f3 a FP en 2024. La parte dorada es lo captable con campa\u00f1a directa. PARCIAL = migraci\u00f3n en curso.',
    '<strong>Contexto:</strong> El voto PLD 2020 corresponde al electorado de Gonzalo Castillo (danilista). El voto de Leonel Fernández ya estaba en FP desde 2020 cuando fundó el partido. Quedan <strong style="color:var(--gold)">~93K votos PLD residuales</strong> captables con campa\u00f1a directa. Espaillat casi completa.',
    '<strong>Foco:</strong> Santiago, La Vega y Puerto Plata tienen buen factor y volumen. El D.N. tiene mucho volumen pero factor bajo \u2014 requiere mensaje espec\u00edfico.',
    {id:'M19',nombre:'Motor Transferencia Voto',desc:'Mide la migraci\u00f3n del voto PLD 2020 (peledeísta/danilista) hacia FP 2024. Factor var\u00eda por penetraci\u00f3n actual.',formula:'factor = 0.50 + 0.30 x (votos_FP / votos_PLD)\ncaptable = residual x 0.40',refs:'Aldrich (1995) \u00b7 Cox (1997) \u00b7 Auditor\u00eda v10.1'}
    );
  var presEl=document.getElementById('transf-pres');
  if(presEl){
    // L-3: Sort state
    window._transfSort = window._transfSort || {key:'prioridad', dir:1};
    var sortKeys = {
      prioridad: function(t){return t.prioridad==='ALTA'?0:t.prioridad==='MEDIA'?1:2;},
      captable:  function(t){return -(t.captable_campana||0);},
      migrado:   function(t){return -(t.migrado||0);},
      pld2020:   function(t){return -(t.pld2020_total||t.leonelista_total||0);},
      estado:    function(t){var m={superado:0,captado:1,parcial:2,disponible:3};return m[t.estado]||9;},
      provincia: function(t){return t.provincia||''}
    };
    var sk = window._transfSort.key;
    var sorted=transf.slice().sort(function(a,b){
      var va=sortKeys[sk](a), vb=sortKeys[sk](b);
      var d = typeof va==='string' ? va.localeCompare(vb) : va-vb;
      return d * window._transfSort.dir;
    });
    var thStyle='style="padding:.25rem .5rem;font-size:.62rem;font-weight:700;color:var(--muted);cursor:pointer;user-select:none;white-space:nowrap;border-bottom:1px solid var(--border);background:var(--bg3)"';
    function sortArrow(k){ return k===sk?(window._transfSort.dir>0?' ↑':' ↓'):'<span style="opacity:.3">⇅</span>'; }
    function sortClick(k){ return 'onclick="window._transfSort={key:\''+k+'\',dir:window._transfSort.key===\''+k+'\'?-window._transfSort.dir:1};renderTransferencia()"'; }
    var header='<div style="display:grid;grid-template-columns:1fr 4.5rem 4.5rem 4.5rem 3.5rem;gap:.2rem;margin-bottom:.1rem">'+
      '<div '+thStyle+' '+sortClick('provincia')+'>Provincia'+sortArrow('provincia')+'</div>'+
      '<div '+thStyle+' '+sortClick('pld2020')+' style="text-align:right">PLD 2020'+sortArrow('pld2020')+'</div>'+
      '<div '+thStyle+' '+sortClick('migrado')+' style="text-align:right">Migrado'+sortArrow('migrado')+'</div>'+
      '<div '+thStyle+' '+sortClick('captable')+' style="text-align:right">Captable'+sortArrow('captable')+'</div>'+
      '<div '+thStyle+' '+sortClick('prioridad')+' style="text-align:right">Prioridad'+sortArrow('prioridad')+'</div>'+
      '</div>';
    presEl.innerHTML = header + sorted.map(function(t){
      var colPri = t.prioridad==='ALTA'?'var(--red)':t.prioridad==='MEDIA'?'var(--gold)':'var(--muted)';
      var estCol = t.estado==='superado'?'var(--green)':t.estado==='captado'?'var(--fp)':t.estado==='parcial'?'var(--gold)':'var(--muted)';
      var captPct = (t.pld2020_total||t.leonelista_total||0)>0
        ? Math.min(100, +(t.migrado/(t.pld2020_total||t.leonelista_total)*100).toFixed(0))
        : 100;
      return '<div style="padding:.48rem 0;border-bottom:1px solid var(--border)">'+
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.25rem">'+
        '<span style="font-size:.8rem;font-weight:700">'+t.provincia+'</span>'+
        '<div style="display:flex;gap:.25rem">'+
        '<span style="font-size:.62rem;padding:.07rem .26rem;border-radius:.2rem;background:'+estCol+'22;color:'+estCol+';font-weight:700">'+t.estado.toUpperCase()+'</span>'+
        '<span style="font-size:.66rem;padding:.07rem .3rem;border-radius:.2rem;background:'+colPri+'22;color:'+colPri+';font-weight:700">'+t.prioridad+'</span>'+
        '</div></div>'+
        '<div style="height:5px;background:var(--bg3);border-radius:3px;margin-bottom:.25rem">'+
        '<div style="height:100%;width:'+captPct+'%;background:var(--fp);border-radius:3px"></div></div>'+
        '<div style="display:grid;grid-template-columns:repeat(3,1fr);font-size:.64rem;color:var(--muted)">'+
        '<span>PLD 2020: <strong>'+fmt(t.pld2020_total||t.leonelista_total||0)+'</strong></span>'+
        '<span>Migrado: <strong style="color:var(--fp)">'+fmt(t.migrado)+'</strong></span>'+
        '<span>Captable: <strong style="color:'+colPri+'">'+fmt(t.captable_campana)+'</strong></span>'+
        '</div>'+
        (t.supero_base?'<div style="font-size:.63rem;color:var(--green);margin-top:.1rem">✅ FP superó base +'+fmt(t.crecimiento_propio)+'</div>':'')+
        '</div>';
    }).join('');
  // ── Tab Senadores: transferencia histórica real PLD casilla 2020 → FP casilla 2024 ──
  // FUENTE CORRECTA: resultados_2024/2020 casilla partido puro
  // NO usar blocs.FP (= bloque completo con aliados) ni blocs.PLD (puede incluir aliados)
  var senEl=document.getElementById('transf-sen');
  if(senEl){
    var sen24m=window._PROV_METRICS_SEN||[];
    var senRes20=(window._DS_RESULTADOS_2020&&window._DS_RESULTADOS_2020.niveles&&
                  window._DS_RESULTADOS_2020.niveles.senadores)||[];
    var senRes24=(window._DS_RESULTADOS&&window._DS_RESULTADOS.niveles&&
                  window._DS_RESULTADOS.niveles.senadores)||[];
    // Build lookup maps by provincia_id
    var map20={}, map24={};
    senRes20.forEach(function(r){map20[r.provincia_id]=r;});
    senRes24.forEach(function(r){map24[r.provincia_id]=r;});
    var senTransf=sen24m.map(function(p24m){
      var r20=map20[p24m.id]||{};
      var r24=map24[p24m.id]||{};
      var vv20=r20.totales&&r20.totales.validos||1;
      var vv24=r24.totales&&r24.totales.validos||1;
      // Casilla pura — votos marcados directamente en la columna del partido
      var pld20=r20.resultados&&r20.resultados.PLD||0;
      var fp20 =r20.resultados&&r20.resultados.FP ||0;
      var fp24 =r24.resultados&&r24.resultados.FP ||0;
      var fpGrowth=fp24-fp20;
      var migrado=pld20>0?Math.min(Math.max(0,fpGrowth),pld20):0;
      var residual=pld20-migrado;
      var tasa=pld20>0?+(migrado/pld20*100).toFixed(1):0;
      var fpPresento=fp24>0;
      return {
        id:p24m.id, provincia:p24m.provincia,
        pld20:pld20, fp20:fp20, fp24:fp24,
        fpGrowth:fpGrowth, migrado:migrado,
        residual:residual, tasa:tasa,
        fpPresento:fpPresento,
        ganador24:p24m.ganador||'—'
      };
    }).filter(function(t){return t.pld20>0||t.fp24>0;})
      .sort(function(a,b){return b.pld20-a.pld20;});

    var totalPLD20S=senTransf.reduce(function(s,t){return s+t.pld20;},0);
    var totalMigS=senTransf.reduce(function(s,t){return s+t.migrado;},0);
    var totalResidS=senTransf.reduce(function(s,t){return s+t.residual;},0);
    var sinCandidato=senTransf.filter(function(t){return !t.fpPresento;}).length;

    senEl.innerHTML=
      '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:.4rem;margin-bottom:.6rem">'+
      '<div class="kpi-card kpi-purple"><div class="kpi-val">'+fmt(totalPLD20S)+'</div><div class="kpi-lbl">PLD 2020</div></div>'+
      '<div class="kpi-card kpi-fp"><div class="kpi-val">'+fmt(totalMigS)+'</div><div class="kpi-lbl">Migrado a FP</div></div>'+
      '<div class="kpi-card kpi-gold"><div class="kpi-val">'+fmt(totalResidS)+'</div><div class="kpi-lbl">Aún no migrado</div></div>'+
      '<div class="kpi-card kpi-red"><div class="kpi-val">'+sinCandidato+'</div><div class="kpi-lbl">Sin candidato FP</div></div>'+
      '</div>'+
      '<div style="font-size:.69rem;color:var(--muted);margin-bottom:.45rem;padding:.3rem .4rem;background:var(--bg3);border-radius:var(--r)">'+
      'Votos que el PLD obtuvo en senadores 2020 y cuántos migró a FP para 2024. El voto PLD 2020 en senadores representaba al electorado danilista/peledeísta. El voto de Leonel Fernández ya estaba en la casilla FP desde 2020. '+

      'En provincias donde FP participó como aliado (no candidato_base), se usan los votos reales de la casilla FP.</div>'+
      senTransf.map(function(t){
        var captPct=t.pld20>0?Math.min(100,Math.round(t.migrado/t.pld20*100)):0;
        var col=t.tasa>=80?'var(--green)':t.tasa>=40?'var(--fp)':t.tasa>=10?'var(--gold)':'var(--muted)';
        var residCol=t.residual>50000?'var(--red)':t.residual>20000?'var(--gold)':'var(--muted)';
        // Badge: si FP sacó pocos votos en casilla vs su base 2020, fue aliado/cedió
        var fpBajoBase = t.fp24 < t.fp20 * 0.6;
        var rolBadge=!t.fpPresento
          ? '<span style="font-size:.62rem;padding:.07rem .26rem;border-radius:.2rem;background:var(--muted)22;color:var(--muted);font-weight:700">SIN VOTOS</span>'
          : (fpBajoBase
              ? '<span style="font-size:.62rem;padding:.07rem .26rem;border-radius:.2rem;background:var(--pld)22;color:var(--pld);font-weight:700">ALIADO</span>'
              : '');
        return '<div style="padding:.48rem 0;border-bottom:1px solid var(--border)">'+
          '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.22rem">'+
          '<span style="font-size:.8rem;font-weight:700">'+t.provincia+'</span>'+
          '<div style="display:flex;gap:.22rem">'+
          rolBadge+
          '<span style="font-size:.68rem;font-weight:700;color:'+col+'">'+t.tasa+'% migrado</span>'+
          '</div></div>'+
          '<div style="height:5px;background:var(--bg3);border-radius:3px;margin-bottom:.22rem">'+
          '<div style="height:100%;width:'+captPct+'%;background:var(--fp);border-radius:3px"></div></div>'+
          '<div style="display:grid;grid-template-columns:repeat(3,1fr);font-size:.64rem;color:var(--muted)">'+
          '<span>PLD 2020: <strong style="color:var(--pld)">'+fmt(t.pld20)+'</strong></span>'+
          '<span>Migrado: <strong style="color:var(--fp)">'+fmt(t.migrado)+'</strong></span>'+
          '<span>Residual: <strong style="color:'+residCol+'">'+fmt(t.residual)+'</strong></span>'+
          '</div></div>';
      }).join('');
  }

  // ── Tab Diputados: transferencia histórica real PLD 2020 → FP 2024 por circunscripción ──
  var dipEl=document.getElementById('transf-dip');
  if(dipEl){
    var dip20=window._PROV_METRICS_DIP_2020||[];
    var dip24=window._PROV_METRICS_DIP||[];

    // Match by provincia_id: DIP 2020 es por provincia, DIP 2024 es por circunscripción
    var dipTransf=dip24.map(function(d24){
      // Find corresponding 2020 province entry
      var d20=dip20.find(function(d){return d.provincia_id===d24.provincia_id||d.id===d24.provincia_id;});
      var circCount=dip24.filter(function(x){return x.provincia_id===d24.provincia_id;}).length||1;
      // Distribute 2020 votes proportionally across circuits
      var pld20_prov=d20&&d20.blocs&&d20.blocs.PLD||0;
      var fp20_prov=d20&&d20.blocs&&d20.blocs.FP||0;
      var pld20=Math.round(pld20_prov/circCount);
      var fp20=Math.round(fp20_prov/circCount);
      var fp24=d24.blocs&&d24.blocs.FP||0;
      var fpGrowth=fp24-fp20;
      var migrado=pld20>0?Math.min(Math.max(0,fpGrowth),pld20):0;
      var residual=pld20-migrado;
      var tasa=pld20>0?+(migrado/pld20*100).toFixed(1):0;
      return {
        id:d24.id, provincia:d24.provincia, circ:d24.circ,
        pld20:pld20, fp20:fp20, fp24:fp24,
        migrado:migrado, residual:residual, tasa:tasa,
        ganador24:d24.ganador||'—',
        pct_fp:d24.pct_fp||0, pct_prm:d24.pct_prm||0
      };
    }).sort(function(a,b){return b.tasa-a.tasa;});

    var totalPLD20D=dipTransf.reduce(function(s,t){return s+t.pld20;},0);
    var totalMigD=dipTransf.reduce(function(s,t){return s+t.migrado;},0);
    var totalResidD=dipTransf.reduce(function(s,t){return s+t.residual;},0);
    var altaTasa=dipTransf.filter(function(t){return t.tasa>=70;}).length;

    dipEl.innerHTML=
      '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:.4rem;margin-bottom:.6rem">'+
      '<div class="kpi-card kpi-purple"><div class="kpi-val">'+fmt(totalPLD20D)+'</div><div class="kpi-lbl">PLD 2020 (~dist.)</div></div>'+
      '<div class="kpi-card kpi-fp"><div class="kpi-val">'+fmt(totalMigD)+'</div><div class="kpi-lbl">Migrado a FP</div></div>'+
      '<div class="kpi-card kpi-gold"><div class="kpi-val">'+fmt(totalResidD)+'</div><div class="kpi-lbl">Aún no migrado</div></div>'+
      '<div class="kpi-card kpi-green"><div class="kpi-val">'+altaTasa+'/45</div><div class="kpi-lbl">Circ. ≥70% migrado</div></div>'+
      '</div>'+
      '<div style="font-size:.69rem;color:var(--muted);margin-bottom:.45rem;padding:.3rem .4rem;background:var(--bg3);border-radius:var(--r)">'+
      'Transferencia estimada de voto PLD 2020 hacia FP 2024 por circunscripción. Los votos 2020 se distribuyen proporcionalmente entre circunscripciones de la misma provincia. '+
      'Ordenado por tasa de migración.</div>'+
      dipTransf.slice(0,20).map(function(t){
        var captPct=t.pld20>0?Math.min(100,Math.round(t.migrado/t.pld20*100)):0;
        var col=t.tasa>=80?'var(--green)':t.tasa>=40?'var(--fp)':t.tasa>=10?'var(--gold)':'var(--muted)';
        return '<div style="padding:.4rem 0;border-bottom:1px solid var(--border)">'+
          '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.18rem">'+
          '<span style="font-size:.77rem;font-weight:700">'+t.provincia+' · C'+t.circ+'</span>'+
          '<span style="font-size:.68rem;font-weight:700;color:'+col+'">'+t.tasa+'% migrado</span>'+
          '</div>'+
          '<div style="height:4px;background:var(--bg3);border-radius:3px;margin-bottom:.18rem">'+
          '<div style="height:100%;width:'+captPct+'%;background:var(--fp);border-radius:3px"></div></div>'+
          '<div style="display:grid;grid-template-columns:repeat(3,1fr);font-size:.63rem;color:var(--muted)">'+
          '<span>PLD ~2020: <strong style="color:var(--pld)">'+fmt(t.pld20)+'</strong></span>'+
          '<span>FP 2024: <strong style="color:var(--fp)">'+fmt(t.fp24)+'</strong></span>'+
          '<span>Residual: <strong>'+fmt(t.residual)+'</strong></span>'+
          '</div></div>';
      }).join('')+
      (dipTransf.length>20?'<div style="font-size:.65rem;color:var(--muted);text-align:center;padding:.4rem">+'+(dipTransf.length-20)+' circunscripciones más</div>':'');
  }
}
}

// ====== POTENCIAL ======
var _POT_NIVEL='presidencial';
function renderPotencial(){
  var pipe=window._SIE_PIPELINE||{};
  var ds=_getProvDS(_POT_NIVEL);
  var proy=pipe.proyeccion_territorial||[];
  var proyMap={};
  proy.forEach(function(p){proyMap[p.provincia_id]=p;});
  var agenda=M.Movilizacion.agenda(_POT_NIVEL,'FP')||[];
  var fpGana=ds.filter(function(p){return p.ganador==='FP'||p.bloque_coalicion==='FP-coalicion';}).length;
  var agendaMap={};
  agenda.forEach(function(a){agendaMap[a.provincia_id||a.id]=a;});

  var lista;
  if(_POT_NIVEL==='presidencial'){
    // B3 fix v11: usar M14 (MotorPotencial.scoreOfensivo) en lugar de M26 (prioridad)
    // M14 produce: score_ofensivo [0-100], categoria_ofensiva (objetivo_prioritario/secundario/difícil/consolidada)
    // que es una dimensión analítica diferente al ranking de inversión de campaña (M26)
    var m14=M.Potencial.scoreOfensivo(ds,'FP')||[];
    var nPrioritario=m14.filter(function(p){return p.categoria_ofensiva==='objetivo_prioritario';}).length;
    var nSecundario=m14.filter(function(p){return p.categoria_ofensiva==='objetivo_secundario';}).length;
    var nConsolidada=m14.filter(function(p){return p.categoria_ofensiva==='consolidada';}).length;
    document.getElementById('pot-kpis').innerHTML=
      kpi('fp',   'Consolidadas FP',   nConsolidada,    'ya gana · defender')
     +kpi('red',  'Obj. prioritario',  nPrioritario,    'score ≥ 60 · mayor potencial')
     +kpi('gold', 'Obj. secundario',   nSecundario,     'score 40-60 · viable campaña')
     +kpi('blue', 'Difícil/Perdida',   m14.length-nPrioritario-nSecundario-nConsolidada, 'margen amplio');
    lista=m14.map(function(pm){
      var pr=proyMap[pm.id]||{};
      var catColor=pm.categoria_ofensiva==='consolidada'?'var(--fp)':
                   pm.categoria_ofensiva==='objetivo_prioritario'?'var(--red)':
                   pm.categoria_ofensiva==='objetivo_secundario'?'var(--gold)':'var(--muted)';
      var catLabel=pm.categoria_ofensiva==='consolidada'?'GANADA':
                   pm.categoria_ofensiva==='objetivo_prioritario'?'PRIORITARIO':
                   pm.categoria_ofensiva==='objetivo_secundario'?'SECUNDARIO':
                   pm.categoria_ofensiva==='difícil'?'DIFÍCIL':'PERDIDA';
      return {
        lbl:pm.provincia||pm.nombre||pm.id,
        col:catColor,
        tag:catLabel,
        fp24:(pm.pct_fp||pm.pct_target||0)+'%',
        fp28:pr.pct_fp_proy?pr.pct_fp_proy.toFixed(1)+'%':'—',
        swing:pr.swing_local_fp?(pr.swing_local_fp>0?'+':'')+pr.swing_local_fp.toFixed(1)+'pp':'—',
        score:(pm.score_ofensivo||0).toFixed(0),
        gap:fmt(pm.votos_gap_fp||0),
        accion:'Margen: '+(pm.margen_pp||0)+'pp · Abst: '+(pm.abstencion||0).toFixed(0)+'%'
      };
    });
  } else {
    // SEN / DIP: use real data from ds (prov_metrics) + agenda
    // Proyección FP 2028: baseline 2024 + swing histórico × 0.35 (mismo factor que nivel presidencial)
    var swingNac = _calcSwingNacional();
    var swingFP  = swingNac.FP ? swingNac.FP.delta * 0.35 : 0;
    var resNivel=M.Movilizacion.resumenMultinivel('FP').find(function(r){return r.nivel===_POT_NIVEL;})||{};
    document.getElementById('pot-kpis').innerHTML=
      kpi('fp',  'FP ya gana',      fpGana+'/'+ds.length,         _POT_NIVEL+' · 2024')
     +kpi('red', 'Alta factibilidad',resNivel.plazas_alta||0,      '< 20% abstencionistas')
     +kpi('gold','Media factibilidad',resNivel.plazas_media||0,    '20-40% abstencionistas')
     +kpi('blue','Por conquistar',  resNivel.plazas_perdidas||agenda.length,'plazas que no gana FP');

    // Build lista from ds + agenda — ordered: FP gana first (defensive), then lost by factibilidad
    var ganadas=ds.filter(function(p){return p.ganador==='FP'||p.bloque_coalicion==='FP-coalicion';});
    var perdidas=agenda.slice().sort(function(a,b){
      var ord={alta:0,media:1,baja:2};
      return (ord[a.factibilidad]||2)-(ord[b.factibilidad]||2)||(a.votos_gap||0)-(b.votos_gap||0);
    });
    lista=[].concat(
      perdidas.map(function(a){
        var fpV=a.votos_objetivo||0;  // ya viene de agenda() que aplica casilla fallback
        var ganV=a.votos_ganador||0;
        var total=a.inscritos||1;
        var pctFP=total>0?+(fpV/total*100).toFixed(1):0;
        var fpBase = fpV > 0 ? (fpV / total * 100) : 0;
        var fp28Val = +(fpBase + swingFP).toFixed(1);
        var cF=a.factibilidad==='alta'?'var(--green)':a.factibilidad==='media'?'var(--gold)':'var(--red)';
        var lbl=a.provincia+(a.circ?' · '+_cleanCirc(a.circ):a.provincia_id?'':' ('+a.nivel+')');
        return {
          lbl:lbl, col:cF, tag:a.factibilidad.toUpperCase(),
          fp24:pctFP+'%',
          fp28: fp28Val+'%',
          swing:'Gap: '+fmt(a.votos_gap||0),
          score:'',
          gap:fmt(a.votos_gap||0),
          accion:'Movilizar '+a.pct_abstencionistas_a_movilizar+'% · Ganador: '+a.ganador_actual
        };
      }),
      ganadas.map(function(p){
        var total=p.votos_validos||1;
        var fpV=p.blocs&&p.blocs.FP||0;
        var pctFP=+(fpV/total*100).toFixed(1);
        var fp28Val=+(pctFP+swingFP).toFixed(1);
        var risk=p.riesgo_nivel||'baja';
        var rCol=risk==='alta'?'var(--red)':risk==='media'?'var(--gold)':'var(--green)';
        var lbl=p.provincia+(p.circ?' · C'+p.circ:'');
        return {
          lbl:lbl, col:rCol, tag:'GANADA',
          fp24:pctFP+'%',
          fp28:fp28Val+'%',
          swing:'Margen: '+(p.margen_pp||'—')+'pp',
          score:'',
          gap:'', accion:'Riesgo: '+risk.toUpperCase()
        };
      })
    );
  }


  var _n=document.getElementById('nota-potencial');if(_n)_n.innerHTML=nota(
    'C\u00f3mo leer: Provincias ordenadas por score de oportunidad real (0-100). PRIORITARIO = score alto. SECUNDARIO = viable. Las columnas muestran % FP actual y proyecci\u00f3n 2028.',
    'El score combina tama\u00f1o del padr\u00f3n, competitividad actual y volatilidad hist\u00f3rica. No es lo mismo que d\u00f3nde FP gana m\u00e1s \u2014 es d\u00f3nde cada peso rinde m\u00e1s.',
    '<strong>Uso:</strong> Este ranking es el mapa de inversi\u00f3n de campa\u00f1a. \u00dasalo junto con Oportunidades para decidir d\u00f3nde actuar.',
    {id:'M14+M22',nombre:'Motor Potencial + Motor Prioridad',desc:'Score ofensivo = oportunidad real de ganar. Prioridad = retorno de inversi\u00f3n.',formula:'score_ofensivo = (1-margen/100)x60 + (abstencion/100)x40\nprioridad = pivot(40%) + gap(30%) + prob(30%)',refs:'Jacobson (2004) \u00b7 Taagepera-Shugart ENPP'}
    );
  document.getElementById('potencial-lista').innerHTML =
    _POT_NIVEL === 'presidencial'
      ? _renderPotencialTabla(lista)
      : lista.map(function(pm,i){
          return '<div style="padding:.45rem 0;border-bottom:1px solid var(--border)">'+
            '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.2rem">'+
            '<span style="font-size:.8rem;font-weight:700"><span style="color:var(--muted);font-size:.66rem;margin-right:.25rem">'+(i+1)+'</span>'+pm.lbl+'</span>'+
            '<span style="font-size:.66rem;font-weight:700;padding:.08rem .3rem;border-radius:.2rem;background:'+pm.col+'22;color:'+pm.col+'">'+pm.tag+'</span></div>'+
            '<div style="display:grid;grid-template-columns:repeat(4,1fr);font-size:.65rem;color:var(--muted);margin-bottom:.15rem">'+
            '<span>FP 24: <strong style="color:var(--fp)">'+pm.fp24+'</strong></span>'+
            '<span>FP 28: <strong>'+pm.fp28+'</strong></span>'+
            '<span>'+pm.swing+'</span>'+
            '<span>Score: <strong style="color:var(--accent)">'+pm.score+'</strong></span>'+
            '</div>'+
            '<div style="font-size:.63rem;color:var(--muted)">'+pm.accion+'</div>'+
            '</div>';
        }).join('');
}

function _renderPotencialTabla(lista) {
  var cols = [
    {k:'lbl',   label:'Provincia',   title:'Ordenar por nombre'},
    {k:'tag',   label:'Categoría',   title:'Ordenar por categoría'},
    {k:'fp24n', label:'FP 2024 %',   title:'Ordenar por resultado 2024'},
    {k:'fp28n', label:'FP 2028 proj',title:'Ordenar por proyección 2028'},
    {k:'swingN',label:'Swing pp',    title:'Ordenar por swing'},
    {k:'scoreN',label:'Score',       title:'Ordenar por score ofensivo'},
    {k:'gapN',  label:'Gap votos',   title:'Ordenar por gap de votos'},
    {k:'accion',label:'Contexto',    title:'Ordenar por acción'},
  ];
  // Enriquecer lista con valores numéricos para sort
  var data = lista.map(function(pm){
    return {
      lbl:    pm.lbl,
      tag:    pm.tag,
      tagCol: pm.col,
      fp24:   pm.fp24,
      fp24n:  parseFloat(pm.fp24)||0,
      fp28:   pm.fp28,
      fp28n:  parseFloat(pm.fp28)||0,
      swing:  pm.swing,
      swingN: parseFloat(pm.swing)||0,
      score:  pm.score,
      scoreN: parseFloat(pm.score)||0,
      gap:    pm.gap,
      gapN:   parseFloat((pm.gap||'').replace(/[^0-9.-]/g,''))||0,
      accion: pm.accion
    };
  });

  // Register render function for re-sort
  if (!window._sieSortRender) window._sieSortRender = {};
  window._sieSortRender['pot-table'] = function(){
    var el = document.getElementById('potencial-lista');
    if (el) el.innerHTML = _renderPotencialTabla(lista);
  };

  var st = window._sieSortState['pot-table'] || { key: 'scoreN', dir: -1 };
  window._sieSortState['pot-table'] = st;
  var sorted = data.slice().sort(function(a,b){
    var va = a[st.key], vb = b[st.key];
    if (typeof va === 'string') return st.dir * va.localeCompare(String(vb));
    return st.dir * ((+va||0)-(+vb||0));
  });

  var thS = 'style="padding:.38rem .5rem;font-size:.68rem;font-weight:700;color:var(--muted);text-align:left;border-bottom:1px solid var(--border);cursor:pointer;white-space:nowrap;user-select:none;background:var(--bg2)"';
  var tdS = 'style="padding:.3rem .5rem;font-size:.71rem;border-bottom:1px solid var(--border)22"';
  var hdrs = cols.map(function(c){
    var arrow = c.k === st.key ? (st.dir > 0 ? ' ↑' : ' ↓') : ' <span style="opacity:.35">⇅</span>';
    return '<th '+thS+' onclick="sieSort(\'pot-table\',\''+c.k+'\')" title="'+c.title+'">'+c.label+arrow+'</th>';
  }).join('');
  var rows = sorted.map(function(r){
    return '<tr>'+
      '<td '+tdS+' style="font-weight:600">'+r.lbl+'</td>'+
      '<td '+tdS+'><span style="font-size:.64rem;font-weight:700;padding:.08rem .28rem;border-radius:.2rem;background:'+r.tagCol+'22;color:'+r.tagCol+'">'+r.tag+'</span></td>'+
      '<td '+tdS+'><strong style="color:var(--fp)">'+r.fp24+'</strong></td>'+
      '<td '+tdS+'><strong>'+r.fp28+'</strong></td>'+
      '<td '+tdS+' style="color:'+(r.swingN>0?'var(--green)':'var(--red)')+'">'+r.swing+'</td>'+
      '<td '+tdS+'><strong style="color:var(--accent)">'+r.score+'</strong></td>'+
      '<td '+tdS+' style="color:var(--muted);font-size:.68rem">'+r.gap+'</td>'+
      '<td '+tdS+' style="color:var(--muted);font-size:.65rem">'+r.accion+'</td>'+
    '</tr>';
  }).join('');
  return '<div style="font-size:.69rem;color:var(--muted);margin-bottom:.35rem">'+sorted.length+' provincias · clic en encabezado para ordenar</div>'+
    '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse"><thead><tr>'+hdrs+'</tr></thead><tbody>'+rows+'</tbody></table></div>';
}

window.setPotNivel=function(n){_POT_NIVEL=n;renderPotencial();};
// ====== MOVILIZACIÓN ======
var _MOV_NIVEL='presidencial', _MOV_PARTIDO='FP';
function renderMovilizacion(){
  var agenda=M.Movilizacion.agenda(_MOV_NIVEL,_MOV_PARTIDO)||[];
  var res=M.Movilizacion.resumenMultinivel(_MOV_PARTIDO)||[];
  var tit=document.getElementById('mov-card-title');
  if(tit) tit.textContent='Plazas recuperables — '+_MOV_PARTIDO+' · '+_MOV_NIVEL;
  var resNivel=res.find(function(r){return r.nivel===_MOV_NIVEL;})||{};
  document.getElementById('mov-kpis').innerHTML=
    kpi('fp',   'Plazas perdidas',   resNivel.plazas_perdidas||agenda.length, _MOV_NIVEL)
   +kpi('green','Alta factibilidad', resNivel.plazas_alta||0,  '< 20% abstencionistas')
   +kpi('gold', 'Media factibilidad',resNivel.plazas_media||0, '20-40% abstencionistas')
   +kpi('red',  'Baja factibilidad', resNivel.plazas_baja||0,  '> 40% abstencionistas');
  if(!agenda.length){
    document.getElementById('movilizacion-list').innerHTML=
      '<div style="padding:1.5rem;text-align:center;color:var(--muted)">'+
      '<div style="font-size:1.5rem;margin-bottom:.5rem">✅</div>'+
      '<div style="font-size:.85rem;font-weight:700">'+_MOV_PARTIDO+' gana todas las plazas</div>'+
      '<div style="font-size:.72rem;margin-top:.25rem">'+_MOV_NIVEL+'</div></div>';
    document.getElementById('mov-resumen').innerHTML='';
    return;
  }

  var _n=document.getElementById('nota-movilizacion');if(_n)_n.innerHTML=nota(
    'C\u00f3mo leer: Cada tarjeta es una provincia donde FP no gana. Abstencionistas a movilizar = % de los que no votaron que FP necesitar\u00eda activar para ganar. ALTA < 20%, MEDIA 20-40%, BAJA > 40%.',
    'La mayor\u00eda de provincias tienen factibilidad alta o media \u2014 el potencial abstencionista es suficiente si se activa eficientemente. Santo Domingo solo necesita 9.5% de sus abstencionistas.',
    '<strong>Acci\u00f3n:</strong> Provincias ALTA = movilizaci\u00f3n pura (llevar gente a votar). Provincias BAJA = persuasi\u00f3n, no solo movilizaci\u00f3n. Son estrategias distintas.',
    {id:'M15',nombre:'Motor Movilizaci\u00f3n',desc:'Calcula cu\u00e1ntos abstencionistas necesita activar FP para revertir el resultado en cada plaza.',formula:'votos_nec = ceil((ganador - fp)/2) + 1\nfactibilidad = votos_nec / abstencionistas x 100',refs:'Leighley & Nagler (2013) Who Votes Now?'}
    );
  document.getElementById('movilizacion-list').innerHTML=agenda.map(function(a){
    var colF=a.factibilidad==='alta'?'var(--green)':a.factibilidad==='media'?'var(--gold)':'var(--red)';
    var w=Math.min(100,a.pct_abstencionistas_a_movilizar||0);
    // L-8: label limpio sin código de provincia redundante en el número de circ
    var circNum = _MOV_NIVEL==='diputados' ? 'C'+String(a.circ||'').replace(/^\d{2}-?C?/i,'').replace(/^C/i,'') : '';
    var lbl = _MOV_NIVEL==='diputados'
      ? (a.provincia||'—')+' · '+circNum
      : (a.provincia||'—');
    return '<div class="mov-card">'+
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.25rem">'+
      '<span style="font-size:.8rem;font-weight:700">'+lbl+'</span>'+
      '<span class="fact-'+a.factibilidad+'" style="font-size:.7rem;font-weight:700">'+a.factibilidad.toUpperCase()+'</span></div>'+
      '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;font-size:.65rem;color:var(--muted);margin-bottom:.2rem">'+
      '<span>Ganador: <strong style="color:'+pc(a.ganador_actual)+'">'+a.ganador_actual+'</strong></span>'+
      '<span>Gap: <strong>'+fmt(a.votos_gap)+'</strong></span>'+
      '<span>Necesarios: <strong>'+fmt(a.votos_necesarios)+'</strong></span>'+
      '</div>'+
      '<div style="font-size:.63rem;color:var(--muted);margin-bottom:.16rem">'+
      'Abstencionistas a movilizar: <strong style="color:'+colF+'">'+a.pct_abstencionistas_a_movilizar+'%</strong> de '+a.participacion_actual+'% participación</div>'+
      '<div style="height:4px;background:var(--bg2);border-radius:2px">'+
      '<div style="height:100%;width:'+w+'%;background:'+colF+';border-radius:2px"></div></div>'+
      '</div>';
  }).join('');
  document.getElementById('mov-resumen').innerHTML=
    '<div style="font-size:.7rem;font-weight:700;color:var(--muted);margin-bottom:.35rem">Resumen multinivel — '+_MOV_PARTIDO+'</div>'+
    res.map(function(r){
      var activo=r.nivel===_MOV_NIVEL;
      return '<div style="display:flex;justify-content:space-between;padding:.22rem 0;border-bottom:1px solid var(--border);font-size:.72rem;'+(activo?'color:var(--fp);font-weight:700':'')+'">'+
        '<span>'+r.nivel+'</span>'+
        '<span>'+r.plazas_perdidas+' plazas · Alta:'+r.plazas_alta+' Media:'+r.plazas_media+' Baja:'+r.plazas_baja+'</span>'+
        '</div>';
    }).join('');
}

// ====== OPORTUNIDADES ======
function renderOportunidades(){
  var pipe=window._SIE_PIPELINE||{};
  var ranking=(pipe.prioridad&&pipe.prioridad.ranking)?pipe.prioridad.ranking:[];
  var alianza=pipe.alianza_datos||[];
  var proy=pipe.proyeccion_territorial||[];
  var aliMap={};
  alianza.forEach(function(a){aliMap[a.id]=a;});
  var proyMap={};
  proy.forEach(function(p){proyMap[p.provincia_id]=p;});
  var ds=_getProvDS('presidencial');
  var fpGanadas=ds.filter(function(p){return p.ganador==='FP';});
  var oportunidades=ranking.map(function(pm){
    var pr=proyMap[pm.id]||{};
    var al=aliMap[pm.id]||{};
    var m=pm.margen_pp||0;
    return Object.assign({},pm,{
      nivel:m<5?'INMEDIATA':m<12?'VIABLE':m<20?'POSIBLE':'LEJANA',
      fp28:pr.pct_fp_proy, prm28:pr.pct_prm_proy,
      gana_al:al.gana_alianza, ganancia_al:al.ganancia_neta_fp,
      pct_alianza_fp: al.pct_alianza!=null ? al.pct_alianza : null,
      pct_prm: al.pct_prm!=null ? al.pct_prm : pm.pct_prm
    });
  });
  var nInm=oportunidades.filter(function(p){return p.nivel==='INMEDIATA';}).length;
  var nVia=oportunidades.filter(function(p){return p.nivel==='VIABLE';}).length;
  var voltea=alianza.filter(function(a){return a.gana_alianza;}).length;

  var nPosible=oportunidades.filter(function(p){return p.nivel==='POSIBLE';}).length;
  document.getElementById('opp-kpis').innerHTML=
    kpi('green','Inm. (<5pp)',   nInm   , nInm===0   ?'Con alianza: ver abajo'  :'margen < 5pp — alta prioridad')
   +kpi('gold', 'Viables (5-12pp)',nVia , nVia===0   ?'Con alianza aumentan'    :'margen 5-12pp — campaña activa')
   +kpi('orange','Posibles (12-20pp)',nPosible,nPosible===0?'Requieren alianza + trabajo':'margen 12-20pp — largo plazo')
   +kpi('fp',   'Alianza voltea',voltea , voltea===0 ?'Sin alianza FP no voltea':'provincias FP+PLD > PRM');


  var _n=document.getElementById('nota-oportunidades');if(_n)_n.innerHTML=nota(
    'C\u00f3mo leer: Provincias por nivel de oportunidad. INMEDIATA = margen <5pp. VIABLE = 5-12pp. POSIBLE = 12-20pp. El badge alianza indica que FP+PLD voltear\u00eda esa provincia.',
    'Las provincias INMEDIATAS y VIABLES son donde se decide la elecci\u00f3n. Con alianza FP+PLD varios POSIBLE se convierten en VIABLE.',
    '<strong>Diferencia con Potencial:</strong> Oportunidades = vista estrat\u00e9gica. Potencial = ranking de inversi\u00f3n. Usa ambas juntas.',
    {id:'M14+M24',nombre:'Motor Oportunidades + Alianza',desc:'Oportunidad = qu\u00e9 tan cerca est\u00e1 FP de ganar. Alianza = cuanto suma FP+PLD sobre ese baseline.',formula:'INMEDIATA(<5pp), VIABLE(5-12pp), POSIBLE(12-20pp)\nalianza_gana = (pct_FP + pct_PLD x 80.9%) > pct_PRM',refs:'Cox (1997) \u00b7 retenci\u00f3n 80.9% auditada v10.1'}
    );
  document.getElementById('opp-lista').innerHTML=oportunidades.map(function(pm){
    var col=pm.nivel==='INMEDIATA'?'var(--green)':pm.nivel==='VIABLE'?'var(--gold)':pm.nivel==='POSIBLE'?'var(--orange)':'var(--red)';
    return '<div style="padding:.5rem 0;border-bottom:1px solid var(--border)">'+
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.25rem">'+
      '<span style="font-size:.82rem;font-weight:700">'+pm.nombre+'</span>'+
      '<div style="display:flex;gap:.25rem">'+
      /* alianza badge moved to vista Alianzas */
      '<span style="font-size:.68rem;font-weight:700;padding:.08rem .32rem;border-radius:.2rem;background:'+col+'22;color:'+col+'">'+pm.nivel+'</span></div></div>'+
      '<div style="display:grid;grid-template-columns:repeat(3,1fr);font-size:.66rem;color:var(--muted)">'+
      '<span>FP 2024: <strong style="color:var(--fp)">'+pm.pct_fp+'%</strong></span>'+
      '<span>2028: <strong>'+(pm.fp28?pm.fp28.toFixed(1):'-')+'%</strong></span>'+
      '<span>Brecha: <strong style="color:'+col+'">'+pm.margen_pp+'pp</strong></span>'+
      '</div>'+
      /* alianza detail → ver sección Alianzas */
      '</div>';
  }).join('');

  document.getElementById('opp-ganadas').innerHTML=fpGanadas.map(function(pm){
    var risk=pm.riesgo_nivel||'baja';
    var col=risk==='alta'?'var(--red)':risk==='media'?'var(--gold)':'var(--green)';
    return '<div style="padding:.4rem 0;border-bottom:1px solid var(--border)">'+
      '<div style="display:flex;justify-content:space-between;align-items:center">'+
      '<span style="font-size:.8rem;font-weight:700">'+pm.provincia+'</span>'+
      '<span style="font-size:.67rem;font-weight:700;color:'+col+'">Riesgo: '+risk.toUpperCase()+'</span></div>'+
      '<div style="font-size:.66rem;color:var(--muted)">FP: '+( pm.pct_fp||0)+'% · Margen: '+(pm.margen_pp||0)+'pp</div>'+
      '</div>';
  }).join('');
  // L-7: footer note referencing Alianzas section
  var oppEl = document.getElementById('opp-lista');
  if(oppEl) oppEl.insertAdjacentHTML('afterend',
    '<div style="font-size:.68rem;color:var(--muted);padding:.5rem .75rem;background:var(--bg3);border-radius:var(--r);margin-top:.5rem;border-left:3px solid var(--fp)">'+
    '🤝 Para ver el impacto de la alianza FP+PLD por provincia, ir a <strong style="color:var(--fp)">Inteligencia FP → Alianzas</strong></div>');
}

// ====== ALIANZAS ======
function renderAlianzas(){
  var pipe=window._SIE_PIPELINE||{};
  var alianza=pipe.alianza_datos||[];
  var resumen=pipe.alianza_resumen||{};
  var gana=alianza.filter(function(a){return a.gana_alianza;});
  var compiten=alianza.filter(function(a){return !a.gana_alianza&&(a.pct_alianza||0)>40;});
  var totalGanancia=alianza.reduce(function(s,a){return s+(a.ganancia_neta_fp||0);},0);
  document.getElementById('alianzas-kpis').innerHTML=
    kpi('green','Voltea presidencial', gana.length,        'FP+PLD > PRM')
   +kpi('gold', 'Compiten fuerte',     compiten.length,    '>40% — competencia real con PRM')
   +kpi('fp',   'Retención FP+PLD',   '80.9%',            'histórico auditado v10.1')
   +kpi('blue', 'Ganancia neta FP',   fmt(totalGanancia), 'votos adicionales');

  var _n=document.getElementById('nota-alianzas');if(_n)_n.innerHTML=nota(
    'C\u00f3mo leer: Margen = diferencia entre FP+PLD y PRM en esa provincia. +pp = alianza gana. VOLTEA = alianza supera al PRM. La barra muestra qu\u00e9 % del voto PLD se retuvo en FP.',
    'Retenci\u00f3n hist\u00f3rica: 80.9% \u2014 de cada 10 votos PLD, ~8 migran a FP con alianza formal. El efecto var\u00eda por provincia.',
    '<strong>La alianza no basta sola.</strong> FP+PLD no llega al 50.1% nacional incluso con 80.9% de retenci\u00f3n. La alianza acerca pero requiere trabajo territorial adicional.',
    {id:'M24',nombre:'Motor Alianza Electoral',desc:'Calcula el impacto neto de la alianza FP+PLD por provincia usando retenci\u00f3n hist\u00f3rica auditada.',formula:'votos_alianza = votos_FP + (votos_PLD x retenci\u00f3n_prov)\nretenci\u00f3n_prov = 0.809 x (0.85 + 0.15 x compatibilidad)',refs:'Cox (1997) \u00b7 Golder (2006) \u00b7 Auditor\u00eda v10.1'}
    );
  renderAlianzasPres();
  _calcEncabezado();
}

function _calcEncabezado(){
  var ds=_PROV_METRICS_PRES||[];
  var fpProvs=ds.filter(function(p){return p.pct_fp&&p.pct_fp>0;}).length;
  var pldProvs=ds.filter(function(p){
    return p.blocs&&(p.blocs.PLD||0)>0 && (p.blocs.FP||0)<(p.blocs.PLD||0);
  }).length;
  var fpVDuro=ds.reduce(function(s,p){return s+(p.blocs&&p.blocs.FP?p.blocs.FP:0);},0);
  var pldVDuro=ds.reduce(function(s,p){return s+(p.blocs&&p.blocs.PLD?p.blocs.PLD:0);},0);
  var pipe=window._SIE_PIPELINE||{};
  var alianza=pipe.alianza_datos||[];
  var provinciasClave=alianza.filter(function(a){return !a.era_ganada_fp;});
  var fpStrClave=provinciasClave.filter(function(a){
    var ds2=_PROV_METRICS_PRES||[];
    var p=ds2.find(function(x){return x.id===a.id;})||{};
    return (p.blocs&&p.blocs.FP||0)>(p.blocs&&p.blocs.PLD||0);
  }).length;
  var encabeza=fpStrClave>(provinciasClave.length/2)?'FP':'PLD';
  var razon=encabeza==='FP'
    ?'FP tiene mayor estructura en '+fpStrClave+' de '+provinciasClave.length+' provincias donde la alianza es necesaria.'
    :'PLD tiene mayor arraigo territorial en las provincias clave donde la alianza es necesaria para ganar.';
  var el=document.getElementById('al-encabezado');
  if(!el) return;
  var col=encabeza==='FP'?'var(--fp)':'var(--pld)';
  el.innerHTML=
    '<div style="background:'+col+'11;border:1px solid '+col+'44;border-radius:var(--r);padding:.75rem;margin-bottom:.5rem">'+
    '<div style="font-size:.6rem;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.07em;margin-bottom:.22rem">¿Quién debe encabezar la Alianza FP+PLD? · Nivel presidencial</div>'+
    '<div style="font-size:.88rem;font-weight:800;color:'+col+';margin-bottom:.18rem">✦ '+encabeza+'</div>'+
    '<div style="font-size:.7rem;color:var(--muted);margin-bottom:.3rem">'+razon+'</div>'+
    '<div style="font-size:.67rem;padding:.28rem .45rem;background:var(--bg3);border-radius:.3rem;color:var(--muted)">Criterio Cox (1997): encabeza quien tiene mayor presencia territorial en las provincias donde la alianza es necesaria para ganar — no el partido con más votos totales.</div>'+
    '</div>'+
    [rowStat('Penetración FP (provs. con estructura)',fpProvs+'/32'),
     rowStat('Penetración PLD (domina sobre FP)',pldProvs+'/32'),
     rowStat('Voto duro FP',fmt(fpVDuro),'var(--fp)'),
     rowStat('Voto duro PLD',fmt(pldVDuro),'var(--pld)'),
     rowStat('Criterio','Mayor penetración en provs. clave (Cox 1997)','var(--muted)'),
    ].join('');
}

function renderAlianzasPres(){
  var pipe=window._SIE_PIPELINE||{};
  var alianza=pipe.alianza_datos||[];
  alianza.sort(function(a,b){return (b.ganancia_neta_fp||0)-(a.ganancia_neta_fp||0);});
  var voltea=alianza.filter(function(a){return a.gana_alianza;});
  var noVoltea=alianza.filter(function(a){return !a.gana_alianza;});
  var compiten=noVoltea.filter(function(a){return (a.pct_alianza||0)>40;});
  var lejanas=noVoltea.filter(function(a){return (a.pct_alianza||0)<=40;});

  var listaEl=document.getElementById('al-pres-lista');
  if(listaEl) listaEl.innerHTML=alianza.map(function(a){
    var col=a.gana_alianza?'var(--green)':a.margen_alianza>-10?'var(--gold)':'var(--muted)';
    return '<div style="padding:.38rem 0;border-bottom:1px solid var(--border)">'+
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.1rem">'+
      '<span style="font-size:.78rem;font-weight:700">'+a.provincia+'</span>'+
      '<div style="display:flex;gap:.2rem">'+
      (a.gana_alianza?'<span style="font-size:.62rem;padding:.06rem .26rem;background:var(--green)22;color:var(--green);border-radius:.2rem">VOLTEA</span>':'')+
      '<span style="font-size:.66rem;font-weight:700;color:'+col+'">'+(a.margen_alianza>0?'+':'')+a.margen_alianza.toFixed(1)+'pp</span></div></div>'+
      '<div style="display:grid;grid-template-columns:repeat(3,1fr);font-size:.63rem;color:var(--muted)">'+
      '<span>Ali: <strong>'+a.pct_alianza.toFixed(1)+'%</strong></span>'+
      '<span>PRM: <strong>'+a.pct_prm.toFixed(1)+'%</strong></span>'+
      '<span>Ganancia: <strong style="color:var(--fp)">+'+fmt(a.ganancia_neta_fp||0)+'</strong></span>'+
      '</div></div>';
  }).join('');

  var volteaEl=document.getElementById('al-pres-voltea');
  if(volteaEl) volteaEl.innerHTML=
    (voltea.length?
      '<div style="font-size:.72rem;color:var(--green);font-weight:700;margin-bottom:.35rem">✅ '+voltea.length+' provincias que voltea la alianza</div>'+
      voltea.map(function(a){
        return '<div style="padding:.3rem 0;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;font-size:.76rem">'+
          '<span style="font-weight:700">'+a.provincia+'</span>'+
          '<span style="color:var(--green)">+'+a.margen_alianza.toFixed(1)+'pp · +'+fmt(a.ganancia_neta_fp||0)+'</span></div>';
      }).join('')
    :'<div style="font-size:.75rem;color:var(--muted);padding:.5rem 0">FP+PLD no voltea ninguna provincia en presidencial sola.</div>')+
    (compiten.length?
      '<div style="font-size:.72rem;color:var(--gold);font-weight:700;margin:.5rem 0 .3rem">⚡ '+compiten.length+' provincias con competencia real (>40%) — variables de terreno pueden definir</div>'+
      compiten.map(function(a){
        return '<div style="padding:.3rem 0;border-bottom:1px solid var(--border)">'+
          '<div style="display:flex;justify-content:space-between;font-size:.76rem;margin-bottom:.08rem">'+
          '<span style="font-weight:700">'+a.provincia+'</span>'+
          '<span style="color:var(--gold)">'+a.pct_alianza.toFixed(1)+'% vs PRM '+a.pct_prm.toFixed(1)+'%</span></div>'+
          '<div style="font-size:.63rem;color:var(--muted)">Margen: '+a.margen_alianza.toFixed(1)+'pp · Dispersos: '+fmt(a.votos_dispersos||0)+' pueden definir</div></div>';
      }).join('')
    :'')+
    (lejanas.length?
      '<div style="font-size:.66rem;color:var(--muted);margin:.45rem 0 .2rem;font-weight:700">'+lejanas.length+' provincias lejanas (< 30%)</div>'+
      '<div style="font-size:.63rem;color:var(--muted)">'+lejanas.map(function(a){return a.provincia+'('+a.pct_alianza.toFixed(0)+'%)';}).join(' · ')+'</div>'
    :'');
}

function renderAlianzasSen(){
  var ds=_PROV_METRICS_SEN||[];
  var elL=document.getElementById('al-sen-lista');
  var elV=document.getElementById('al-sen-voltea');
  // L-4: Update KPIs for senadores level
  var senGana=ds.filter(function(p){return p.bloque_coalicion==='FP-coalicion';});
  var senReal=ds.filter(function(p){return p.ganador==='FP';});
  var kpiEl=document.getElementById('alianzas-kpis');
  if(kpiEl) kpiEl.innerHTML=
    kpi('green','FP gana senadores', senReal.length,  'directo · '+senGana.length+' con alianza')
   +kpi('gold', 'PRM senadores',     32-senGana.length,'bloque PRM')
   +kpi('fp',   'Retención FP+PLD',  '80.9%',          'histórico auditado v10.1')
   +kpi('blue', 'Meta 2028',         '17+',             'senadores para mayoría');

  var COALICION_PRM=['PRM','PRSC','ALPAIS','PLR','PRI','PPG','PPC','DXC','UDC','MODA',
                     'PRSD','PHD','PCR','APD','PAL','PDP','PNVC','PASOVE','JS'];
  var aliSen=(window._DS_ALIANZAS&&window._DS_ALIANZAS.niveles&&
              window._DS_ALIANZAS.niveles.senadores)||[];

  var results=ds.map(function(p){
    var total=p.votos_validos||1;
    var aliP=aliSen.find(function(a){return a.provincia_id===p.id;});
    var bloquesPRM=[],bloquesOp=[];
    if(aliP&&aliP.bloques){
      aliP.bloques.forEach(function(b){
        if(COALICION_PRM.includes(b.candidato_base)) bloquesPRM.push(b);
        else bloquesOp.push(b);
      });
    }
    var vPRM=bloquesPRM.reduce(function(s,b){return s+(b.total_votos||0);},0);
    var vOp =bloquesOp .reduce(function(s,b){return s+(b.total_votos||0);},0);
    var encPRM=bloquesPRM.slice().sort(function(a,b){return (b.total_votos||0)-(a.total_votos||0);})[0];
    var encOp =bloquesOp .slice().sort(function(a,b){return (b.total_votos||0)-(a.total_votos||0);})[0];
    var labelPRM=encPRM?(encPRM.candidato_base==='PRM'?'PRM':'PRM/'+encPRM.candidato_base):'PRM';
    var labelOp =encOp ?(encOp .candidato_base==='FP' ?'FP' :'FP/'+encOp.candidato_base):'FP';
    if(!aliP){
      vPRM=(p.blocs&&p.blocs.PRM)||p.votos_casilla_prm||0;
      vOp =(p.blocs&&p.blocs.FP) ||p.votos_casilla_fp ||0;
      labelPRM='PRM'; labelOp='FP';
    }
    var prmPct=+(vPRM/total*100).toFixed(1);
    var opPct =+(vOp /total*100).toFixed(1);
    var margen=+(opPct-prmPct).toFixed(1);
    var gana  =vOp>vPRM&&vPRM>0;
    return {
      provincia:p.provincia, id:p.id,
      vOp:vOp, vPRM:vPRM,
      opPct:opPct, prmPct:prmPct,
      labelOp:labelOp, labelPRM:labelPRM,
      margen:margen, gana:gana,
      ganadorActual:p.ganador
    };
  }).sort(function(a,b){
    if(a.gana&&!b.gana) return -1;
    if(!a.gana&&b.gana) return 1;
    return b.margen-a.margen;
  });

  if(elL) elL.innerHTML=
    '<div style="display:grid;grid-template-columns:1fr 3.5rem 3.5rem 3rem 3.5rem;gap:.2rem;'+
    'font-size:.6rem;font-weight:700;color:var(--muted);padding:.2rem 0 .3rem;'+
    'border-bottom:1px solid var(--border);text-transform:uppercase">'+
    '<span>Provincia</span>'+
    '<span style="text-align:right">Blq.Op%</span>'+
    '<span style="text-align:right">Blq.PRM%</span>'+
    '<span style="text-align:right">Margen</span>'+
    '<span style="text-align:right">Status</span></div>'+
    results.map(function(r){
      var col=r.gana?'var(--green)':r.margen>=-5?'var(--gold)':r.margen>=-15?'var(--orange)':'var(--muted)';
      var tag=r.gana?'VOLTEA':r.margen>=-5?'CERCA':r.margen>=-15?'DISPUT.':'';
      return '<div style="padding:.38rem 0;border-bottom:1px solid var(--border)22">'+
        '<div style="display:grid;grid-template-columns:1fr 3.5rem 3.5rem 3rem 3.5rem;gap:.2rem;align-items:center">'+
        '<span style="font-size:.78rem;font-weight:'+(r.gana?'700':'500')+'">'+r.provincia+'</span>'+
        '<span style="text-align:right;font-size:.7rem;color:var(--fp)">'+r.opPct+'%</span>'+
        '<span style="text-align:right;font-size:.7rem;color:var(--prm)">'+r.prmPct+'%</span>'+
        '<span style="text-align:right;font-size:.7rem;font-weight:700;color:'+col+'">'+(r.margen>0?'+':'')+r.margen+'pp</span>'+
        '<span style="text-align:right;font-size:.63rem;font-weight:700;color:'+col+'">'+tag+'</span>'+
        '</div>'+
        '<div style="font-size:.6rem;color:var(--muted);margin-top:.05rem">'+
        '<span style="color:var(--fp)">'+r.labelOp+'</span>: '+fmt(r.vOp)+
        ' · <span style="color:var(--prm)">'+r.labelPRM+'</span>: '+fmt(r.vPRM)+
        ' · Ganó: <strong>'+r.ganadorActual+'</strong></div>'+
        '</div>';
    }).join('');

  var voltea=results.filter(function(r){return r.gana;});
  var cerca=results.filter(function(r){return !r.gana&&r.margen>=-15;});
  if(elV) elV.innerHTML=
    '<div style="font-size:.72rem;color:var(--muted);margin-bottom:.4rem">'+
    voltea.length+' provincia(s) voltearían · '+cerca.length+' disputadas (\u226415pp)</div>'+
    (voltea.length
      ? voltea.map(function(r){
          return '<div style="background:rgba(21,128,61,.08);border:1px solid var(--green)44;border-radius:var(--r);padding:.5rem;margin-bottom:.28rem">'+
            '<div style="display:flex;justify-content:space-between;align-items:center">'+
            '<span style="font-size:.8rem;font-weight:700;color:var(--green)">\u2705 '+r.provincia+'</span>'+
            '<span style="font-size:.7rem;font-weight:700;color:var(--green)">'+r.opPct+'% vs '+r.prmPct+'% (+'+r.margen+'pp)</span></div>'+
            '<div style="font-size:.65rem;color:var(--muted)">'+r.labelOp+' '+fmt(r.vOp)+' vs '+r.labelPRM+' '+fmt(r.vPRM)+'</div></div>';
        }).join('')
      : '<div style="color:var(--muted);font-size:.75rem;padding:.5rem">El bloque opositor no voltea senadores con los datos actuales.</div>')+
    (cerca.length
      ? '<div style="font-size:.68rem;color:var(--gold);margin:.5rem 0 .25rem;font-weight:700">'+cerca.length+' disputadas (margen \u226415pp):</div>'+
        cerca.map(function(r){
          return '<div style="padding:.3rem .4rem;border:1px solid var(--gold)33;border-radius:var(--r);margin-bottom:.18rem;display:flex;justify-content:space-between">'+
            '<span style="font-size:.75rem;font-weight:700">'+r.provincia+'</span>'+
            '<span style="font-size:.68rem;color:var(--gold)">'+r.labelOp+' '+r.opPct+'% vs '+r.labelPRM+' '+r.prmPct+'% ('+r.margen+'pp)</span></div>';
        }).join('')
      : '');
}

function renderAlianzasDip(){
  // L-4: Update KPIs for diputados level
  var dipC=window.SIE_MOTORES&&window.SIE_MOTORES.Curules?window.SIE_MOTORES.Curules.getTotalByNivel('diputados'):{};
  var fpDip=dipC.FP||0, prmDip=dipC.PRM||0;
  var kpiElD=document.getElementById('alianzas-kpis');
  if(kpiElD) kpiElD.innerHTML=
    kpi('green','FP diputados 2024',  fpDip,  'territoriales + nac. + ext.')
   +kpi('blue', 'PRM diputados 2024', prmDip, 'territoriales + nac. + ext.')
   +kpi('fp',   'Retención FP+PLD',   '80.9%','histórico auditado v10.1')
   +kpi('gold', 'Meta 2028',          '79+',  'diputados para mayoría (158/2+1)');
  // v15c — D'Hondt correcto usando alianzas_2024.json (candidato_base ya corregido)
  // Fuente de verdad: _DS_ALIANZAS_DIP (bloques por circuito) + _DS_CURULES_RES (curules reales 2024)
  // Proyección 2028: swing PRM=−1.97pp / FP+PLD=+1.45pp sobre % de bloque
  var aliDip  = window._DS_ALIANZAS_DIP || [];
  var curRes  = window._DS_CURULES_RES  || window._DS_CURULES || null;
  var elL=document.getElementById('al-dip-lista');
  var elV=document.getElementById('al-dip-voltea');
  var COAL_PRM=['PRM','PRSC','ALPAIS','PLR','PRI','PPG','PPC','DXC','UDC','MODA','PRSD',
                'PHD','PCR','APD','PAL','PDP','PNVC','PASOVE','JS','PUN','FAMP','FNP','GENS'];
  var SWING_PRM=-1.97, SWING_OP=1.45;

  // D'Hondt puro (umbral 2%)
  function dhondt(bloqArr, escanos){
    var totalV=bloqArr.reduce(function(s,b){return s+b.v;},0);
    var umbral=totalV*0.02;
    var elig=bloqArr.filter(function(b){return b.v>=umbral;});
    if(!elig.length) return {};
    var seats={};
    elig.forEach(function(b){seats[b.p]=0;});
    for(var i=0;i<escanos;i++){
      var best=null,bestQ=-1;
      elig.forEach(function(b){var q=b.v/(seats[b.p]+1);if(q>bestQ){bestQ=q;best=b.p;}});
      seats[best]++;
    }
    return seats;
  }

  var curDip=(curRes&&curRes.niveles&&curRes.niveles.diputados)||[];
  if(!aliDip.length||!curDip.length){
    if(elL) elL.innerHTML='<p style="font-size:.75rem;color:var(--muted);padding:.5rem">Sin datos de alianzas de diputados.</p>';
    return;
  }

  var circResults=aliDip.map(function(c){
    var curReal=curDip.find(function(x){return x.provincia_id===c.provincia_id&&x.circ===c.circ;});
    if(!curReal) return null;
    var seats=curReal.curules_totales||2;

    // Classify bloques using bloque_politico field (authoritative — set from JCE candidacy data)
    // candidato_base = who actually filed candidacy; bloque_politico = gobierno|oposicion
    var totalV=0, prmV=0, opV=0, otherV=0;
    c.bloques.forEach(function(b){
      var v=b.total_votos||0;
      totalV+=v;
      var bp=b.bloque_politico||( COAL_PRM.includes(b.candidato_base)?'gobierno':'oposicion' );
      if(bp==='gobierno')   prmV +=v;
      else if(bp==='oposicion') opV+=v;
      else                  otherV+=v;
    });
    if(!totalV) return null;
    // Legacy aliases for rest of function
    var fpV=opV, pldV=0;

    // 2024 base blocs for D'Hondt
    var bloq24=[];
    if(prmV>0) bloq24.push({p:'PRM',v:prmV});
    if(fpV >0) bloq24.push({p:'FP', v:fpV });
    if(pldV>0) bloq24.push({p:'PLD',v:pldV});
    if(otherV>0) bloq24.push({p:'OTR',v:otherV});

    // 2028 projected blocs: apply swing proportionally
    var prmPct24=prmV/totalV*100, opPct24=(fpV+pldV)/totalV*100;
    var prmPct28=prmPct24+SWING_PRM, opPct28=opPct24+SWING_OP;
    // Cap and adjust
    prmPct28=Math.max(0,prmPct28); opPct28=Math.max(0,opPct28);
    var prmV28=prmPct28/100*totalV, opV28=opPct28/100*totalV;
    var bloq28=[];
    if(prmV28>0) bloq28.push({p:'PRM',v:prmV28});
    if(opV28 >0) bloq28.push({p:'FP', v:opV28}); // FP+PLD combinado bajo FP
    if(otherV>0) bloq28.push({p:'OTR',v:otherV});

    // D'Hondt 2024 (base)
    var sim24=dhondt(bloq24,seats);
    // D'Hondt 2028 (proyectado)
    var sim28=dhondt(bloq28,seats);

    // Real 2024 curules
    var real24={};
    (curReal.resultado||[]).forEach(function(r){real24[r.partido]=(real24[r.partido]||0)+r.curules;});

    // Bloque opposition: FP+PLD combined
    var op24sim=(sim24.FP||0)+(sim24.PLD||0);
    var op24real=(real24.FP||0)+(real24.PLD||0)+(real24.PRD||0);
    var op28sim=sim28.FP||0;
    var delta=op28sim-op24real; // gain vs 2024 real

    return {
      lbl:c.provincia+' '+_cleanCirc(c.circ),
      pid:c.provincia_id, ci:c.circ,
      seats:seats,
      real24:real24, sim24:sim24, sim28:sim28,
      op24:op24real, op28:op28sim, delta:delta,
      prm24:real24.PRM||0, prm28:sim28.PRM||0,
      fpPct:+(fpV/totalV*100).toFixed(1),
      pldPct:+(pldV/totalV*100).toFixed(1),
      prmPct:+(prmV/totalV*100).toFixed(1),
      opPct24:+(opPct24).toFixed(1),
      opPct28:+(opPct28).toFixed(1)
    };
  }).filter(Boolean);

  // National totals
  var tot24prm=0,tot24op=0,tot28prm=0,tot28op=0;
  circResults.forEach(function(r){
    tot24prm+=r.prm24; tot24op+=r.op24;
    tot28prm+=r.prm28; tot28op+=r.op28;
  });
  var deltaTotal=tot28op-tot24op;
  var conCambio=circResults.filter(function(r){return r.delta!==0;});
  var sinCambio=circResults.filter(function(r){return r.delta===0;});

  // Scoreboard
  var scoreHTML=
    '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:.5rem;margin-bottom:.75rem">'+
    '<div style="background:var(--fp)11;border:1px solid var(--fp)44;border-radius:var(--r);padding:.6rem;text-align:center">'+
    '<div style="font-size:.62rem;color:var(--muted);text-transform:uppercase;margin-bottom:.2rem">Bloque Oposición</div>'+
    '<div style="font-size:1.3rem;font-weight:800;color:var(--fp)">'+tot24op+' → '+tot28op+'</div>'+
    '<div style="font-size:.68rem;color:'+(deltaTotal>=0?'var(--green)':'var(--red)')+';font-weight:700">'+(deltaTotal>=0?'+':'')+deltaTotal+' curules</div></div>'+
    '<div style="background:var(--prm)11;border:1px solid var(--prm)44;border-radius:var(--r);padding:.6rem;text-align:center">'+
    '<div style="font-size:.62rem;color:var(--muted);text-transform:uppercase;margin-bottom:.2rem">PRM</div>'+
    '<div style="font-size:1.3rem;font-weight:800;color:var(--prm)">'+tot24prm+' → '+tot28prm+'</div>'+
    '<div style="font-size:.68rem;color:var(--red);font-weight:700">'+(tot28prm-tot24prm)+' curules</div></div>'+
    '<div style="background:var(--bg3);border:1px solid var(--border);border-radius:var(--r);padding:.6rem;text-align:center">'+
    '<div style="font-size:.62rem;color:var(--muted);text-transform:uppercase;margin-bottom:.2rem">Circuitos con cambio</div>'+
    '<div style="font-size:1.3rem;font-weight:800;color:var(--accent)">'+conCambio.length+'/'+circResults.length+'</div>'+
    '<div style="font-size:.68rem;color:var(--muted)">'+sinCambio.length+' sin cambio</div></div></div>'+
    '<div style="font-size:.63rem;color:var(--muted);margin-bottom:.5rem;padding:.3rem .45rem;background:var(--bg3);border-radius:var(--r);border-left:2px solid var(--fp)44">'+
    'Método D\'Hondt (Ley 20-23, Art. 68). Proyección 2028: swing PRM '+SWING_PRM+'pp · FP+PLD '+
    (SWING_OP>0?'+':'')+SWING_OP+'pp sobre % de bloque 2024. Base corregida desde alianzas_2024.json.</div>';

  // Table
  var tableHeader=
    '<div style="display:grid;grid-template-columns:1fr 1.8rem 6rem 6rem 4rem;gap:.2rem;font-size:.6rem;font-weight:700;color:var(--muted);padding:.2rem 0 .3rem;border-bottom:1px solid var(--border);text-transform:uppercase">'+
    '<span>Circunscripción</span><span style="text-align:center">Cur.</span>'+
    '<span style="text-align:center">2024 real</span>'+
    '<span style="text-align:center">2028 proy.</span>'+
    '<span style="text-align:center">Delta</span></div>';

  var tableRows=circResults.map(function(r){
    var deltaCol=r.delta>0?'var(--green)':r.delta<0?'var(--red)':'var(--muted)';
    var highlight=r.delta!==0?'border-left:2px solid var(--green)44;padding-left:.3rem':'';
    var real24Str=Object.entries(r.real24).sort(function(a,b){return b[1]-a[1];})
      .map(function(e){return '<span style="color:'+pc(e[0])+'">'+e[0]+':'+e[1]+'</span>';}).join(' ');
    var sim28Str=Object.entries(r.sim28).filter(function(e){return e[1]>0;})
      .sort(function(a,b){return b[1]-a[1];})
      .map(function(e){
        var label=e[0]==='FP'?'Op':e[0];
        return '<span style="color:'+pc(e[0])+'">'+label+':'+e[1]+'</span>';
      }).join(' ');
    return '<div style="padding:.35rem 0;border-bottom:1px solid var(--border)22;'+highlight+'">'+
      '<div style="display:grid;grid-template-columns:1fr 1.8rem 6rem 6rem 4rem;gap:.2rem;align-items:center">'+
      '<span style="font-size:.75rem;font-weight:'+(r.delta!==0?'700':'400')+'">'+r.lbl+'</span>'+
      '<span style="text-align:center;font-size:.7rem;color:var(--muted)">'+r.seats+'</span>'+
      '<span style="font-size:.64rem;display:flex;gap:.18rem;flex-wrap:wrap">'+real24Str+'</span>'+
      '<span style="font-size:.64rem;display:flex;gap:.18rem;flex-wrap:wrap">'+sim28Str+'</span>'+
      '<span style="text-align:center;font-size:.75rem;font-weight:700;color:'+deltaCol+'">'+(r.delta>0?'+':'')+r.delta+'</span>'+
      '</div>'+
      '<div style="font-size:.59rem;color:var(--muted);margin-top:.05rem">'+
      'Op 2024: '+r.opPct24+'% → 2028: '+r.opPct28+'% · PRM '+r.prmPct+'%</div>'+
      '</div>';
  }).join('');

  if(elL) elL.innerHTML=scoreHTML+tableHeader+tableRows;

  if(elV) elV.innerHTML=
    '<div style="font-size:.72rem;color:var(--muted);margin-bottom:.4rem">'+
    conCambio.length+' circuito(s) con cambio en asignación de curules vs 2024</div>'+
    (conCambio.length
      ? conCambio.map(function(r){
          var real24Str=Object.entries(r.real24).sort(function(a,b){return b[1]-a[1];})
            .map(function(e){return e[0]+':'+e[1];}).join(', ');
          var sim28Str=Object.entries(r.sim28).filter(function(e){return e[1]>0;})
            .sort(function(a,b){return b[1]-a[1];})
            .map(function(e){return (e[0]==='FP'?'Op':e[0])+':'+e[1];}).join(', ');
          return '<div style="background:rgba(21,128,61,.08);border:1px solid var(--green)44;border-radius:var(--r);padding:.5rem;margin-bottom:.28rem">'+
            '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.15rem">'+
            '<span style="font-size:.8rem;font-weight:700;color:var(--green)">'+r.lbl+'</span>'+
            '<span style="font-size:.72rem;font-weight:700;color:var(--green)">'+(r.delta>0?'+':'')+r.delta+' curul(es)</span></div>'+
            '<div style="font-size:.64rem;color:var(--muted)">2024: '+real24Str+'</div>'+
            '<div style="font-size:.64rem;color:var(--fp)">2028: '+sim28Str+'</div>'+
            '<div style="font-size:.59rem;color:var(--muted)">Op: '+r.opPct24+'% → '+r.opPct28+'%</div></div>';
        }).join('')
      : '<div style="font-size:.73rem;color:var(--muted);padding:.5rem;text-align:center">'+
        'La proyección no mueve curules con el swing actual.</div>');
}

// ====== ENCUESTAS ======
function renderEncuestas(){
  var enc=window.SIE_ENCUESTAS||(window.SIE_ENCUESTAS={lista:[],activo:false});
  var pipe=window._SIE_PIPELINE||{};
  var pipeEnc=pipe.encuestas||{estado:{activo:false}};
  var est=pipeEnc.estado||{};
  var col=est.activo?'var(--green)':'var(--gold)';
  var det=document.getElementById('enc-estado-detalle');
  if(det) det.innerHTML=
    '<div style="background:'+col+'11;border:1px solid '+col+'44;border-radius:var(--r);padding:.7rem;margin-bottom:.65rem">'+
    '<div style="font-size:.82rem;font-weight:700;color:'+col+';margin-bottom:.3rem">'+
    (est.activo?'🟢 Modelo activo con encuestas':'🟡 Solo fundamentals — sin encuestas validadas')+'</div>'+
    (est.activo?'<div style="font-size:.72rem;color:var(--muted)">Última firma: <strong>'+est.ultima_firma+'</strong> · Peso: 40% encuestas / 60% fundamentals</div>':
    '<div style="font-size:.72rem;color:var(--muted)">Agrega encuestas validadas para activar el modo híbrido.</div>')+
    '</div>'+
    '<div style="font-size:.72rem;color:var(--muted);line-height:1.6">'+
    '<strong style="color:var(--text)">Intención candidato</strong> — mide "¿A quién votaría?" → afecta proyección presidencial.<br>'+
    '<strong style="color:var(--text)">Simpatía partidaria</strong> — mide "¿Con cuál partido simpatiza?" → afecta proyección legislativa.<br>'+
    '<span style="color:var(--muted)">La brecha típica entre ambas es 4-5pp (efecto voto útil, Duverger 1954).</span>'+
    '</div>';

  // Estado banner
  var banner=document.getElementById('enc-estado-banner');
  if(banner) banner.innerHTML='<div style="background:'+col+'11;border:1px solid '+col+'44;border-radius:var(--r);padding:.4rem .75rem;font-size:.73rem;font-weight:700;color:'+col+'">'+
    (est.activo?'🟢 '+enc.lista.filter(function(e){return e.activa;}).length+' encuestas activas · El modelo las integra con peso 40%':
    '🟡 Sin encuestas activas — modelo usa solo fundamentals')+'</div>';

  // Formulario
  var form=document.getElementById('enc-form');
  if(form) form.innerHTML=
    '<div style="display:grid;gap:.45rem">'+
    '<div><div style="font-size:.66rem;color:var(--muted);margin-bottom:.18rem">Tipo</div>'+
    '<select id="enc-tipo"><option value="candidato">Intención candidato</option><option value="simpatia">Simpatía partidaria</option></select></div>'+
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:.35rem">'+
    '<div><div style="font-size:.66rem;color:var(--muted);margin-bottom:.18rem">Empresa</div><input type="text" id="enc-empresa" placeholder="Ej: Gallup"></div>'+
    '<div><div style="font-size:.66rem;color:var(--muted);margin-bottom:.18rem">Fecha</div><input type="date" id="enc-fecha" value="'+new Date().toISOString().substring(0,10)+'"></div>'+
    '</div>'+
    '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:.3rem">'+
    '<div><div style="font-size:.62rem;color:var(--muted);margin-bottom:.12rem">PRM %</div><input type="number" id="enc-prm" min="0" max="100" step="0.1" value="54.0"></div>'+
    '<div><div style="font-size:.62rem;color:var(--muted);margin-bottom:.12rem">FP %</div><input type="number" id="enc-fp" min="0" max="100" step="0.1" value="32.0"></div>'+
    '<div><div style="font-size:.62rem;color:var(--muted);margin-bottom:.12rem">PLD %</div><input type="number" id="enc-pld" min="0" max="100" step="0.1" value="8.0"></div>'+
    '</div>'+
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:.35rem">'+
    '<div><div style="font-size:.66rem;color:var(--muted);margin-bottom:.18rem">Muestra n</div><input type="number" id="enc-n" min="100" step="50" value="1200"></div>'+
    '<div><div style="font-size:.66rem;color:var(--muted);margin-bottom:.18rem">Calidad</div>'+
    '<select id="enc-calidad"><option value="A+">A+ (referencia)</option><option value="A" selected>A</option><option value="B">B</option><option value="C">C</option></select></div>'+
    '</div>'+
    '<button onclick="addEncuesta()" style="width:100%;background:var(--fp);color:#fff;border:none;padding:.48rem;border-radius:var(--r);font-weight:700;cursor:pointer;margin-top:.25rem">+ Agregar encuesta</button>'+
    '</div>';

  // Lista
  var lista=document.getElementById('enc-lista');
  if(lista) lista.innerHTML=enc.lista.length
    ? enc.lista.map(function(e,i){
        var dias=Math.round((Date.now()-new Date(e.fecha).getTime())/(864e5));
        var peso=+(Math.exp(-0.015*dias)*(e.calidad==='A+'?2.0:e.calidad==='A'?1.5:e.calidad==='B'?1.0:0.6)*Math.sqrt((e.n_muestra||e.n||1200)/1200)).toFixed(2);
        var col2=e.activa?'var(--green)':'var(--muted)';
        return '<div style="padding:.5rem;border:1px solid var(--border);border-radius:var(--r);margin-bottom:.3rem;'+(e.activa?'border-color:var(--green)44':'')+'">'+
          '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.28rem">'+
          '<span style="font-size:.8rem;font-weight:700">'+e.empresa+' · <span style="color:var(--muted);font-size:.68rem">'+(e.tipo==='candidato'||e.tipo==='intencion_candidato'?'intención candidato':e.tipo==='simpatia'||e.tipo==='simpatia_partidaria'?'simpatía partidaria':e.tipo)+'</span></span>'+
          '<div style="display:flex;gap:.4rem;align-items:center">'+
          '<span style="font-size:.65rem;color:var(--muted)">Peso: '+peso+'</span>'+
          '<span style="font-size:.63rem;font-weight:700;color:'+col2+'">'+( e.activa?'ACTIVA':'INACTIVA')+'</span>'+
          '<button onclick="toggleEncuesta('+i+')" style="background:var(--bg3);border:1px solid var(--border);color:var(--muted);padding:.1rem .3rem;border-radius:.2rem;font-size:.65rem;cursor:pointer">'+(e.activa?'Desactivar':'Activar')+'</button>'+
          '</div></div>'+
          '<div style="display:grid;grid-template-columns:repeat(4,1fr);font-size:.67rem;color:var(--muted)">'+
          '<span>PRM: <strong style="color:var(--prm)">'+(e.prm!=null?e.prm:e.PRM!=null?e.PRM:'—')+'%</strong></span>'+
          '<span>FP: <strong style="color:var(--fp)">'+(e.fp!=null?e.fp:e.FP!=null?e.FP:'—')+'%</strong></span>'+
          '<span>PLD: <strong style="color:var(--pld)">'+(e.pld!=null?e.pld:e.PLD!=null?e.PLD:'—')+'%</strong></span>'+
          '<span>n='+(e.n_muestra||e.n||'?')+' · '+dias+'d · '+e.calidad+'</span>'+
          '</div></div>';
      }).join('')
    : '<div style="color:var(--muted);font-size:.78rem;padding:1rem;text-align:center">Sin encuestas registradas</div>';

  // JSON loader
  var jl=document.getElementById('enc-json-loader');
  if(jl) jl.innerHTML=
    '<div style="font-size:.73rem;color:var(--muted);margin-bottom:.45rem">'+
    'Carga un archivo JSON con array de encuestas. Formato: <code style="font-size:.68rem;background:var(--bg3);padding:.1rem .3rem;border-radius:.2rem">[{empresa,tipo,fecha,n,calidad,prm,fp,pld}]</code></div>'+
    '<input type="file" accept=".json" id="enc-file" style="display:none" onchange="loadEncuestasJSON(event)">'+
    '<button id="btn-enc-file" style="background:var(--bg3);border:1px solid var(--border);color:var(--text);padding:.42rem .75rem;border-radius:var(--r);font-size:.74rem;font-weight:700;cursor:pointer">📂 Seleccionar archivo JSON</button>';
  setTimeout(function(){var b=document.getElementById('btn-enc-file'),i=document.getElementById('enc-file');if(b&&i)b.onclick=function(){i.click();};},50);

  // ── Tracking chart ── defer render until element has actual width
  (function(){
    var enc_lista = enc.lista;
    var chartContainer = document.getElementById('enc-tracking-chart');
    if (!chartContainer) return;
    // Try ResizeObserver first for reliable width detection
    if (typeof ResizeObserver !== 'undefined') {
      var ro = new ResizeObserver(function(entries) {
        ro.disconnect();
        renderTrackingChart(enc_lista);
      });
      ro.observe(chartContainer);
      // Fallback: also render after 200ms in case observer fires too early
      setTimeout(function(){ renderTrackingChart(enc_lista); }, 200);
    } else {
      setTimeout(function(){ renderTrackingChart(enc_lista); }, 150);
    }
  })();
}

// ── TRACKING CHART: evolución temporal de encuestas ──
function renderTrackingChart(listaEnc) {
  var chartEl = document.getElementById('enc-tracking-chart');
  var legEl   = document.getElementById('enc-tracking-legend');
  var tablaEl = document.getElementById('enc-tracking-tabla');
  if (!chartEl) return;

  // Resultado 2024 como línea de referencia (JCE PDF oficial)
  var REF2024 = { PRM: 57.44, FP: 28.85, PLD: 10.39 };
  var COLORES = { PRM: '#1E40AF', FP: '#00d48a', PLD: '#7C3AED' };
  var PARTIDOS = ['PRM','FP','PLD'];

  // Sin encuestas: mostrar placeholder
  if (!listaEnc || !listaEnc.length) {
    chartEl.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--muted);font-size:.82rem">Sin encuestas cargadas · Carga un JSON para ver el tracking temporal</div>';
    if (legEl) legEl.innerHTML = '';
    if (tablaEl) tablaEl.innerHTML = '';
    return;
  }

  // Ordenar encuestas por fecha
  var sorted = listaEnc.slice().sort(function(a,b){ return new Date(a.fecha)-new Date(b.fecha); });

  // Dimensiones del canvas SVG
  var W = Math.max(chartEl.offsetWidth || 0, chartEl.parentElement ? chartEl.parentElement.offsetWidth : 0) || 560;
  var H = 240;
  var PAD = { top: 24, right: 80, bottom: 36, left: 46 };
  var plotW = W - PAD.left - PAD.right;
  var plotH = H - PAD.top  - PAD.bottom;

  // Escala X: fechas
  var fechas = sorted.map(function(e){ return new Date(e.fecha).getTime(); });
  var t0 = Math.min.apply(null, fechas);
  var t1 = Math.max.apply(null, fechas);
  var tRange = t1 - t0 || 1;
  function xScale(t){ return PAD.left + ((t - t0) / tRange) * plotW; }

  // Escala Y: 0–70%
  var Y_MIN = 0, Y_MAX = 70;
  function yScale(v){ return PAD.top + plotH - ((v - Y_MIN)/(Y_MAX - Y_MIN))*plotH; }

  // Construir SVG
  var svg = '<svg width="100%" height="'+H+'" viewBox="0 0 '+W+' '+H+'" style="overflow:visible">';

  // Grid horizontal
  [0,10,20,30,40,50,60,70].forEach(function(v){
    var y = yScale(v);
    svg += '<line x1="'+PAD.left+'" y1="'+y+'" x2="'+(W-PAD.right)+'" y2="'+y+'" stroke="var(--border)" stroke-width="0.6" stroke-dasharray="3,3"/>';
    svg += '<text x="'+(PAD.left-6)+'" y="'+(y+4)+'" text-anchor="end" font-size="9" fill="var(--muted)">'+v+'%</text>';
  });

  // Ejes
  svg += '<line x1="'+PAD.left+'" y1="'+PAD.top+'" x2="'+PAD.left+'" y2="'+(H-PAD.bottom)+'" stroke="var(--border)" stroke-width="1"/>';
  svg += '<line x1="'+PAD.left+'" y1="'+(H-PAD.bottom)+'" x2="'+(W-PAD.right)+'" y2="'+(H-PAD.bottom)+'" stroke="var(--border)" stroke-width="1"/>';

  // Líneas de referencia 2024
  PARTIDOS.forEach(function(p){
    var y = yScale(REF2024[p]);
    svg += '<line x1="'+PAD.left+'" y1="'+y+'" x2="'+(W-PAD.right)+'" y2="'+y+'" stroke="'+COLORES[p]+'" stroke-width="1" stroke-dasharray="6,3" opacity="0.5"/>';
    svg += '<text x="'+(W-PAD.right+4)+'" y="'+(y+4)+'" font-size="8.5" fill="'+COLORES[p]+'" opacity="0.75">'+p+' \'24</text>';
  });

  // Etiquetas eje X (fechas)
  var step = Math.max(1, Math.floor(sorted.length / 5));
  sorted.forEach(function(e, i){
    if (i % step !== 0 && i !== sorted.length-1) return;
    var x = xScale(new Date(e.fecha).getTime());
    var label = e.fecha ? e.fecha.substring(5) : ''; // MM-DD
    svg += '<text x="'+x+'" y="'+(H-PAD.bottom+14)+'" text-anchor="middle" font-size="8.5" fill="var(--muted)">'+label+'</text>';
  });

  // Líneas y puntos por partido y tipo
  var TIPOS = [
    { tipo: 'candidato', dash: '', label: 'Intención candidato', campo: { PRM:'prm', FP:'fp', PLD:'pld' } },
    { tipo: 'simpatia',  dash: '5,4', label: 'Simpatía partidaria', campo: { PRM:'prm', FP:'fp', PLD:'pld' } }
  ];

  PARTIDOS.forEach(function(p){
    TIPOS.forEach(function(tipoObj){
      var pts = sorted.filter(function(e){ return e.tipo === tipoObj.tipo && e[tipoObj.campo[p]] != null; });
      if (!pts.length) return;

      // Polyline
      var coords = pts.map(function(e){
        var x = xScale(new Date(e.fecha).getTime());
        var y = yScale(e[tipoObj.campo[p]]);
        return x+','+y;
      }).join(' ');
      svg += '<polyline points="'+coords+'" fill="none" stroke="'+COLORES[p]+'" stroke-width="'+(tipoObj.dash?'1.6':'2.2')+'" stroke-dasharray="'+tipoObj.dash+'" opacity="'+(tipoObj.dash?'0.65':'1')+'"/>';

      // Puntos con tooltip
      pts.forEach(function(e){
        var x = xScale(new Date(e.fecha).getTime());
        var y = yScale(e[tipoObj.campo[p]]);
        var val = e[tipoObj.campo[p]];
        svg += '<circle cx="'+x+'" cy="'+y+'" r="'+(tipoObj.dash?'3':'4')+'" fill="'+COLORES[p]+'" opacity="'+(tipoObj.dash?'0.65':'1')+'">';
        svg += '<title>'+(e.empresa||e.firma||'Sin firma')+' · '+e.fecha+'\n'+p+': '+val+'%\n('+tipoObj.label+')</title>';
        svg += '</circle>';
        // Etiqueta del valor en puntos grandes
        if (!tipoObj.dash) {
          svg += '<text x="'+x+'" y="'+(y-7)+'" text-anchor="middle" font-size="8" font-weight="700" fill="'+COLORES[p]+'">'+val+'</text>';
        }
      });
    });
  });

  svg += '</svg>';
  chartEl.innerHTML = svg;

  // Leyenda
  if (legEl) {
    var leyFirmas = {};
    sorted.forEach(function(e){ leyFirmas[e.empresa||e.firma||'Sin firma'] = true; });
    legEl.innerHTML =
      PARTIDOS.map(function(p){
        return '<span style="display:flex;align-items:center;gap:.3rem">'+
          '<span style="width:18px;height:2.5px;background:'+COLORES[p]+';display:inline-block;border-radius:2px"></span>'+
          '<span style="color:'+COLORES[p]+';font-weight:700">'+p+'</span>'+
        '</span>';
      }).join('') +
      '<span style="color:var(--muted);margin-left:.6rem">―― Intención</span>' +
      '<span style="color:var(--muted)">- - Simpatía</span>' +
      '<span style="color:var(--muted);margin-left:.6rem">Firmas: '+Object.keys(leyFirmas).join(', ')+'</span>';
  }

  // Tabla comparativa resumen — ordenable
  if (tablaEl) {
    var cols = [
      {k:'fecha',  label:'Fecha',   title:'Ordenar por fecha'},
      {k:'empresa',label:'Firma',   title:'Ordenar por firma'},
      {k:'tipo',   label:'Tipo',    title:'Ordenar por tipo'},
      {k:'prm',    label:'PRM %',   title:'Ordenar por PRM'},
      {k:'fp',     label:'FP %',    title:'Ordenar por FP'},
      {k:'pld',    label:'PLD %',   title:'Ordenar por PLD'},
      {k:'n',      label:'n',       title:'Ordenar por muestra'},
      {k:'calidad',label:'Calidad', title:'Ordenar por calidad'},
    ];
    window._encSortKey = window._encSortKey || 'fecha';
    window._encSortDir = window._encSortDir !== undefined ? window._encSortDir : -1;

    tablaEl.innerHTML = renderSortableEncTable(sorted, cols);
  }
}

// Tabla encuestas sortable
function renderSortableEncTable(data, cols) {
  var sk = window._encSortKey;
  var sd = window._encSortDir;
  var sorted2 = data.slice().sort(function(a,b){
    var va = a[sk], vb = b[sk];
    if (typeof va === 'string') return sd * va.localeCompare(vb);
    return sd * ((+va||0) - (+vb||0));
  });

  var COLORES = { PRM: '#1E40AF', FP: '#00d48a', PLD: '#7C3AED' };
  var th = 'style="padding:.36rem .55rem;font-size:.69rem;font-weight:700;color:var(--muted);text-align:left;border-bottom:1px solid var(--border);cursor:pointer;white-space:nowrap;user-select:none"';
  var td = 'style="padding:.34rem .55rem;font-size:.71rem;border-bottom:1px solid var(--border)22"';

  var hdrs = cols.map(function(c){
    var arrow = c.k === sk ? (sd > 0 ? ' ↑' : ' ↓') : ' ⇅';
    return '<th '+th+' title="'+c.title+'" onclick="sieEncSort(\''+c.k+'\')">' + c.label + '<span style="opacity:.5">'+arrow+'</span></th>';
  }).join('');

  var rows = sorted2.map(function(e){
    var dias = Math.round((Date.now()-new Date(e.fecha).getTime())/(864e5));
    return '<tr>'+
      '<td '+td+'>'+e.fecha+'</td>'+
      '<td '+td+' style="font-weight:600">'+(e.empresa||e.firma||'Sin firma')+'</td>'+
      '<td '+td+' style="font-size:.65rem">'+(e.tipo==='intencion_candidato'||e.tipo==='candidato'?'intención':'simpatía')+'</td>'+
      '<td '+td+'><span style="font-weight:700;color:'+COLORES.PRM+'">'+(e.prm!=null?e.prm:'—')+'%</span></td>'+
      '<td '+td+'><span style="font-weight:700;color:'+COLORES.FP+'">'+(e.fp!=null?e.fp:'—')+'%</span></td>'+
      '<td '+td+'><span style="font-weight:700;color:'+COLORES.PLD+'">'+(e.pld!=null?e.pld:'—')+'%</span></td>'+
      '<td '+td+' style="color:var(--muted)">'+e.n+'</td>'+
      '<td '+td+'><span style="background:var(--bg3);padding:.1rem .35rem;border-radius:.2rem;font-size:.65rem;font-weight:700">'+e.calidad+'</span></td>'+
    '</tr>';
  }).join('');

  return '<div style="margin-top:.4rem;font-size:.71rem;color:var(--muted);margin-bottom:.4rem">'+
    sorted2.length+' encuestas · haz clic en el encabezado para ordenar</div>'+
    '<table style="width:100%;border-collapse:collapse"><thead><tr>'+hdrs+'</tr></thead><tbody>'+rows+'</tbody></table>';
}

window.sieEncSort = function(key) {
  if (window._encSortKey === key) {
    window._encSortDir = -window._encSortDir;
  } else {
    window._encSortKey = key;
    window._encSortDir = -1;
  }
  renderEncuestas();
};

window.addEncuesta=function(){
  var enc=window.SIE_ENCUESTAS||(window.SIE_ENCUESTAS={lista:[]});
  var obj={
    empresa:document.getElementById('enc-empresa').value||'Sin nombre',
    tipo:document.getElementById('enc-tipo').value,
    fecha:document.getElementById('enc-fecha').value,
    n:+document.getElementById('enc-n').value||1200,
    calidad:document.getElementById('enc-calidad').value,
    prm:+document.getElementById('enc-prm').value,
    fp:+document.getElementById('enc-fp').value,
    pld:+document.getElementById('enc-pld').value,
    activa:true
  };
  enc.lista.push(obj);
  window.SIE_RECALIBRAR&&window.SIE_RECALIBRAR(enc.lista.filter(function(e){return e.activa;}));
  renderEncuestas();
};
window.toggleEncuesta=function(i){
  var enc=window.SIE_ENCUESTAS;
  if(!enc||!enc.lista[i]) return;
  enc.lista[i].activa=!enc.lista[i].activa;
  window.SIE_RECALIBRAR&&window.SIE_RECALIBRAR(enc.lista.filter(function(e){return e.activa;}));
  renderEncuestas();
};
window.loadEncuestasJSON=function(ev){
  var f=ev.target.files[0]; if(!f) return;
  var r=new FileReader();
  r.onload=function(e){
    try{
      var arr=JSON.parse(e.target.result);
      var enc=window.SIE_ENCUESTAS||(window.SIE_ENCUESTAS={lista:[]});
      arr.forEach(function(o){enc.lista.push(Object.assign({activa:true},o));});
      window.SIE_RECALIBRAR&&window.SIE_RECALIBRAR(enc.lista.filter(function(x){return x.activa;}));
      renderEncuestas();
    }catch(err){alert('Error al parsear JSON: '+err.message);}
  };
  r.readAsText(f);
};

// ====== SIMULADOR ======
var _SIM_NIVEL='presidencial';
var _OBJ_NIVEL='presidencial';
var _SIM_VALS={PRM:54,FP:32,PLD:8,PRSC:2,PRD:1,OTRO:3};
var _SIM_ALIANZA={FP_PLD:false,FP_PRSC:false,FP_PRD:false,PRM_PLD:false,PRM_PRSC:false};
// Free-form custom alianzas: [{partyA, partyB, ret, active}]
var _SIM_ALIANZA_CUSTOM=[];
// Expose to window so inline onclick= handlers can access them
window._SIM_VALS=_SIM_VALS;
window._SIM_ALIANZA=_SIM_ALIANZA;
window._SIM_ALIANZA_CUSTOM=_SIM_ALIANZA_CUSTOM;

function initSimulador(){
  window._simInit=true;
  var pipe=window._SIE_PIPELINE||{};
  var proyN=pipe.proyeccion_nacional||{};
  _SIM_VALS.PRM=+(proyN.PRM&&proyN.PRM.proyectado_norm||54);
  _SIM_VALS.FP =+(proyN.FP &&proyN.FP .proyectado_norm||38);
  _SIM_VALS.PLD=+(proyN.PLD&&proyN.PLD.proyectado_norm||8);
  _SIM_VALS.PRSC=+(proyN.PRSC&&proyN.PRSC.proyectado_norm||2);
  _SIM_VALS.PRD =+(proyN.PRD &&proyN.PRD .proyectado_norm||1);
  _SIM_VALS.OTRO=+(100-_SIM_VALS.PRM-_SIM_VALS.FP-_SIM_VALS.PLD-_SIM_VALS.PRSC-_SIM_VALS.PRD).toFixed(1);
  if(_SIM_VALS.OTRO<0){
    // Ajustar proporcionalmente para que sume 100
    var _exceso=-_SIM_VALS.OTRO;
    _SIM_VALS.PRSC=Math.max(0,+(_SIM_VALS.PRSC-_exceso/2).toFixed(1));
    _SIM_VALS.PRD=Math.max(0,+(_SIM_VALS.PRD-_exceso/2).toFixed(1));
    _SIM_VALS.OTRO=0;
  }
  // Territorios
  var sel=document.getElementById('sim-territorio');
  if(sel&&_PROV_METRICS_PRES){
    _PROV_METRICS_PRES.forEach(function(p){
      var o=document.createElement('option'); o.value=p.id; o.textContent=p.provincia; sel.appendChild(o);
    });
  }
  document.getElementById('btn-simular').addEventListener('click',runSimulation);
  document.getElementById('btn-sim-reset').addEventListener('click',function(){
    window._simInit=false; _SIM_VALS={PRM:54,FP:32,PLD:8,PRSC:2,PRD:1,OTRO:3}; _SIM_ALIANZA={FP_PLD:false,FP_PRSC:false,FP_PRD:false,PRM_PLD:false,PRM_PRSC:false}; _SIM_ALIANZA_CUSTOM=[];
    initSimulador();
  });

  var _n=document.getElementById('nota-simulador');if(_n)_n.innerHTML=nota(
    'C\u00f3mo usar: Ajusta sliders para cambiar % de intenci\u00f3n de voto. La suma debe ser 100%. Activa alianzas para redistribuir votos. El resultado se actualiza en tiempo real.',
    'Los valores por defecto vienen de la proyecci\u00f3n actual del modelo. Escenario pesimista FP: bajar 5pp. Optimista: subir 5pp con encuestas activas.',
    '<strong>Limitaci\u00f3n:</strong> Este simulador usa porcentajes nacionales. La distribuci\u00f3n territorial real puede diferir \u2014 ganar en las provincias correctas importa m\u00e1s que el % puro.',
    {id:'M10',nombre:'Motor Escenarios / Simulador',desc:'Aplica alianzas con retenci\u00f3n configurable e integra encuestas activas. Calcula D\'Hondt para nivel legislativo.',formula:'alianza: vals_A += vals_B x retenci\u00f3n\nD\'Hondt: cociente = votos / (escanos + 1)\numbral = total x 0.02',refs:'Ley 20-23 Art. 68 \u00b7 D\'Hondt (1878)'}
    );
  _renderSimSliders();
  _renderSimAlianzaConfig();
  runSimulation();
}

var _SIM_PARTIES=[
  {id:'PRM',label:'PRM',color:'var(--prm)'},
  {id:'FP', label:'FP', color:'var(--fp)'},
  {id:'PLD',label:'PLD',color:'var(--pld)'},
  {id:'PRSC',label:'PRSC',color:'var(--prsc)'},
  {id:'PRD',label:'PRD', color:'var(--prd)'},
  {id:'OTRO',label:'Otros',color:'var(--other)'},
];
function _renderSimSliders(){
  var g=document.getElementById('sim-sliders'); if(!g) return;
  // Only build DOM once — after that just sync values
  if(!g.querySelector('#sl-PRM')){
    g.innerHTML=_SIM_PARTIES.map(function(p){
      return '<div class="slider-row" id="slider-row-'+p.id+'">'+
        '<span class="slider-party" style="color:'+p.color+'">'+p.label+'</span>'+
        '<input type="range" id="sl-'+p.id+'" min="0" max="100" step="0.5" value="'+(_SIM_VALS[p.id]||0)+'">'+
        '<span class="slider-val" id="sv-'+p.id+'">'+(_SIM_VALS[p.id]||0)+'%</span>'+
        '</div>';
    }).join('');
    _SIM_PARTIES.forEach(function(p){
      var sl=document.getElementById('sl-'+p.id);
      if(sl) sl.addEventListener('input',function(){
        _SIM_VALS[p.id]=+this.value;
        document.getElementById('sv-'+p.id).textContent=(+this.value).toFixed(1)+'%';
        _checkSimTotal();
        runSimulation();
      });
    });
  } else {
    // DOM exists — just sync slider positions and labels to _SIM_VALS
    _SIM_PARTIES.forEach(function(p){
      var sl=document.getElementById('sl-'+p.id);
      var sv=document.getElementById('sv-'+p.id);
      if(sl){ sl.max=100; sl.value=_SIM_VALS[p.id]||0; }
      if(sv) sv.textContent=(+(_SIM_VALS[p.id]||0)).toFixed(1)+'%';
    });
  }
  _checkSimTotal();
}

function _checkSimTotal(){
  var total=+Object.values(_SIM_VALS).reduce(function(s,v){return s+v;},0).toFixed(1);
  var ind=document.getElementById('sim-total-indicator');
  if(!ind) return;
  if(total>100.05){
    ind.className='sim-total-bar sim-total-warn';
    ind.textContent='⚠ Total: '+total+'% — supera 100%, ajusta antes de simular';
  } else if(total<99.5){
    ind.className='sim-total-bar sim-total-ok';
    ind.textContent='✓ Total: '+total+'% — '+(100-total).toFixed(1)+'% sin asignar';
  } else {
    ind.className='sim-total-bar sim-total-ok';
    ind.textContent='✓ Total: '+total+'% — 100% asignado';
  }
  // Never lock sliders — user controls all values freely
}

function _renderSimAlianzaConfig(){
  var el=document.getElementById('sim-alianza-config'); if(!el) return;
  var PARTIES=['PRM','FP','PLD','PRSC','PRD','ALPAIS','BIS','GENS','OD','PDI','PQDC','PSC','PRD','PLR','APD','PPG','DXC','FNP','OTRO'];
  // Use window. prefix on all inline handlers so they resolve in browser global scope
  var SA='window._SIM_ALIANZA';
  var SAC='window._SIM_ALIANZA_CUSTOM';
  var RFN='window._renderSimAlianzaConfig()';
  var SIM='window.runSimulation()';

  function buildHTML(){
    var presets=[
      {id:'FP_PLD',  partyA:'FP',  partyB:'PLD',  ret:80.9},
      {id:'FP_PRSC', partyA:'FP',  partyB:'PRSC', ret:75.0},
      {id:'FP_PRD',  partyA:'FP',  partyB:'PRD',  ret:70.0},
      {id:'PRM_PLD', partyA:'PRM', partyB:'PLD',  ret:80.9},
      {id:'PRM_PRSC',partyA:'PRM', partyB:'PRSC', ret:75.0},
    ];

    var presetsHTML=presets.map(function(al){
      var checked=window._SIM_ALIANZA[al.id]?'checked':'';
      var retVal=window._SIM_ALIANZA['ret_'+al.id]||al.ret;
      return '<div style="display:flex;align-items:center;gap:.4rem;padding:.32rem .5rem;'+
        'background:var(--bg3);border-radius:var(--r);border:1px solid '+(checked?'var(--fp)':'var(--border)')+';margin-bottom:.22rem">'+
        '<input type="checkbox" '+checked+' style="accent-color:var(--fp);cursor:pointer" '+
          'onchange="'+SA+'.'+al.id+'=this.checked;'+RFN+';'+SIM+'">'+
        '<span style="flex:1;font-size:.75rem">'+
          '<strong style="color:'+pc(al.partyA)+'">'+al.partyA+'</strong>'+
          ' + <strong style="color:'+pc(al.partyB)+'">'+al.partyB+'</strong></span>'+
        '<span style="font-size:.65rem;color:var(--muted);white-space:nowrap">Ret.</span>'+
        '<input type="range" min="50" max="100" step="0.5" value="'+retVal+'"'+
          ' style="width:70px;cursor:pointer"'+
          ' oninput="'+SA+'.ret_'+al.id+'=+this.value;this.nextElementSibling.textContent=this.value+\'%\';'+SIM+'">'+
        '<span style="font-size:.65rem;color:var(--fp);font-weight:700;min-width:32px">'+retVal+'%</span>'+
        '</div>';
    }).join('');

    var customHTML=(window._SIM_ALIANZA_CUSTOM||[]).map(function(c,i){
      return '<div style="display:flex;align-items:center;gap:.3rem;padding:.28rem .5rem;'+
        'background:var(--bg3);border-radius:var(--r);border:1px solid var(--gold)44;margin-bottom:.22rem">'+
        '<select style="font-size:.7rem;padding:.1rem .2rem;background:var(--bg2);border:1px solid var(--border);border-radius:.2rem;font-weight:700" '+
          'onchange="'+SAC+'['+i+'].partyA=this.value;'+RFN+';'+SIM+'">'+
          PARTIES.map(function(p){return '<option value="'+p+'"'+(p===c.partyA?' selected':'')+'>'+p+'</option>';}).join('')+
        '</select>'+
        '<span style="font-size:.72rem">+</span>'+
        '<select style="font-size:.7rem;padding:.1rem .2rem;background:var(--bg2);border:1px solid var(--border);border-radius:.2rem;font-weight:700" '+
          'onchange="'+SAC+'['+i+'].partyB=this.value;'+RFN+';'+SIM+'">'+
          PARTIES.map(function(p){return '<option value="'+p+'"'+(p===c.partyB?' selected':'')+'>'+p+'</option>';}).join('')+
        '</select>'+
        '<span style="font-size:.65rem;color:var(--muted)">Ret.</span>'+
        '<input type="range" min="50" max="100" step="1" value="'+c.ret+'" style="width:65px;cursor:pointer" '+
          'oninput="'+SAC+'['+i+'].ret=+this.value;this.nextElementSibling.textContent=this.value+\'%\';'+SIM+'">'+
        '<span style="font-size:.65rem;color:var(--fp);font-weight:700;min-width:30px">'+c.ret+'%</span>'+
        '<button onclick="'+SAC+'.splice('+i+',1);'+RFN+';'+SIM+'" '+
          'style="font-size:.65rem;padding:.1rem .35rem;border:1px solid var(--border);border-radius:.2rem;background:transparent;color:var(--muted);cursor:pointer">✕</button>'+
        '</div>';
    }).join('');

    var addBtn='<button onclick="window._SIM_ALIANZA_CUSTOM=window._SIM_ALIANZA_CUSTOM||[];'+SAC+'.push({partyA:\'FP\',partyB:\'PLD\',ret:75});'+RFN+';'+SIM+'" '+
      'style="width:100%;font-size:.72rem;padding:.35rem;border:1px dashed var(--border);border-radius:var(--r);background:transparent;color:var(--muted);cursor:pointer;margin-top:.25rem">'+
      '+ Agregar alianza personalizada</button>';

    return '<div style="font-size:.71rem;color:var(--muted);margin-bottom:.35rem">'+
      'Activa predefinidas o crea combinaciones libres. Retención = % del voto B que migra al A:</div>'+
      presetsHTML+
      ((window._SIM_ALIANZA_CUSTOM||[]).length?'<div style="font-size:.68rem;color:var(--gold);margin:.35rem 0 .2rem;font-weight:700">Alianzas personalizadas:</div>':'')+
      customHTML+addBtn;
  }

  el.innerHTML=buildHTML();
}
// Expose to window immediately so inline onclick= handlers can find it
window._renderSimAlianzaConfig=_renderSimAlianzaConfig;

window.runSimulation=function(){
  if(!window._simInit) return;
  var nivel=_SIM_NIVEL||'presidencial';
  var part=+(document.getElementById('sim-participacion').value||54);
  var usarEnc=(document.getElementById('sim-usar-enc').value||'no')==='si';
  var territorio=document.getElementById('sim-territorio').value||'';
  var nuevosEl=(document.getElementById('sim-nuevos-el').value||'no')==='si';
  var pipe=window._SIE_PIPELINE||{};
  var pad28=pipe.meta&&pipe.meta.padron2028?pipe.meta.padron2028:8859093;
  var padronBase=territorio
    ?(_PROV_METRICS_PRES&&_PROV_METRICS_PRES.find(function(p){return p.id===territorio;})
       ?_PROV_METRICS_PRES.find(function(p){return p.id===territorio;}).inscritos:250000)
    :pad28;
  var padUse=padronBase+(nuevosEl?342000:0);
  var totalVotos=Math.round(padUse*(part/100));

  // ── Construir porcentajes base con alianzas aplicadas ──
  var vals=Object.assign({},_SIM_VALS);
  var ALIANZAS_DEF=[
    {id:'FP_PLD',  partyA:'FP', partyB:'PLD',  ret:0.809},
    {id:'FP_PRSC', partyA:'FP', partyB:'PRSC', ret:0.750},
    {id:'FP_PRD',  partyA:'FP', partyB:'PRD',  ret:0.700},
    {id:'PRM_PLD', partyA:'PRM',partyB:'PLD',  ret:0.809},
    {id:'PRM_PRSC',partyA:'PRM',partyB:'PRSC', ret:0.750},
  ];
  var aliActivas=[];
  // Always read from window to pick up changes made by inline onclick handlers
  var simAlianza=window._SIM_ALIANZA||_SIM_ALIANZA;
  var simAlianzaCustom=window._SIM_ALIANZA_CUSTOM||_SIM_ALIANZA_CUSTOM||[];

  // Apply preset alianzas (with user-edited retention)
  ALIANZAS_DEF.forEach(function(al){
    if(!simAlianza[al.id]) return;
    var retPct=simAlianza['ret_'+al.id]!=null ? simAlianza['ret_'+al.id]/100 : al.ret;
    var vB=vals[al.partyB]||0;
    if(vB<=0.05) return;
    var migra=+(vB*retPct).toFixed(1);
    var dispers=+(vB*(1-retPct)).toFixed(1);
    vals[al.partyA]=+(vals[al.partyA]+migra).toFixed(1);
    vals[al.partyB]=0;
    vals.OTRO=+(vals.OTRO+dispers).toFixed(1);
    aliActivas.push(Object.assign({},al,{retUsed:+(retPct*100).toFixed(1)}));
  });

  // Apply custom free-form alianzas
  simAlianzaCustom.forEach(function(c){
    if(!c.partyA||!c.partyB||c.partyA===c.partyB) return;
    var retPct=c.ret/100;
    var vB=vals[c.partyB]||0;
    if(vB<=0.05) return;
    var migra=+(vB*retPct).toFixed(1);
    var dispers=+(vB*(1-retPct)).toFixed(1);
    vals[c.partyA]+=migra;
    vals[c.partyB]=0;
    vals.OTRO+=dispers;
    aliActivas.push({partyA:c.partyA,partyB:c.partyB,retUsed:c.ret,custom:true});
  });

  // ── Encuestas ──
  if(usarEnc&&window.SIE_ENCUESTAS&&window.SIE_ENCUESTAS.lista.length){
    var activas=window.SIE_ENCUESTAS.lista.filter(function(e){return e.activa;});
    if(activas.length){
      var wSum=0,wp={};
      activas.forEach(function(e){
        var dias=Math.round((Date.now()-new Date(e.fecha).getTime())/864e5);
        var w=Math.exp(-0.015*dias)*(e.calidad==='A+'?2:e.calidad==='A'?1.5:e.calidad==='B'?1:0.6)*Math.sqrt(e.n/1200);
        wSum+=w;
        ['PRM','FP','PLD'].forEach(function(p){wp[p]=(wp[p]||0)+(e[p.toLowerCase()]||0)*w;});
      });
      if(wSum>0){
        ['PRM','FP','PLD'].forEach(function(p){
          vals[p]=+(0.6*vals[p]+0.4*(wp[p]/wSum)).toFixed(1);
        });
      }
    }
  }

  var partidos=[
    {id:'PRM', label:'PRM', color:PC.PRM},
    {id:'FP',  label:'FP'+(aliActivas.some(function(a){return a.partyA==='FP';})
       ?' + '+aliActivas.filter(function(a){return a.partyA==='FP';}).map(function(a){return a.partyB;}).join('+'):''), color:PC.FP},
    {id:'PLD', label:'PLD',  color:PC.PLD},
    {id:'PRSC',label:'PRSC', color:PC.PRSC},
    {id:'PRD', label:'PRD',  color:PC.PRD},
    {id:'OTRO',label:'Otros',color:PC.OTHER}
  ].filter(function(p){return (vals[p.id]||0)>0.1;});

  var winner=partidos.reduce(function(a,b){return (vals[a.id]||0)>(vals[b.id]||0)?a:b},{id:'',label:''});
  var fpPct=vals.FP||0, prmPct=vals.PRM||0;
  var wins=nivel==='presidencial'?fpPct>50:(fpPct>prmPct);
  var gapFP=prmPct-fpPct;

  // ── KPIs ──
  document.getElementById('sim-kpis').innerHTML=
    kpi('fp',  'FP proyectado',  fpPct.toFixed(1)+'%',   wins?'✅ GANA':'⚠ Brecha PRM: '+gapFP.toFixed(1)+'pp')
   +kpi('prm','PRM proyectado', prmPct.toFixed(1)+'%',  'padrón base: '+fmt(padUse))
   +kpi('blue','Votos FP',      fmt(Math.round(totalVotos*fpPct/100)),nivel+' · '+part+'% participación')
   +kpi('gold','Total votos',   fmt(totalVotos),'participación '+part+'%');

  // ── Barras ──
  var resEl=document.getElementById('sim-results');
  if(resEl) resEl.innerHTML='<div class="bar-list">'+partidos.map(function(p){
    var pct=+(vals[p.id]||0).toFixed(1);
    return '<div style="'+(p.id===winner.id?'background:var(--bg3);border-radius:var(--r);padding:.3rem .4rem':'')+'">'+
      '<div class="bar-hdr"><span class="bar-label" style="color:'+p.color+'">'+(p.id===winner.id?'★ ':'')+p.label+'</span><span class="bar-pct">'+pct+'%</span></div>'+
      '<div style="font-size:.67rem;color:var(--muted);margin-bottom:.1rem">'+fmt(Math.round(totalVotos*pct/100))+' votos</div>'+
      '<div class="bar-track"><div class="bar-fill" style="width:'+Math.min(100,pct)+'%;background:'+p.color+'"></div></div>'+
      '</div>';
  }).join('')+'</div>';

  // ── Curules D'Hondt para nivel legislativo ──
  var dhEl=document.getElementById('sim-curules');
  if(dhEl&&nivel!=='presidencial'){
    var pctObj={};
    partidos.forEach(function(p){if((vals[p.id]||0)>0) pctObj[p.id]=vals[p.id];});
    var legResult=window.SIE_MOTORES&&window.SIE_MOTORES.Escenarios
      ?window.SIE_MOTORES.Escenarios.simularLegislativo(pctObj):null;
    if(legResult){
      var nivelData=nivel==='senadores'?legResult.senadores:legResult.diputados;
      var nivelTot=nivel==='senadores'?32:nivel==='diputados'?158:7;
      var mayoriaLabel=nivel==='senadores'?'17 sen.':'90 dip.';
      var sorted=Object.entries(nivelData).sort(function(a,b){return b[1]-a[1];});
      dhEl.style.display='';
      dhEl.innerHTML=
        '<div style="font-size:.8rem;font-weight:800;color:var(--accent);margin-bottom:.5rem">'+
        '🏛 Distribución '+nivel+' (D\'Hondt · umbral 2%)</div>'+
        '<div style="display:flex;flex-wrap:wrap;gap:.3rem;margin-bottom:.6rem">'+
        sorted.map(function(e){
          var col=PC[e[0]]||PC.OTHER;
          var esFP=e[0]==='FP'||aliActivas.some(function(a){return a.partyA==='FP'&&a.partyB===e[0];});
          return '<span style="font-size:.75rem;font-weight:700;padding:.2rem .5rem;border-radius:.25rem;background:'+col+'22;color:'+col+';border:1px solid '+col+'44">'+
            e[0]+' <strong>'+e[1]+'</strong></span>';
        }).join('')+
        '</div>'+
        (function(){
          var fpCurules=nivelData.FP||0;
          var prmCurules=nivelData.PRM||0;
          var mayoria=nivel==='senadores'?17:90;
          return '<div style="font-size:.72rem;'+(fpCurules>=mayoria?'color:var(--green)':fpCurules>prmCurules?'color:var(--gold)':'color:var(--muted)')+'">'+
            'FP: '+fpCurules+' / '+nivelTot+' · Mayoría simple: '+mayoriaLabel+
            (fpCurules>=mayoria?' ✅ FP tiene mayoría':fpCurules>prmCurules?' · FP es primera fuerza':' · FP no tiene mayoría')+
            '</div>';
        })()+
        '<div style="margin-top:.5rem">'+
        sorted.map(function(e){
          var col=PC[e[0]]||PC.OTHER;
          var pct=nivelTot>0?+(e[1]/nivelTot*100).toFixed(0):0;
          return '<div style="display:flex;align-items:center;gap:.4rem;margin-bottom:.2rem">'+
            '<span style="font-size:.68rem;font-weight:700;color:'+col+';width:3.5rem">'+e[0]+'</span>'+
            '<div style="flex:1;height:10px;background:var(--bg3);border-radius:5px">'+
            '<div style="height:100%;width:'+Math.min(100,pct)+'%;background:'+col+';border-radius:5px"></div></div>'+
            '<span style="font-size:.7rem;font-weight:700;width:2rem;text-align:right">'+e[1]+'</span>'+
            '</div>';
        }).join('')+'</div>';
    }
  } else if(dhEl&&nivel==='presidencial'){
    dhEl.style.display='none';
  }

  // ── Análisis textual ──
  var anaEl=document.getElementById('sim-pres-analysis');
  if(anaEl){
    var aliStrs=aliActivas.map(function(al){
      var migra=(vals[al.partyA]-_SIM_VALS[al.partyA]);
      return '<div style="color:var(--fp);font-size:.73rem;margin-bottom:.2rem">✦ Alianza '+al.partyA+'+'+al.partyB+' · Ret. '+(al.ret*100).toFixed(0)+'% · FP +'+migra.toFixed(1)+'pp</div>';
    }).join('');
    var encStr=usarEnc?'<div style="color:var(--accent);font-size:.73rem;margin-bottom:.2rem">✦ Encuestas integradas (Bayesiano 40%)</div>':'';
    var ganarStr=wins
      ?'<div style="background:rgba(21,128,61,.1);border:1px solid var(--green)44;border-radius:var(--r);padding:.5rem;font-size:.75rem;font-weight:700;color:var(--green);margin-bottom:.4rem">🏆 FP GANA en '+nivel+' con este escenario</div>'
      :'<div style="background:rgba(220,38,38,.08);border:1px solid var(--red)44;border-radius:var(--r);padding:.5rem;font-size:.75rem;color:var(--red);margin-bottom:.4rem">⚠ FP no gana · Gap: '+Math.abs(gapFP).toFixed(1)+'pp</div>';
    anaEl.innerHTML=ganarStr+aliStrs+encStr+
      [rowStat('Participación',part+'%'),
       rowStat('Padrón base',fmt(padUse),nuevosEl?'var(--gold)':null),
       rowStat('Total votos',fmt(totalVotos)),
       rowStat('Nivel',nivel),
       rowStat('Territorio',territorio?(_PROV_METRICS_PRES&&(_PROV_METRICS_PRES.find(function(p){return p.id===territorio;})||{}).provincia||territorio):'Nacional'),
      ].join('');
  }
}

// Nivel selector Simulador
document.addEventListener('click',function(e){
  var lb=e.target.closest('.level-btn');
  if(!lb) return;
  var bar=lb.closest('.level-selector');
  if(!bar) return;
  // Potencial nivel
  if(bar.id==='pot-level-bar'){
    bar.querySelectorAll('.level-btn').forEach(function(b){b.classList.remove('active');});
    lb.classList.add('active');
    _POT_NIVEL=lb.dataset.level||'presidencial';
    renderPotencial();
  }
  // Movilizacion partido/nivel
  if(bar.id==='mov-controls'){
    bar.querySelectorAll('[data-partido]').forEach(function(b){b.classList.remove('active');});
    bar.querySelectorAll('[data-nivel]').forEach(function(b){b.classList.remove('active');});
    lb.classList.add('active');
    if(lb.dataset.partido) _MOV_PARTIDO=lb.dataset.partido;
    if(lb.dataset.nivel)   _MOV_NIVEL=lb.dataset.nivel;
    renderMovilizacion();
  }
  // Objetivo nivel
  if(bar.id==='obj-nivel-bar'){
    bar.querySelectorAll('.level-btn').forEach(function(b){b.classList.remove('active');});
    lb.classList.add('active');
    renderObjetivo(lb.dataset.level);
  }
  // Simulador nivel
  if(bar.id==='sim-nivel-bar'){
    bar.querySelectorAll('.level-btn').forEach(function(b){b.classList.remove('active');});
    lb.classList.add('active');
    _SIM_NIVEL=lb.dataset.level||'presidencial';
    var badge=document.getElementById('sim-escenario-badge');
    if(badge) badge.textContent=_SIM_NIVEL.charAt(0).toUpperCase()+_SIM_NIVEL.slice(1);
    runSimulation();
  }
});

// ====== PROYECCION v9.1 ======
window._proyInit = false;

function _calcSwingNacional(){
  // v15 OPCIÓN B: swing calibrado desde encuestas 2027, no delta 2020→2024 inválido
  // FP: base real 2024 = 28.85%; encuestas 2027 ponderadas ~33% → delta +4.15pp orgánico
  // PLD: swing cero (2020→2024 inválido: incluía base peledeísta 2020 que se fue a FP)
  // Fuente presidencial: bloque JCE 2024 | Fuente legislativa: casilla partido puro JCE 2024
  var BASELINES_PRES = {
    PRM: { pct20: 52.51, pct24: 57.44 },
    FP:  { pct20: 28.85, pct24: 33.00 }, // Opción B: delta orgánico +4.15pp
    PLD: { pct20: 10.39, pct24: 10.39 }  // swing cero
  };
  // Bases legislativas reales (casilla partido puro 2024, no presidencial)
  var BASELINES_LEG = {
    PRM: { sen: 45.54, dip: 48.26, prom: 46.90 },
    FP:  { sen: 19.35, dip: 17.15, prom: 18.25 }, // 10.6pp menos que presidencial = diferencial casilla partido vs bloque
    PLD: { sen: 17.64, dip: 15.25, prom: 16.44 }
  };
  var swing = {};
  ['PRM','FP','PLD'].forEach(function(p){
    var b = BASELINES_PRES[p];
    var leg = BASELINES_LEG[p];
    var delta = +(b.pct24 - b.pct20).toFixed(2);
    // Factor de amortiguación: expansión >10pp = 0.35, estable = 0.40, colapso <-10pp = 0.25
    var factor = delta > 10 ? 0.35 : delta < -10 ? 0.25 : 0.40;
    swing[p] = {
      pct20: b.pct20, pct24: b.pct24, delta: delta,
      aplicado: +(delta * factor).toFixed(2),
      // Bases legislativas para uso en senadores/diputados
      leg_sen: leg.sen, leg_dip: leg.dip, leg_prom: leg.prom,
      // Factor conversión figura→partido (solo relevante para FP con Leonel)
      factor_figura_partido: p === 'FP' ? 0.633 : p === 'PRM' ? 0.852 : 1.31
    };
  });
  return swing;
}

function _proyectarConParticipacion(participacion){
  var swing = _calcSwingNacional();
  var PARTIDOS = ['PRM','FP','PLD'];
  var BASE = { PRM:{votos_pct:57.44,es_incumbente:true,ciclos:1},
               FP: {votos_pct:28.85,es_incumbente:false,ciclos:0},
               PLD:{votos_pct:10.39,es_incumbente:false,ciclos:0} };
  var result = {};
  PARTIDOS.forEach(function(p){
    var base = BASE[p];
    var proy = base.votos_pct;
    // Swing histórico × 0.35
    var sw = swing[p] ? swing[p].delta * 0.35 : 0;
    proy += sw;
    // Incumbencia × 1.02 (no aditivo)
    if(base.es_incumbente){ proy *= 1.02; }
    // Fatiga 8 años
    if(base.es_incumbente && base.ciclos>=2){ proy -= 2.0; }
    // Normalización histórica
    var factorH = M.NormalizacionHistorica.factorAjusteProyeccion(p);
    if(factorH && factorH.multiplicador !== 1.00){ proy = proy * factorH.multiplicador; }
    // Ajuste participación relativa a base 54%
    var adj_partic = ((participacion - 0.54) / 0.54) * (p==='FP'?2.5:p==='PRM'?-1.5:0);
    proy += adj_partic;
    result[p] = { base_2024:base.votos_pct, proyectado:+Math.max(0,Math.min(100,proy)).toFixed(2),
                  swing_aplicado:sw, es_incumbente:base.es_incumbente,
                  normalizacion: factorH && factorH.multiplicador!==1 ? factorH : null };
  });
  var total = Object.values(result).reduce(function(s,x){return s+x.proyectado;},0);
  Object.values(result).forEach(function(x){ x.proyectado_norm = +(x.proyectado/total*100).toFixed(2); });
  return result;
}

function initProyeccion(){
  window._proyInit = true;
  renderProyFundamentals(null);
  var crec = M.CrecimientoPadron.proyectar();
  var padEl = document.getElementById('proy-padron');
  if(padEl) padEl.innerHTML = [
    rowStat('Padrón 2016',fmt(crec.historico[0].padron)),
    rowStat('Padrón 2020',fmt(crec.historico[1].padron)),
    rowStat('Padrón 2024',fmt(crec.historico[2].padron),'var(--text)'),
    rowStat('CAGR 2020-2024',crec.cagr_4yr+'%'),
    rowStat('CAGR 2016-2024',crec.cagr_8yr+'%'),
    rowStat('Proyección 2028 (bajo)',fmt(crec.padron_2028_bajo)),
    rowStat('Proyección 2028 (alto)',fmt(crec.padron_2028_alto)),
    rowStat('Proyección 2028 (medio)',fmt(crec.padron_2028_medio),'var(--green)'),
    rowStat('Nuevos electores netos',fmt(crec.nuevos_electores),'var(--gold)'),
  ].join('')+'<p class="note">'+crec.metodologia+' — Fuente: JCE 2016, 2020, 2024</p>';
  // No encuestas-panel en esta vista — las encuestas se manejan en renderEncuestas()
}

// renderProyeccion: puede llamarse N veces (refresh) desde el nav
function renderProyeccion(){
  // C-2: Show baseline notice if no real 2027 polls active
  var pipe = window._SIE_PIPELINE||{};
  var enc  = pipe.encuestas&&pipe.encuestas.estado;
  var noticeEl = document.getElementById('proy-escenarios-row');
  if(noticeEl && (!enc || !enc.activo)){
    noticeEl.insertAdjacentHTML('beforebegin',
      '<div style="background:var(--gold)11;border:1px solid var(--gold)44;border-radius:var(--r);'+
      'padding:.45rem .75rem;margin-bottom:.65rem;display:flex;align-items:center;gap:.5rem;font-size:.73rem">'+
      '<span>🔧</span>'+
      '<span><strong style="color:var(--gold)">Proyección baseline</strong> — parámetros de fundamentals + swing 2020→2024. '+
      'Sin encuestas 2027 activas. Carga encuestas en <strong>Simulación → Encuestas</strong> para activar el modo Bayesiano.</span>'+
      '</div>');
  }
  renderProyFundamentals(window._polls && window._polls.length
    ? M.Encuestas.agregar(['PRM','FP','PLD'])
    : null);
  renderProyEscenarios();
  renderProySwing();
  renderProyTerritorial();
  renderProyTerritorialSenadores();
  renderProyTerritorialDiputados();
}

function renderProyEscenarios(){
  var esc = {
    pesimista: _proyectarConParticipacion(0.50),
    base:      _proyectarConParticipacion(0.54),
    optimista: _proyectarConParticipacion(0.58)
  };
  ['pesimista','base','optimista'].forEach(function(e){
    var pFP = esc[e].FP ? esc[e].FP.proyectado_norm : '?';
    var pPRM = esc[e].PRM ? esc[e].PRM.proyectado_norm : '?';
    var elId = e==='pesimista'?'esc-p-fp':e==='base'?'esc-b-fp':'esc-o-fp';
    var el = document.getElementById(elId);
    if(el) el.innerHTML = '<span style="color:var(--fp)">FP '+pFP+'%</span>'
      +'<br><span style="font-size:.78rem;color:var(--prm)">PRM '+pPRM+'%</span>';
  });
}

function renderProySwing(){
  var swing = _calcSwingNacional();
  var el = document.getElementById('proy-swing');
  if(!el) return;

  var pesos = M.Proyeccion && M.Proyeccion.calcularPesosTemporales ? M.Proyeccion.calcularPesosTemporales() : null;
  var faseHTML = '';
  if(pesos){
    var col = pesos.fase==='EARLY'?'var(--muted)':pesos.fase.includes('FINAL')||pesos.fase==='CAMPAÑA'?'var(--fp)':'var(--gold)';
    faseHTML = '<div style="display:flex;justify-content:space-between;align-items:center;'+
      'background:var(--bg3);border:1px solid var(--border);border-radius:var(--r);padding:.35rem .65rem;margin-bottom:.65rem;font-size:.71rem">'+
      '<span style="font-weight:700;color:'+col+'">'+pesos.fase.replace(/_/g,' ')+'</span>'+
      '<span style="color:var(--muted)">'+pesos.meses_restantes+' meses para la elección</span>'+
      '<span>Encuestas <strong style="color:'+col+'">'+Math.round(pesos.peso_encuesta*100)+'%</strong> · Modelo <strong>'+Math.round(pesos.peso_modelo*100)+'%</strong></span>'+
      '</div>';
  }

  var th = 'style="padding:.3rem .5rem;font-size:.67rem;font-weight:700;color:var(--muted);text-align:right;border-bottom:2px solid var(--border);white-space:nowrap"';
  var thL= 'style="padding:.3rem .5rem;font-size:.67rem;font-weight:700;color:var(--muted);text-align:left;border-bottom:2px solid var(--border)"';
  var td = 'style="padding:.3rem .5rem;font-size:.75rem;text-align:right;border-bottom:1px solid var(--border)22"';
  var tdL= 'style="padding:.3rem .5rem;font-size:.75rem;border-bottom:1px solid var(--border)22"';

  var rows = ['PRM','FP','PLD'].map(function(p){
    var s = swing[p]||{pct20:0,pct24:0,delta:0,aplicado:0,leg_prom:0};
    var col = s.delta>0?'var(--green)':s.delta<0?'var(--red)':'var(--muted)';
    var proy28 = +(s.pct24 + (s.aplicado||0)).toFixed(1);
    var legBase = s.leg_prom||0;
    var nota28 = p==='PLD'?'Swing cero (base 2020 no comparable)':
                 p==='FP'?'Base 28.85% + enc.2027 ~33%':
                 'Bloque 2024 + swing aplicado';
    return '<tr>'+
      '<td '+tdL+'><strong style="color:'+pc(p)+'">'+p+'</strong>'+
      '<div style="font-size:.64rem;color:var(--muted);margin-top:.08rem">'+nota28+'</div></td>'+
      '<td '+td+'>'+s.pct24+'%</td>'+
      '<td '+td+'><strong style="color:'+col+'">'+(s.aplicado>0?'+':'')+s.aplicado+'pp</strong></td>'+
      '<td '+td+'><strong style="color:'+pc(p)+'">'+proy28+'%</strong></td>'+
      '<td '+td+' style="color:var(--muted);font-size:.68rem">'+legBase+'%</td>'+
      '</tr>';
  }).join('');

  el.innerHTML = faseHTML +
    '<table style="width:100%;border-collapse:collapse">'+
    '<thead><tr>'+
    '<th '+thL+'>Partido</th>'+
    '<th '+th+'>Base 2024</th>'+
    '<th '+th+'>Swing aplica</th>'+
    '<th '+th+'>Proy. 2028</th>'+
    '<th '+th+'>Leg. base</th>'+
    '</tr></thead><tbody>'+rows+'</tbody></table>'+
    '<div style="font-size:.63rem;color:var(--muted);margin-top:.4rem;font-style:italic">'+
    'Swing aplicado = 35% del delta 2020→2024 + ajuste incumbencia. Leg. = base legislativa partido puro.</div>';
}

function renderProyTerritorial(){
  var el = document.getElementById('proy-territorial');
  if(!el) return;
  // Usar datos del pipeline (Pedersen + factor local) si disponibles
  var pipe = window._SIE_PIPELINE || {};
  var provData = pipe.proyeccion_territorial || [];
  if(!provData.length){
    // fallback legacy
    var swing = _calcSwingNacional();
    var swingFP = swing.FP ? swing.FP.delta : 0;
    provData = (_PROV_METRICS_PRES||[]).slice().sort(function(a,b){return (b.pct_fp||0)-(a.pct_fp||0);})
      .slice(0,12).map(function(p){
        return { provincia:p.provincia, provincia_id:p.id,
          pct_fp_base:p.pct_fp||0, pct_fp_proy:+(( p.pct_fp||0)+swingFP*0.35).toFixed(1),
          pct_prm_base:p.pct_prm||0, pct_prm_proy:p.pct_prm||0,
          swing_local_fp:+(swingFP*0.35).toFixed(2), ganador_proy:'PRM' };
      });
  }
  // Ordenar: primero donde FP proyecta ganar, luego por swing descendente
  var sorted = provData.slice().sort(function(a,b){
    var ag = a.ganador_proy==='FP'?1:0, bg = b.ganador_proy==='FP'?1:0;
    if(ag!==bg) return bg-ag;
    return (b.swing_local_fp||0)-(a.swing_local_fp||0);
  }).slice(0,12);

  el.innerHTML = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:.4rem">'+
  sorted.map(function(p){
    var fpBase = p.pct_fp_base || 0;
    var fpProy = p.pct_fp_proy || fpBase;
    var prmBase= p.pct_prm_base|| 0;
    var swing  = p.swing_local_fp || 0;
    var gana   = p.ganador_proy==='FP';
    var conf   = pipe.confianza_provincial
      ? (pipe.confianza_provincial.find(function(c){return c.id===p.provincia_id;})||{etiqueta:'🔴 ESTIMADO'}).etiqueta
      : '';
    return '<div style="background:var(--bg3);border:1px solid '+(gana?'var(--fp)':'var(--border)')+';border-radius:var(--r);padding:.55rem .75rem">'+
      '<div style="font-size:.76rem;font-weight:700;margin-bottom:.1rem">'+p.provincia+'</div>'+
      (conf?'<div style="font-size:.6rem;color:var(--muted);margin-bottom:.15rem">'+conf+'</div>':'')+
      '<div style="display:flex;justify-content:space-between;align-items:center">'+
      '<div style="font-size:.7rem;color:var(--muted)">Base: '+fpBase+'%</div>'+
      '<div style="font-size:.85rem;font-weight:800;color:var(--fp)">→ '+fpProy.toFixed(1)+'%'+
      '<span style="font-size:.65rem;color:'+(swing>0?'var(--green)':'var(--red)')+';margin-left:.25rem">'+
      (swing>0?'+':'')+swing.toFixed(1)+'pp</span></div></div>'+
      '<div style="font-size:.68rem;margin-top:.2rem;color:'+(gana?'var(--green)':'var(--muted)')+'">'+
      (gana?'✅ FP proyecta ganar':'PRM: '+prmBase+'% · Brecha '+(prmBase-fpProy).toFixed(1)+'pp')+'</div>'+
      '</div>';
  }).join('')+'</div>';
}
function renderProyFundamentals(polls_agg){
  // Usar proyección del pipeline si disponible; fallback al motor directo
  var pipe = window._SIE_PIPELINE || {};
  var pnac = pipe.proyeccion_nacional;
  var proy = (pnac && !polls_agg) ? pnac : M.Proyeccion.proyectar({}, polls_agg ? polls_agg.promedio : null);
  var partidos = Object.keys(proy);
  var statusNorm = M.NormalizacionHistorica.getStatus();
  var normBanner = '<div style="background:var(--bg3);border:1px solid '+(statusNorm.modo==='PROXY'?'var(--gold)':'var(--green)')+';border-radius:var(--r);padding:.5rem .75rem;margin-bottom:.75rem;font-size:.72rem">'
    +'<span style="font-weight:700;color:'+(statusNorm.modo==='PROXY'?'var(--gold)':'var(--green)')+'">MotorNormalizacionHistorica: '+statusNorm.modo+'</span>'
    +(statusNorm.advertencia?' <span style="color:var(--muted)">\u2014 '+statusNorm.advertencia+'</span>':'')
    +'</div>';


  var _n=document.getElementById('nota-proy-fundamentals');if(_n)_n.innerHTML=nota(
    'C\u00f3mo leer: Barras con el resultado proyectado 2028. El +pp/-pp a la derecha indica el cambio vs 2024. El badge norm indica ajuste por madurez organizativa.',
    'FP proyecta <strong style="color:var(--fp)">subir ~6pp</strong> vs 2024. El PRM proyecta <strong style="color:var(--red)">bajar ~5-7pp</strong> por fatiga de incumbencia. La brecha sigue siendo significativa.',
    '<strong>Clave:</strong> Esta es la proyecci\u00f3n base si nada cambia estructuralmente. La alianza, encuestas y trabajo territorial mueven estos n\u00fameros. Usa el Simulador para escenarios.',
    {id:'M11',nombre:'Motor Proyecci\u00f3n 2028',desc:'7 pasos: baseline + swing x0.35 + incumbencia x1.02 + fatiga -2pp + normalizaci\u00f3n + participaci\u00f3n + bayesiano si encuestas activas.',formula:'proy = base + (swing x 0.35) x incumbencia x norm + adj_partic + bayesiano',refs:'Abramowitz (2008) \u00b7 Gelman & King (1994) swing \u00b7 Panebianco (1988)'}
    );
  document.getElementById('proy-fundamentals').innerHTML = normBanner + partidos.map(function(p){
    var d = proy[p];
    var diff = +(d.proyectado - d.base_2024).toFixed(2);
    var diffStr = diff>=0?'+'+diff:''+diff;
    var normTag = d.ajuste_normalizacion
      ? '<span style="font-size:.62rem;background:var(--bg3);color:var(--gold);border:1px solid var(--gold)33;border-radius:.2rem;padding:.08rem .3rem;margin-left:.35rem">norm x'+d.ajuste_normalizacion.multiplicador+'</span>'
      : '';
    return '<div style="padding:.55rem 0;border-bottom:1px solid var(--border)">'
      +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.28rem">'
      +'<span style="font-weight:700;color:'+pc(p)+'">'+p+(d.es_incumbente?' \ud83c\udfc6':'')+normTag+'</span>'
      +'<div style="text-align:right">'
      +'<span style="font-size:1.05rem;font-weight:800;color:'+pc(p)+'">'+d.proyectado_norm+'%</span>'
      +'<span style="font-size:.7rem;color:'+(diff>=0?'var(--green)':'var(--red)')+';margin-left:.4rem">'+diffStr+'pp</span></div></div>'
      +'<div class="bar-track"><div class="bar-fill" style="width:'+d.proyectado_norm+'%;background:'+pc(p)+'"></div></div>'
      +'<div style="font-size:.68rem;color:var(--muted);margin-top:.2rem">Base 2024: '+d.base_2024+'% \u00b7 '+d.metodologia
      +(d.ajuste_normalizacion?' \u00b7 '+d.ajuste_normalizacion.razon:'')+'</div></div>';
  }).join('');
}


// ── Proyección territorial senadores 2028 ──
function renderProyTerritorialSenadores(){
  // v15c — Base proyección = casilla FP 2024 + PLD×80.9%  (NO bloque senatorial)
  // Bloque senatorial 2024 se muestra como referencia histórica solamente.
  var el = document.getElementById('proy-sen-territorial');
  if(!el) return;

  var senRes24 = (window._DS_RESULTADOS&&window._DS_RESULTADOS.niveles&&
                  window._DS_RESULTADOS.niveles.senadores)||[];
  var aliSen   = (window._DS_ALIANZAS&&window._DS_ALIANZAS.niveles&&
                  window._DS_ALIANZAS.niveles.senadores)||[];
  var provSen  = _PROV_SEN || [];
  if(!senRes24.length){ el.innerHTML='<p class="text-muted text-sm">Sin datos senadores.</p>'; return; }

  var mapAli={}, mapProv={};
  aliSen.forEach(function(a){ mapAli[a.provincia_id]=a; });
  provSen.forEach(function(p){ mapProv[p.id]=p; });

  var swing    = M.Proyeccion&&M.Proyeccion.calcularSwingHistorico ? M.Proyeccion.calcularSwingHistorico() : {};
  var swingFP  = swing.FP  ? +(swing.FP.aplicado  * 0.633).toFixed(2) : 0.92;
  var swingPRM = swing.PRM ? +(swing.PRM.aplicado * 0.633).toFixed(2) : -1.25;

  var data = senRes24.map(function(r24){
    var vv    = r24.totales&&r24.totales.validos||1;
    var aliP  = mapAli[r24.provincia_id];
    var p24m  = mapProv[r24.provincia_id]||{};

    // ── Casilla pura 2024 (fuente: resultados_2024.json) ──────────────
    var fp24  = r24.resultados&&r24.resultados.FP  ||0;
    var pld24 = r24.resultados&&r24.resultados.PLD ||0;
    var prd24 = r24.resultados&&r24.resultados.PRD ||0;
    var prm24 = r24.resultados&&r24.resultados.PRM ||0;

    // ── Bloque alianza 2024 (referencia histórica) ────────────────────
    var bloqOpV=0, bloqPrmV=0, encNombre='FP';
    if(aliP){
      aliP.bloques.forEach(function(b){
        if(b.bloque_politico==='gobierno')     bloqPrmV+=b.total_votos||0;
        else if(b.bloque_politico==='oposicion'){ bloqOpV+=b.total_votos||0; }
      });
      var encOp = aliP.bloques.filter(function(b){return b.bloque_politico==='oposicion';})
        .sort(function(a,b){return (b.total_votos||0)-(a.total_votos||0);})[0];
      if(encOp) encNombre = encOp.candidato_base==='FP'?'FP':'FP+'+encOp.candidato_base;
    } else {
      bloqPrmV = prm24;
      bloqOpV  = fp24 + pld24 + prd24;
    }
    var bloqOpPct  = +(bloqOpV /vv*100).toFixed(1);
    var bloqPrmPct = +(bloqPrmV/vv*100).toFixed(1);

    // ── Base proyección 2028 ─────────────────────────────────────────
    // FP partido puro + PLD retención 80.9% (voto PLD 2020 transferido)
    // PRM: bloque senatorial 2024 (PRM siempre encabezó con todos sus aliados)
    var opBase28  = +((fp24 + pld24 * 0.809) / vv * 100).toFixed(1);
    var prmBase28 = bloqPrmPct;  // bloque PRM = referencia realista

    var opProy28  = Math.min(65, +(opBase28  + swingFP ).toFixed(1));
    var prmProy28 = Math.max(0,  +(prmBase28 + swingPRM).toFixed(1));

    var ganaOp = opProy28 > prmProy28;
    var margen = +(opProy28 - prmProy28).toFixed(1);

    return {
      id: r24.provincia_id, nombre: r24.provincia,
      encNombre: encNombre,
      fp24pct:  +(fp24 /vv*100).toFixed(1),
      pld24pct: +(pld24/vv*100).toFixed(1),
      opBase28: opBase28, prmBase28: prmBase28,
      opProy28: opProy28, prmProy28: prmProy28,
      bloqOpPct: bloqOpPct, bloqPrmPct: bloqPrmPct,
      ganador24: p24m.ganador||'—',
      ganaOp: ganaOp, margen: margen
    };
  }).sort(function(a,b){
    if(a.ganaOp && !b.ganaOp) return -1;
    if(!a.ganaOp && b.ganaOp) return 1;
    return b.margen - a.margen;
  });

  var ganaOp   = data.filter(function(d){ return d.ganaOp; }).length;
  var cercanos = data.filter(function(d){ return !d.ganaOp && d.margen > -15; }).length;

  el.innerHTML =
    '<div style="font-size:.72rem;color:var(--muted);margin-bottom:.45rem">'+
    'Oposición proyecta ganar <strong style="color:var(--fp)">'+ganaOp+'/32</strong> · '+
    cercanos+' más en rango ±15pp · '+
    'Swing leg: FP '+(swingFP>=0?'+':'')+swingFP+'pp · PRM '+(swingPRM>=0?'+':'')+swingPRM+'pp</div>'+
    '<div style="font-size:.6rem;color:var(--muted);margin-bottom:.45rem;padding:.28rem .4rem;'+
    'background:var(--bg3);border-radius:var(--r);border-left:2px solid var(--gold)44">'+
    '⚠ Proyección = cas. FP 2024 + PLD×80.9% + swing. '+
    'Bloque 2024 (con todos aliados) entre paréntesis como referencia histórica.</div>'+
    data.map(function(d){
      var col  = d.ganaOp ? 'var(--green)' : d.margen > -15 ? 'var(--gold)' : 'var(--muted)';
      var icon = d.ganaOp ? '✅' : d.margen > -15 ? '🟡' : '·';
      var g24c = d.ganador24==='PRM'?'var(--prm)':'var(--fp)';
      // v16: simplified card
        var colMargen = d.margen>=5?'var(--green)':d.margen>=-5?'var(--gold)':'var(--muted)';
        return '<div style="padding:.38rem 0;border-bottom:1px solid var(--border)">'+
          '<div style="display:flex;justify-content:space-between;align-items:center">'+
          '<span style="font-size:.8rem;font-weight:700">'+icon+' '+d.nombre+'</span>'+
          '<span style="font-size:.73rem;font-weight:700;color:'+colMargen+'">'+(d.margen>=0?'+':'')+d.margen+'pp</span></div>'+
          '<div style="display:flex;justify-content:space-between;font-size:.67rem;color:var(--muted);margin-top:.05rem">'+
          '<span style="color:'+col+'"><strong>'+d.encNombre+'</strong> '+d.opProy28+'% vs PRM '+d.prmProy28+'%</span>'+
          '<span>2024: '+d.ganador24+' ganó</span>'+
          '</div></div>';
      }).join('');
}

// ── Proyección territorial diputados 2028 ──
function renderProyTerritorialDiputados(){
  // v15c — Proyección diputados usa D'Hondt sobre bloques reales (alianzas_2024.json corregido)
  // No mide % por circunscripción — las curules dependen del cociente D'Hondt sobre el bloque
  var el = document.getElementById('proy-dip-territorial');
  if(!el) return;
  var aliDip = window._DS_ALIANZAS_DIP || [];
  var curRes  = window._DS_CURULES_RES || window._DS_CURULES || null;
  var curDip  = (curRes&&curRes.niveles&&curRes.niveles.diputados)||[];
  if(!aliDip.length||!curDip.length){
    el.innerHTML='<p class="text-muted text-sm">Sin datos D\'Hondt.</p>'; return;
  }
  var swing  = M.Proyeccion&&M.Proyeccion.calcularSwingHistorico ? M.Proyeccion.calcularSwingHistorico() : {};
  var SWING_PRM = swing.PRM ? +(swing.PRM.aplicado * 0.633).toFixed(2) : -1.25;
  var SWING_FP  = swing.FP  ? +(swing.FP.aplicado  * 0.633).toFixed(2) : 0.92;
  var SWING_OP  = +(SWING_FP - SWING_PRM * 0.5).toFixed(2); // neto oposición (FP+PLD combinados)
  var COAL_PRM=['PRM','PRSC','ALPAIS','PLR','PRI','PPG','PPC','DXC','UDC','MODA','PRSD',
                'PHD','PCR','APD','PAL','PDP','PNVC','PASOVE','JS','PUN','FAMP','FNP','GENS'];

  function dhondt(bloqArr,escanos){
    var totalV=bloqArr.reduce(function(s,b){return s+b.v;},0);
    var umbral=totalV*0.02;
    var elig=bloqArr.filter(function(b){return b.v>=umbral;});
    if(!elig.length) return {};
    var seats={};
    elig.forEach(function(b){seats[b.p]=0;});
    for(var i=0;i<escanos;i++){
      var best=null,bestQ=-1;
      elig.forEach(function(b){var q=b.v/(seats[b.p]+1);if(q>bestQ){bestQ=q;best=b.p;}});
      seats[best]++;
    }
    return seats;
  }

  var rows=[], tot24op=0, tot28op=0, tot24prm=0, tot28prm=0;
  aliDip.forEach(function(c){
    var curReal=curDip.find(function(x){return x.provincia_id===c.provincia_id&&x.circ===c.circ;});
    if(!curReal) return;
    var seats=curReal.curules_totales||2;
    // Use bloque_politico (not candidato_base) — candidato_base = quien presentó candidatura JCE
    // bloque_politico = clasificación política real del bloque para proyección
    var totalV=0, prmV=0, opV=0, otherV=0;
    c.bloques.forEach(function(b){
      var v=b.total_votos||0; totalV+=v;
      var bp=b.bloque_politico||(COAL_PRM.includes(b.candidato_base)?'gobierno':'oposicion');
      if(bp==='gobierno')    prmV+=v;
      else if(bp==='oposicion') opV+=v;
      else                   otherV+=v;
    });
    if(!totalV) return;
    // 2024 real curules
    var real24={};
    (curReal.resultado||[]).forEach(function(r){real24[r.partido]=(real24[r.partido]||0)+r.curules;});
    var op24=(real24.FP||0)+(real24.PLD||0)+(real24.PRD||0);
    var prm24=real24.PRM||0;
    // 2028 D'Hondt with swing
    var prmPct28=(prmV/totalV*100)+SWING_PRM;
    var opPct28=(opV/totalV*100)+SWING_OP;
    var bloq28=[];
    if(prmPct28>0) bloq28.push({p:'PRM',v:Math.max(0,prmPct28/100*totalV)});
    if(opPct28 >0) bloq28.push({p:'FP', v:Math.max(0,opPct28/100*totalV)});
    if(otherV  >0) bloq28.push({p:'OTR',v:otherV});
    var sim28=dhondt(bloq28,seats);
    var op28=sim28.FP||0;
    var prm28=sim28.PRM||0;
    var delta=op28-op24;
    tot24op+=op24; tot28op+=op28;
    tot24prm+=prm24; tot28prm+=prm28;
    rows.push({
      lbl:c.provincia+' '+_cleanCirc(c.circ),
      seats:seats, op24:op24, op28:op28, prm24:prm24, prm28:prm28,
      delta:delta,
      opPct24:+(opV/totalV*100).toFixed(1),
      opPct28:+(opPct28).toFixed(1),
      real24:real24, sim28:sim28
    });
  });

  var deltaTotal=tot28op-tot24op;
  var conCambio=rows.filter(function(r){return r.delta!==0;}).length;

  // Summary bar
  var sumHTML=
    '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:.4rem;margin-bottom:.6rem">'+
    '<div style="background:var(--fp)11;border:1px solid var(--fp)33;border-radius:var(--r);padding:.45rem;text-align:center">'+
    '<div style="font-size:.58rem;color:var(--muted);text-transform:uppercase">Oposición 2028</div>'+
    '<div style="font-size:1.15rem;font-weight:800;color:var(--fp)">'+tot28op+' cur.</div>'+
    '<div style="font-size:.64rem;color:'+(deltaTotal>=0?'var(--green)':'var(--red)')+'">'+(deltaTotal>=0?'+':'')+deltaTotal+' vs 2024</div></div>'+
    '<div style="background:var(--prm)11;border:1px solid var(--prm)33;border-radius:var(--r);padding:.45rem;text-align:center">'+
    '<div style="font-size:.58rem;color:var(--muted);text-transform:uppercase">PRM 2028</div>'+
    '<div style="font-size:1.15rem;font-weight:800;color:var(--prm)">'+tot28prm+' cur.</div>'+
    '<div style="font-size:.64rem;color:var(--red)">'+(tot28prm-tot24prm)+' vs 2024</div></div>'+
    '<div style="background:var(--bg3);border:1px solid var(--border);border-radius:var(--r);padding:.45rem;text-align:center">'+
    '<div style="font-size:.58rem;color:var(--muted);text-transform:uppercase">Swing aplicado</div>'+
    '<div style="font-size:.85rem;font-weight:700;color:var(--accent)">PRM '+SWING_PRM+'pp</div>'+
    '<div style="font-size:.64rem;color:var(--fp)">Op '+(SWING_OP>0?'+':'')+SWING_OP+'pp</div></div></div>'+
    '<div style="font-size:.61rem;color:var(--muted);margin-bottom:.4rem;padding:.28rem .4rem;background:var(--bg3);border-radius:var(--r);border-left:2px solid var(--gold)44">'+
    '⚠ Diputados: impacto de alianzas recae en curules vía D\'Hondt — no en % de circunscripción. '+
    conCambio+' de '+rows.length+' circuitos cambian distribución de curules con el swing proyectado.</div>';

  // Table sorted by op28 desc
  rows.sort(function(a,b){return b.op28-a.op28||b.op24-a.op24;});
  var tableHTML=rows.map(function(r){
    var deltaCol=r.delta>0?'var(--green)':r.delta<0?'var(--red)':'var(--muted)';
    var hl=r.delta!==0?'border-left:2px solid var(--green)33;padding-left:.25rem':'';
    var r24str=Object.entries(r.real24).filter(function(e){return e[1]>0;})
      .sort(function(a,b){return b[1]-a[1];})
      .map(function(e){return '<span style="color:'+pc(e[0])+'">'+e[0]+':'+e[1]+'</span>';}).join(' ');
    var r28str=Object.entries(r.sim28).filter(function(e){return e[1]>0;})
      .sort(function(a,b){return b[1]-a[1];})
      .map(function(e){
        var lbl=e[0]==='FP'?'Op':e[0];
        return '<span style="color:'+pc(e[0])+'">'+lbl+':'+e[1]+'</span>';
      }).join(' ');
    return '<div style="padding:.3rem 0;border-bottom:1px solid var(--border)22;'+hl+'">'+
      '<div style="display:grid;grid-template-columns:1fr 1.6rem 5.2rem 5.2rem 3.2rem;gap:.15rem;align-items:center">'+
      '<span style="font-size:.72rem;font-weight:'+(r.delta!==0?'700':'400')+'">'+r.lbl+'</span>'+
      '<span style="text-align:center;font-size:.66rem;color:var(--muted)">'+r.seats+'</span>'+
      '<span style="font-size:.62rem;display:flex;gap:.15rem;flex-wrap:wrap">'+r24str+'</span>'+
      '<span style="font-size:.62rem;display:flex;gap:.15rem;flex-wrap:wrap">'+r28str+'</span>'+
      '<span style="text-align:center;font-size:.72rem;font-weight:700;color:'+deltaCol+'">'+(r.delta>0?'+':'')+r.delta+'</span>'+
      '</div>'+
      '<div style="font-size:.57rem;color:var(--muted)">Op '+r.opPct24+'%→'+r.opPct28+'%</div>'+
      '</div>';
  }).join('');

  var hdrHTML=
    '<div style="display:grid;grid-template-columns:1fr 1.6rem 5.2rem 5.2rem 3.2rem;gap:.15rem;font-size:.58rem;font-weight:700;color:var(--muted);padding:.15rem 0 .25rem;border-bottom:1px solid var(--border);text-transform:uppercase;margin-bottom:.1rem">'+
    '<span>Circuito</span><span style="text-align:center">Cur</span>'+
    '<span style="text-align:center">2024 real</span><span style="text-align:center">2028 proy</span>'+
    '<span style="text-align:center">Δ</span></div>';

  el.innerHTML=sumHTML+hdrHTML+tableHTML;
}


// ====== REPLAY ======
function renderReplay(){
  // ── 2024 Replay ──────────────────────────────────────────────
  var result = M.Replay.run(M.Resultados, M.Curules, M.Padron);
  document.getElementById('replay-checks').innerHTML = result.checks.map(function(c){
    return '<div class="replay-step '+(c.ok?'ok':'fail')+'">'+
      '<span class="replay-icon">'+c.icon+'</span>'+
      '<span class="replay-name">'+c.name+'</span>'+
      '<span class="replay-status">'+c.status+'</span></div>';
  }).join('');
  document.getElementById('replay-summary').innerHTML =
    '<div style="text-align:center;padding:1.5rem 0">'+
    '<div style="font-size:2.8rem">'+(result.pct>=100?'\ud83c\udf89':'\u26a0\ufe0f')+'</div>'+
    '<div style="font-size:1.25rem;font-weight:800;margin:.5rem 0;color:'+(result.pct>=100?'var(--green)':'var(--gold)')+'">'+result.passed+'/'+result.total+' verificaciones 2024</div>'+
    (valResult.errores.length
      ?'<div style="margin-top:.5rem;color:var(--red);font-size:.76rem">Errores: '+valResult.errores.join(', ')+'</div>'
      :'<div style="margin-top:.5rem;color:var(--green);font-size:.76rem">\u2705 Validación interna OK</div>')+
    '</div>';

  // ── 2020 Replay ──────────────────────────────────────────────
  var r2El = document.getElementById('replay-2020');
  if(!r2El) return;

  var H = M.Historico2020;
  var tot20 = H.getTotalesPresidencial();
  var comp = H.getComparativaCurules();
  var res20 = window._DS_RESULTADOS_2020&&window._DS_RESULTADOS_2020.niveles&&
              window._DS_RESULTADOS_2020.niveles.presidencial&&
              window._DS_RESULTADOS_2020.niveles.presidencial.resultados||{};
  var val20 = tot20.votos_validos||0;
  var sorted20 = Object.entries(res20).sort(function(a,b){return b[1]-a[1];});
  var ganador20 = sorted20[0];
  var par20 = tot20.inscritos?+(tot20.votos_emitidos/tot20.inscritos*100).toFixed(1):0;

  // Comparativa curules 2020 vs 2024
  var NIVELES = [
    {k:'senadores',label:'Senadores',tot:32},
    {k:'diputados',label:'Diputados',tot:158},
    {k:'diputados_nacionales',label:'Nacionales',tot:5},
    {k:'diputados_exterior',label:'Exterior',tot:7}
  ];

  r2El.innerHTML=
    '<div style="font-size:.8rem;font-weight:800;color:var(--accent);margin-bottom:.75rem">🔁 Replay 2020 — Verificación histórica</div>'+
    // KPIs 2020
    '<div class="kpi-grid" style="margin-bottom:.75rem">'+
    kpi('blue', 'Ganador 2020',      ganador20?ganador20[0]:'?', ganador20?+(ganador20[1]/val20*100).toFixed(2)+'%':'')  +
    kpi('green','Participación 2020',par20+'%',              fmt(tot20.votos_emitidos||0)+' emitidos')                   +
    kpi('gold', 'Padrón 2020',       fmt((tot20.inscritos||0)+595879),'Dom. '+fmt(tot20.inscritos||0)+' + Ext. 595,879')+
    kpi('fp',   'FP 2020',           +(res20.FP||0)/val20?+(+(res20.FP||0)/val20*100).toFixed(1)+'%':'—',               fmt(res20.FP||0)+' votos')  +
    '</div>'+
    // Barras presidencial 2020
    '<div class="card" style="margin-bottom:.75rem">'+
    '<div class="card-hdr"><span class="card-title">Resultado presidencial 2020</span><span class="card-badge">JCE Oficial</span></div>'+
    '<div>'+sorted20.slice(0,6).map(function(e){
      var pct=val20?+(e[1]/val20*100).toFixed(2):0;
      return '<div style="display:flex;align-items:center;gap:.5rem;padding:.25rem 0;border-bottom:1px solid var(--border)">'+
        '<span style="font-size:.72rem;font-weight:700;color:'+pc(e[0])+';width:3.5rem">'+e[0]+'</span>'+
        '<div style="flex:1;height:8px;background:var(--bg3);border-radius:4px">'+
        '<div style="height:100%;width:'+Math.min(100,pct/0.7)+'%;background:'+pc(e[0])+';border-radius:4px"></div></div>'+
        '<span style="font-size:.72rem;font-weight:700;width:3rem;text-align:right">'+pct+'%</span>'+
        '<span style="font-size:.65rem;color:var(--muted);width:5rem;text-align:right">'+fmt(e[1])+'</span></div>';
    }).join('')+'</div></div>'+
    // Comparativa curules 2020 vs 2024
    '<div class="card">'+
    '<div class="card-hdr"><span class="card-title">Curules 2020 → 2024</span><span class="card-badge">Cambio neto</span></div>'+
    '<div>'+NIVELES.map(function(n){
      var d20=comp[n.k]&&comp[n.k]._2020||{};
      var d24=comp[n.k]&&comp[n.k]._2024||{};
      var partidos=Array.from(new Set(Object.keys(d20).concat(Object.keys(d24)))).sort(function(a,b){return (d24[b]||0)-(d24[a]||0);}).slice(0,4);
      return '<div style="margin-bottom:.5rem">'+
        '<div style="font-size:.72rem;font-weight:700;color:var(--accent);margin-bottom:.2rem">'+n.label+' ('+n.tot+')</div>'+
        partidos.map(function(p){
          var v20=d20[p]||0,v24=d24[p]||0,delta=v24-v20;
          return '<div style="display:flex;justify-content:space-between;font-size:.7rem;padding:.15rem .3rem;background:var(--bg3);border-radius:.2rem;margin-bottom:.1rem">'+
            '<span style="color:'+pc(p)+';font-weight:700">'+p+'</span>'+
            '<span>'+v20+' → <strong>'+v24+'</strong> <span style="color:'+(delta>0?'var(--green)':delta<0?'var(--red)':'var(--muted)')+'"> ('+(delta>0?'+':'')+delta+')</span></span></div>';
        }).join('')+'</div>';
    }).join('')+'</div></div>'+

    // UI4 v12: tabla de swing provincial sortable
    (function(){
      var swings = window._SIE_PIPELINE && window._SIE_PIPELINE.swing_2020_2024 || [];
      if(!swings.length) return '';

      // Enriquecer datos
      var data = swings.map(function(r){
        var prov20 = (window._PROV_METRICS_PRES_2020||[]).find(function(p){return p.id===r.id;})||{};
        var prov24 = (window._PROV_METRICS_PRES||[]).find(function(p){return p.id===r.id;})||{};
        var fp20 = +(prov20.pct_fp||0), fp24 = +(prov24.pct_fp||0);
        var prm20= +(prov20.pct_prm||0),prm24= +(prov24.pct_prm||0);
        var swFP = r.swing&&r.swing.FP  ? +r.swing.FP  : 0;
        var swPRM= r.swing&&r.swing.PRM ? +r.swing.PRM : 0;
        var swPLD= r.swing&&r.swing.PLD ? +r.swing.PLD : 0;
        return { id:r.id, nombre:r.provincia||r.nombre||r.id, fp20:fp20, fp24:fp24, swFP:swFP, prm20:prm20, prm24:prm24, swPRM:swPRM, swPLD:swPLD };
      });

      // Sort state
      var st = window._sieSortState['replay-swing'] || { key:'swFP', dir:-1 };
      window._sieSortState['replay-swing'] = st;
      if (!window._sieSortRender) window._sieSortRender = {};
      window._sieSortRender['replay-swing'] = function(){
        var el = document.getElementById('replay-swing-container');
        if (el) el.innerHTML = renderReplaySwingTable(data);
      };

      function renderReplaySwingTable(d){
        var s = window._sieSortState['replay-swing'];
        var sorted = d.slice().sort(function(a,b){
          var va=a[s.key], vb=b[s.key];
          if(typeof va==='string') return s.dir*va.localeCompare(String(vb));
          return s.dir*((+va||0)-(+vb||0));
        });
        var thS='style="padding:.32rem .4rem;font-size:.64rem;font-weight:700;color:var(--muted);text-align:right;border-bottom:2px solid var(--border);cursor:pointer;white-space:nowrap;user-select:none;background:var(--bg2)"';
        var thL='style="padding:.32rem .4rem;font-size:.64rem;font-weight:700;color:var(--muted);text-align:left;border-bottom:2px solid var(--border);cursor:pointer;white-space:nowrap;user-select:none;background:var(--bg2)"';
        var tdS='style="text-align:right;padding:.22rem .4rem;font-size:.67rem;border-bottom:1px solid var(--border)22"';
        var tdL='style="text-align:left;padding:.22rem .4rem;font-size:.67rem;border-bottom:1px solid var(--border)22;font-weight:700"';
        function arw(k){ return k===s.key?(s.dir>0?' ↑':' ↓'):'<span style="opacity:.3">⇅</span>'; }
        function sortClick(k){ return 'onclick="window._sieSortState[\'replay-swing\']=window._sieSortState[\'replay-swing\']||{};var st=window._sieSortState[\'replay-swing\'];st.dir=st.key===\''+k+'\'?-st.dir:-1;st.key=\''+k+'\';var fn=window._sieSortRender&&window._sieSortRender[\'replay-swing\'];if(fn)fn();"'; }
        var cols = [
          {k:'nombre',label:'Provincia',  align:thL, cellAlign:tdL, render:function(r){return r.nombre;}},
          {k:'fp20',  label:'FP 20%',     align:thS, cellAlign:tdS, render:function(r){return '<span style="color:var(--fp)">'+r.fp20.toFixed(1)+'</span>';}},
          {k:'fp24',  label:'FP 24%',     align:thS, cellAlign:tdS, render:function(r){return '<strong style="color:var(--fp)">'+r.fp24.toFixed(1)+'</strong>';}},
          {k:'swFP',  label:'Δ FP',       align:thS, cellAlign:tdS, render:function(r){return '<strong style="color:'+(r.swFP>=0?'var(--green)':'var(--red)')+'font-weight:800">'+(r.swFP>=0?'+':'')+r.swFP.toFixed(1)+'</strong>';}},
          {k:'prm20', label:'PRM 20%',    align:thS, cellAlign:tdS, render:function(r){return '<span style="color:var(--prm)">'+r.prm20.toFixed(1)+'</span>';}},
          {k:'prm24', label:'PRM 24%',    align:thS, cellAlign:tdS, render:function(r){return '<strong style="color:var(--prm)">'+r.prm24.toFixed(1)+'</strong>';}},
          {k:'swPRM', label:'Δ PRM',      align:thS, cellAlign:tdS, render:function(r){return '<span style="color:'+(r.swPRM>=0?'var(--green)':'var(--red)')+'">'+  (r.swPRM>=0?'+':'')+r.swPRM.toFixed(1)+'</span>';}},
          {k:'swPLD', label:'Δ PLD',      align:thS, cellAlign:tdS, render:function(r){return '<span style="color:'+(r.swPLD>=0?'var(--green)':'var(--red)')+'">'+  (r.swPLD>=0?'+':'')+r.swPLD.toFixed(1)+'</span>';}},
        ];
        var hdrs = cols.map(function(c){ return '<th '+c.align+' '+sortClick(c.k)+'>'+c.label+arw(c.k)+'</th>'; }).join('');
        var rows = sorted.map(function(r,i){
          return '<tr style="'+(i%2?'background:var(--bg3)':'')+'">'+ cols.map(function(c){ return '<td '+c.cellAlign+'>'+c.render(r)+'</td>'; }).join('')+'</tr>';
        }).join('');
        return '<div style="font-size:.67rem;color:var(--muted);margin-bottom:.35rem">32 provincias · clic en encabezado para ordenar</div>'+
          '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse"><thead><tr>'+hdrs+'</tr></thead><tbody>'+rows+'</tbody></table></div>'+
          '<div style="font-size:.63rem;color:var(--muted);padding:.35rem 0;font-style:italic">Fuente: prov_metrics JCE · Δ = porcentaje 2024 − porcentaje 2020</div>';
      }

      var html = '<div class="card" style="margin-top:.75rem">'+
        '<div class="card-hdr"><span class="card-title">Swing provincial 2020 → 2024</span>'+
        '<span class="card-badge">32 provincias · Δpp por partido</span></div>'+
        '<div id="replay-swing-container">'+renderReplaySwingTable(data)+'</div>'+
        '</div>';
      return html;
    })();
}


// ====== MOTORES ======
function renderMotores(){
  var pipe = window._SIE_PIPELINE || {};
  var encEst = pipe.encuestas && pipe.encuestas.estado ? pipe.encuestas.estado : null;
  var valOk  = pipe.validacion && pipe.validacion.ok;

  // B6 fix v11: IDs y descripciones corregidos. Estado real del pipeline.
  var MOTORES_ON = [
    {id:'M1',  n:'Motor Carga',               d:'25 datasets embebidos · validados al inicio del pipeline',       estado:'ACTIVO'},
    {id:'M2',  n:'Motor Validación',          d:'Consistencia interna: votos, partidos, curules (MIT Election Data Lab)',
                                               estado: valOk===true?'OK':valOk===false?'⚠ FALLO':'ACTIVO'},
    {id:'M3',  n:'Motor Padrón',              d:'getPadronNacional/Prov/Mun · CAGR JCE 2016–2024 (Leighley & Nagler 2013)', estado:'ACTIVO'},
    {id:'M4',  n:'Motor Resultados',          d:'Agregación por bloques electorales (Golder 2006)',                estado:'ACTIVO'},
    {id:'M5',  n:'Motor Alianzas',            d:'Fuerza de coalición · escenario sin alianza (Golder 2006)',       estado:'ACTIVO'},
    {id:'M6',  n:'Motor Curules/D\'Hondt',    d:'D\'Hondt con umbral 2% (Ley 20-23 Orgánica del Régimen Electoral — debate sustitución activo 2024)',       estado:'ACTIVO'},
    {id:'M7',  n:'Motor Territorial',         d:'Catálogo provincias/municipios/circunscripciones',                estado:'ACTIVO'},
    {id:'M8',  n:'Motor KPIs',                d:'ENPP Laakso-Taagepera (1979), índice Pedersen, ENID, concentración', estado:'ACTIVO'},
    {id:'M9',  n:'Motor Replay',              d:'10 checkpoints cruzados contra datos JCE 2024',                   estado:'ACTIVO'},
    {id:'M10', n:'Motor Escenarios',          d:'Simulación D\'Hondt multivariable con umbral legal',              estado:'ACTIVO'},
    {id:'M11', n:'Motor Proyección 2028',     d:'7 pasos: Baseline+Swing+Incumbencia+Fatiga+NormHist+Encuestas+Territorial (Abramowitz 2008) · v11: swing_factor diferenciado', estado:'ACTIVO'},
    {id:'M12', n:'Motor Crecimiento Padrón',  d:'CAGR (Vf/Vi)^(1/n)-1 · Padrón 2028: 8,859,093',                 estado:'ACTIVO'},
    {id:'M13', n:'Motor Encuestas',           d:'Ponderación exponencial tiempo/calidad/n (Silver/FiveThirtyEight) · v11: normalización JSON corregida',
                                               estado: encEst&&encEst.activo?('🟢 BAYESIANO ('+encEst.n_encuestas+')'):'🟡 SIN DATA'},
    {id:'M14', n:'Motor Potencial',           d:'Score ofensivo/defensivo territorial · v11: conectado a vista Potencial (Jacobson 2004)', estado:'ACTIVO'},
    {id:'M15', n:'Motor Movilización',        d:'Multi-nivel (presidencial/senadores/diputados) · Turnout gap (Leighley & Nagler 2013)', estado:'ACTIVO'},
    {id:'M16', n:'Motor Riesgo',              d:'Multi-nivel · Composite risk index: margen(50%)+participación(25%)+ENPP(25%) · thresholds P66/P33', estado:'ACTIVO'},
    {id:'M17', n:'Motor Normalización Hist.', d:'Modo COMPLETO: factores ponderados 2020+2024 · PRM×0.92 · FP×1.15 · PLD×1.15 (Panebianco 1988)', estado:'COMPLETO'},
    {id:'M18', n:'Motor Histórico 2020',      d:'Comparativo 2020-2024 · Swing analysis · 45 circs diputados (2024) / 158 territoriales (2028) · 32 prov senadores', estado:'ACTIVO'},
    {id:'M19', n:'Motor Transferencia Voto',  d:'Transferencia voto PLD 2020 residual por provincia · Retención 80.9%', estado:'ACTIVO'},
    {id:'M20', n:'Motor Pivot Electoral',     d:'Provincias que deciden la elección · Score = padrón(35%)+competitividad(35%)+volatilidad(20%)+movilización(10%)', estado:'ACTIVO'},
    {id:'M21', n:'Motor Ruta de Victoria',    d:'Ruta mínima de provincias para alcanzar meta 2028 · v11: votos_fp_proy calculados (B2 fix)', estado:'ACTIVO'},
    {id:'M22', n:'Motor Meta Electoral',      d:'Cálculo de votos necesarios 2028 · Escenarios pesimista/base/optimista', estado:'ACTIVO'},
    {id:'M23', n:'Motor Nuevos Electores',    d:'Proyección cohorte 18-21 años 2028 · CAGR diferenciado por provincia', estado:'ACTIVO'},
    {id:'M24', n:'Motor Alianza Electoral',   d:'Impacto FP+PLD por provincia · Retención 80.9% · voltea '+( (pipe.alianza_datos||[]).filter(function(a){return a.gana_alianza;}).length )+' provincias', estado:'ACTIVO'},
    {id:'M25', n:'Motor Sensibilidad',        d:'Análisis de palancas · tornado chart · 5 dimensiones de impacto', estado:'ACTIVO'},
    {id:'M26', n:'Motor Prioridad Estratégica',d:'Ranking inversión por provincia · v11: 4 componentes (pivot 35%+gap 25%+prob 25%+voto_abs 15%) · corregido sesgo provincias pequeñas', estado:'ACTIVO'},
  ];
  var MOTORES_OFF = [
    {id:'M27', n:'Motor Municipal',           d:'Alcaldes y Directores DM · pendiente dataset municipal 2020/2024'},
  ];

  document.getElementById('motores-on').innerHTML = MOTORES_ON.map(function(m){
    var isWarn = m.estado && (m.estado.indexOf('⚠')>=0 || m.estado.indexOf('SIN')>=0);
    var isBay  = m.estado && m.estado.indexOf('BAYESIANO')>=0;
    var isComp = m.estado === 'COMPLETO';
    var tagBg  = isWarn?'var(--gold)':isBay?'var(--green)':isComp?'var(--purple)':'var(--green)';
    var tagTxt = '#fff';
    return '<div style="display:flex;justify-content:space-between;align-items:flex-start;padding:.42rem 0;border-bottom:1px solid var(--border)">'
      +'<div style="flex:1">'
      +'<div style="display:flex;gap:.4rem;align-items:baseline">'
      +'<span style="font-size:.65rem;color:var(--muted);font-weight:700;min-width:2.4rem">'+m.id+'</span>'
      +'<div style="font-size:.8rem;font-weight:700">'+m.n+'</div></div>'
      +'<div class="text-muted" style="font-size:.66rem;padding-left:2.8rem">'+m.d+'</div></div>'
      +'<span style="font-size:.62rem;font-weight:700;padding:.1rem .35rem;border-radius:.25rem;margin-left:.5rem;white-space:nowrap;background:'+tagBg+';color:'+tagTxt+'">'+m.estado+'</span>'
      +'</div>';
  }).join('');

  document.getElementById('motores-off').innerHTML = MOTORES_OFF.map(function(m){
    return '<div style="display:flex;justify-content:space-between;align-items:flex-start;padding:.42rem 0;border-bottom:1px solid var(--border)">'
      +'<div style="flex:1">'
      +'<div style="display:flex;gap:.4rem;align-items:baseline">'
      +'<span style="font-size:.65rem;color:var(--muted);font-weight:700;min-width:2.4rem">'+m.id+'</span>'
      +'<div style="font-size:.8rem;font-weight:700">'+m.n+'</div></div>'
      +'<div class="text-muted" style="font-size:.66rem;padding-left:2.8rem">'+m.d+'</div></div>'
      +'<span class="tag tag-off" style="margin-left:.5rem;white-space:nowrap">INACTIVO</span></div>';
  }).join('');

  var DS = [
    {f:'resultados_2024.json',s:'44 KB (sin municipal)'},
    {f:'padron_provincial_2024.json',s:'Presidencial + senadores \u00b7 32 provincias'},
    {f:'padron_circ_2024.json',s:'Diputados \u00b7 45 circs (estimado proporcional)'},
    {f:'padron_exterior_2024.json',s:'Exterior \u00b7 3 regiones (estimado)'},
    {f:'prov_metrics_presidencial_2024.json',s:'32 prov \u00b7 bloques presidenciales'},
    {f:'prov_metrics_senadores_2024.json',s:'32 prov \u00b7 alianzas senatoriales'},
    {f:'prov_metrics_diputados_2024.json',s:'32 prov \u00b7 agregado por provincia'},
    {f:'curules_resultado_2024.json',s:'22 KB'},
    {f:'partidos.json',s:'2 KB \u00b7 39 partidos'},
    {f:'padron_2024.json',s:'24 KB \u00b7 190 entradas'},
    {f:'territorios_catalogo.json',s:'57 KB'},
    {f:'prov_pres_2024.json',s:'32 provincias — nivel presidencial'},
    {f:'prov_sen_2024.json', s:'32 provincias — nivel senadores'},
    {f:'prov_dip_2024.json', s:'32 provincias — nivel diputados'},
    {f:'alianzas_2024.json',s:'111 KB'},
    {f:'curules_catalogo.json',s:'8 KB'},
  ];
  document.getElementById('datasets-status').innerHTML =
    '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:.4rem">'
    +DS.map(function(d){
      return '<div style="background:var(--bg3);border:1px solid var(--border);border-radius:var(--r);padding:.48rem .7rem;display:flex;justify-content:space-between">'
        +'<div><div style="font-size:.76rem;font-weight:700">'+d.f+'</div>'
        +'<div class="text-muted" style="font-size:.68rem">'+d.s+'</div></div>'
        +'<span style="color:var(--green)">\u2705</span></div>';
    }).join('')+'</div>';

  var REFS = [
    ['D\'Hondt','Ley 20-23 Orgánica del Régimen Electoral (derogó 15-19 y 275-97) — umbral 2%'],
    ['ENPP','Laakso & Taagepera (1979) Comparative Political Studies 12(1)'],
    ['Competitividad','Jacobson (2004) The Politics of Congressional Elections, 6th ed.'],
    ['Swing/Elasticidad','Gelman & King (1994) AJPS 38(2)'],
    ['Incumbencia','Erikson & Wlezien (2012) The Timeline of Presidential Elections'],
    ['Proyecci\u00f3n','Abramowitz (2008) PS: Political Science & Politics 41(4)'],
    ['Mean reversion','Silver (2020) FiveThirtyEight presidential model documentation'],
    ['Encuestas','Silver (2014) FiveThirtyEight pollster ratings methodology'],
    ['Movilizaci\u00f3n','Leighley & Nagler (2013) Who Votes Now? Princeton UP'],
    ['CAGR','F\u00f3rmula est\u00e1ndar: (Vf/Vi)^(1/n) - 1'],
  ];
  document.getElementById('metodologia-refs').innerHTML =
    '<div style="display:flex;flex-direction:column;gap:.32rem;font-size:.76rem">'
    +REFS.map(function(r){
      return '<div style="padding:.28rem 0;border-bottom:1px solid var(--border)">'
        +'<span style="font-weight:700;color:var(--accent)">'+r[0]+':</span> '+r[1]+'</div>';
    }).join('')+'</div>';
}


// ====== ALIANZAS ======
// REMOVED: old renderAlianzas (replaced by new version)

// ====== TRANSFERENCIA ======
// REMOVED: old renderTransferencia (replaced by new version)

// ====== ENCUESTAS ======
window._encuestas_locales = [];

// REMOVED: old renderEncuestas (replaced by new version)


// ====== BOOT — cada render protegido con try/catch ======
var _BOOT_ERRORS = [];
function _safeRender(name, fn){
  try { fn(); }
  catch(e){ _BOOT_ERRORS.push(name+': '+e.message); console.error('SIE render error ['+name+']:', e.message, e.stack&&e.stack.split('\n')[1]); }
}
// Solo pre-renderiza la vista activa al arrancar (Dashboard)
// Las demás vistas se renderizan lazy al navegar (ver index.html routing)
_safeRender('Dashboard', renderDashboard);
_safeRender('Motores',   renderMotores);
setTimeout(function(){ try{ drawParliament('parl-canvas',M.Curules.getTotalLegislativo(),M.Curules.getSumaCurules()); }catch(e){ console.warn('drawParliament:', e.message); } },80);

// ── Listeners para selectores de nivel del HTML (level-btn) ──
function bindLevelBtns(containerId, onChange) {
  var cont = document.getElementById(containerId);
  if (!cont) return;
  cont.addEventListener('click', function(e) {
    var btn = e.target.closest('.level-btn');
    if (!btn) return;
    var nivel = btn.dataset.level || btn.dataset.nivel;
    var partido = btn.dataset.partido;
    if (nivel) {
      cont.querySelectorAll('[data-level],[data-nivel]').forEach(function(b){b.classList.remove('active');});
      btn.classList.add('active');
      onChange(nivel, null);
    }
    if (partido) {
      cont.querySelectorAll('[data-partido]').forEach(function(b){b.classList.remove('active');});
      btn.classList.add('active');
      onChange(null, partido);
    }
  });
}

bindLevelBtns('sim-nivel-bar', function(nivel){
  if(nivel){ _SIM_NIVEL=nivel; _renderSimSliders(); runSimulation(); }
});
bindLevelBtns('obj-nivel-bar', function(nivel){
  if(nivel){ _OBJ_NIVEL=nivel; renderObjetivo(); }
});
bindLevelBtns('pot-level-bar', function(nivel){ if(nivel){_POT_NIVEL=nivel; renderPotencial();} });
bindLevelBtns('mov-controls', function(nivel, partido){
  if(nivel){ _MOV_NIVEL=nivel; }
  if(partido){ _MOV_PARTIDO=partido; }
  renderMovilizacion();
});
// riesgo-controls removed (vista reemplazada por Oportunidades)

// ── Exponer funciones al scope global ──
window.renderDashboard = typeof renderDashboard !== 'undefined' ? renderDashboard : function(){};
window.initProyeccion = typeof initProyeccion !== 'undefined' ? initProyeccion : function(){};
window.renderProyeccion = typeof renderProyeccion !== 'undefined' ? renderProyeccion : function(){};
window.renderObjetivo = typeof renderObjetivo !== 'undefined' ? renderObjetivo : function(){};
window.renderPresidencial = typeof renderPresidencial !== 'undefined' ? renderPresidencial : function(){};
window.renderSenadores = typeof renderSenadores !== 'undefined' ? renderSenadores : function(){};
window.renderDiputados = typeof renderDiputados !== 'undefined' ? renderDiputados : function(){};
window.renderExterior = typeof renderExterior !== 'undefined' ? renderExterior : function(){};
window.renderHistorico = typeof renderHistorico !== 'undefined' ? renderHistorico : function(){};
window.renderTransferencia = typeof renderTransferencia !== 'undefined' ? renderTransferencia : function(){};
window.renderPotencial = typeof renderPotencial !== 'undefined' ? renderPotencial : function(){};
window.renderMovilizacion = typeof renderMovilizacion !== 'undefined' ? renderMovilizacion : function(){};
window.renderOportunidades = typeof renderOportunidades !== 'undefined' ? renderOportunidades : function(){};
window.renderAlianzas = typeof renderAlianzas !== 'undefined' ? renderAlianzas : function(){};
window.renderAlianzasSen = typeof renderAlianzasSen !== 'undefined' ? renderAlianzasSen : function(){};
window.renderAlianzasDip = typeof renderAlianzasDip !== 'undefined' ? renderAlianzasDip : function(){};
window.renderEncuestas = typeof renderEncuestas !== 'undefined' ? renderEncuestas : function(){};
window.initSimulador = typeof initSimulador !== 'undefined' ? initSimulador : function(){};
window.runSimulation = typeof runSimulation !== 'undefined' ? runSimulation : function(){};
window.renderReplay = typeof renderReplay !== 'undefined' ? renderReplay : function(){};
window.renderMotores = typeof renderMotores !== 'undefined' ? renderMotores : function(){};
window.addEncuesta = typeof addEncuesta !== 'undefined' ? addEncuesta : function(){};
window.toggleEncuesta = typeof toggleEncuesta !== 'undefined' ? toggleEncuesta : function(){};
window.loadEncuestasJSON = typeof loadEncuestasJSON !== 'undefined' ? loadEncuestasJSON : function(){};
window.toggleMetodo = typeof toggleMetodo !== 'undefined' ? toggleMetodo : function(){};
window.toggleTheme = typeof toggleTheme !== 'undefined' ? toggleTheme : function(){};
window.toggleGroup = typeof toggleGroup !== 'undefined' ? toggleGroup : function(){};
window._checkSimTotal = typeof _checkSimTotal !== 'undefined' ? _checkSimTotal : function(){};
window.drawParliament = typeof drawParliament !== 'undefined' ? drawParliament : function(){};

})();


// ================================================================
// INTELIGENCIA FP — Tab switching para vista unificada
// ================================================================
(function(){
  function initIntelTabs(){
    var bar = document.getElementById('intel-tab-bar');
    if(!bar || bar._init) return;
    bar._init = true;
    bar.addEventListener('click', function(e){
      var btn = e.target.closest('.tab-btn');
      if(!btn) return;
      var target = btn.dataset.itab;
      if(!target) return;
      // Deactivate all tabs
      bar.querySelectorAll('.tab-btn').forEach(function(b){ b.classList.remove('active'); });
      btn.classList.add('active');
      // Hide all panels
      document.querySelectorAll('.intel-panel').forEach(function(p){ p.style.display='none'; });
      // Show target
      var panel = document.getElementById(target);
      if(panel) panel.style.display='';
      // Trigger render for the activated tab
      var renderMap = {
        'intel-transferencia': function(){ typeof renderTransferencia!=='undefined' && renderTransferencia(); },
        'intel-potencial':     function(){ typeof renderPotencial!=='undefined'     && renderPotencial();     },
        'intel-movilizacion':  function(){ typeof renderMovilizacion!=='undefined'  && renderMovilizacion();  },
        'intel-oportunidades': function(){ typeof renderOportunidades!=='undefined' && renderOportunidades(); }
      };
      if(renderMap[target]) renderMap[target]();
    });
  }
  // Initialize when view becomes visible
  var origShow = window._showView;
  window._intelTabsInit = initIntelTabs;
})();

// ================================================================
// PDF EXPORT — Resumen ejecutivo de una página
// ================================================================
window.siePDF = function() {
  var pipe  = window._SIE_PIPELINE || {};
  var meta  = pipe.meta || {};
  var proy  = pipe.proyeccion_nacional || {};
  var pal   = meta.palancas || {};
  var M     = window.SIE_MOTORES || {};
  var fp28  = proy.FP  ? proy.FP.proyectado_norm  : '—';
  var prm28 = proy.PRM ? proy.PRM.proyectado_norm : '—';
  var brecha = (fp28!=='—'&&prm28!=='—') ? +(prm28-fp28).toFixed(1)+'pp' : '—';
  var gap   = meta.gap || 1170545;
  var ev    = meta.evaluacion || 'DESAFIANTE';
  var fpV   = meta.votos_actuales || 1226194;
  var metaV = meta.meta_votos || 2396739;
  var pctP  = +(fpV/metaV*100).toFixed(1);
  var modoModelo = pipe.encuestas && pipe.encuestas.estado && pipe.encuestas.estado.activo ? 'BAYESIANO' : 'FUNDAMENTALS';
  var fecha = new Date().toLocaleDateString('es-DO',{year:'numeric',month:'long',day:'numeric'});
  function f(n){ return Number(n).toLocaleString('es-DO'); }
  function kpiBx(label,val,col){
    return '<div style="background:#0d1422;border:1px solid #1a2f47;border-top:3px solid '+col+';border-radius:6px;padding:12px 14px;flex:1">'+
      '<div style="font-size:9px;text-transform:uppercase;letter-spacing:.08em;color:#4d7090;margin-bottom:6px">'+label+'</div>'+
      '<div style="font-size:22px;font-weight:800;color:'+col+'">'+val+'</div></div>';
  }
  function row(label,val,col){
    return '<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #1a2f47;font-size:11px">'+
      '<span style="color:#8899aa">'+label+'</span>'+
      '<strong style="color:'+(col||'#dfe8f5')+'">'+val+'</strong></div>';
  }
  var palRows = [
    row('① Alianza FP+PLD (80.9%)', f(pal.alianza_fp_pld||357583), '#00d48a'),
    row('② Nuevos electores 2028',  f(pal.nuevos_electores||222490), '#6366F1'),
    row('③ Movilización abstención',f(pal.movilizacion_abstencion||117055), '#f59e0b'),
    row('④ Transferencia voto PLD', f(pal.transferencia_leonelista||37191), '#a78bfa'),
    row('Total identificado',       f(pal.total||734319), (pal.total||0)>=gap?'#00d48a':'#f59e0b'),
    row('Gap residual',             f(Math.max(0,gap-(pal.total||734319))), '#f87171')
  ].join('');
  var blocsP = M.Resultados ? M.Resultados.getPresidencialByBloc() : [];
  var proyRows = blocsP.slice(0,3).map(function(b){
    return row(b.id+' 2024: '+b.pct+'%  →  2028 proy.',
      (proy[b.id]?proy[b.id].proyectado_norm+'%':'—'),
      b.id==='FP'?'#00d48a':b.id==='PRM'?'#3b82f6':'#a78bfa');
  }).join('');
  var html = '<!DOCTYPE html><html lang="es"><head><meta charset="utf-8">'+
    '<title>SIE 2028 — Resumen Ejecutivo</title>'+
    '<style>*{box-sizing:border-box;margin:0;padding:0}'+
    'body{background:#080d16;color:#dfe8f5;font-family:Segoe UI,system-ui,sans-serif;padding:28px 32px}'+
    '@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}'+
    '.no-print{display:none}}</style></head><body>'+
    '<div class="no-print" style="margin-bottom:18px;display:flex;gap:10px">'+
    '<button onclick="window.print()" style="background:#00d48a;color:#000;border:none;padding:8px 18px;border-radius:6px;font-weight:800;cursor:pointer;font-size:13px">🖨 Imprimir / Guardar PDF</button>'+
    '<button onclick="window.close()" style="background:#1a2f47;color:#8899aa;border:none;padding:8px 14px;border-radius:6px;cursor:pointer">✕ Cerrar</button></div>'+
    '<div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #00d48a;padding-bottom:14px;margin-bottom:20px">'+
    '<div><div style="font-size:20px;font-weight:800">⚡ SIE <span style="color:#00d48a">2028</span></div>'+
    '<div style="font-size:11px;color:#4d7090;margin-top:3px">Sistema de Inteligencia Electoral · República Dominicana · USO INTERNO CONFIDENCIAL</div></div>'+
    '<div style="text-align:right"><div style="font-size:10px;color:#4d7090">'+fecha+'</div>'+
    '<div style="font-size:10px;margin-top:2px">Modo: <strong style="color:'+(modoModelo==='BAYESIANO'?'#00d48a':'#f59e0b')+'">'+modoModelo+'</strong></div></div></div>'+
    '<div style="display:flex;gap:10px;margin-bottom:12px">'+
    kpiBx('FP 2028 Proyectado',fp28+'%','#00d48a')+
    kpiBx('PRM 2028 Proyectado',prm28+'%','#3b82f6')+
    kpiBx('Brecha',brecha,'#f87171')+
    kpiBx('Meta 2028',f(metaV),'#f59e0b')+'</div>'+
    '<div style="display:flex;gap:10px;margin-bottom:20px">'+
    kpiBx('Gap a cerrar',f(gap),'#f87171')+
    kpiBx('FP votos 2024',f(fpV),'#00d48a')+
    kpiBx('Progreso a meta',pctP+'%','#f59e0b')+
    kpiBx('Evaluación',ev,gap>700000?'#f87171':'#f59e0b')+'</div>'+
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:18px">'+
    '<div style="background:#0d1422;border:1px solid #1a2f47;border-radius:6px;padding:14px">'+
    '<div style="font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;color:#4d7090;margin-bottom:10px">4 Palancas — Votos adicionales identificados</div>'+
    palRows+'</div>'+
    '<div style="background:#0d1422;border:1px solid #1a2f47;border-radius:6px;padding:14px">'+
    '<div style="font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;color:#4d7090;margin-bottom:10px">Proyección Nacional 2028</div>'+
    proyRows+
    '<div style="margin-top:10px;padding-top:8px;border-top:1px solid #1a2f47">'+
    [55,60,65].map(function(pt){return row('Participación '+pt+'%',f(Math.round((meta.padron2028||8859093)*(pt/100)))+' votos');}).join('')+
    '</div></div></div>'+
    '<div style="border-top:1px solid #1a2f47;padding-top:12px;display:flex;justify-content:space-between;font-size:9px;color:#4d7090">'+
    '<span>SIE 2028 v12.0 · Datos JCE 2024 verificados · '+modoModelo+'</span>'+
    '<span>CONFIDENCIAL — USO INTERNO CAMPAÑA FP</span></div></body></html>';
  // Use blob URL instead of popup — works without popup blocker
  var blob = new Blob([html], {type:'text/html'});
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.target = '_blank';
  a.click();
  setTimeout(function(){ URL.revokeObjectURL(url); }, 10000);
};
// ── OLD PDF FUNCTION REPLACED ABOVE ──