/**
 * SIE 2028 v9.0 — NUEVOS MOTORES ESTRATÉGICOS
 * Estos se integran sin romper los motores existentes (M1-M18)
 * 
 * NUEVOS:
 * - M_Pivot: Provincias que deciden la elección
 * - M_Ruta: Combinaciones mínimas para ganar
 * - M_Meta: Cálculo de meta electoral 2028
 * - M_Prioridad: Ranking de inversión
 * - M17 Activado: Normalización Histórica (Panebianco 1988)
 */

// ============================================================================
// MOTOR PIVOT ELECTORAL (M_Pivot)
// ============================================================================
const MotorPivotElectoral = {
  status: 'READY',
  
  calculate(provinces) {
    const weights = {
      padronal: 0.35,
      competitivity: 0.35,
      volatility: 0.20,
      mobilization: 0.10
    };

    const totalPadron = provinces.reduce((sum, p) => sum + (p.padron_2024 || 0), 0);
    
    const scores = provinces.map(prov => {
      const padronalScore = ((prov.padron_2024 || 0) / totalPadron) * 100 * 5;
      const margin = Math.abs((prov.votos_fp_2024 || 0) - (prov.votos_prm_2024 || 0)) / (prov.padron_2024 || 1);
      const competitivityScore = (1 - margin) * 100;
      const volatilityScore = (prov.enpp_volatility || 0) * 100;
      const abstentionists = (prov.padron_2024 || 0) - (prov.votantes_2024 || 0);
      const mobilizationScore = (abstentionists / (prov.padron_2024 || 1)) * 100;
      
      const pivotScore = 
        (padronalScore * weights.padronal) +
        (competitivityScore * weights.competitivity) +
        (volatilityScore * weights.volatility) +
        (mobilizationScore * weights.mobilization);
      
      return {
        nombre: prov.nombre,
        pivotScore: Math.min(100, pivotScore),
        clasificacion: 
          pivotScore > 70 ? 'CRÍTICA' :
          pivotScore > 50 ? 'IMPORTANTE' :
          'SECUNDARIA'
      };
    });

    const sorted = scores.sort((a, b) => b.pivotScore - a.pivotScore);
    
    return {
      topFive: sorted.slice(0, 5),
      allScores: scores,
      summary: {
        criticas: sorted.filter(p => p.pivotScore > 70).length,
        importantes: sorted.filter(p => p.pivotScore > 50 && p.pivotScore <= 70).length,
        secundarias: sorted.filter(p => p.pivotScore <= 50).length
      }
    };
  }
};

// ============================================================================
// MOTOR RUTA DE VICTORIA (M_Ruta)
// ============================================================================
const MotorRutaVictoria = {
  status: 'READY',
  
  calculate(votesPerProvince, metaVotos = 2354700) {
    const provinces = Object.entries(votesPerProvince)
      .map(([name, votos]) => ({ nombre: name, votos }))
      .sort((a, b) => b.votos - a.votos);

    const victoryRoute = [];
    let totalVotos = 0;
    
    for (let prov of provinces) {
      if (totalVotos < metaVotos) {
        victoryRoute.push(prov);
        totalVotos += prov.votos;
      }
    }

    return {
      minimalRoute: {
        provincias: victoryRoute,
        totalVotos: totalVotos,
        margen: totalVotos - metaVotos,
        ganador: totalVotos >= metaVotos ? true : false
      },
      provinciasCriticas: victoryRoute.length,
      estrategia: victoryRoute.length <= 5 ? 'CONCENTRADA' : 'DISTRIBUIDA'
    };
  }
};

// ============================================================================
// MOTOR META ELECTORAL (M_Meta)
// ============================================================================
const MotorMetaElectoral = {
  status: 'READY',
  
  calculate(padron2028 = 8700000, participacion2028 = 0.54, votosActualesFP = 2100000) {
    const votantesEsperados = Math.round(padron2028 * participacion2028);
    const meta = Math.round(votantesEsperados * 0.501);
    const gap = meta - votosActualesFP;
    const porcentajeGap = (gap / votosActualesFP) * 100;

    const scenarios = {
      pesimista: {
        votantes: Math.round(padron2028 * 0.52),
        metaVotos: Math.round(padron2028 * 0.52 * 0.501),
        gap: Math.round(padron2028 * 0.52 * 0.501) - votosActualesFP
      },
      base: {
        votantes: votantesEsperados,
        metaVotos: meta,
        gap: gap
      },
      optimista: {
        votantes: Math.round(padron2028 * 0.56),
        metaVotos: Math.round(padron2028 * 0.56 * 0.501),
        gap: Math.round(padron2028 * 0.56 * 0.501) - votosActualesFP
      }
    };

    return {
      meta: {
        padron2028,
        participacion2028,
        votantesEsperados,
        metaVotos: meta,
        votosActualesFP,
        gap,
        porcentajeGap
      },
      scenarios,
      evaluacion: {
        esFactible: gap <= 300000 ? 'FACTIBLE' : 'DESAFIANTE'
      }
    };
  }
};

// ============================================================================
// MOTOR PRIORIDAD ESTRATÉGICA (M_Prioridad)
// ============================================================================
const MotorPrioridadEstrategica = {
  status: 'READY',
  
  calculate(provinces) {
    const weights = {
      pivot: 0.40,
      gap: 0.30,
      probability: 0.30
    };

    const scores = provinces.map(prov => {
      const pivotNorm = (prov.pivotScore || 50) / 100;
      const maxGap = 200000;
      const gapNorm = Math.max(0, 1 - ((prov.gap || 0) / maxGap));
      const probNorm = prov.probabilidadVictoria || 0.5;
      
      const priorityScore = 
        (pivotNorm * weights.pivot) +
        (gapNorm * weights.gap) +
        (probNorm * weights.probability);
      
      return {
        nombre: prov.nombre,
        priorityScore: (priorityScore * 100).toFixed(1),
        gap: prov.gap,
        prioridad:
          priorityScore > 0.90 ? 'MÁXIMA' :
          priorityScore > 0.75 ? 'ALTA' :
          priorityScore > 0.50 ? 'MEDIA' :
          'BAJA'
      };
    });

    const ranking = scores.sort((a, b) => b.priorityScore - a.priorityScore);

    return {
      ranking,
      topTen: ranking.slice(0, 10),
      resumen: {
        maxima: ranking.filter(p => p.prioridad === 'MÁXIMA').length,
        alta: ranking.filter(p => p.prioridad === 'ALTA').length,
        media: ranking.filter(p => p.prioridad === 'MEDIA').length,
        baja: ranking.filter(p => p.prioridad === 'BAJA').length
      }
    };
  }
};

// ============================================================================
// MotorNormalizacionHistorica está definido en engine.js — no duplicar aquí

// ============================================================================
// EXPORTAR NUEVOS MOTORES
// ============================================================================
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    MotorPivotElectoral,
    MotorRutaVictoria,
    MotorMetaElectoral,
    MotorPrioridadEstrategica
  };
}

