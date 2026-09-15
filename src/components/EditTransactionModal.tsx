import { useState, useEffect, type FC } from 'react';
import { X, Save, AlertCircle, Loader2, Edit3, CreditCard, Banknote, Smartphone, UserCheck, Camera } from 'lucide-react';
import type {
  CategoriaGasto,
  ConfiguracionSistema,
  MetodoPago,
  SubcategoriaOtro,
  Movimiento,
} from '../types';
import { calcularDesgloseGasto, roundToTwo, CONFIG_DEFAULT } from '../utils/accounting';
import { vibrarExito } from '../utils/vibration';
import { validarEsImagen, comprimirImagen } from '../utils/imageCompression';

export interface EditTransactionModalProps {
  isOpen: boolean;
  movimiento: Movimiento | null;
  onClose: () => void;
  onGuardar: (movimientoActualizado: Movimiento) => Promise<void>;
  config?: ConfiguracionSistema;
}

const CATEGORIAS_OPCIONES: { id: CategoriaGasto; label: string }[] = [
  { id: 'METRO', label: 'Metro de Quito' },
  { id: 'BUS_URBANO', label: 'Bus Urbano' },
  { id: 'BUS_VALLES', label: 'Bus Valles' },
  { id: 'UBER', label: 'Uber' },
  { id: 'INDRIVE', label: 'inDrive' },
  { id: 'DIDI', label: 'DiDi' },
  { id: 'TAXI', label: 'Taxi' },
  { id: 'ALIMENTACION', label: 'Alimentación' },
  { id: 'RETIRO_CAJERO', label: 'Retiro Cajero' },
  { id: 'OTROS', label: 'Otros' },
];

const SUBCATEGORIAS_OTROS: { id: SubcategoriaOtro; label: string }[] = [
  { id: 'PARQUEADERO', label: 'Parqueadero' },
  { id: 'PEAJE', label: 'Peaje' },
  { id: 'RECARGA_DATOS', label: 'Recarga Datos' },
  { id: 'COPIAS_GUIAS', label: 'Copias/Guías' },
  { id: 'ENCOMIENDA', label: 'Encomienda' },
  { id: 'MANTENIMIENTO', label: 'Mantenimiento' },
  { id: 'VARIOS', label: 'Varios' },
];

const METODOS_OPCIONES: { id: MetodoPago; label: string; icon: typeof CreditCard }[] = [
  { id: 'DEBITO_PRODUBANCO', label: 'Débito Produbanco', icon: CreditCard },
  { id: 'EFECTIVO_CAJA', label: 'Efectivo', icon: Banknote },
  { id: 'DEUNA_PRODUBANCO', label: 'De Una (Produbanco)', icon: Smartphone },
  { id: 'DEUNA_PERSONAL', label: 'De Una (Personal)', icon: UserCheck },
];

