import { useState, useMemo, type FC, type ElementType } from 'react';
import {
  Train,
  Bus,
  Car,
  Utensils,
  Landmark,
  ArrowRightLeft,
  Package,
  Wallet,
  Search,
  Edit2,
  Trash2,
  AlertTriangle,
  Receipt,
  X,
} from 'lucide-react';
import type {
  CategoriaGasto,
  MetodoPago,
  Movimiento,
} from '../types';
import { vibrarExito } from '../utils/vibration';

export interface TransactionHistoryProps {
  movimientos: Movimiento[];
  onEditarMovimiento: (movimiento: Movimiento) => void;
  onEliminarMovimiento: (id: string) => Promise<void>;
}

export type FiltroCategoria =
  | 'TODOS'
  | 'METRO_BUS'
  | 'APPS_TAXI'
  | 'EFECTIVO'
  | 'DE_UNA'
  | 'RETIROS';

interface TabConfig {
  id: FiltroCategoria;
  label: string;
}

const TABS: TabConfig[] = [
  { id: 'TODOS', label: 'Todos' },
  { id: 'METRO_BUS', label: 'Metro / Bus' },
  { id: 'APPS_TAXI', label: 'Apps / Taxi' },
  { id: 'EFECTIVO', label: 'Efectivo' },
  { id: 'DE_UNA', label: 'De Una' },
  { id: 'RETIROS', label: 'Retiros' },
];

export function formatearFechaHora(fechaIso: string): string {
  try {
    const d = new Date(fechaIso);
    if (isNaN(d.getTime())) return fechaIso;
    const dia = d.getDate();
    const meses = [
      'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
      'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
    ];
    const mes = meses[d.getMonth()];
    const horas = String(d.getHours()).padStart(2, '0');
    const minutos = String(d.getMinutes()).padStart(2, '0');
    return `${dia} ${mes} - ${horas}:${minutos}`;
  } catch {
    return fechaIso;
  }
}

export function getCategoriaIcon(categoria?: CategoriaGasto, tipo?: string): ElementType {
  if (tipo === 'AUTO_REEMBOLSO') return ArrowRightLeft;
  if (tipo === 'FONDEO_BASE') return Wallet;
  if (tipo === 'RETIRO_CAJERO' || categoria === 'RETIRO_CAJERO') return Landmark;

  switch (categoria) {
    case 'METRO':
      return Train;
    case 'BUS_URBANO':
    case 'BUS_VALLES':
      return Bus;
    case 'UBER':
    case 'DIDI':
    case 'INDRIVE':
    case 'TAXI':
      return Car;
    case 'ALIMENTACION':
      return Utensils;
    case 'OTROS':
      return Package;
    default:
      return Wallet;
  }
}

export function getCategoriaNombre(movimiento: Movimiento): string {
  if (movimiento.tipo === 'AUTO_REEMBOLSO') return 'Auto-Reembolso';
  if (movimiento.tipo === 'FONDEO_BASE') return 'Fondeo Base';
  if (movimiento.tipo === 'RETIRO_CAJERO' || movimiento.categoria === 'RETIRO_CAJERO') {
    return 'Retiro Cajero';
  }

  switch (movimiento.categoria) {
    case 'METRO':
      return 'Metro de Quito';
    case 'BUS_URBANO':
      return 'Bus Urbano';
    case 'BUS_VALLES':
      return 'Bus Valles';
    case 'UBER':
      return 'Uber';
    case 'DIDI':
      return 'DiDi';
    case 'INDRIVE':
      return 'inDrive';
    case 'TAXI':
      return 'Taxi Convencional';
    case 'ALIMENTACION':
      return 'Alimentación';
    case 'OTROS':
      return movimiento.subcategoriaOtro
        ? `Otros · ${movimiento.subcategoriaOtro}`
        : 'Otros Gastos';
    default:
      return 'Movimiento';
  }
}

export function getMetodoPagoBadge(metodoPago: MetodoPago): {
  label: string;
  className: string;
} {
  switch (metodoPago) {
    case 'DEBITO_PRODUBANCO':
      return {
        label: 'Débito Produbanco',
        className: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
      };
    case 'EFECTIVO_CAJA':
      return {
        label: 'Efectivo',
        className: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
      };
    case 'DEUNA_PRODUBANCO':
      return {
        label: 'De Una (Produbanco)',
        className: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
      };
    case 'DEUNA_PERSONAL':
      return {
        label: 'De Una (Personal)',
        className: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
      };
    default:
      return {
        label: metodoPago,
        className: 'bg-slate-700 text-slate-300 border-slate-600',
      };
  }
}

