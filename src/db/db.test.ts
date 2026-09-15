import { describe, it, expect, beforeEach } from 'vitest';
import {
  db,
  BilleteraDB,
  obtenerConfiguracion,
  inicializarBaseDatos,
  guardarConfiguracion,
  registrarMovimiento,
  eliminarMovimiento,
  obtenerMovimientosMes,
  registrarArqueo,
  obtenerHistorialArqueos,
  limpiarBaseDatosParaPruebas,
} from './db';
import { CONFIG_DEFAULT } from '../utils/accounting';

describe('Capa de Persistencia Local Offline con Dexie.js (IndexedDB)', () => {
  beforeEach(async () => {
    await limpiarBaseDatosParaPruebas();
  });

  describe('Instancia y esquema de la base de datos', () => {
    it('debe instanciar BilleteraDB con las tablas correctas', () => {
      expect(db).toBeInstanceOf(BilleteraDB);
      expect(db.name).toBe('BilleteraCajaChicaDB');
      expect(db.movimientos).toBeDefined();
      expect(db.arqueos).toBeDefined();
      expect(db.configuracion).toBeDefined();
    });
  });

  describe('Configuración del sistema', () => {
    it('debe devolver CONFIG_DEFAULT e inicializar la BD si no existe configuración previa', async () => {
      const config = await obtenerConfiguracion();
      expect(config).toEqual(CONFIG_DEFAULT);

      // Verificar que se guardó en la tabla configuracion
      const stored = await db.configuracion.get('default');
      expect(stored).toBeDefined();
      expect(stored?.baseMensual).toBe(200.0);
      expect(stored?.costoTransferenciaSPI).toBe(0.2);
      expect(stored?.porcentajeIVADigital).toBe(15);
      expect(stored?.vibracionTactil).toBe(true);
    });

    it('inicializarBaseDatos debe ser un alias funcional de obtenerConfiguracion', async () => {
      const config = await inicializarBaseDatos();
      expect(config).toEqual(CONFIG_DEFAULT);
    });

    it('debe permitir actualizar y persistir la configuración con guardarConfiguracion', async () => {
      await obtenerConfiguracion();
      await guardarConfiguracion({
        baseMensual: 250.0,
        costoTransferenciaSPI: 0.22,
      });

      const updated = await obtenerConfiguracion();
      expect(updated.baseMensual).toBe(250.0);
      expect(updated.costoTransferenciaSPI).toBe(0.22);
      expect(updated.porcentajeIVADigital).toBe(15);
      expect(updated.vibracionTactil).toBe(true);
    });
  });

  describe('Movimientos contables', () => {
    it('debe registrar un movimiento generando id UUID y fechaHora si faltan', async () => {
      const nuevo = await registrarMovimiento({
        tipo: 'GASTO',
        categoria: 'METRO',
        metodoPago: 'EFECTIVO_CAJA',
        montoBase: 0.45,
        comisionBancaria: 0,
        impuestoDigitalIVA: 0,
        montoTotalDebitado: 0.45,
        estadoReembolso: 'NO_APLICA',
      });

      expect(nuevo.id).toBeDefined();
      expect(typeof nuevo.id).toBe('string');
      expect(nuevo.id.length).toBeGreaterThan(10);
      expect(nuevo.fechaHora).toBeDefined();
      expect(new Date(nuevo.fechaHora).getTime()).not.toBeNaN();

      // Comprobar persistencia directa en la tabla
      const persisted = await db.movimientos.get(nuevo.id);
      expect(persisted).toEqual(nuevo);
    });

    it('debe respetar el id y fechaHora si ya vienen definidos', async () => {
      const customId = 'mov-12345';
      const customFecha = '2026-09-10T14:30:00.000Z';

      const nuevo = await registrarMovimiento({
        id: customId,
        fechaHora: customFecha,
        tipo: 'GASTO',
        categoria: 'UBER',
        metodoPago: 'DEBITO_PRODUBANCO',
        montoBase: 5.0,
        comisionBancaria: 0,
        impuestoDigitalIVA: 0.75,
        montoTotalDebitado: 5.75,
        estadoReembolso: 'NO_APLICA',
      });

      expect(nuevo.id).toBe(customId);
      expect(nuevo.fechaHora).toBe(customFecha);

      const persisted = await db.movimientos.get(customId);
      expect(persisted?.montoTotalDebitado).toBe(5.75);
    });

    it('debe eliminar un movimiento por id', async () => {
      const mov = await registrarMovimiento({
        tipo: 'GASTO',
        categoria: 'BUS_URBANO',
        metodoPago: 'EFECTIVO_CAJA',
        montoBase: 0.35,
        comisionBancaria: 0,
        impuestoDigitalIVA: 0,
        montoTotalDebitado: 0.35,
        estadoReembolso: 'NO_APLICA',
      });

      const antes = await db.movimientos.get(mov.id);
      expect(antes).toBeDefined();

      await eliminarMovimiento(mov.id);

      const despues = await db.movimientos.get(mov.id);
      expect(despues).toBeUndefined();
    });

    it('debe obtener movimientos ordenados descendentemente por fechaHora', async () => {
      await registrarMovimiento({
        id: 'mov-1',
        fechaHora: '2026-09-01T10:00:00.000Z',
        tipo: 'GASTO',
        categoria: 'METRO',
        metodoPago: 'EFECTIVO_CAJA',
        montoBase: 0.45,
        comisionBancaria: 0,
        impuestoDigitalIVA: 0,
        montoTotalDebitado: 0.45,
        estadoReembolso: 'NO_APLICA',
      });

      await registrarMovimiento({
        id: 'mov-2',
        fechaHora: '2026-09-05T12:00:00.000Z',
        tipo: 'GASTO',
        categoria: 'BUS_URBANO',
        metodoPago: 'EFECTIVO_CAJA',
        montoBase: 0.35,
        comisionBancaria: 0,
        impuestoDigitalIVA: 0,
        montoTotalDebitado: 0.35,
        estadoReembolso: 'NO_APLICA',
      });

      await registrarMovimiento({
        id: 'mov-3',
        fechaHora: '2026-09-03T15:00:00.000Z',
        tipo: 'GASTO',
        categoria: 'ALIMENTACION',
        metodoPago: 'DEBITO_PRODUBANCO',
        montoBase: 3.5,
        comisionBancaria: 0,
        impuestoDigitalIVA: 0,
        montoTotalDebitado: 3.5,
        estadoReembolso: 'NO_APLICA',
      });

      const todos = await obtenerMovimientosMes();
      expect(todos.map((m) => m.id)).toEqual(['mov-2', 'mov-3', 'mov-1']);
    });

    it('debe filtrar movimientos por mesAnio correctamente', async () => {
      await registrarMovimiento({
        id: 'ago-1',
        fechaHora: '2026-08-30T10:00:00.000Z',
        tipo: 'GASTO',
        categoria: 'METRO',
        metodoPago: 'EFECTIVO_CAJA',
        montoBase: 0.45,
        comisionBancaria: 0,
        impuestoDigitalIVA: 0,
        montoTotalDebitado: 0.45,
        estadoReembolso: 'NO_APLICA',
      });

      await registrarMovimiento({
        id: 'sep-1',
        fechaHora: '2026-09-01T10:00:00.000Z',
        tipo: 'GASTO',
        categoria: 'METRO',
        metodoPago: 'EFECTIVO_CAJA',
        montoBase: 0.45,
        comisionBancaria: 0,
        impuestoDigitalIVA: 0,
        montoTotalDebitado: 0.45,
        estadoReembolso: 'NO_APLICA',
      });

      await registrarMovimiento({
        id: 'sep-2',
        fechaHora: '2026-09-15T10:00:00.000Z',
        tipo: 'GASTO',
        categoria: 'BUS_URBANO',
        metodoPago: 'EFECTIVO_CAJA',
        montoBase: 0.35,
        comisionBancaria: 0,
        impuestoDigitalIVA: 0,
        montoTotalDebitado: 0.35,
        estadoReembolso: 'NO_APLICA',
      });

      const movimientosSep = await obtenerMovimientosMes('2026-09');
      expect(movimientosSep.map((m) => m.id)).toEqual(['sep-2', 'sep-1']);

      const movimientosAgo = await obtenerMovimientosMes('2026-08');
      expect(movimientosAgo.map((m) => m.id)).toEqual(['ago-1']);
    });
  });

  describe('Arqueos y cierres de caja', () => {
    it('debe registrar un arqueo generando id y fechaHora automáticamente', async () => {
      const arqueo = await registrarArqueo({
        saldoRealBanco: 180.0,
        saldoTeoricoBanco: 180.0,
        diferenciaBanco: 0,
        saldoRealEfectivo: 20.0,
        saldoTeoricoEfectivo: 20.0,
        diferenciaEfectivo: 0,
        estado: 'CUADRADO',
        observaciones: 'Arqueo de prueba cuadrado',
      });

      expect(arqueo.id).toBeDefined();
      expect(arqueo.fechaHora).toBeDefined();
      expect(arqueo.estado).toBe('CUADRADO');

      const persisted = await db.arqueos.get(arqueo.id);
      expect(persisted).toEqual(arqueo);
    });

    it('debe obtener el historial de arqueos ordenado de más reciente a más antiguo', async () => {
      await registrarArqueo({
        id: 'arq-1',
        fechaHora: '2026-09-01T20:00:00.000Z',
        saldoRealBanco: 200,
        saldoTeoricoBanco: 200,
        diferenciaBanco: 0,
        saldoRealEfectivo: 0,
        saldoTeoricoEfectivo: 0,
        diferenciaEfectivo: 0,
        estado: 'CUADRADO',
      });

      await registrarArqueo({
        id: 'arq-2',
        fechaHora: '2026-09-10T20:00:00.000Z',
        saldoRealBanco: 150,
        saldoTeoricoBanco: 150,
        diferenciaBanco: 0,
        saldoRealEfectivo: 30,
        saldoTeoricoEfectivo: 30,
        diferenciaEfectivo: 0,
        estado: 'CUADRADO',
      });

      const historial = await obtenerHistorialArqueos();
      expect(historial.map((a) => a.id)).toEqual(['arq-2', 'arq-1']);
    });
  });

  describe('limpiarBaseDatosParaPruebas', () => {
    it('debe vaciar todas las tablas de la base de datos', async () => {
      await obtenerConfiguracion();
      await registrarMovimiento({
        tipo: 'FONDEO_BASE',
        metodoPago: 'DEBITO_PRODUBANCO',
        montoBase: 200,
        comisionBancaria: 0,
        impuestoDigitalIVA: 0,
        montoTotalDebitado: 200,
        estadoReembolso: 'NO_APLICA',
      });
      await registrarArqueo({
        saldoRealBanco: 200,
        saldoTeoricoBanco: 200,
        diferenciaBanco: 0,
        saldoRealEfectivo: 0,
        saldoTeoricoEfectivo: 0,
        diferenciaEfectivo: 0,
        estado: 'CUADRADO',
      });

      expect(await db.movimientos.count()).toBe(1);
      expect(await db.arqueos.count()).toBe(1);
      expect(await db.configuracion.count()).toBe(1);

      await limpiarBaseDatosParaPruebas();

      expect(await db.movimientos.count()).toBe(0);
      expect(await db.arqueos.count()).toBe(0);
      expect(await db.configuracion.count()).toBe(0);
    });
  });
});
