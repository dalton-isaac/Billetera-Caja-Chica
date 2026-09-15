import type {
  CategoriaGasto,
  ConfiguracionSistema,
  DesgloseGasto,
  DiagnosticoArqueo,
  EstadoReembolso,
  MetodoPago,
  Movimiento,
  SaldosBolsillos,
} from '../types';

export const CONFIG_DEFAULT: ConfiguracionSistema = {
  baseMensual: 200.00,
  costoTransferenciaSPI: 0.20,
  porcentajeIVADigital: 15,
  vibracionTactil: true,
};

export const TARIFAS_TRANSPORTE = {
  METRO: 0.45,
  BUS_URBANO: 0.35,
  BUS_VALLES_MIN: 0.45,
  BUS_VALLES_MED: 0.55,
  BUS_VALLES_MAX: 0.75,
} as const;

/**
 * Redondea un valor numérico a 2 decimales según el estándar del sistema.
 */
export function roundToTwo(val: number): number {
  return Number(val.toFixed(2));
}

/**
 * Calcula el desglose contable, impuestos y comisiones bancarias de un gasto.
 */
export function calcularDesgloseGasto(
  categoria: CategoriaGasto,
  metodoPago: MetodoPago,
  montoBase: number,
  config: ConfiguracionSistema = CONFIG_DEFAULT,
): DesgloseGasto {
  const base = roundToTwo(montoBase);
  let comisionBancaria = 0;
  let impuestoDigitalIVA = 0;
  let montoTotalDebitado = 0;
  let estadoReembolso: EstadoReembolso = 'NO_APLICA';

  switch (metodoPago) {
    case 'DEBITO_PRODUBANCO':
      if (categoria === 'UBER') {
        impuestoDigitalIVA = roundToTwo(base * (config.porcentajeIVADigital / 100));
        montoTotalDebitado = roundToTwo(base + impuestoDigitalIVA);
      } else {
        montoTotalDebitado = base;
      }
      estadoReembolso = 'NO_APLICA';
      break;

    case 'DEUNA_PRODUBANCO':
      comisionBancaria = roundToTwo(config.costoTransferenciaSPI);
      impuestoDigitalIVA = 0;
      montoTotalDebitado = roundToTwo(base + comisionBancaria);
      estadoReembolso = 'NO_APLICA';
      break;

    case 'DEUNA_PERSONAL':
      comisionBancaria = 0;
      impuestoDigitalIVA = 0;
      montoTotalDebitado = 0;
      estadoReembolso = 'PENDIENTE';
      break;

    case 'EFECTIVO_CAJA':
      comisionBancaria = 0;
      impuestoDigitalIVA = 0;
      montoTotalDebitado = base;
      estadoReembolso = 'NO_APLICA';
      break;
  }

  return {
    montoBase: base,
    comisionBancaria,
    impuestoDigitalIVA,
    impuestoIVA: impuestoDigitalIVA,
    montoTotalDebitado,
    estadoReembolso,
  };
}

/**
 * Calcula los saldos de los tres bolsillos virtuales y el total de gastos acumulados.
 */
export function calcularSaldosBolsillos(
  movimientos: Movimiento[],
  baseMensual = 200.00,
): SaldosBolsillos {
  let saldoProdubanco = baseMensual;
  let saldoEfectivo = 0.00;
  let saldoPendienteReembolso = 0.00;
  let totalGastosMes = 0.00;

  for (const m of movimientos) {
    const isRetiro = m.tipo === 'RETIRO_CAJERO' || m.categoria === 'RETIRO_CAJERO';

    if (m.tipo === 'FONDEO_BASE') {
      saldoProdubanco += m.montoBase;
      continue;
    }

    if (isRetiro) {
      const debitoRetiro = m.montoTotalDebitado > 0 ? m.montoTotalDebitado : m.montoBase;
      saldoProdubanco -= debitoRetiro;
      saldoEfectivo += m.montoBase;
      continue;
    }

    if (m.tipo === 'AUTO_REEMBOLSO') {
      const comision = m.comisionBancaria !== undefined ? m.comisionBancaria : 0.20;
      const debitoReembolso = m.montoTotalDebitado > 0 ? m.montoTotalDebitado : (m.montoBase + comision);
      saldoProdubanco -= debitoReembolso;
      saldoPendienteReembolso -= m.montoBase;
      continue;
    }

    // Tipo GASTO o por defecto
    const comision = m.comisionBancaria || 0;
    const iva = m.impuestoDigitalIVA || 0;
    const gastoReal = m.montoBase + comision + iva;

    totalGastosMes += gastoReal;

    switch (m.metodoPago) {
      case 'DEBITO_PRODUBANCO': {
        const debito = m.montoTotalDebitado > 0 ? m.montoTotalDebitado : (m.montoBase + iva);
        saldoProdubanco -= debito;
        break;
      }
      case 'DEUNA_PRODUBANCO': {
        const debito = m.montoTotalDebitado > 0 ? m.montoTotalDebitado : (m.montoBase + comision);
        saldoProdubanco -= debito;
        break;
      }
      case 'EFECTIVO_CAJA': {
        saldoEfectivo -= m.montoBase;
        break;
      }
      case 'DEUNA_PERSONAL': {
        saldoPendienteReembolso += m.montoBase;
        break;
      }
    }
  }

  return {
    saldoProdubanco: roundToTwo(saldoProdubanco),
    saldoEfectivo: roundToTwo(saldoEfectivo),
    saldoPendienteReembolso: roundToTwo(saldoPendienteReembolso),
    totalGastosMes: roundToTwo(totalGastosMes),
    baseMensual: roundToTwo(baseMensual),
  };
}

/**
 * Realiza el diagnóstico del arqueo comparando saldos reales y teóricos,
 * sugiriendo pistas inteligentes ante descuadres típicos de Quito.
 */
export function calcularDiagnosticoArqueo(
  saldoRealBanco: number,
  saldoRealEfectivo: number,
  saldoTeoricoBanco: number,
  saldoTeoricoEfectivo: number,
): DiagnosticoArqueo {
  const diffBanco = roundToTwo(saldoRealBanco - saldoTeoricoBanco);
  const diffEfectivo = roundToTwo(saldoRealEfectivo - saldoTeoricoEfectivo);
  const cuadrado = Math.abs(diffBanco) === 0 && Math.abs(diffEfectivo) === 0;
  const pistas: string[] = [];

  // Diagnóstico bancario (ej. comisión SPI no anotada, hasta 3 transferencias)
  if (diffBanco < -0.001) {
    const centsBanco = Math.round(Math.abs(diffBanco) * 100);
    if (centsBanco <= 60 && centsBanco % 20 === 0) {
      pistas.push('Posible comisión SPI de Produbanco no anotada ($0.20)');
    }
  }

  // Diagnóstico efectivo (ej. pasaje Metro $0.45 o Bus $0.35)
  if (diffEfectivo < -0.001) {
    const centsEfectivo = Math.round(Math.abs(diffEfectivo) * 100);

    if (centsEfectivo === 45) {
      pistas.push('Posible pasaje de Metro de Quito olvidado ($0.45)');
    } else {
      const remainder = centsEfectivo % 35;
      const isMultipleOrClose =
        centsEfectivo >= 33 && (remainder === 0 || remainder <= 2 || remainder >= 33);

      if (isMultipleOrClose) {
        pistas.push('Posible pasaje de bus urbano olvidado ($0.35)');
      }
    }
  }

  return {
    cuadrado,
    diffBanco,
    diffEfectivo,
    pistas,
  };
}
