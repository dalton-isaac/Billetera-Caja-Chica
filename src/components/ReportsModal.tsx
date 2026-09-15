import { useState, useId, useRef, type FC, type ChangeEvent } from 'react';
import {
  X,
  FileText,
  FileSpreadsheet,
  Download,
  Upload,
  Calendar,
  User,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import type { Movimiento, SaldosBolsillos } from '../types';
import { calcularSaldosBolsillos } from '../utils/accounting';
import { generarReportePDF } from '../utils/pdfGenerator';
import { generarReporteExcel } from '../utils/excelGenerator';
import { exportarBackupJSON, importarBackupJSON } from '../utils/backupRestore';
import { vibrarExito } from '../utils/vibration';

export interface ReportsModalProps {
  isOpen: boolean;
  onClose: () => void;
  movimientos: Movimiento[];
  saldos: SaldosBolsillos;
  onBackupRestored?: () => void;
}

function getNombreMes(mesAnio: string): string {
  if (mesAnio === 'TODOS') return 'Historial Completo';
  const [year, month] = mesAnio.split('-');
  const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
  const nombre = date.toLocaleDateString('es-EC', { month: 'long', year: 'numeric' });
  return nombre.charAt(0).toUpperCase() + nombre.slice(1);
}

export const ReportsModal: FC<ReportsModalProps> = ({
  isOpen,
  onClose,
  movimientos,
  saldos,
  onBackupRestored,
}) => {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonth);
  const [nombreMensajero, setNombreMensajero] = useState<string>('Isaac Alarcón');
  const [statusMessage, setStatusMessage] = useState<{
    tipo: 'success' | 'error' | 'info';
    texto: string;
  } | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isConfirmingRestore, setIsConfirmingRestore] = useState<boolean>(false);
  const [pendingRestoreJson, setPendingRestoreJson] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const monthSelectId = useId();
  const nombreInputId = useId();

  if (!isOpen) return null;

  // Extraer lista de meses únicos de los movimientos
  const mesesSet = new Set<string>();
  mesesSet.add(currentMonth);
  for (const m of movimientos) {
    if (m.fechaHora && m.fechaHora.length >= 7) {
      const ym = m.fechaHora.slice(0, 7);
      if (/^\d{4}-\d{2}$/.test(ym)) {
        mesesSet.add(ym);
      }
    }
  }
  const mesesDisponibles = Array.from(mesesSet).sort().reverse();

  // Filtrar movimientos según mes seleccionado
  const movimientosFiltrados =
    selectedMonth === 'TODOS'
      ? movimientos
      : movimientos.filter((m) => m.fechaHora.startsWith(selectedMonth));

  // Recalcular saldos para el período seleccionado
  const saldosReporte = calcularSaldosBolsillos(
    movimientosFiltrados,
    saldos.baseMensual,
  );

  const mesEtiqueta = getNombreMes(selectedMonth);

  const handleDescargarPDF = () => {
    try {
      setIsProcessing(true);
      setStatusMessage(null);
      generarReportePDF(
        movimientosFiltrados,
        saldosReporte,
        mesEtiqueta,
        nombreMensajero.trim() || 'Responsable de Movilización',
        true,
      );
      vibrarExito();
      setStatusMessage({
        tipo: 'success',
        texto: `📄 Reporte PDF descargado: Rendicion_Caja_Chica_Quito_${mesEtiqueta.replace(/\s+/g, '_')}.pdf`,
      });
    } catch (error) {
      console.error('Error generando PDF:', error);
      setStatusMessage({
        tipo: 'error',
        texto: '❌ Error al generar el documento PDF.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDescargarExcel = () => {
    try {
      setIsProcessing(true);
      setStatusMessage(null);
      generarReporteExcel(movimientosFiltrados, saldosReporte, mesEtiqueta, true);
      vibrarExito();
      setStatusMessage({
        tipo: 'success',
        texto: `📊 Reporte Excel descargado: Reporte_Caja_Chica_${mesEtiqueta.replace(/\s+/g, '_')}.xlsx`,
      });
    } catch (error) {
      console.error('Error generando Excel:', error);
      setStatusMessage({
        tipo: 'error',
        texto: '❌ Error al generar la hoja de cálculo Excel.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExportarJSON = async () => {
    try {
      setIsProcessing(true);
      setStatusMessage(null);
      await exportarBackupJSON(true);
      vibrarExito();
      setStatusMessage({
        tipo: 'success',
        texto: '💾 Copia de seguridad JSON descargada correctamente.',
      });
    } catch (error) {
      console.error('Error exportando respaldo:', error);
      setStatusMessage({
        tipo: 'error',
        texto: '❌ Error al exportar la copia de seguridad.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSeleccionarArchivoJSON = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setPendingRestoreJson(content);
        setIsConfirmingRestore(true);
      }
    };
    reader.onerror = () => {
      setStatusMessage({
        tipo: 'error',
        texto: '❌ No se pudo leer el archivo seleccionado.',
      });
    };
    reader.readAsText(file);
    // Reset file input value so user can pick the same file again if needed
    e.target.value = '';
  };

  const handleEjecutarRestauracion = async () => {
    if (!pendingRestoreJson) return;

    try {
      setIsProcessing(true);
      await importarBackupJSON(pendingRestoreJson);
      vibrarExito();
      setIsConfirmingRestore(false);
      setPendingRestoreJson(null);
      setStatusMessage({
        tipo: 'success',
        texto: '📥 ¡Base de datos restaurada con éxito desde el respaldo!',
      });
      onBackupRestored?.();
    } catch (error: unknown) {
      console.error('Error importando respaldo:', error);
      setIsConfirmingRestore(false);
      setPendingRestoreJson(null);
      const errMsg = error instanceof Error ? error.message : 'Error desconocido';
      setStatusMessage({
        tipo: 'error',
        texto: `❌ Error al restaurar respaldo: ${errMsg}`,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-3xl p-4 sm:p-5 shadow-2xl flex flex-col gap-4 text-slate-100 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-2xl border border-emerald-500/20">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black tracking-tight text-white">
                Reportes y Respaldo
              </h2>
              <p className="text-[11px] text-slate-400">
                Rendición formal corporativa y copia de seguridad
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal"
            className="p-1.5 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Notificación de Estado */}
        {statusMessage && (
          <div
            className={`p-3 rounded-2xl text-xs flex items-start gap-2 ${
              statusMessage.tipo === 'success'
                ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/15 border border-rose-500/30 text-rose-300'
            }`}
          >
            {statusMessage.tipo === 'success' ? (
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            )}
            <span className="font-medium leading-relaxed">{statusMessage.texto}</span>
          </div>
        )}

        {/* Modal de Confirmación de Restauración */}
        {isConfirmingRestore && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col gap-3">
            <div className="flex items-start gap-2.5 text-amber-300">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 text-amber-400 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400">
                  Confirmar Restauración
                </h4>
                <p className="text-[11px] text-amber-200/90 mt-1 leading-relaxed">
                  ¿Deseas reemplazar todos los datos actuales con este archivo de respaldo?
                  Esta acción sobrescribirá movimientos y arqueos registrados.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setIsConfirmingRestore(false);
                  setPendingRestoreJson(null);
                }}
                disabled={isProcessing}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-semibold rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleEjecutarRestauracion}
                disabled={isProcessing}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-md"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Restaurando...</span>
                  </>
                ) : (
                  <span>Sí, Restaurar Datos</span>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Selector de Parámetros de Reporte */}
        <div className="bg-slate-850 border border-slate-750/80 rounded-2xl p-3.5 flex flex-col gap-3">
          <div className="flex items-center justify-between text-xs font-bold text-slate-300">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              Periodo del Reporte
            </span>
            <span className="text-[11px] text-emerald-400 font-medium">
              {movimientosFiltrados.length} movimientos
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label htmlFor={monthSelectId} className="block text-[10px] text-slate-400 mb-1">
                Mes / Historial
              </label>
              <select
                id={monthSelectId}
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-2.5 py-1.5 text-xs font-medium focus:outline-none focus:border-emerald-500"
              >
                <option value="TODOS">Todos los meses (Todo el historial)</option>
                {mesesDisponibles.map((m) => (
                  <option key={m} value={m}>
                    {getNombreMes(m)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor={nombreInputId} className="block text-[10px] text-slate-400 mb-1">
                Responsable de Caja
              </label>
              <div className="relative">
                <input
                  id={nombreInputId}
                  type="text"
                  value={nombreMensajero}
                  onChange={(e) => setNombreMensajero(e.target.value)}
                  placeholder="Nombre de quien rinde cuentas"
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-2.5 py-1.5 text-xs font-medium focus:outline-none focus:border-emerald-500 pl-7"
                />
                <User className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2" />
              </div>
            </div>
          </div>

          {/* Mini Resumen del Periodo */}
          <div className="pt-2 border-t border-slate-800/80 grid grid-cols-3 gap-1.5 text-center">
            <div className="p-1.5 bg-slate-900/60 rounded-xl">
              <p className="text-[9px] text-slate-400 uppercase tracking-wider">Gastos</p>
              <p className="text-xs font-black text-rose-400">
                ${saldosReporte.totalGastosMes.toFixed(2)}
              </p>
            </div>
            <div className="p-1.5 bg-slate-900/60 rounded-xl">
              <p className="text-[9px] text-slate-400 uppercase tracking-wider">Banco</p>
              <p className="text-xs font-black text-emerald-400">
                ${saldosReporte.saldoProdubanco.toFixed(2)}
              </p>
            </div>
            <div className="p-1.5 bg-slate-900/60 rounded-xl">
              <p className="text-[9px] text-slate-400 uppercase tracking-wider">Efectivo</p>
              <p className="text-xs font-black text-amber-400">
                ${saldosReporte.saldoEfectivo.toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        {/* Sección: Descarga de Reportes Formales */}
        <div className="flex flex-col gap-2">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">
            Informes para la Empresa
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Botón Descargar PDF */}
            <button
              type="button"
              onClick={handleDescargarPDF}
              disabled={isProcessing}
              className="flex items-center gap-3 p-3 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 hover:border-rose-500/50 rounded-2xl text-left transition-all active:scale-[0.98] group"
            >
              <div className="p-2 bg-rose-500/20 text-rose-400 rounded-xl group-hover:scale-105 transition-transform">
                <FileText className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-rose-200">
                  Descargar Reporte PDF
                </p>
                <p className="text-[10px] text-rose-300/70 truncate">
                  Membretado con firmas para contabilidad
                </p>
              </div>
            </button>

            {/* Botón Descargar Excel */}
            <button
              type="button"
              onClick={handleDescargarExcel}
              disabled={isProcessing}
              className="flex items-center gap-3 p-3 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 hover:border-emerald-500/50 rounded-2xl text-left transition-all active:scale-[0.98] group"
            >
              <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl group-hover:scale-105 transition-transform">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-emerald-200">
                  Descargar Excel (.xlsx)
                </p>
                <p className="text-[10px] text-emerald-300/70 truncate">
                  Movimientos y resumen contable
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* Sección: Respaldo y Migración */}
        <div className="flex flex-col gap-2 pt-2 border-t border-slate-800">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">
            Copia de Seguridad & Migración
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Botón Exportar Respaldo JSON */}
            <button
              type="button"
              onClick={handleExportarJSON}
              disabled={isProcessing}
              className="flex items-center gap-3 p-3 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 hover:border-blue-500/50 rounded-2xl text-left transition-all active:scale-[0.98] group"
            >
              <div className="p-2 bg-blue-500/20 text-blue-400 rounded-xl group-hover:scale-105 transition-transform">
                <Download className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-blue-200">
                  Exportar Respaldo JSON
                </p>
                <p className="text-[10px] text-blue-300/70 truncate">
                  Copia completa de la base de datos
                </p>
              </div>
            </button>

            {/* Botón Importar Respaldo JSON */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="flex items-center gap-3 p-3 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 hover:border-amber-500/50 rounded-2xl text-left transition-all active:scale-[0.98] group"
            >
              <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl group-hover:scale-105 transition-transform">
                <Upload className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-amber-200">
                  Importar Respaldo JSON
                </p>
                <p className="text-[10px] text-amber-300/70 truncate">
                  Restaurar desde archivo previo
                </p>
              </div>
            </button>

            {/* Input oculto para carga de archivo */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              aria-label="Archivo de respaldo JSON"
              onChange={handleSeleccionarArchivoJSON}
              className="hidden"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-bold rounded-xl transition-all"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