export const TransactionHistory: FC<TransactionHistoryProps> = ({
  movimientos,
  onEditarMovimiento,
  onEliminarMovimiento,
}) => {
  const [filtroActivo, setFiltroActivo] = useState<FiltroCategoria>('TODOS');
  const [busqueda, setBusqueda] = useState<string>('');
  const [movimientoAEliminar, setMovimientoAEliminar] = useState<Movimiento | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Orden cronológico: más reciente primero
  const movimientosOrdenados = useMemo(() => {
    return [...movimientos].sort((a, b) => {
      return new Date(b.fechaHora).getTime() - new Date(a.fechaHora).getTime();
    });
  }, [movimientos]);

  // Filtrado por categoría/método y texto de búsqueda
  const movimientosFiltrados = useMemo(() => {
    return movimientosOrdenados.filter((m) => {
      // 1. Filtro por pestaña
      let pasaFiltro = true;
      switch (filtroActivo) {
        case 'METRO_BUS':
          pasaFiltro =
            m.categoria === 'METRO' ||
            m.categoria === 'BUS_URBANO' ||
            m.categoria === 'BUS_VALLES';
          break;
        case 'APPS_TAXI':
          pasaFiltro =
            m.categoria === 'UBER' ||
            m.categoria === 'DIDI' ||
            m.categoria === 'INDRIVE' ||
            m.categoria === 'TAXI';
          break;
        case 'EFECTIVO':
          pasaFiltro = m.metodoPago === 'EFECTIVO_CAJA';
          break;
        case 'DE_UNA':
          pasaFiltro =
            m.metodoPago === 'DEUNA_PRODUBANCO' ||
            m.metodoPago === 'DEUNA_PERSONAL';
          break;
        case 'RETIROS':
          pasaFiltro =
            m.tipo === 'RETIRO_CAJERO' || m.categoria === 'RETIRO_CAJERO';
          break;
        case 'TODOS':
        default:
          pasaFiltro = true;
          break;
      }

      if (!pasaFiltro) return false;

      // 2. Filtro por texto de búsqueda
      if (busqueda.trim()) {
        const query = busqueda.toLowerCase().trim();
        const categoriaStr = (m.categoria || '').toLowerCase();
        const subcategoriaStr = (m.subcategoriaOtro || '').toLowerCase();
        const notaStr = (m.nota || '').toLowerCase();
        const metodoStr = m.metodoPago.toLowerCase();
        const montoBaseStr = m.montoBase.toFixed(2);
        const totalStr = m.montoTotalDebitado.toFixed(2);

        const coincide =
          categoriaStr.includes(query) ||
          subcategoriaStr.includes(query) ||
          notaStr.includes(query) ||
          metodoStr.includes(query) ||
          montoBaseStr.includes(query) ||
          totalStr.includes(query);

        if (!coincide) return false;
      }

      return true;
    });
  }, [movimientosOrdenados, filtroActivo, busqueda]);

  const handleConfirmarEliminar = async () => {
    if (!movimientoAEliminar) return;
    try {
      setIsDeleting(true);
      vibrarExito();
      await onEliminarMovimiento(movimientoAEliminar.id);
      setMovimientoAEliminar(null);
    } catch (err) {
      console.error('Error eliminando movimiento:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="w-full flex flex-col gap-3">
      {/* Título de la sección */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Receipt className="w-4 h-4 text-emerald-400" />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            Historial de Movimientos ({movimientosFiltrados.length})
          </h2>
        </div>
      </div>

      {/* Buscador de texto */}
      <div className="relative flex items-center">
        <Search className="w-4 h-4 absolute left-3 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por detalle, categoría, monto..."
          aria-label="Buscar movimientos"
          className="w-full pl-9 pr-9 py-2 bg-slate-850 rounded-xl border border-slate-750 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
        />
        {busqueda && (
          <button
            type="button"
            onClick={() => setBusqueda('')}
            aria-label="Limpiar búsqueda"
            className="absolute right-2.5 p-1 rounded-full text-slate-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Pestañas de Filtro */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {TABS.map((tab) => {
          const isSelected = filtroActivo === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                vibrarExito();
                setFiltroActivo(tab.id);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all active:scale-95 ${
                isSelected
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700/60'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Lista de Movimientos o Estado Vacío */}
      {movimientosFiltrados.length === 0 ? (
        <div className="p-6 rounded-2xl bg-slate-850/60 border border-slate-800 flex flex-col items-center justify-center text-center gap-2">
          <div className="p-3 rounded-full bg-slate-800 text-slate-500">
            <Receipt className="w-6 h-6" />
          </div>
          <div className="text-sm font-bold text-slate-300">
            No se encontraron movimientos
          </div>
          <p className="text-xs text-slate-500 max-w-xs">
            {busqueda || filtroActivo !== 'TODOS'
              ? 'Prueba cambiando el filtro o término de búsqueda para ver otros registros.'
              : 'Los gastos, retiros y reembolsos que registres aparecerán aquí en tiempo real.'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {movimientosFiltrados.map((m) => {
            const Icon = getCategoriaIcon(m.categoria, m.tipo);
            const nombre = getCategoriaNombre(m);
            const badge = getMetodoPagoBadge(m.metodoPago);
            const isPersonal = m.metodoPago === 'DEUNA_PERSONAL';
            const isRetiro = m.tipo === 'RETIRO_CAJERO' || m.categoria === 'RETIRO_CAJERO';
            const isReembolso = m.tipo === 'AUTO_REEMBOLSO';

            return (
              <div
                key={m.id}
                className="p-3 rounded-2xl bg-slate-850/90 border border-slate-750 hover:border-slate-700 flex flex-col gap-2.5 shadow-sm transition-all"
              >
                {/* Cabecera del ítem */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 flex-shrink-0">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs sm:text-sm font-bold text-white truncate">
                        {nombre}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {formatearFechaHora(m.fechaHora)}
                      </div>
                    </div>
                  </div>

                  {/* Monto Principal */}
                  <div className="text-right flex-shrink-0">
                    <div
                      className={`text-sm sm:text-base font-black ${
                        isPersonal
                          ? 'text-rose-400'
                          : isRetiro
                          ? 'text-cyan-300'
                          : isReembolso
                          ? 'text-amber-400'
                          : 'text-emerald-400'
                      }`}
                    >
                      ${m.montoBase.toFixed(2)}
                    </div>
                    {isPersonal && (
                      <span className="text-[10px] text-rose-400 font-semibold block">
                        Deuda Personal
                      </span>
                    )}
                  </div>
                </div>

                {/* Nota opcional */}
                {m.nota && (
                  <div className="text-xs text-slate-300 bg-slate-900/60 px-2.5 py-1.5 rounded-lg border border-slate-800/80 italic">
                    "{m.nota}"
                  </div>
                )}

                {/* Badges y Desglose Financiero */}
                <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1.5 border-t border-slate-800 text-[11px]">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span
                      className={`px-2 py-0.5 rounded-md border text-[10px] font-semibold ${badge.className}`}
                    >
                      {badge.label}
                    </span>

                    {m.estadoReembolso === 'PENDIENTE' && (
                      <span className="px-2 py-0.5 rounded-md border bg-rose-950/60 border-rose-700 text-rose-300 text-[10px] font-bold">
                        ⚠️ Por Cobrar
                      </span>
                    )}
                    {m.estadoReembolso === 'REEMBOLSADO' && (
                      <span className="px-2 py-0.5 rounded-md border bg-emerald-950/60 border-emerald-700 text-emerald-300 text-[10px] font-bold">
                        ✓ Cobrado
                      </span>
                    )}
                  </div>

                  {/* Desglose de impuestos / comisiones */}
                  <div className="flex items-center gap-2 text-slate-400 text-[10px]">
                    {m.impuestoDigitalIVA > 0 && (
                      <span className="text-amber-300 font-semibold">
                        +IVA: ${m.impuestoDigitalIVA.toFixed(2)}
                      </span>
                    )}
                    {m.comisionBancaria > 0 && (
                      <span className="text-amber-300 font-semibold">
                        +SPI: ${m.comisionBancaria.toFixed(2)}
                      </span>
                    )}
                    {!isPersonal && !isRetiro && (
                      <span className="text-slate-300 font-medium">
                        Total: ${m.montoTotalDebitado.toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Acciones del movimiento: Editar y Eliminar */}
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => onEditarMovimiento(m)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700 text-[11px] font-semibold transition-colors active:scale-95"
                  >
                    <Edit2 className="w-3 h-3 text-amber-400" />
                    <span>Editar</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMovimientoAEliminar(m)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-rose-950/40 text-slate-400 hover:text-rose-300 border border-slate-700 hover:border-rose-800/60 text-[11px] font-semibold transition-colors active:scale-95"
                  >
                    <Trash2 className="w-3 h-3 text-rose-400" />
                    <span>Eliminar</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Confirmación de Eliminación */}
      {movimientoAEliminar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-750 rounded-3xl p-5 flex flex-col gap-3 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">¿Eliminar movimiento?</h3>
                <p className="text-xs text-slate-400">
                  {getCategoriaNombre(movimientoAEliminar)} · ${movimientoAEliminar.montoBase.toFixed(2)}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-800">
              Esta acción recalculará los saldos de Produbanco, Efectivo y Deuda Personal en tiempo real.
            </p>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setMovimientoAEliminar(null)}
                disabled={isDeleting}
                className="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-750 text-xs font-bold text-slate-300 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarEliminar}
                disabled={isDeleting}
                className="py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 border border-rose-500 text-xs font-bold text-white transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-rose-950/40"
              >
                {isDeleting ? 'Eliminando...' : 'Sí, Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
