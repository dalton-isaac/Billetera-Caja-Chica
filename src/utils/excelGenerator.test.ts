import { describe, it, expect } from 'vitest';

import * as XLSX from 'xlsx';
import { generarReporteExcel } from './excelGenerator';
import type { Movimiento, SaldosBolsillos } from '../types';

describe('excelGenerator', () => {
  const mockSaldos: SaldosBolsillos = {
    baseMensual: 200.0,
    saldoProdubanco: 185.0,
    saldoEfectivo: 9.55,
    saldoPendienteReembolso: 5.0,
    totalGastosMes: 15.45,
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
      nota: 'Viaje Quitumbe - San Francisco',
    },
    {
      id: 'mov-2',
      fechaHora: '2026-09-15T12:00:00.000Z',
      tipo: 'GASTO',
      categoria: 'UBER',
      metodoPago: 'DEBITO_PRODUBANCO',
      montoBase: 5.0,
      comisionBancaria: 0,
      impuestoDigitalIVA: 0.75,
      montoTotalDebitado: 5.75,
      estadoReembolso: 'NO_APLICA',
    },
    {
      id: 'mov-3',
      fechaHora: '2026-09-15T16:00:00.000Z',
      tipo: 'AUTO_REEMBOLSO',
      metodoPago: 'DEBITO_PRODUBANCO',
      montoBase: 10.0,
      comisionBancaria: 0.20,
      impuestoDigitalIVA: 0,
      montoTotalDebitado: 10.20,
      estadoReembolso: 'REEMBOLSADO',
    },
  ];

  it('generates a workbook with "Movimientos" and "Resumen Contable" sheets', () => {
    const wb = generarReporteExcel(mockMovimientos, mockSaldos, 'Septiembre 2026', false);

    expect(wb).toBeDefined();
    expect(wb.SheetNames).toEqual(['Movimientos', 'Resumen Contable']);

    const wsMov = wb.Sheets['Movimientos'];
    expect(wsMov).toBeDefined();

    const dataMov = XLSX.utils.sheet_to_json<Record<string, unknown>>(wsMov);
    expect(dataMov).toHaveLength(3);
    expect(dataMov[0]['Categoría']).toBe('METRO');
    expect(dataMov[0]['Monto Base ($)']).toBe(0.45);
    expect(dataMov[0]['Notas']).toBe('Viaje Quitumbe - San Francisco');
    expect(dataMov[1]['IVA Digital 15% ($)']).toBe(0.75);
    expect(dataMov[1]['Total Debitado ($)']).toBe(5.75);
    expect(dataMov[2]['Categoría']).toBe('Auto-Reembolso Personal');
    expect(dataMov[2]['Comisión SPI $0.20 ($)']).toBe(0.20);
  });

  it('includes accounting summary rows in "Resumen Contable" sheet', () => {
    const wb = generarReporteExcel(mockMovimientos, mockSaldos, 'Septiembre 2026', false);

    const wsResumen = wb.Sheets['Resumen Contable'];
    const dataResumen = XLSX.utils.sheet_to_json<{ 'Concepto Contable': string; 'Valor ($)': unknown }>(wsResumen);

    expect(dataResumen.length).toBeGreaterThanOrEqual(6);

    const baseRow = dataResumen.find((r) => r['Concepto Contable'].includes('Fondo Base Asignado'));
    expect(baseRow?.['Valor ($)']).toBe(200.0);

    const gastosRow = dataResumen.find((r) => r['Concepto Contable'].includes('Total Gastos'));
    expect(gastosRow?.['Valor ($)']).toBe(15.45);

    const bancoRow = dataResumen.find((r) => r['Concepto Contable'].includes('Saldo Banco Produbanco'));
    expect(bancoRow?.['Valor ($)']).toBe(185.0);

    const periodRow = dataResumen.find((r) => r['Concepto Contable'].includes('Periodo Reportado'));
    expect(periodRow?.['Valor ($)']).toBe('Septiembre 2026');
  });

  it('generates workbook and executes successfully when descargar is true', () => {
    const wb = generarReporteExcel(mockMovimientos, mockSaldos, 'Septiembre 2026', true);
    expect(wb).toBeDefined();
    expect(wb.SheetNames).toContain('Movimientos');
    expect(wb.SheetNames).toContain('Resumen Contable');
  });
});

