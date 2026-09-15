import { useState, useEffect, type FC } from 'react';
import { X, Delete, Check, Car, Utensils, Package, Banknote, Camera, Loader2 } from 'lucide-react';
import type {
  CategoriaGasto,
  ConfiguracionSistema,
  MetodoPago,
  SubcategoriaOtro,
  TipoMovimiento,
} from '../types';
import { calcularDesgloseGasto, CONFIG_DEFAULT } from '../utils/accounting';
import { vibrarExito } from '../utils/vibration';
import { validarEsImagen, comprimirImagen } from '../utils/imageCompression';

interface QuickAmountModalProps {
  isOpen: boolean;
  onClose: () => void;
  categoria: CategoriaGasto | null;
  metodoPago: MetodoPago;
  onConfirm: (data: {
    categoria: CategoriaGasto;
    montoBase: number;
    subcategoriaOtro?: SubcategoriaOtro;
    nota?: string;
    tipo?: TipoMovimiento;
    comprobanteUrl?: string;
  }) => void;
  config?: ConfiguracionSistema;
}

const SUBCATEGORIAS_OTROS: { id: SubcategoriaOtro; label: string }[] = [
  { id: 'PARQUEADERO', label: '🅿️ Parqueadero' },
  { id: 'PEAJE', label: '🛣️ Peaje' },
  { id: 'RECARGA_DATOS', label: '📶 Recarga Datos' },
  { id: 'COPIAS_GUIAS', label: '📄 Copias/Guías' },
  { id: 'ENCOMIENDA', label: '📦 Encomienda' },
  { id: 'MANTENIMIENTO', label: '🔧 Mantenimiento' },
  { id: 'VARIOS', label: '✨ Varios' },
];

