import { useState, type FC } from 'react';
import {
  Train,
  Bus,
  MapPin,
  Car,
  Utensils,
  Package,
  Landmark,
  X,
  Zap,
} from 'lucide-react';
import type {
  CategoriaGasto,
  ConfiguracionSistema,
  MetodoPago,
  SubcategoriaOtro,
  TipoMovimiento,
} from '../types';
import { TARIFAS_TRANSPORTE } from '../utils/accounting';
import { vibrarExito } from '../utils/vibration';
import { QuickAmountModal } from './QuickAmountModal';

interface QuickActionGridProps {
  metodoPago: MetodoPago;
  onRegistrarGastoRapido: (params: {
    categoria: CategoriaGasto;
    montoBase: number;
    subcategoriaOtro?: SubcategoriaOtro;
    nota?: string;
    tipo?: TipoMovimiento;
  }) => Promise<void> | void;
  config?: ConfiguracionSistema;
}

export const QuickActionGrid: FC<QuickActionGridProps> = ({
  metodoPago,
  onRegistrarGastoRapido,
  config,
}) => {
  const [modalCategoria, setModalCategoria] = useState<CategoriaGasto | null>(null);
  const [showVallesSelector, setShowVallesSelector] = useState(false);

  // Registro instantáneo de 1 toque (Metro y Bus Urbano)
  const handleMetroInstant = () => {
    vibrarExito();
    onRegistrarGastoRapido({
      categoria: 'METRO',
      montoBase: TARIFAS_TRANSPORTE.METRO,
      tipo: 'GASTO',
    });
  };

  const handleBusUrbanoInstant = () => {
    vibrarExito();
    onRegistrarGastoRapido({
      categoria: 'BUS_URBANO',
      montoBase: TARIFAS_TRANSPORTE.BUS_URBANO,
      tipo: 'GASTO',
    });
  };

  const handleSelectVallesTarifa = (monto: number, destino: string) => {
    vibrarExito();
    setShowVallesSelector(false);
    onRegistrarGastoRapido({
      categoria: 'BUS_VALLES',
      montoBase: monto,
      nota: `Bus Valles: ${destino}`,
      tipo: 'GASTO',
    });
  };

  const openModal = (cat: CategoriaGasto) => {
    vibrarExito();
    setModalCategoria(cat);
  };

  return (
    <div className="w-full flex flex-col gap-4">
      {/* Sección 1: Accesos 1-Toque (Transporte Masivo) */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
            <Zap className="w-3.5 h-3.5 fill-current" />
            1-Toque Inmediato (Sin confirmación)
          </span>
          <span className="text-[11px] text-slate-500">Registra en &lt; 1 seg</span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {/* Metro $0.45 */}
          <button
            type="button"
            onClick={handleMetroInstant}
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-gradient-to-b from-emerald-650 to-emerald-800 hover:from-emerald-600 hover:to-emerald-750 active:scale-95 text-white shadow-lg shadow-emerald-950/40 border border-emerald-500/40 transition-transform"
          >
            <Train className="w-6 h-6 mb-1 text-emerald-200" />
            <span className="text-xs font-bold leading-tight">Metro</span>
            <span className="text-sm font-black text-emerald-200 mt-0.5">$0.45</span>
          </button>

          {/* Bus Urbano $0.35 */}
          <button
            type="button"
            onClick={handleBusUrbanoInstant}
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-gradient-to-b from-blue-650 to-blue-800 hover:from-blue-600 hover:to-blue-750 active:scale-95 text-white shadow-lg shadow-blue-950/40 border border-blue-500/40 transition-transform"
          >
            <Bus className="w-6 h-6 mb-1 text-blue-200" />
            <span className="text-xs font-bold leading-tight">Bus Urbano</span>
            <span className="text-sm font-black text-blue-200 mt-0.5">$0.35</span>
          </button>

          {/* Bus Valles Popover trigger */}
          <button
            type="button"
            onClick={() => {
              vibrarExito();
              setShowVallesSelector(true);
            }}
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-gradient-to-b from-amber-650 to-amber-850 hover:from-amber-600 hover:to-amber-800 active:scale-95 text-white shadow-lg shadow-amber-950/40 border border-amber-500/40 transition-transform"
          >
            <MapPin className="w-6 h-6 mb-1 text-amber-200" />
            <span className="text-xs font-bold leading-tight">Bus Valles</span>
            <span className="text-[11px] font-bold text-amber-200 mt-1">$0.45 - $0.75</span>
          </button>
        </div>
      </div>

      {/* Sección 2: Movilidad en Apps y Taxi */}
      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 px-1">
          Taxis y Aplicaciones de Movilidad
        </span>

        <div className="grid grid-cols-4 gap-2">
          {/* Uber */}
          <button
            type="button"
            onClick={() => openModal('UBER')}
            className="relative flex flex-col items-center justify-center p-2.5 rounded-2xl bg-slate-800/90 hover:bg-slate-750 active:scale-95 border border-slate-700 text-white transition-transform"
          >
            {metodoPago === 'DEBITO_PRODUBANCO' && (
              <span className="absolute -top-1.5 right-1 px-1.5 py-0.2 rounded-full bg-blue-500 text-[9px] font-bold text-white shadow">
                +15% IVA
              </span>
            )}
            <Car className="w-5 h-5 mb-1 text-slate-100" />
            <span className="text-xs font-bold">Uber</span>
            <span className="text-[10px] text-slate-400">Tarifa libre</span>
          </button>

          {/* inDrive */}
          <button
            type="button"
            onClick={() => openModal('INDRIVE')}
            className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-slate-800/90 hover:bg-slate-750 active:scale-95 border border-slate-700 text-white transition-transform"
          >
            <Car className="w-5 h-5 mb-1 text-emerald-400" />
            <span className="text-xs font-bold">inDrive</span>
            <span className="text-[10px] text-slate-400">Pactada</span>
          </button>

          {/* DiDi */}
          <button
            type="button"
            onClick={() => openModal('DIDI')}
            className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-slate-800/90 hover:bg-slate-750 active:scale-95 border border-slate-700 text-white transition-transform"
          >
            <Car className="w-5 h-5 mb-1 text-amber-400" />
            <span className="text-xs font-bold">DiDi</span>
            <span className="text-[10px] text-slate-400">App</span>
          </button>

          {/* Taxi */}
          <button
            type="button"
            onClick={() => openModal('TAXI')}
            className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-slate-800/90 hover:bg-slate-750 active:scale-95 border border-slate-700 text-white transition-transform"
          >
            <Car className="w-5 h-5 mb-1 text-yellow-400" />
            <span className="text-xs font-bold">Taxi</span>
            <span className="text-[10px] text-slate-400">Taxímetro</span>
          </button>
        </div>
      </div>

      {/* Sección 3: Otros Gastos Operativos y Cajero */}
      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 px-1">
          Gastos Diarios y Fondeo de Caja
        </span>

        <div className="grid grid-cols-3 gap-2">
          {/* Alimentación */}
          <button
            type="button"
            onClick={() => openModal('ALIMENTACION')}
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-800/90 hover:bg-slate-750 active:scale-95 border border-slate-700 text-white transition-transform"
          >
            <Utensils className="w-5 h-5 mb-1 text-orange-400" />
            <span className="text-xs font-bold">Alimentación</span>
            <span className="text-[10px] text-slate-400">Almuerzo/Café</span>
          </button>

          {/* Otros Gastos */}
          <button
            type="button"
            onClick={() => openModal('OTROS')}
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-800/90 hover:bg-slate-750 active:scale-95 border border-slate-700 text-white transition-transform"
          >
            <Package className="w-5 h-5 mb-1 text-purple-400" />
            <span className="text-xs font-bold">Otros Gastos</span>
            <span className="text-[10px] text-slate-400">Peaje/Parqueo</span>
          </button>

          {/* Retiro de Cajero */}
          <button
            type="button"
            onClick={() => openModal('RETIRO_CAJERO')}
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-gradient-to-b from-cyan-900/60 to-slate-850 hover:from-cyan-800/60 active:scale-95 border border-cyan-500/40 text-white transition-transform shadow-md"
          >
            <Landmark className="w-5 h-5 mb-1 text-cyan-300" />
            <span className="text-xs font-bold text-cyan-200">Retiro Cajero</span>
            <span className="text-[10px] text-cyan-400/80">Banco ➔ Efectivo</span>
          </button>
        </div>
      </div>

      {/* Popover / Sheet selector para Bus Valles */}
      {showVallesSelector && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-750 rounded-3xl p-5 flex flex-col gap-3 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Tarifa Bus a Valles</h3>
                  <p className="text-xs text-slate-400">Selecciona el tramo o destino</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowVallesSelector(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => handleSelectVallesTarifa(0.45, 'Cumbayá')}
                className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-800 hover:bg-slate-750 active:scale-98 border border-slate-700 text-left transition-transform"
              >
                <div>
                  <div className="text-sm font-bold text-white">Cumbayá / Mínimo</div>
                  <div className="text-xs text-slate-400">Tramo corto hasta Cumbayá</div>
                </div>
                <span className="text-base font-black text-amber-400">$0.45</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectVallesTarifa(0.55, 'Tumbaco / Chillos')}
                className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-800 hover:bg-slate-750 active:scale-98 border border-slate-700 text-left transition-transform"
              >
                <div>
                  <div className="text-sm font-bold text-white">Tumbaco / Los Chillos</div>
                  <div className="text-xs text-slate-400">Sangolquí, Conocoto, San Rafael</div>
                </div>
                <span className="text-base font-black text-amber-400">$0.55</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectVallesTarifa(0.75, 'Pifo / El Quinche')}
                className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-800 hover:bg-slate-750 active:scale-98 border border-slate-700 text-left transition-transform"
              >
                <div>
                  <div className="text-sm font-bold text-white">Pifo / Quinche / Amaguaña</div>
                  <div className="text-xs text-slate-400">Tramos interparroquiales largos</div>
                </div>
                <span className="text-base font-black text-amber-400">$0.75</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowVallesSelector(false);
                  openModal('BUS_VALLES');
                }}
                className="p-3 rounded-2xl bg-slate-850 hover:bg-slate-800 border border-slate-750 text-center text-xs font-bold text-slate-300"
              >
                Otro valor personalizado...
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal con teclado numérico gigante */}
      <QuickAmountModal
        isOpen={modalCategoria !== null}
        onClose={() => setModalCategoria(null)}
        categoria={modalCategoria}
        metodoPago={metodoPago}
        onConfirm={onRegistrarGastoRapido}
        config={config}
      />
    </div>
  );
};
