import { describe, it, expect, beforeEach } from 'vitest';
import { db, limpiarBaseDatosParaPruebas, registrarMovimiento, registrarArqueo, guardarConfiguracion } from '../db/db';
import { exportarBackupJSON, importarBackupJSON } from './backupRestore';
import type { Movimiento, RegistroArqueo } from '../types';

describe('backupRestore', () => {
  beforeEach(async () => {
    await limpiarBaseDatosParaPruebas();
  });

  it('exports valid JSON containing movements, audits, and configuration', async () => {
    await registrarMovimiento({
      id: 'mov-1',
      fechaHora: '2026-09-15T10:00:00.000Z',
      tipo: 'GASTO',
      categoria: 'METRO',
      metodoPago: 'EFECTIVO_CAJA',
      montoBase: 0.45,
      comisionBancaria: 0,
      impuestoDigitalIVA: 0,
      montoTotalDebitado: 0.45,
      estadoReembolso: 'NO_APLICA',
    });

    await registrarArqueo({
      id: 'arq-1',
      fechaHora: '2026-09-15T18:00:00.000Z',
      saldoRealBanco: 200,
      saldoTeoricoBanco: 200,
      diferenciaBanco: 0,
      saldoRealEfectivo: 0,
      saldoTeoricoEfectivo: 0,
      diferenciaEfectivo: 0,
      estado: 'CUADRADO',
    });

    await guardarConfiguracion({ baseMensual: 250 });

    const jsonStr = await exportarBackupJSON(false);
    expect(typeof jsonStr).toBe('string');

    const parsed = JSON.parse(jsonStr);
    expect(parsed.version).toBe(1);
    expect(parsed.sistema).toContain('Billetera Caja Chica');
    expect(parsed.datos.movimientos).toHaveLength(1);
    expect(parsed.datos.movimientos[0].id).toBe('mov-1');
    expect(parsed.datos.arqueos).toHaveLength(1);
    expect(parsed.datos.arqueos[0].id).toBe('arq-1');
    expect(parsed.datos.configuracion).toBeDefined();
  });

  it('restores movements, audits, and configuration from valid JSON backup', async () => {
    // Current database with old data
    await registrarMovimiento({
      id: 'mov-old',
      fechaHora: '2026-09-01T10:00:00.000Z',
      tipo: 'GASTO',
      categoria: 'TAXI',
      metodoPago: 'EFECTIVO_CAJA',
      montoBase: 2.50,
      comisionBancaria: 0,
      impuestoDigitalIVA: 0,
      montoTotalDebitado: 2.50,
      estadoReembolso: 'NO_APLICA',
    });

    const mockBackup = {
      version: 1,
      sistema: 'Billetera Caja Chica - Quito',
      fechaExportacion: '2026-09-15T15:00:00.000Z',
      datos: {
        movimientos: [
          {
            id: 'mov-new-1',
            fechaHora: '2026-09-15T11:00:00.000Z',
            tipo: 'GASTO',
            categoria: 'UBER',
            metodoPago: 'DEBITO_PRODUBANCO',
            montoBase: 4.00,
            comisionBancaria: 0,
            impuestoDigitalIVA: 0.60,
            montoTotalDebitado: 4.60,
            estadoReembolso: 'NO_APLICA',
            nota: 'Viaje a reuniones en Cumbayá',
          } as Movimiento,
        ],
        arqueos: [
          {
            id: 'arq-new-1',
            fechaHora: '2026-09-15T17:00:00.000Z',
            saldoRealBanco: 195.40,
            saldoTeoricoBanco: 195.40,
            diferenciaBanco: 0,
            saldoRealEfectivo: 0,
            saldoTeoricoEfectivo: 0,
            diferenciaEfectivo: 0,
            estado: 'CUADRADO',
          } as RegistroArqueo,
        ],
        configuracion: [
          {
            id: 'default',
            baseMensual: 200,
            costoTransferenciaSPI: 0.20,
            porcentajeIVADigital: 15,
            vibracionTactil: true,
          },
        ],
      },
    };

    const result = await importarBackupJSON(JSON.stringify(mockBackup));
    expect(result).toBe(true);

    const movimientos = await db.movimientos.toArray();
    expect(movimientos).toHaveLength(1);
    expect(movimientos[0].id).toBe('mov-new-1');
    expect(movimientos[0].nota).toBe('Viaje a reuniones en Cumbayá');

    const arqueos = await db.arqueos.toArray();
    expect(arqueos).toHaveLength(1);
    expect(arqueos[0].id).toBe('arq-new-1');
  });

  it('rejects invalid or corrupted JSON strings', async () => {
    await expect(importarBackupJSON('')).rejects.toThrow(/vacío o inválido/i);
    await expect(importarBackupJSON('not valid json')).rejects.toThrow(/JSON válido/i);
    await expect(importarBackupJSON(JSON.stringify({ algo: 'invalido' }))).rejects.toThrow(
      /no contiene datos de movimientos, arqueos ni configuración/i,
    );
  });

  it('rejects backup with corrupted movement items missing required fields', async () => {
    const corruptBackup = {
      datos: {
        movimientos: [
          {
            id: 'mov-sin-monto',
            // montoBase is missing!
            metodoPago: 'EFECTIVO_CAJA',
          },
        ],
      },
    };

    await expect(importarBackupJSON(JSON.stringify(corruptBackup))).rejects.toThrow(
      /movimientos corruptos o con campos requeridos faltantes/i,
    );
  });
});