export const EditTransactionModal: FC<EditTransactionModalProps> = ({
  isOpen,
  movimiento,
  onClose,
  onGuardar,
  config = CONFIG_DEFAULT,
}) => {
  const [montoBaseStr, setMontoBaseStr] = useState<string>('');
  const [metodoPago, setMetodoPago] = useState<MetodoPago>('DEBITO_PRODUBANCO');
  const [categoria, setCategoria] = useState<CategoriaGasto>('OTROS');
  const [subcategoriaOtro, setSubcategoriaOtro] = useState<SubcategoriaOtro>('VARIOS');
  const [nota, setNota] = useState<string>('');
  const [comprobanteUrl, setComprobanteUrl] = useState<string | undefined>(undefined);
  const [isCompressing, setIsCompressing] = useState<boolean>(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && movimiento) {
      setMontoBaseStr(movimiento.montoBase.toFixed(2));
      setMetodoPago(movimiento.metodoPago);
      setCategoria(movimiento.categoria || 'OTROS');
      setSubcategoriaOtro(movimiento.subcategoriaOtro || 'VARIOS');
      setNota(movimiento.nota || '');
      setComprobanteUrl(movimiento.comprobanteUrl || undefined);
      setIsCompressing(false);
      setFileError(null);
      setIsSaving(false);
      setErrorMsg(null);
    }
  }, [isOpen, movimiento]);

  if (!isOpen || !movimiento) return null;

  const numericAmount = roundToTwo(parseFloat(montoBaseStr) || 0);
  const isRetiro = movimiento.tipo === 'RETIRO_CAJERO' || categoria === 'RETIRO_CAJERO';
  const isReembolso = movimiento.tipo === 'AUTO_REEMBOLSO';

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!validarEsImagen(file)) {
      setFileError('El archivo seleccionado no es una imagen válida.');
      return;
    }

    try {
      setIsCompressing(true);
      setFileError(null);
      const base64 = await comprimirImagen(file);
      setComprobanteUrl(base64);
      vibrarExito();
    } catch (err) {
      console.error('Error comprimiendo imagen:', err);
      setFileError('No se pudo procesar la foto seleccionada.');
    } finally {
      setIsCompressing(false);
      e.target.value = '';
    }
  };

  // Recálculo en vivo
  let comisionBancaria = 0;
  let impuestoDigitalIVA = 0;
  let montoTotalDebitado = 0;
  let estadoReembolso = movimiento.estadoReembolso;

  if (isReembolso) {
    comisionBancaria = config.costoTransferenciaSPI;
    impuestoDigitalIVA = 0;
    montoTotalDebitado = roundToTwo(numericAmount + comisionBancaria);
    estadoReembolso = 'REEMBOLSADO';
  } else if (isRetiro) {
    comisionBancaria = 0;
    impuestoDigitalIVA = 0;
    montoTotalDebitado = numericAmount;
    estadoReembolso = 'NO_APLICA';
  } else {
    const desglose = calcularDesgloseGasto(categoria, metodoPago, numericAmount, config);
    comisionBancaria = desglose.comisionBancaria;
    impuestoDigitalIVA = desglose.impuestoDigitalIVA;
    montoTotalDebitado = desglose.montoTotalDebitado;
    estadoReembolso = movimiento.estadoReembolso === 'REEMBOLSADO' ? 'REEMBOLSADO' : desglose.estadoReembolso;
  }

  const handleGuardar = async () => {
    if (numericAmount <= 0) {
      setErrorMsg('El monto base debe ser mayor a 0.00');
      return;
    }

    try {
      setIsSaving(true);
      setErrorMsg(null);
      vibrarExito();

      const movimientoActualizado: Movimiento = {
        ...movimiento,
        montoBase: numericAmount,
        metodoPago,
        categoria: isReembolso ? movimiento.categoria : categoria,
        subcategoriaOtro: categoria === 'OTROS' && !isReembolso && !isRetiro ? subcategoriaOtro : undefined,
        comisionBancaria,
        impuestoDigitalIVA,
        montoTotalDebitado,
        estadoReembolso,
        nota: nota.trim() || undefined,
        tipo: isRetiro ? 'RETIRO_CAJERO' : isReembolso ? 'AUTO_REEMBOLSO' : 'GASTO',
        comprobanteUrl: comprobanteUrl || undefined,
      };

      await onGuardar(movimientoActualizado);
      onClose();
    } catch (err) {
      console.error('Error al guardar cambios en movimiento:', err);
      setErrorMsg('No se pudo guardar la edición del movimiento.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-slate-900 border-t sm:border border-slate-750 rounded-t-3xl sm:rounded-3xl p-4 sm:p-5 flex flex-col gap-4 shadow-2xl max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white leading-tight">
                Editar Movimiento
              </h2>
              <span className="text-xs text-slate-400">
                Ajustar monto, método de pago o notas
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            disabled={isSaving}
            className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Monto Base Input */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="edit-monto-base" className="text-xs font-semibold text-slate-300">
            Monto Base ($ USD)
          </label>
          <div className="relative flex items-center">
            <span className="absolute left-3 text-lg font-bold text-slate-400">$</span>
            <input
              id="edit-monto-base"
              type="number"
              step="0.01"
              min="0.01"
              value={montoBaseStr}
              onChange={(e) => setMontoBaseStr(e.target.value)}
              placeholder="0.00"
              disabled={isSaving}
              aria-label="Monto Base"
              className="w-full pl-8 pr-3 py-2.5 bg-slate-950 rounded-xl border border-slate-700 text-lg font-bold text-white focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* Método de Pago */}
        {!isReembolso && !isRetiro && (
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-slate-300">Método de Pago</span>
            <div className="grid grid-cols-2 gap-2">
              {METODOS_OPCIONES.map((opt) => {
                const isSelected = metodoPago === opt.id;
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setMetodoPago(opt.id)}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition-colors text-left ${
                      isSelected
                        ? 'bg-amber-500/20 border-amber-500 text-amber-200'
                        : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-750'
                    }`}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Categoría */}
        {!isReembolso && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="edit-categoria-select" className="text-xs font-semibold text-slate-300">
              Categoría
            </label>
            <select
              id="edit-categoria-select"
              value={categoria}
              onChange={(e) => setCategoria(e.target.value as CategoriaGasto)}
              disabled={isSaving}
              className="w-full px-3 py-2.5 bg-slate-950 rounded-xl border border-slate-700 text-xs font-semibold text-white focus:outline-none focus:border-amber-500"
            >
              {CATEGORIAS_OPCIONES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Subcategoría para OTROS */}
        {categoria === 'OTROS' && !isReembolso && !isRetiro && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="edit-subcategoria-select" className="text-xs font-semibold text-slate-300">
              Subcategoría
            </label>
            <select
              id="edit-subcategoria-select"
              value={subcategoriaOtro}
              onChange={(e) => setSubcategoriaOtro(e.target.value as SubcategoriaOtro)}
              disabled={isSaving}
              className="w-full px-3 py-2 bg-slate-950 rounded-xl border border-slate-700 text-xs font-semibold text-white focus:outline-none focus:border-amber-500"
            >
              {SUBCATEGORIAS_OTROS.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Nota */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="edit-nota-input" className="text-xs font-semibold text-slate-300">
            Nota / Motivo
          </label>
          <input
            id="edit-nota-input"
            type="text"
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            placeholder="Detalle o descripción..."
            disabled={isSaving}
            className="w-full px-3 py-2.5 bg-slate-950 rounded-xl border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        {/* Foto de Comprobante / Factura */}
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-slate-300">
            Foto del Recibo / Factura
          </span>
          {comprobanteUrl ? (
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
              <div className="flex items-center gap-2.5">
                <img
                  src={comprobanteUrl}
                  alt="Recibo adjunto"
                  className="w-12 h-12 object-cover rounded-lg border border-slate-700 bg-slate-900"
                />
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-white">Comprobante guardado</span>
                  <span className="text-[10px] text-emerald-400 font-medium">Foto optimizada</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setComprobanteUrl(undefined)}
                disabled={isSaving}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold rounded-lg bg-slate-800 hover:bg-rose-950/60 text-slate-300 hover:text-rose-300 border border-slate-700 hover:border-rose-800/60 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                <span>✕ Quitar foto</span>
              </button>
            </div>
          ) : (
            <div>
              <label
                htmlFor="edit-photo-input"
                className={`flex items-center justify-center gap-2 w-full py-2.5 px-3 rounded-xl border border-dashed text-xs font-bold cursor-pointer transition-colors ${
                  isCompressing || isSaving
                    ? 'bg-slate-800/50 border-slate-700 text-slate-400 pointer-events-none'
                    : 'bg-slate-950/80 hover:bg-slate-850 border-slate-700 hover:border-amber-500/60 text-slate-300 hover:text-amber-300'
                }`}
              >
                {isCompressing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                    <span>Optimizando foto de factura...</span>
                  </>
                ) : (
                  <>
                    <Camera className="w-4 h-4 text-amber-400" />
                    <span>📷 Adjuntar Recibo / Factura</span>
                  </>
                )}
              </label>
              <input
                id="edit-photo-input"
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                disabled={isCompressing || isSaving}
                className="hidden"
                data-testid="edit-photo-input"
              />
            </div>
          )}
          {fileError && (
            <span className="text-[11px] text-rose-400 px-1 font-medium">{fileError}</span>
          )}
        </div>

        {/* Recalculated Financial Breakdown */}
        <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col gap-1.5 text-xs">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Recálculo Contable Automático
          </span>

          <div className="flex justify-between text-slate-300">
            <span>Monto Base:</span>
            <span className="font-bold text-white">${numericAmount.toFixed(2)}</span>
          </div>

          {comisionBancaria > 0 && (
            <div className="flex justify-between text-amber-300">
              <span>+ Comisión SPI (Produbanco):</span>
              <span className="font-bold">+${comisionBancaria.toFixed(2)}</span>
            </div>
          )}

          {impuestoDigitalIVA > 0 && (
            <div className="flex justify-between text-amber-300">
              <span>+ IVA Digital 15% (Uber):</span>
              <span className="font-bold">+${impuestoDigitalIVA.toFixed(2)}</span>
            </div>
          )}

          <div className="pt-1.5 border-t border-slate-800 flex justify-between font-bold text-sm">
            <span className="text-slate-200">
              {metodoPago === 'DEUNA_PERSONAL' ? 'Deuda a Reembolsar:' : 'Total Debitado:'}
            </span>
            <span
              className={metodoPago === 'DEUNA_PERSONAL' ? 'text-rose-400 font-black' : 'text-emerald-400 font-black'}
            >
              ${(metodoPago === 'DEUNA_PERSONAL' ? numericAmount : montoTotalDebitado).toFixed(2)}
            </span>
          </div>
        </div>

        {/* Error message */}
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
            disabled={isSaving}
            className="col-span-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-750 active:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-300 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleGuardar}
            disabled={isSaving || isCompressing}
            className="col-span-2 py-3 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:pointer-events-none active:bg-amber-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-950/50 transition-transform active:scale-[0.98]"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Guardando...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Guardar Cambios</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
