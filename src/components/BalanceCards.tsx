import type { FC } from 'react';
import { Building2, Banknote, HandCoins, AlertTriangle, Zap, TrendingDown } from 'lucide-react';
import type { SaldosBolsillos } from '../types';

interface BalanceCardsProps {
  saldos: SaldosBolsillos;
  onCobrarReembolso?: () => void;
}

export const BalanceCards: FC<BalanceCardsProps> = ({ saldos, onCobrarReembolso }) => {
  const tieneDeuda = saldos.saldoPendienteReembolso > 0;
  const bancoBajo = saldos.saldoProdubanco < 25;
  const efectivoBajo = saldos.saldoEfectivo < 5;

  const porcentajeGastado = saldos.baseMensual > 0
    ? Math.min(100, Math.round((saldos.totalGastosMes / saldos.baseMensual) * 100))
    : 0;

  return (
    <div className="w-full flex flex-col gap-3">
      {/* 3 Main Pocket Cards */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* Pocket 1: Produbanco */}
        <div className="flex flex-col justify-between p-3.5 rounded-2xl bg-slate-850/90 border border-slate-750 shadow-md">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-blue-400">
              <Building2 className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Produbanco
              </span>
            </div>
            {bancoBajo && (
              <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">
                <AlertTriangle className="w-2.5 h-2.5" /> Bajo
              </span>
            )}
          </div>
          <div>
            <div className="text-2xl font-black tracking-tight text-white">
              ${saldos.saldoProdubanco.toFixed(2)}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Banco Caja Chica</div>
          </div>
        </div>

        {/* Pocket 2: Efectivo */}
        <div className="flex flex-col justify-between p-3.5 rounded-2xl bg-slate-850/90 border border-slate-750 shadow-md">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-emerald-400">
              <Banknote className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Efectivo
              </span>
            </div>
            {efectivoBajo && (
              <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">
                <AlertTriangle className="w-2.5 h-2.5" /> Bajo
              </span>
            )}
          </div>
          <div>
            <div className="text-2xl font-black tracking-tight text-white">
              ${saldos.saldoEfectivo.toFixed(2)}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Caja Física en Mano</div>
          </div>
        </div>
      </div>

      {/* Pocket 3: A mi favor (Deuda Personal) - Full Width Highlight Card */}
      <div
        className={`p-3.5 rounded-2xl border transition-all duration-200 shadow-md ${
          tieneDeuda
            ? 'bg-gradient-to-r from-rose-950/60 via-amber-950/40 to-slate-900 border-rose-500/50 shadow-rose-900/20'
            : 'bg-slate-850/60 border-slate-800'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className={`p-2 rounded-xl ${
                tieneDeuda
                  ? 'bg-rose-500/20 text-rose-300 ring-1 ring-rose-500/30'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              <HandCoins className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  A mi favor
                </span>
                {tieneDeuda && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30 animate-pulse">
                    Pendiente
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-400">
                {tieneDeuda
                  ? 'Dinero puesto de tu bolsillo (De Una Personal)'
                  : 'Sin reembolsos pendientes'}
              </div>
            </div>
          </div>

          <div className="text-right">
            <div
              className={`text-2xl font-black tracking-tight ${
                tieneDeuda ? 'text-rose-300' : 'text-slate-400'
              }`}
            >
              ${saldos.saldoPendienteReembolso.toFixed(2)}
            </div>
            {tieneDeuda && onCobrarReembolso && (
              <button
                type="button"
                onClick={onCobrarReembolso}
                className="mt-1 flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold transition-all active:scale-95 shadow-sm"
              >
                <Zap className="w-3 h-3 fill-current" />
                <span>Cobrar</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Monthly Budget Tracker Bar */}
      <div className="px-3 py-2.5 rounded-xl bg-slate-900/80 border border-slate-800/80 flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1 text-slate-400">
            <TrendingDown className="w-3.5 h-3.5 text-slate-400" />
            <span>Gastos acumulados del mes:</span>
          </div>
          <span className="font-bold text-slate-200">
            ${saldos.totalGastosMes.toFixed(2)}{' '}
            <span className="text-slate-500 font-normal">/ ${saldos.baseMensual.toFixed(2)}</span>
          </span>
        </div>
        <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 rounded-full ${
              porcentajeGastado > 85
                ? 'bg-rose-500'
                : porcentajeGastado > 60
                ? 'bg-amber-500'
                : 'bg-emerald-500'
            }`}
            style={{ width: `${porcentajeGastado}%` }}
          />
        </div>
      </div>
    </div>
  );
};
