import { describe, it, expect } from 'vitest';
import {
  calcularDesgloseGasto,
  calcularSaldosBolsillos,
  calcularDiagnosticoArqueo,
  CONFIG_DEFAULT,
  TARIFAS_TRANSPORTE,
} from './accounting';
import type {
  Movimiento,
  ConfiguracionSistema,
} from '../types';

describe('Motor Contable y Reglas de Negocio de Ecuador', () => {
  describe('CONFIG_DEFAULT', () => {
    it('debe contener los valores por defecto del sistema contable', () => {
      expect(CONFIG_DEFAULT.baseMensual).toBe(200.00);
      expect(CONFIG_DEFAULT.costoTransferenciaSPI).toBe(0.20);
      expect(CONFIG_DEFAULT.porcentajeIVADigital).toBe(15);
      expect(CONFIG_DEFAULT.vibracionTactil).toBe(true);
    });
  });

  describe('TARIFAS_TRANSPORTE', () => {
    it('debe exportar las tarifas oficiales de transporte en Quito', () => {
      expect(TARIFAS_TRANSPORTE.METRO).toBe(0.45);
      expect(TARIFAS_TRANSPORTE.BUS_URBANO).toBe(0.35);
      expect(TARIFAS_TRANSPORTE.BUS_VALLES_MIN).toBe(0.45);
      expect(TARIFAS_TRANSPORTE.BUS_VALLES_MED).toBe(0.55);
      expect(TARIFAS_TRANSPORTE.BUS_VALLES_MAX).toBe(0.75);
    });
  });

  describe('calcularDesgloseGasto', () => {
    it('debe aplicar 15% IVA digital cuando la categoría es UBER y el método de pago es DEBITO_PRODUBANCO', () => {
      const resultado = calcularDesgloseGasto('UBER', 'DEBITO_PRODUBANCO', 10.00);

      expect(resultado.montoBase).toBe(10.00);
      expect(resultado.impuestoDigitalIVA).toBe(1.50);
      expect(resultado.comisionBancaria).toBe(0);
      expect(resultado.montoTotalDebitado).toBe(11.50);
      expect(resultado.estadoReembolso).toBe('NO_APLICA');
    });

    it('no debe aplicar IVA si el débito con tarjeta Produbanco es de otra categoría (ej. METRO o ALIMENTACION)', () => {
      const metro = calcularDesgloseGasto('METRO', 'DEBITO_PRODUBANCO', 0.45);
      expect(metro.montoBase).toBe(0.45);
      expect(metro.impuestoDigitalIVA).toBe(0);
      expect(metro.comisionBancaria).toBe(0);
      expect(metro.montoTotalDebitado).toBe(0.45);
      expect(metro.estadoReembolso).toBe('NO_APLICA');

      const comida = calcularDesgloseGasto('ALIMENTACION', 'DEBITO_PRODUBANCO', 5.50);
      expect(comida.impuestoDigitalIVA).toBe(0);
      expect(comida.montoTotalDebitado).toBe(5.50);
    });

    it('debe aplicar comisión SPI de $0.20 y $0 IVA cuando se paga con DEUNA_PRODUBANCO', () => {
      const indrive = calcularDesgloseGasto('INDRIVE', 'DEUNA_PRODUBANCO', 5.00);

      expect(indrive.montoBase).toBe(5.00);
      expect(indrive.comisionBancaria).toBe(0.20);
      expect(indrive.impuestoDigitalIVA).toBe(0);
      expect(indrive.montoTotalDebitado).toBe(5.20);
      expect(indrive.estadoReembolso).toBe('NO_APLICA');
    });

    it('inDrive/Uber con DEUNA_PRODUBANCO no debe generar IVA digital pero sí comisión SPI de $0.20', () => {
      const uberDeUna = calcularDesgloseGasto('UBER', 'DEUNA_PRODUBANCO', 10.00);

      expect(uberDeUna.montoBase).toBe(10.00);
      expect(uberDeUna.comisionBancaria).toBe(0.20);
      expect(uberDeUna.impuestoDigitalIVA).toBe(0);
      expect(uberDeUna.montoTotalDebitado).toBe(10.20);
      expect(uberDeUna.estadoReembolso).toBe('NO_APLICA');
    });

    it('debe registrar DEUNA_PERSONAL con $0 comisión, $0 IVA, montoTotalDebitado = 0 y estado PENDIENTE', () => {
      const resultado = calcularDesgloseGasto('INDRIVE', 'DEUNA_PERSONAL', 6.50);

      expect(resultado.montoBase).toBe(6.50);
      expect(resultado.comisionBancaria).toBe(0);
      expect(resultado.impuestoDigitalIVA).toBe(0);
      expect(resultado.montoTotalDebitado).toBe(0);
      expect(resultado.estadoReembolso).toBe('PENDIENTE');
    });

    it('debe registrar EFECTIVO_CAJA con $0 comisión, $0 IVA, débito = montoBase y estado NO_APLICA', () => {
      const bus = calcularDesgloseGasto('BUS_URBANO', 'EFECTIVO_CAJA', 0.35);

      expect(bus.montoBase).toBe(0.35);
      expect(bus.comisionBancaria).toBe(0);
      expect(bus.impuestoDigitalIVA).toBe(0);
      expect(bus.montoTotalDebitado).toBe(0.35);
      expect(bus.estadoReembolso).toBe('NO_APLICA');
    });

    it('debe respetar configuración personalizada de IVA y comisión SPI', () => {
      const customConfig: ConfiguracionSistema = {
        baseMensual: 250.00,
        costoTransferenciaSPI: 0.30,
        porcentajeIVADigital: 12,
        vibracionTactil: false,
      };

      const uberCustom = calcularDesgloseGasto('UBER', 'DEBITO_PRODUBANCO', 10.00, customConfig);
      expect(uberCustom.impuestoDigitalIVA).toBe(1.20);
      expect(uberCustom.montoTotalDebitado).toBe(11.20);

      const deunaCustom = calcularDesgloseGasto('TAXI', 'DEUNA_PRODUBANCO', 10.00, customConfig);
      expect(deunaCustom.comisionBancaria).toBe(0.30);
      expect(deunaCustom.montoTotalDebitado).toBe(10.30);
    });

    it('debe redondear adecuadamente centavos fraccionarios a 2 decimales', () => {
      const resultado = calcularDesgloseGasto('UBER', 'DEBITO_PRODUBANCO', 10.33);
      // 10.33 * 0.15 = 1.5495 -> 1.55
      expect(resultado.impuestoDigitalIVA).toBe(1.55);
      expect(resultado.montoTotalDebitado).toBe(11.88);
    });
  });

  describe('calcularSaldosBolsillos', () => {
    it('debe retornar saldo inicial completo sin movimientos', () => {
      const saldos = calcularSaldosBolsillos([], 200.00);

      expect(saldos.saldoProdubanco).toBe(200.00);
      expect(saldos.saldoEfectivo).toBe(0.00);
      expect(saldos.saldoPendienteReembolso).toBe(0.00);
      expect(saldos.totalGastosMes).toBe(0.00);
      expect(saldos.baseMensual).toBe(200.00);
    });

    it('debe manejar retiro de cajero traspasando fondos de Produbanco a Efectivo sin considerarlo gasto', () => {
      const movimientos: Movimiento[] = [
        {
          id: 'ret-1',
          fechaHora: '2026-09-15T09:00:00-05:00',
          tipo: 'RETIRO_CAJERO',
          categoria: 'RETIRO_CAJERO',
          metodoPago: 'DEBITO_PRODUBANCO',
          montoBase: 40.00,
          comisionBancaria: 0,
          impuestoDigitalIVA: 0,
          montoTotalDebitado: 40.00,
          estadoReembolso: 'NO_APLICA',
        },
      ];

      const saldos = calcularSaldosBolsillos(movimientos, 200.00);

      expect(saldos.saldoProdubanco).toBe(160.00);
      expect(saldos.saldoEfectivo).toBe(40.00);
      expect(saldos.saldoPendienteReembolso).toBe(0.00);
      expect(saldos.totalGastosMes).toBe(0.00); // Retiro NO es gasto
    });

    it('debe deducir gasto en efectivo únicamente del bolsillo de Efectivo en mano', () => {
      const movimientos: Movimiento[] = [
        {
          id: 'ret-1',
          fechaHora: '2026-09-15T09:00:00-05:00',
          tipo: 'RETIRO_CAJERO',
          categoria: 'RETIRO_CAJERO',
          metodoPago: 'DEBITO_PRODUBANCO',
          montoBase: 50.00,
          comisionBancaria: 0,
          impuestoDigitalIVA: 0,
          montoTotalDebitado: 50.00,
          estadoReembolso: 'NO_APLICA',
        },
        {
          id: 'gasto-1',
          fechaHora: '2026-09-15T09:30:00-05:00',
          tipo: 'GASTO',
          categoria: 'BUS_URBANO',
          metodoPago: 'EFECTIVO_CAJA',
          montoBase: 0.35,
          comisionBancaria: 0,
          impuestoDigitalIVA: 0,
          montoTotalDebitado: 0.35,
          estadoReembolso: 'NO_APLICA',
        },
      ];

      const saldos = calcularSaldosBolsillos(movimientos, 200.00);

      expect(saldos.saldoProdubanco).toBe(150.00);
      expect(saldos.saldoEfectivo).toBe(49.65);
      expect(saldos.totalGastosMes).toBe(0.35);
    });

    it('debe deducir gastos con tarjeta física (incluyendo IVA digital de Uber) de Produbanco', () => {
      const movimientos: Movimiento[] = [
        {
          id: 'gasto-uber',
          fechaHora: '2026-09-15T10:00:00-05:00',
          tipo: 'GASTO',
          categoria: 'UBER',
          metodoPago: 'DEBITO_PRODUBANCO',
          montoBase: 10.00,
          comisionBancaria: 0,
          impuestoDigitalIVA: 1.50,
          montoTotalDebitado: 11.50,
          estadoReembolso: 'NO_APLICA',
        },
      ];

      const saldos = calcularSaldosBolsillos(movimientos, 200.00);

      expect(saldos.saldoProdubanco).toBe(188.50);
      expect(saldos.saldoEfectivo).toBe(0.00);
      expect(saldos.totalGastosMes).toBe(11.50);
    });

    it('debe deducir De Una Produbanco (monto + $0.20 comisión) de Produbanco', () => {
      const movimientos: Movimiento[] = [
        {
          id: 'gasto-deuna-produbanco',
          fechaHora: '2026-09-15T11:00:00-05:00',
          tipo: 'GASTO',
          categoria: 'INDRIVE',
          metodoPago: 'DEUNA_PRODUBANCO',
          montoBase: 5.00,
          comisionBancaria: 0.20,
          impuestoDigitalIVA: 0,
          montoTotalDebitado: 5.20,
          estadoReembolso: 'NO_APLICA',
        },
      ];

      const saldos = calcularSaldosBolsillos(movimientos, 200.00);

      expect(saldos.saldoProdubanco).toBe(194.80);
      expect(saldos.saldoEfectivo).toBe(0.00);
      expect(saldos.saldoPendienteReembolso).toBe(0.00);
      expect(saldos.totalGastosMes).toBe(5.20);
    });

    it('debe acumular en saldoPendienteReembolso los gastos con De Una Personal sin afectar Produbanco ni Efectivo', () => {
      const movimientos: Movimiento[] = [
        {
          id: 'gasto-deuna-pers-1',
          fechaHora: '2026-09-15T12:00:00-05:00',
          tipo: 'GASTO',
          categoria: 'INDRIVE',
          metodoPago: 'DEUNA_PERSONAL',
          montoBase: 4.50,
          comisionBancaria: 0,
          impuestoDigitalIVA: 0,
          montoTotalDebitado: 0,
          estadoReembolso: 'PENDIENTE',
        },
        {
          id: 'gasto-deuna-pers-2',
          fechaHora: '2026-09-15T13:00:00-05:00',
          tipo: 'GASTO',
          categoria: 'TAXI',
          metodoPago: 'DEUNA_PERSONAL',
          montoBase: 3.00,
          comisionBancaria: 0,
          impuestoDigitalIVA: 0,
          montoTotalDebitado: 0,
          estadoReembolso: 'PENDIENTE',
        },
      ];

      const saldos = calcularSaldosBolsillos(movimientos, 200.00);

      expect(saldos.saldoProdubanco).toBe(200.00);
      expect(saldos.saldoEfectivo).toBe(0.00);
      expect(saldos.saldoPendienteReembolso).toBe(7.50);
      expect(saldos.totalGastosMes).toBe(7.50);
    });

    it('debe procesar AUTO_REEMBOLSO deduciendo (deuda + $0.20 comisión) de Produbanco y liquidando saldoPendienteReembolso', () => {
      const movimientos: Movimiento[] = [
        {
          id: 'gasto-pers',
          fechaHora: '2026-09-15T12:00:00-05:00',
          tipo: 'GASTO',
          categoria: 'INDRIVE',
          metodoPago: 'DEUNA_PERSONAL',
          montoBase: 10.00,
          comisionBancaria: 0,
          impuestoDigitalIVA: 0,
          montoTotalDebitado: 0,
          estadoReembolso: 'PENDIENTE',
        },
        {
          id: 'reembolso-1',
          fechaHora: '2026-09-15T14:00:00-05:00',
          tipo: 'AUTO_REEMBOLSO',
          categoria: 'OTROS',
          metodoPago: 'DEBITO_PRODUBANCO',
          montoBase: 10.00,
          comisionBancaria: 0.20,
          impuestoDigitalIVA: 0,
          montoTotalDebitado: 10.20,
          estadoReembolso: 'REEMBOLSADO',
        },
      ];

      const saldos = calcularSaldosBolsillos(movimientos, 200.00);

      expect(saldos.saldoProdubanco).toBe(189.80); // 200 - (10.00 + 0.20)
      expect(saldos.saldoPendienteReembolso).toBe(0.00); // 10 - 10 = 0
      expect(saldos.saldoEfectivo).toBe(0.00);
      expect(saldos.totalGastosMes).toBe(10.00); // El gasto fue $10.00
    });

    it('debe calcular correctamente un mes completo con operaciones combinadas', () => {
      const movimientos: Movimiento[] = [
        // Retiro cajero $50
        {
          id: 'm1',
          fechaHora: '2026-09-01T08:00:00-05:00',
          tipo: 'RETIRO_CAJERO',
          categoria: 'RETIRO_CAJERO',
          metodoPago: 'DEBITO_PRODUBANCO',
          montoBase: 50.00,
          comisionBancaria: 0,
          impuestoDigitalIVA: 0,
          montoTotalDebitado: 50.00,
          estadoReembolso: 'NO_APLICA',
        },
        // Metro $0.45 en efectivo
        {
          id: 'm2',
          fechaHora: '2026-09-01T09:00:00-05:00',
          tipo: 'GASTO',
          categoria: 'METRO',
          metodoPago: 'EFECTIVO_CAJA',
          montoBase: 0.45,
          comisionBancaria: 0,
          impuestoDigitalIVA: 0,
          montoTotalDebitado: 0.45,
          estadoReembolso: 'NO_APLICA',
        },
        // Bus urbano $0.35 en efectivo
        {
          id: 'm3',
          fechaHora: '2026-09-01T12:00:00-05:00',
          tipo: 'GASTO',
          categoria: 'BUS_URBANO',
          metodoPago: 'EFECTIVO_CAJA',
          montoBase: 0.35,
          comisionBancaria: 0,
          impuestoDigitalIVA: 0,
          montoTotalDebitado: 0.35,
          estadoReembolso: 'NO_APLICA',
        },
        // Uber $10 con tarjeta Produbanco (+15% IVA = $11.50)
        {
          id: 'm4',
          fechaHora: '2026-09-01T14:00:00-05:00',
          tipo: 'GASTO',
          categoria: 'UBER',
          metodoPago: 'DEBITO_PRODUBANCO',
          montoBase: 10.00,
          comisionBancaria: 0,
          impuestoDigitalIVA: 1.50,
          montoTotalDebitado: 11.50,
          estadoReembolso: 'NO_APLICA',
        },
        // inDrive $6 con De Una Produbanco (+$0.20 = $6.20)
        {
          id: 'm5',
          fechaHora: '2026-09-01T16:00:00-05:00',
          tipo: 'GASTO',
          categoria: 'INDRIVE',
          metodoPago: 'DEUNA_PRODUBANCO',
          montoBase: 6.00,
          comisionBancaria: 0.20,
          impuestoDigitalIVA: 0,
          montoTotalDebitado: 6.20,
          estadoReembolso: 'NO_APLICA',
        },
        // Comida $5 con De Una Personal (pendiente $5)
        {
          id: 'm6',
          fechaHora: '2026-09-01T18:00:00-05:00',
          tipo: 'GASTO',
          categoria: 'ALIMENTACION',
          metodoPago: 'DEUNA_PERSONAL',
          montoBase: 5.00,
          comisionBancaria: 0,
          impuestoDigitalIVA: 0,
          montoTotalDebitado: 0,
          estadoReembolso: 'PENDIENTE',
        },
      ];

      const saldos = calcularSaldosBolsillos(movimientos, 200.00);

      // Produbanco: 200 - 50 (cajero) - 11.50 (uber) - 6.20 (deuna produbanco) = 132.30
      expect(saldos.saldoProdubanco).toBe(132.30);
      // Efectivo: 50 (cajero) - 0.45 (metro) - 0.35 (bus) = 49.20
      expect(saldos.saldoEfectivo).toBe(49.20);
      // Pendiente: $5.00
      expect(saldos.saldoPendienteReembolso).toBe(5.00);
      // Total gastos mes: 0.45 + 0.35 + 11.50 + 6.20 + 5.00 = 23.50
      expect(saldos.totalGastosMes).toBe(23.50);
    });
  });

  describe('calcularDiagnosticoArqueo', () => {
    it('debe indicar arqueo cuadrado si saldos reales coinciden exactamente con los teóricos', () => {
      const diag = calcularDiagnosticoArqueo(150.00, 45.00, 150.00, 45.00);

      expect(diag.cuadrado).toBe(true);
      expect(diag.diffBanco).toBe(0.00);
      expect(diag.diffEfectivo).toBe(0.00);
      expect(diag.pistas).toEqual([]);
    });

    it('debe detectar faltante de $0.35 en efectivo y sugerir pasaje de bus urbano olvidado', () => {
      // Real efectivo: $44.65, Teórico efectivo: $45.00 -> diff: -0.35
      const diag = calcularDiagnosticoArqueo(150.00, 44.65, 150.00, 45.00);

      expect(diag.cuadrado).toBe(false);
      expect(diag.diffEfectivo).toBe(-0.35);
      expect(diag.diffBanco).toBe(0.00);
      expect(diag.pistas).toContain('Posible pasaje de bus urbano olvidado ($0.35)');
    });

    it('debe sugerir pasaje de bus cuando el faltante es múltiplo de $0.35 (ej. $0.70 por ida y vuelta)', () => {
      // Real efectivo: $44.30, Teórico: $45.00 -> diff: -0.70
      const diag = calcularDiagnosticoArqueo(150.00, 44.30, 150.00, 45.00);

      expect(diag.cuadrado).toBe(false);
      expect(diag.diffEfectivo).toBe(-0.70);
      expect(diag.pistas).toContain('Posible pasaje de bus urbano olvidado ($0.35)');
    });

    it('debe detectar faltante de $0.45 en efectivo y sugerir pasaje de Metro de Quito olvidado', () => {
      // Real efectivo: $44.55, Teórico: $45.00 -> diff: -0.45
      const diag = calcularDiagnosticoArqueo(150.00, 44.55, 150.00, 45.00);

      expect(diag.cuadrado).toBe(false);
      expect(diag.diffEfectivo).toBe(-0.45);
      expect(diag.pistas).toContain('Posible pasaje de Metro de Quito olvidado ($0.45)');
    });

    it('debe detectar faltante de $0.20 en banco y sugerir comisión SPI de Produbanco no anotada', () => {
      // Real banco: $149.80, Teórico banco: $150.00 -> diff: -0.20
      const diag = calcularDiagnosticoArqueo(149.80, 45.00, 150.00, 45.00);

      expect(diag.cuadrado).toBe(false);
      expect(diag.diffBanco).toBe(-0.20);
      expect(diag.pistas).toContain('Posible comisión SPI de Produbanco no anotada ($0.20)');
    });

    it('debe diagnosticar múltiples faltantes simultáneos (comisión SPI + bus urbano)', () => {
      // Banco falta 0.20, Efectivo falta 0.35
      const diag = calcularDiagnosticoArqueo(149.80, 44.65, 150.00, 45.00);

      expect(diag.cuadrado).toBe(false);
      expect(diag.diffBanco).toBe(-0.20);
      expect(diag.diffEfectivo).toBe(-0.35);
      expect(diag.pistas).toContain('Posible comisión SPI de Produbanco no anotada ($0.20)');
      expect(diag.pistas).toContain('Posible pasaje de bus urbano olvidado ($0.35)');
    });

    it('no debe incluir pistas predeterminadas si el descuadre no coincide con patrones de transporte/bancarios', () => {
      // Faltan $12.34 en banco y sobra $1.00 en efectivo
      const diag = calcularDiagnosticoArqueo(137.66, 46.00, 150.00, 45.00);

      expect(diag.cuadrado).toBe(false);
      expect(diag.diffBanco).toBe(-12.34);
      expect(diag.diffEfectivo).toBe(1.00);
      expect(diag.pistas).not.toContain('Posible pasaje de bus urbano olvidado ($0.35)');
      expect(diag.pistas).not.toContain('Posible pasaje de Metro de Quito olvidado ($0.45)');
      expect(diag.pistas).not.toContain('Posible comisión SPI de Produbanco no anotada ($0.20)');
    });

    it('no debe sugerir comisión SPI ante descuadres de dólares enteros en banco (-$10.00 y -$5.00)', () => {
      const diag10 = calcularDiagnosticoArqueo(140.00, 45.00, 150.00, 45.00);
      expect(diag10.diffBanco).toBe(-10.00);
      expect(diag10.pistas).not.toContain('Posible comisión SPI de Produbanco no anotada ($0.20)');

      const diag5 = calcularDiagnosticoArqueo(145.00, 45.00, 150.00, 45.00);
      expect(diag5.diffBanco).toBe(-5.00);
      expect(diag5.pistas).not.toContain('Posible comisión SPI de Produbanco no anotada ($0.20)');
    });

    it('no debe sugerir pasaje de bus ante descuadres de 1¢ o 2¢ en efectivo (-$0.01 y -$0.02)', () => {
      const diag1c = calcularDiagnosticoArqueo(150.00, 44.99, 150.00, 45.00);
      expect(diag1c.diffEfectivo).toBe(-0.01);
      expect(diag1c.pistas).not.toContain('Posible pasaje de bus urbano olvidado ($0.35)');

      const diag2c = calcularDiagnosticoArqueo(150.00, 44.98, 150.00, 45.00);
      expect(diag2c.diffEfectivo).toBe(-0.02);
      expect(diag2c.pistas).not.toContain('Posible pasaje de bus urbano olvidado ($0.35)');
    });

    it('debe sugerir comisión SPI ante descuadres de -$0.20 y -$0.40 en banco', () => {
      const diag20 = calcularDiagnosticoArqueo(149.80, 45.00, 150.00, 45.00);
      expect(diag20.diffBanco).toBe(-0.20);
      expect(diag20.pistas).toContain('Posible comisión SPI de Produbanco no anotada ($0.20)');

      const diag40 = calcularDiagnosticoArqueo(149.60, 45.00, 150.00, 45.00);
      expect(diag40.diffBanco).toBe(-0.40);
      expect(diag40.pistas).toContain('Posible comisión SPI de Produbanco no anotada ($0.20)');
    });
  });
});