export const QuickAmountModal: FC<QuickAmountModalProps> = ({
  isOpen,
  onClose,
  categoria,
  metodoPago,
  onConfirm,
  config = CONFIG_DEFAULT,
}) => {
  const [amountStr, setAmountStr] = useState<string>('');
  const [subcategoria, setSubcategoria] = useState<SubcategoriaOtro>('VARIOS');
  const [nota, setNota] = useState<string>('');
  const [comprobanteUrl, setComprobanteUrl] = useState<string | undefined>(undefined);
  const [isCompressing, setIsCompressing] = useState<boolean>(false);
  const [fileError, setFileError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setAmountStr('');
      setSubcategoria('VARIOS');
      setNota('');
      setComprobanteUrl(undefined);
      setIsCompressing(false);
      setFileError(null);
    }
  }, [isOpen]);

  if (!isOpen || !categoria) return null;

  const isRetiro = categoria === 'RETIRO_CAJERO';
  const numericAmount = parseFloat(amountStr) || 0;

  // Calculo contable en vivo
  const desglose = calcularDesgloseGasto(categoria, metodoPago, numericAmount, config);

  const handleDigit = (digit: string) => {
    vibrarExito();
    if (amountStr.includes('.')) {
      const parts = amountStr.split('.');
      if (parts[1] && parts[1].length >= 2) return;
    }
    if (amountStr === '' && digit === '0') return;
    if (amountStr.length >= 7) return;
    setAmountStr((prev) => prev + digit);
  };

  const handleDot = () => {
    vibrarExito();
    if (amountStr.includes('.')) return;
    if (amountStr === '') {
      setAmountStr('0.');
    } else {
      setAmountStr((prev) => prev + '.');
    }
  };

  const handleBackspace = () => {
    vibrarExito();
    setAmountStr((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    vibrarExito();
    setAmountStr('');
  };

  const handlePreset = (val: number) => {
    vibrarExito();
    setAmountStr(val.toFixed(2));
  };

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

  const handleConfirm = () => {
    if (numericAmount <= 0) return;
    vibrarExito();
    const payload: {
      categoria: CategoriaGasto;
      montoBase: number;
      subcategoriaOtro?: SubcategoriaOtro;
      nota?: string;
      tipo?: TipoMovimiento;
      comprobanteUrl?: string;
    } = {
      categoria,
      montoBase: numericAmount,
      subcategoriaOtro: categoria === 'OTROS' ? subcategoria : undefined,
      nota: nota.trim() || undefined,
      tipo: isRetiro ? 'RETIRO_CAJERO' : 'GASTO',
    };
    if (comprobanteUrl) {
      payload.comprobanteUrl = comprobanteUrl;
    }
    onConfirm(payload);
    onClose();
  };

  const getCategoriaHeader = () => {
    switch (categoria) {
      case 'UBER':
        return { title: 'Uber', icon: Car, color: 'text-white' };
      case 'DIDI':
        return { title: 'DiDi', icon: Car, color: 'text-amber-400' };
      case 'INDRIVE':
        return { title: 'inDrive', icon: Car, color: 'text-emerald-400' };
      case 'TAXI':
        return { title: 'Taxi Convencional', icon: Car, color: 'text-yellow-400' };
      case 'ALIMENTACION':
        return { title: 'Alimentación / Refrigerio', icon: Utensils, color: 'text-orange-400' };
      case 'RETIRO_CAJERO':
        return { title: 'Retiro de Cajero (Produbanco)', icon: Banknote, color: 'text-cyan-400' };
      case 'OTROS':
      default:
        return { title: 'Otros Gastos', icon: Package, color: 'text-purple-400' };
    }
  };

  const header = getCategoriaHeader();
  const HeaderIcon = header.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-slate-900 border-t sm:border border-slate-750 rounded-t-3xl sm:rounded-3xl p-4 sm:p-5 flex flex-col gap-3 shadow-2xl max-h-[95vh] overflow-y-auto">
        {/* Header bar */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-slate-800 border border-slate-700">
              <HeaderIcon className={`w-5 h-5 ${header.color}`} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white leading-tight">
                {header.title}
              </h2>
              <span className="text-xs text-slate-400">
                {isRetiro ? 'Traspaso a Efectivo en Mano' : `Método: ${metodoPago.replace('_', ' ')}`}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Amount Display */}
        <div className="flex flex-col items-center justify-center py-2 px-4 bg-slate-950/80 rounded-2xl border border-slate-800">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-0.5">
            {isRetiro ? 'Monto Retirado' : 'Monto Base del Gasto'}
          </div>
          <div className="flex items-baseline gap-1 text-4xl sm:text-5xl font-black tracking-tight text-white">
            <span className="text-2xl text-emerald-400 font-bold">$</span>
            <span>{amountStr || '0.00'}</span>
          </div>

          {/* Quick Realtime Breakdown */}
          <div className="w-full mt-2 pt-2 border-t border-slate-800/80 text-xs flex flex-col gap-1">
            {isRetiro ? (
              <div className="flex items-center justify-between text-cyan-300 font-medium">
                <span>Traspaso a Efectivo:</span>
                <span>+${numericAmount.toFixed(2)}</span>
              </div>
            ) : (
              <>
                {desglose.impuestoDigitalIVA > 0 && (
                  <div className="flex items-center justify-between text-amber-300">
                    <span>+ IVA Digital 15% (Uber):</span>
                    <span>+${desglose.impuestoDigitalIVA.toFixed(2)}</span>
                  </div>
                )}
                {desglose.comisionBancaria > 0 && (
                  <div className="flex items-center justify-between text-amber-300">
                    <span>+ Comisión SPI (Produbanco):</span>
                    <span>+${desglose.comisionBancaria.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between font-bold text-slate-200">
                  <span>
                    {metodoPago === 'DEUNA_PERSONAL'
                      ? 'Total a tu favor (Deuda):'
                      : 'Total debitado:'}
                  </span>
                  <span className={metodoPago === 'DEUNA_PERSONAL' ? 'text-rose-400' : 'text-emerald-400'}>
                    ${(metodoPago === 'DEUNA_PERSONAL' ? desglose.montoBase : desglose.montoTotalDebitado).toFixed(2)}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Quick Amount Presets */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none">
          {(isRetiro ? [10, 20, 30, 50, 100] : [1, 2, 3, 5, 10, 15]).map((val) => (
            <button
              key={val}
              type="button"
              onClick={() => handlePreset(val)}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 active:bg-slate-700 text-xs font-bold text-slate-300 border border-slate-700 whitespace-nowrap transition-colors"
            >
              ${val}
            </button>
          ))}
        </div>

        {/* Subcategories if OTROS */}
        {categoria === 'OTROS' && (
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Subcategoría
            </span>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
              {SUBCATEGORIAS_OTROS.map((sub) => {
                const isSelected = subcategoria === sub.id;
                return (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => {
                      vibrarExito();
                      setSubcategoria(sub.id);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                      isSelected
                        ? 'bg-purple-600 border-purple-400 text-white font-bold'
                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750'
                    }`}
                  >
                    {sub.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Quick Note Input */}
        <div>
          <input
            type="text"
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            placeholder="Nota o motivo opcional (ej. Envío a cliente)..."
            className="w-full px-3 py-2 text-xs bg-slate-800/80 rounded-xl border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Adjuntar Recibo / Factura */}
        <div className="flex flex-col gap-1.5">
          {comprobanteUrl ? (
            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-800/90 border border-slate-750">
              <div className="flex items-center gap-2.5">
                <img
                  src={comprobanteUrl}
                  alt="Recibo adjunto"
                  className="w-10 h-10 object-cover rounded-lg border border-slate-600 bg-slate-950"
                />
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-white">Recibo / Factura</span>
                  <span className="text-[10px] text-emerald-400 font-medium">Foto optimizada lista</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setComprobanteUrl(undefined)}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold rounded-lg bg-slate-750 hover:bg-rose-950/60 text-slate-300 hover:text-rose-300 border border-slate-650 hover:border-rose-800/60 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                <span>✕ Quitar foto</span>
              </button>
            </div>
          ) : (
            <div>
              <label
                htmlFor="quick-photo-input"
                className={`flex items-center justify-center gap-2 w-full py-2.5 px-3 rounded-xl border border-dashed text-xs font-bold cursor-pointer transition-colors ${
                  isCompressing
                    ? 'bg-slate-800/50 border-slate-700 text-slate-400 pointer-events-none'
                    : 'bg-slate-800/60 hover:bg-slate-800 border-slate-700 hover:border-emerald-500/60 text-slate-300 hover:text-emerald-300'
                }`}
              >
                {isCompressing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                    <span>Optimizando foto de factura...</span>
                  </>
                ) : (
                  <>
                    <Camera className="w-4 h-4 text-emerald-400" />
                    <span>📷 Adjuntar Recibo / Factura</span>
                  </>
                )}
              </label>
              <input
                id="quick-photo-input"
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                disabled={isCompressing}
                className="hidden"
                data-testid="quick-photo-input"
              />
            </div>
          )}
          {fileError && (
            <span className="text-[11px] text-rose-400 px-1 font-medium">{fileError}</span>
          )}
        </div>

        {/* Giant Ergonomic Touch Keypad */}
        <div className="grid grid-cols-3 gap-2">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleDigit(digit)}
              className="h-13 py-3 rounded-2xl bg-slate-800 hover:bg-slate-750 active:bg-slate-700 border border-slate-700/80 text-xl font-bold text-white shadow-sm transition-transform active:scale-95"
            >
              {digit}
            </button>
          ))}
          <button
            type="button"
            onClick={handleDot}
            className="h-13 py-3 rounded-2xl bg-slate-800 hover:bg-slate-750 active:bg-slate-700 border border-slate-700/80 text-xl font-bold text-white shadow-sm active:scale-95"
          >
            .
          </button>
          <button
            type="button"
            onClick={() => handleDigit('0')}
            className="h-13 py-3 rounded-2xl bg-slate-800 hover:bg-slate-750 active:bg-slate-700 border border-slate-700/80 text-xl font-bold text-white shadow-sm active:scale-95"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleBackspace}
            aria-label="Borrar dígito"
            className="h-13 py-3 rounded-2xl bg-slate-800 hover:bg-slate-750 active:bg-slate-700 border border-slate-700/80 flex items-center justify-center text-slate-300 active:scale-95"
          >
            <Delete className="w-6 h-6" />
          </button>
        </div>

        {/* Action Controls */}
        <div className="grid grid-cols-4 gap-2 pt-1">
          <button
            type="button"
            onClick={handleClear}
            className="col-span-1 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-750 active:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-300 transition-colors"
          >
            Limpiar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={numericAmount <= 0 || isCompressing}
            className="col-span-3 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:pointer-events-none active:bg-emerald-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30 transition-transform active:scale-[0.98]"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>
              Confirmar ${numericAmount > 0 ? numericAmount.toFixed(2) : '0.00'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
