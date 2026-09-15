import type { FC, ElementType } from 'react';
import { CreditCard, Banknote, Smartphone, UserCheck } from 'lucide-react';
import type { MetodoPago } from '../types';
import { vibrarExito } from '../utils/vibration';

interface PaymentSelectorProps {
  selected: MetodoPago;
  onSelect: (metodo: MetodoPago) => void;
}

interface MetodoOption {
  id: MetodoPago;
  titulo: string;
  subtitulo: string;
  icono: ElementType;
  colorActivo: string;
  badge: string;
}

const OPCIONES_PAGO: MetodoOption[] = [
  {
    id: 'DEBITO_PRODUBANCO',
    titulo: 'Débito Produbanco',
    subtitulo: '+15% IVA si es Uber',
    icono: CreditCard,
    colorActivo: 'border-blue-500 bg-blue-950/40 text-blue-200 ring-2 ring-blue-500/50 shadow-blue-500/20',
    badge: 'Tarjeta Banco',
  },
  {
    id: 'EFECTIVO_CAJA',
    titulo: 'Efectivo Caja',
    subtitulo: 'Monedas/Billetes',
    icono: Banknote,
    colorActivo: 'border-emerald-500 bg-emerald-950/40 text-emerald-200 ring-2 ring-emerald-500/50 shadow-emerald-500/20',
    badge: 'Caja Física',
  },
  {
    id: 'DEUNA_PRODUBANCO',
    titulo: 'De Una (Produbanco)',
    subtitulo: '+$0.20 comisión SPI, $0 deuda',
    icono: Smartphone,
    colorActivo: 'border-amber-500 bg-amber-950/40 text-amber-200 ring-2 ring-amber-500/50 shadow-amber-500/20',
    badge: 'Comisión $0.20',
  },
  {
    id: 'DEUNA_PERSONAL',
    titulo: 'De Una (Personal)',
    subtitulo: 'Puesto de mi bolsillo, genera deuda',
    icono: UserCheck,
    colorActivo: 'border-rose-500 bg-rose-950/40 text-rose-200 ring-2 ring-rose-500/50 shadow-rose-500/20',
    badge: 'A Reembolsar',
  },
];

export const PaymentSelector: FC<PaymentSelectorProps> = ({ selected, onSelect }) => {
  const handleSelect = (id: MetodoPago) => {
    vibrarExito();
    onSelect(id);
  };

  return (
    <div className="w-full flex flex-col gap-2">
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Método de Pago Activo
        </span>
        <span className="text-[11px] text-slate-500">Toca para cambiar antes de registrar</span>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {OPCIONES_PAGO.map((opcion) => {
          const isSelected = selected === opcion.id;
          const Icon = opcion.icono;

          return (
            <button
              key={opcion.id}
              type="button"
              onClick={() => handleSelect(opcion.id)}
              aria-pressed={isSelected}
              className={`relative flex flex-col text-left p-3 rounded-2xl border transition-all duration-150 active:scale-[0.98] shadow-md ${
                isSelected
                  ? `${opcion.colorActivo} shadow-lg font-medium`
                  : 'border-slate-800 bg-slate-850/80 hover:bg-slate-800/90 text-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5 w-full">
                <div
                  className={`p-1.5 rounded-xl ${
                    isSelected ? 'bg-white/10' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-md font-semibold tracking-wide ${
                    isSelected
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {opcion.badge}
                </span>
              </div>

              <div className="text-sm font-bold tracking-tight leading-snug">
                {opcion.titulo}
              </div>

              <div
                className={`text-[11px] leading-tight mt-1 line-clamp-2 ${
                  isSelected ? 'text-white/80' : 'text-slate-400'
                }`}
              >
                {opcion.subtitulo}
              </div>

              {isSelected && (
                <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-emerald-400/40 animate-pulse" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
