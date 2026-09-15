import { useState, useEffect, type FC } from 'react';
import { X, ArrowRightLeft, AlertCircle, CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import { roundToTwo } from '../utils/accounting';

export interface AutoReimburseModalProps {
  isOpen: boolean;
  onClose: () => void;
  saldoPendiente: number;
  costoTransferenciaSPI?: number;
  onConfirmarReembolso: (
    montoReembolso: number,
    comisionSPI: number,
    nota?: string,
  ) => Promise<void>;
}

export const AutoReimburseModal: FC<AutoReimburseModalProps> = ({
  isOpen,
  onClose,
  saldoPendiente,
  costoTransferenciaSPI = 0.20,
  onConfirmarReembolso,
}) => {
  const [modoCobro, setModoCobro] = useState<'TOTAL' | 'PARCIAL'>('TOTAL');
  const [montoParcialStr, setMontoParcialStr] = useState<string>('');
  const [nota, setNota] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setModoCobro('TOTAL');
      setMontoParcialStr('');
      setNota('');
      setIsSubmitting(false);
      setErrorMsg(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const sinDeuda = saldoPendiente <= 0;
  const montoCobrar =
    modoCobro === 'TOTAL'
      ? roundToTwo(Math.max(0, saldoPendiente))
      : roundToTwo(parseFloat(montoParcialStr) || 0);

  const comisionSPI = roundToTwo(costoTransferenciaSPI);
  const totalDebitado =
    montoCobrar > 0 ? roundToTwo(montoCobrar + comisionSPI) : 0;

  const excedeSaldo = modoCobro === 'PARCIAL' && montoCobrar > saldoPendiente;
  const montoInvalido = montoCobrar <= 0 || excedeSaldo || sinDeuda;

  const handleConfirmar = async () => {
    if (montoInvalido || isSubmitting) return;

    try {
      setIsSubmitting(true);
      setErrorMsg(null);
      await onConfirmarReembolso(
        montoCobrar,
        comisionSPI,
        nota.trim() || undefined,
      );
      onClose();
    } catch (err) {
      console.error('Error al confirmar auto-reembolso:', err);
      setErrorMsg('Ocurrió un error al procesar el reembolso. Intente nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-slate-900 border-t sm:border border-slate-750 rounded-t-3xl sm:rounded-3xl p-4 sm:p-5 flex flex-col gap-4 shadow-2xl max-h-[95vh] overflow-y-auto">
        {/* Header Bar */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white leading-tight">
                Auto-Reembolso y Liquidación
              </h2>
              <span className="text-xs text-slate-400">
                Produbanco (Caja Chica) ➔ Pichincha (Personal)
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

        {/* Status notice if no debt */}
        {sinDeuda ? (
          <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center gap-3 text-slate-300">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <div className="text-xs">
              <span className="font-semibold block text-white">
                No tienes reembolsos pendientes por cobrar
              </span>
              Tu cuenta personal está al día con la caja chica.
            </div>
          </div>
        ) : (
          <>
            {/* Mode Toggle: Cobro Total vs Cobro Parcial */}
            <div className="flex items-center p-1 bg-slate-950/80 rounded-xl border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setModoCobro('TOTAL')}
                className={`flex-1 py-2 rounded-lg font-bold transition-all ${
                  modoCobro === 'TOTAL'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Cobro Total (${saldoPendiente.toFixed(2)})
              </button>
              <button
                type="button"
                onClick={() => {
                  setModoCobro('PARCIAL');
                  if (!montoParcialStr) {
                    setMontoParcialStr(saldoPendiente.toFixed(2));
                  }
                }}
                className={`flex-1 py-2 rounded-lg font-bold transition-all ${
                  modoCobro === 'PARCIAL'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Cobro Parcial
              </button>
            </div>

            {/* Partial amount input when in PARCIAL mode */}
            {modoCobro === 'PARCIAL' && (
              <div className="flex flex-col gap-1.5 animate-in fade-in duration-150">
                <label
                  htmlFor="monto-parcial-input"
                  className="text-xs font-semibold text-slate-300 flex items-center justify-between"
                >
                  <span>Monto a cobrar:</span>
                  <span className="text-[11px] text-slate-400 font-normal">
                    Máximo: ${saldoPendiente.toFixed(2)}
                  </span>
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-base font-bold text-slate-400">$</span>
                  <input
                    id="monto-parcial-input"
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={saldoPendiente}
                    value={montoParcialStr}
                    onChange={(e) => setMontoParcialStr(e.target.value)}
                    placeholder="0.00"
                    aria-label="Monto a cobrar"
                    className={`w-full pl-8 pr-3 py-2.5 bg-slate-950 rounded-xl border text-sm font-bold text-white focus:outline-none ${
                      excedeSaldo
                        ? 'border-rose-500 focus:border-rose-400'
                        : 'border-slate-700 focus:border-rose-500'
                    }`}
                  />
                </div>
                {excedeSaldo && (
                  <span className="text-[11px] text-rose-400 flex items-center gap-1 font-medium">
                    <AlertCircle className="w-3 h-3" />
                    El monto a cobrar excede la deuda pendiente (${saldoPendiente.toFixed(2)})
                  </span>
                )}
              </div>
            )}

            {/* Financial Breakdown Card */}
            <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-slate-800 flex flex-col gap-2.5">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Desglose de la Transferencia SPI
              </div>

              <div className="flex items-center justify-between text-xs text-slate-300">
                <span className="flex items-center gap-1.5">
                  <span>💰</span> Deuda personal por cobrar:
                </span>
                <span className="font-bold text-rose-300">
                  ${montoCobrar.toFixed(2)}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-300">
                <span className="flex items-center gap-1.5">
                  <span>🏦</span> Costo transferencia interbancaria (SPI):
                </span>
                <span className="font-bold text-amber-400">
                  +${comisionSPI.toFixed(2)}
                </span>
              </div>

              <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-sm font-black">
                <span className="text-white flex items-center gap-1.5">
                  <span>📉</span> Total que saldrá de Produbanco:
                </span>
                <span className="text-emerald-400 text-base">
                  ${totalDebitado.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Transfer explanation note */}
            <div className="text-[11px] text-slate-400 leading-relaxed bg-slate-850/60 p-2.5 rounded-xl border border-slate-800">
              💡 <strong className="text-slate-300">Regla de liquidación:</strong> Realiza la
              transferencia desde la app Produbanco a tu Banco Pichincha por{' '}
              <strong className="text-rose-300">${montoCobrar.toFixed(2)}</strong>. Los{' '}
              <strong className="text-amber-300">${comisionSPI.toFixed(2)}</strong> de SPI se
              debitarán automáticamente de la caja chica como gasto bancario.
            </div>

            {/* Optional note input */}
            <div>
              <input
                type="text"
                value={nota}
                onChange={(e) => setNota(e.target.value)}
                placeholder="Nota o motivo opcional (ej. Transferencia semanal)..."
                className="w-full px-3 py-2 text-xs bg-slate-800/80 rounded-xl border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
              />
            </div>
          </>
        )}

        {/* Error message if any */}
        {errorMsg && (
          <div className="p-2.5 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-3 gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="col-span-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-750 active:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-300 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirmar}
            disabled={montoInvalido || isSubmitting}
            className="col-span-2 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:pointer-events-none active:bg-rose-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-rose-950/50 transition-transform active:scale-[0.98]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Procesando...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Confirmar Transferencia y Cobro</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
