import { useState, useEffect, useMemo, type FC } from 'react';
import {
  Scale,
  X,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Save,
  Loader2,
  History,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import type { RegistroArqueo } from '../types';
import { db, registrarArqueo } from '../db/db';
import { calcularDiagnosticoArqueo, roundToTwo } from '../utils/accounting';

export interface ArqueoModalProps {
  isOpen: boolean;
  onClose: () => void;
  saldoTeoricoBanco: number;
  saldoTeoricoEfectivo: number;
  onGuardarArqueo?: (registro: Omit<RegistroArqueo, 'id' | 'fechaHora'>) => Promise<void>;
}

export const ArqueoModal: FC<ArqueoModalProps> = ({
  isOpen,
  onClose,
  saldoTeoricoBanco = 0,
  saldoTeoricoEfectivo = 0,
  onGuardarArqueo,
}) => {
  const [saldoRealBancoStr, setSaldoRealBancoStr] = useState<string>('');
  const [saldoRealEfectivoStr, setSaldoRealEfectivoStr] = useState<string>('');
  const [observaciones, setObservaciones] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [mostrarHistorial, setMostrarHistorial] = useState<boolean>(false);

  // Historial reactivo de arqueos previos desde IndexedDB
  const historial = useLiveQuery(
    () => db.arqueos.orderBy('fechaHora').reverse().toArray(),
    [],
    [],
  ) ?? [];

  useEffect(() => {
    if (isOpen) {
      setSaldoRealBancoStr(saldoTeoricoBanco.toFixed(2));
      setSaldoRealEfectivoStr(saldoTeoricoEfectivo.toFixed(2));
      setObservaciones('');
      setErrorMsg(null);
      setIsSubmitting(false);
    }
  }, [isOpen, saldoTeoricoBanco, saldoTeoricoEfectivo]);

  const parsedBanco = parseFloat(saldoRealBancoStr);
  const parsedEfectivo = parseFloat(saldoRealEfectivoStr);
  const bancoValido = !isNaN(parsedBanco);
  const efectivoValido = !isNaN(parsedEfectivo);

  const saldoRealBanco = bancoValido ? roundToTwo(parsedBanco) : 0;
  const saldoRealEfectivo = efectivoValido ? roundToTwo(parsedEfectivo) : 0;

  const diagnostico = useMemo(() => {
    return calcularDiagnosticoArqueo(
      saldoRealBanco,
      saldoRealEfectivo,
      saldoTeoricoBanco,
      saldoTeoricoEfectivo,
    );
  }, [saldoRealBanco, saldoRealEfectivo, saldoTeoricoBanco, saldoTeoricoEfectivo]);

  if (!isOpen) return null;

  const handleGuardar = async () => {
    if (!bancoValido || !efectivoValido) {
      setErrorMsg('Por favor ingrese valores numéricos válidos en ambos saldos.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);

      const registro: Omit<RegistroArqueo, 'id' | 'fechaHora'> = {
        saldoRealBanco,
        saldoTeoricoBanco,
        diferenciaBanco: diagnostico.diffBanco,
        saldoRealEfectivo,
        saldoTeoricoEfectivo,
        diferenciaEfectivo: diagnostico.diffEfectivo,
        estado: diagnostico.cuadrado ? 'CUADRADO' : 'DESCUADRE',
        observaciones: observaciones.trim() || undefined,
      };

      if (onGuardarArqueo) {
        await onGuardarArqueo(registro);
      } else {
        await registrarArqueo(registro);
      }

      onClose();
    } catch (err) {
      console.error('Error al guardar arqueo:', err);
      setErrorMsg('Ocurrió un error al guardar el acta de arqueo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-slate-900 border-t sm:border border-slate-750 rounded-t-3xl sm:rounded-3xl p-4 sm:p-5 flex flex-col gap-4 shadow-2xl max-h-[92vh] overflow-y-auto">
        {/* Header Bar */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white leading-tight">
                ¿Me cuadra la caja?
              </h2>
              <span className="text-xs text-slate-400">
                Arqueo diario y diagnóstico predictivo
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            disabled={isSubmitting}
            className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Inputs Section */}
        <div className="flex flex-col gap-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label
                htmlFor="saldo-real-banco"
                className="block text-xs font-semibold text-slate-300"
              >
                Saldo real en mi app de Produbanco ($)
              </label>
              <span className="text-[11px] text-slate-400">
                Teórico: ${saldoTeoricoBanco.toFixed(2)}
              </span>
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                $
              </span>
              <input
                id="saldo-real-banco"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={saldoRealBancoStr}
                onChange={(e) => setSaldoRealBancoStr(e.target.value)}
                className="w-full bg-slate-950 border border-slate-750 focus:border-emerald-500 rounded-xl pl-7 pr-3 py-2.5 text-white font-bold text-sm outline-none transition-colors"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label
                htmlFor="saldo-real-efectivo"
                className="block text-xs font-semibold text-slate-300"
              >
                Efectivo real en mi billetera ($)
              </label>
              <span className="text-[11px] text-slate-400">
                Teórico: ${saldoTeoricoEfectivo.toFixed(2)}
              </span>
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                $
              </span>
              <input
                id="saldo-real-efectivo"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={saldoRealEfectivoStr}
                onChange={(e) => setSaldoRealEfectivoStr(e.target.value)}
                className="w-full bg-slate-950 border border-slate-750 focus:border-emerald-500 rounded-xl pl-7 pr-3 py-2.5 text-white font-bold text-sm outline-none transition-colors"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="observaciones-arqueo"
              className="block text-xs font-semibold text-slate-300 mb-1"
            >
              Observaciones / notas opcionales
            </label>
            <input
              id="observaciones-arqueo"
              type="text"
              placeholder="Ej: Cierre fin del día, entrega de facturas"
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              className="w-full bg-slate-950 border border-slate-750 focus:border-emerald-500 rounded-xl px-3 py-2 text-white text-xs outline-none transition-colors"
            />
          </div>
        </div>

        {/* Diagnostic Semáforo Display */}
        {diagnostico.cuadrado ? (
          <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 flex items-start gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 flex-shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-emerald-300">
                ¡Tu caja está 100% cuadrada!
              </h3>
              <p className="text-xs text-emerald-200/80 mt-0.5">
                Tus saldos reales coinciden exactamente con los registros contables teóricos.
              </p>
            </div>
          </div>
        ) : (
          <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 flex-shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-bold text-rose-300">
                  Descuadre detectado
                </h3>
                <p className="text-xs text-rose-200/80 mt-0.5">
                  Existe una discrepancia entre tus saldos reales y los cálculos teóricos.
                </p>
              </div>
            </div>

            {/* Desglose de diferencias */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-rose-500/20 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-950/70 border border-rose-500/20">
                <span className="text-[11px] text-slate-400 block font-medium">
                  Produbanco
                </span>
                <div className="font-bold mt-0.5">
                  {diagnostico.diffBanco === 0 ? (
                    <span className="text-emerald-400">Cuadrado ($0.00)</span>
                  ) : (
                    <span className={diagnostico.diffBanco > 0 ? 'text-blue-400' : 'text-rose-400'}>
                      {diagnostico.diffBanco > 0
                        ? `+$${diagnostico.diffBanco.toFixed(2)}`
                        : `-$${Math.abs(diagnostico.diffBanco).toFixed(2)}`}
                      <span className="text-[10px] font-normal block text-slate-400">
                        {diagnostico.diffBanco > 0 ? '(sobrante)' : '(faltante)'}
                      </span>
                    </span>
                  )}
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-950/70 border border-rose-500/20">
                <span className="text-[11px] text-slate-400 block font-medium">
                  Efectivo Billetera
                </span>
                <div className="font-bold mt-0.5">
                  {diagnostico.diffEfectivo === 0 ? (
                    <span className="text-emerald-400">Cuadrado ($0.00)</span>
                  ) : (
                    <span className={diagnostico.diffEfectivo > 0 ? 'text-blue-400' : 'text-rose-400'}>
                      {diagnostico.diffEfectivo > 0
                        ? `+$${diagnostico.diffEfectivo.toFixed(2)}`
                        : `-$${Math.abs(diagnostico.diffEfectivo).toFixed(2)}`}
                      <span className="text-[10px] font-normal block text-slate-400">
                        {diagnostico.diffEfectivo > 0 ? '(sobrante)' : '(faltante)'}
                      </span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Pistas Inteligentes Box */}
        {diagnostico.pistas.length > 0 && (
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col gap-2">
            <div className="flex items-center gap-1.5 text-amber-400 font-bold text-xs uppercase tracking-wider">
              <Sparkles className="w-4 h-4" />
              <span>Pistas Inteligentes de Descuadre</span>
            </div>
            <ul className="flex flex-col gap-1.5 text-xs text-amber-200">
              {diagnostico.pistas.map((pista, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-2 bg-slate-950/60 p-2 rounded-xl border border-amber-500/20"
                >
                  <span className="text-amber-400 font-bold">•</span>
                  <span>{pista}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Error notification if any */}
        {errorMsg && (
          <div className="p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2.5 pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 py-3 px-4 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold text-sm transition-all disabled:opacity-50"
          >
            ✕ Cerrar
          </button>
          <button
            type="button"
            onClick={handleGuardar}
            disabled={isSubmitting || !bancoValido || !efectivoValido}
            className="flex-[2] py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white font-bold text-sm shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Guardando...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>💾 Guardar Acta de Arqueo</span>
              </>
            )}
          </button>
        </div>

        {/* Historial de Arqueos Acordeón */}
        <div className="border-t border-slate-800 pt-3 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setMostrarHistorial(!mostrarHistorial)}
            className="flex items-center justify-between w-full py-2 px-3 rounded-xl bg-slate-850 hover:bg-slate-800 border border-slate-750 text-xs font-bold text-slate-300 transition-colors"
          >
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-emerald-400" />
              <span>Historial de Arqueos ({historial.length})</span>
            </div>
            {mostrarHistorial ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {mostrarHistorial && (
            <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
              {historial.length === 0 ? (
                <p className="text-xs text-slate-500 py-2 text-center">
                  No hay actas de arqueo anteriores registradas.
                </p>
              ) : (
                historial.map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-xl bg-slate-850/70 border border-slate-750 flex flex-col gap-1 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-400">
                        {new Date(item.fechaHora).toLocaleString()}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          item.estado === 'CUADRADO'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {item.estado === 'CUADRADO' ? 'CUADRADO' : 'DESCUADRE'}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-300 text-[11px]">
                      <span>
                        Banco: ${item.saldoRealBanco.toFixed(2)} (
                        {item.diferenciaBanco >= 0
                          ? `+${item.diferenciaBanco.toFixed(2)}`
                          : item.diferenciaBanco.toFixed(2)}
                        )
                      </span>
                      <span>
                        Efectivo: ${item.saldoRealEfectivo.toFixed(2)} (
                        {item.diferenciaEfectivo >= 0
                          ? `+${item.diferenciaEfectivo.toFixed(2)}`
                          : item.diferenciaEfectivo.toFixed(2)}
                        )
                      </span>
                    </div>
                    {item.observaciones && (
                      <p className="text-[11px] text-slate-400 italic">
                        "{item.observaciones}"
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
