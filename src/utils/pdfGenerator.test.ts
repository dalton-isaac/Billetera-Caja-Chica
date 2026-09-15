import { describe, it, expect } from 'vitest';
import { generarReportePDF } from './pdfGenerator';

import type { Movimiento, SaldosBolsillos } from '../types';

describe('pdfGenerator', () => {
  const mockSaldos: SaldosBolsillos = {
    baseMensual: 200.0,
    saldoProdubanco: 180.0,
    saldoEfectivo: 14.20,
    saldoPendienteReembolso: 0.0,
    totalGastosMes: 19.80,
  };

  const mockMovimientos: Movimiento[] = [
    {
      id: 'mov-1',
      fechaHora: '2026-09-15T08:30:00.000Z',
      tipo: 'GASTO',
      categoria: 'METRO',
      metodoPago: 'EFECTIVO_CAJA',
      montoBase: 0.45,
      comisionBancaria: 0,
      impuestoDigitalIVA: 0,
      montoTotalDebitado: 0.45,
      estadoReembolso: 'NO_APLICA',
      nota: 'Estación El Labrador a El Recreo',
    },
    {
      id: 'mov-2',
      fechaHora: '2026-09-15T12:00:00.000Z',
      tipo: 'GASTO',
      categoria: 'UBER',
      metodoPago: 'DEBITO_PRODUBANCO',
      montoBase: 6.0,
      comisionBancaria: 0,
      impuestoDigitalIVA: 0.90,
      montoTotalDebitado: 6.90,
      estadoReembolso: 'NO_APLICA',
    },
    {
      id: 'mov-3',
      fechaHora: '2026-09-15T14:00:00.000Z',
      tipo: 'GASTO',
      categoria: 'OTROS',
      subcategoriaOtro: 'PARQUEADERO',
      metodoPago: 'DEUNA_PRODUBANCO',
      montoBase: 2.0,
      comisionBancaria: 0.20,
      impuestoDigitalIVA: 0,
      montoTotalDebitado: 2.20,
      estadoReembolso: 'NO_APLICA',
      nota: 'Parqueadero CCI',
    },
    {
      id: 'mov-4',
      fechaHora: '2026-09-15T15:00:00.000Z',
      tipo: 'AUTO_REEMBOLSO',
      metodoPago: 'DEBITO_PRODUBANCO',
      montoBase: 10.0,
      comisionBancaria: 0.20,
      impuestoDigitalIVA: 0,
      montoTotalDebitado: 10.20,
      estadoReembolso: 'REEMBOLSADO',
    },
  ];

  it('generates a valid jsPDF instance successfully', () => {
    const doc = generarReportePDF(
      mockMovimientos,
      mockSaldos,
      'Septiembre 2026',
      'Isaac Alarcón',
      false,
    );

    expect(doc).toBeDefined();
    expect(typeof doc.save).toBe('function');
    expect(typeof doc.text).toBe('function');
    expect(doc.internal.pages.length).toBeGreaterThanOrEqual(1);
  });

  it('handles empty movements list without crashing', () => {
    const doc = generarReportePDF([], mockSaldos, 'General', undefined, false);
    expect(doc).toBeDefined();
    expect(typeof doc.save).toBe('function');
    expect(doc.internal.pages.length).toBeGreaterThanOrEqual(1);
  });

  it('executes doc.save without errors when descargar is true', () => {
    const doc = generarReportePDF(
      mockMovimientos,
      mockSaldos,
      'Septiembre 2026',
      'Isaac Alarcón',
      true,
    );

    expect(doc).toBeDefined();
    expect(typeof doc.save).toBe('function');
  });
});

