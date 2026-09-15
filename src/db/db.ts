import Dexie, { type EntityTable } from 'dexie';
import type { ConfiguracionSistema, Movimiento, RegistroArqueo } from '../types';
import { CONFIG_DEFAULT } from '../utils/accounting';

export type ConfiguracionEntity = ConfiguracionSistema & { id: string };

function generarUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export class BilleteraDB extends Dexie {
  movimientos!: EntityTable<Movimiento, 'id'>;
  arqueos!: EntityTable<RegistroArqueo, 'id'>;
  configuracion!: EntityTable<ConfiguracionEntity, 'id'>;

  constructor(databaseName = 'BilleteraCajaChicaDB') {
    super(databaseName);
    this.version(1).stores({
      movimientos: 'id, fechaHora, tipo, categoria, metodoPago, estadoReembolso',
      arqueos: 'id, fechaHora, estado',
      configuracion: 'id',
    });
  }
}

export const db = new BilleteraDB('BilleteraCajaChicaDB');

/**
 * Obtiene la configuración del sistema o inicializa la configuración por defecto
 * (base $200.00, SPI $0.20, IVA Digital 15%, vibración táctil activada).
 */
export async function obtenerConfiguracion(): Promise<ConfiguracionSistema> {
  const item = await db.configuracion.get('default');
  if (item) {
    return {
      baseMensual: item.baseMensual,
      costoTransferenciaSPI: item.costoTransferenciaSPI,
      porcentajeIVADigital: item.porcentajeIVADigital,
      vibracionTactil: item.vibracionTactil,
    };
  }

  const initial: ConfiguracionEntity = {
    ...CONFIG_DEFAULT,
    id: 'default',
  };
  await db.configuracion.put(initial);
  return { ...CONFIG_DEFAULT };
}

/**
 * Inicializa la base de datos garantizando los valores de configuración por defecto.
 */
export async function inicializarBaseDatos(): Promise<ConfiguracionSistema> {
  return obtenerConfiguracion();
}

/**
 * Actualiza parcialmente la configuración del sistema y la persiste en IndexedDB.
 */
export async function guardarConfiguracion(config: Partial<ConfiguracionSistema>): Promise<void> {
  const current = await obtenerConfiguracion();
  const updated: ConfiguracionEntity = {
    ...current,
    ...config,
    id: 'default',
  };
  await db.configuracion.put(updated);
}

/**
 * Registra un movimiento contable en la base de datos offline.
 * Si no se proporciona id o fechaHora, son autogenerados.
 */
export async function registrarMovimiento(
  movimiento: Omit<Movimiento, 'id' | 'fechaHora'> & { id?: string; fechaHora?: string },
): Promise<Movimiento> {
  const nuevo: Movimiento = {
    ...movimiento,
    id: movimiento.id || generarUUID(),
    fechaHora: movimiento.fechaHora || new Date().toISOString(),
  };
  await db.movimientos.put(nuevo);
  return nuevo;
}

/**
 * Elimina un movimiento contable por su identificador único.
 */
export async function eliminarMovimiento(id: string): Promise<void> {
  await db.movimientos.delete(id);
}

/**
 * Obtiene los movimientos contables ordenados descendentemente por fechaHora.
 * Permite filtrar por mes y año en formato 'YYYY-MM'.
 */
export async function obtenerMovimientosMes(mesAnio?: string): Promise<Movimiento[]> {
  const list = await db.movimientos.orderBy('fechaHora').reverse().toArray();
  if (mesAnio) {
    return list.filter((m) => m.fechaHora.startsWith(mesAnio));
  }
  return list;
}

/**
 * Registra un arqueo o cierre de caja en la base de datos offline.
 * Si no se proporciona id o fechaHora, son autogenerados.
 */
export async function registrarArqueo(
  arqueo: Omit<RegistroArqueo, 'id' | 'fechaHora'> & { id?: string; fechaHora?: string },
): Promise<RegistroArqueo> {
  const nuevo: RegistroArqueo = {
    ...arqueo,
    id: arqueo.id || generarUUID(),
    fechaHora: arqueo.fechaHora || new Date().toISOString(),
  };
  await db.arqueos.put(nuevo);
  return nuevo;
}

/**
 * Obtiene el historial completo de arqueos ordenados descendentemente por fechaHora.
 */
export async function obtenerHistorialArqueos(): Promise<RegistroArqueo[]> {
  return db.arqueos.orderBy('fechaHora').reverse().toArray();
}

/**
 * Limpia todas las tablas de la base de datos.
 * Diseñado primordialmente para suites de prueba automatizadas.
 */
export async function limpiarBaseDatosParaPruebas(): Promise<void> {
  await Promise.all([
    db.movimientos.clear(),
    db.arqueos.clear(),
    db.configuracion.clear(),
  ]);
}
