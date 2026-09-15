import { db, type ConfiguracionEntity } from '../db/db';
import type { Movimiento, RegistroArqueo } from '../types';


export interface BackupData {
  version: number;
  sistema: string;
  fechaExportacion: string;
  datos: {
    movimientos: Movimiento[];
    arqueos: RegistroArqueo[];
    configuracion: ConfiguracionEntity[];
  };
}

/**
 * Exporta todos los movimientos, arqueos y configuración de Dexie a un archivo JSON.
 * Descarga el archivo automáticamente en el navegador y retorna la cadena JSON.
 */
export async function exportarBackupJSON(descargar = true): Promise<string> {
  const movimientos = await db.movimientos.toArray();
  const arqueos = await db.arqueos.toArray();
  const configuracion = await db.configuracion.toArray();

  const backupData: BackupData = {
    version: 1,
    sistema: 'Billetera Caja Chica - Quito',
    fechaExportacion: new Date().toISOString(),
    datos: {
      movimientos,
      arqueos,
      configuracion,
    },
  };

  const jsonStr = JSON.stringify(backupData, null, 2);

  if (descargar && typeof window !== 'undefined' && typeof document !== 'undefined') {
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const fecha = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `Backup_Caja_Chica_${fecha}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return jsonStr;
}

/**
 * Valida y restaura una copia de seguridad JSON en las tablas de IndexedDB.
 */
export async function importarBackupJSON(jsonStr: string): Promise<boolean> {
  if (!jsonStr || typeof jsonStr !== 'string') {
    throw new Error('Contenido de archivo de respaldo vacío o inválido.');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    throw new Error('El archivo no contiene un formato JSON válido.');
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Estructura de respaldo no reconocida.');
  }

  const record = parsed as Record<string, unknown>;
  const datos = (record.datos && typeof record.datos === 'object' ? record.datos : record) as Record<string, unknown>;

  const movimientos = datos.movimientos as Movimiento[] | undefined;
  const arqueos = datos.arqueos as RegistroArqueo[] | undefined;
  const configuracion = datos.configuracion as ConfiguracionEntity[] | ConfiguracionEntity | undefined;

  if (!movimientos && !arqueos && !configuracion) {
    throw new Error('El archivo no contiene datos de movimientos, arqueos ni configuración reconocibles.');
  }

  if (movimientos && !Array.isArray(movimientos)) {
    throw new Error('La lista de movimientos es inválida.');
  }

  if (arqueos && !Array.isArray(arqueos)) {
    throw new Error('La lista de arqueos es inválida.');
  }

  // Validar consistencia básica de movimientos
  if (movimientos) {
    for (const m of movimientos) {
      if (!m.id || typeof m.montoBase !== 'number' || !m.metodoPago) {
        throw new Error('Se detectaron movimientos corruptos o con campos requeridos faltantes.');
      }
    }
  }

  // Restauración atómica en Dexie
  await db.transaction('rw', db.movimientos, db.arqueos, db.configuracion, async () => {
    if (movimientos) {
      await db.movimientos.clear();
      if (movimientos.length > 0) {
        await db.movimientos.bulkPut(movimientos);
      }
    }

    if (arqueos) {
      await db.arqueos.clear();
      if (arqueos.length > 0) {
        await db.arqueos.bulkPut(arqueos);
      }
    }

    if (configuracion) {
      await db.configuracion.clear();
      if (Array.isArray(configuracion)) {
        if (configuracion.length > 0) {
          await db.configuracion.bulkPut(configuracion);
        }
      } else if (typeof configuracion === 'object') {
        await db.configuracion.put(configuracion as ConfiguracionEntity);
      }
    }
  });

  return true;
}
