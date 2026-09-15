import { Wallet, ShieldCheck, CheckCircle2, DollarSign } from 'lucide-react';

export default function App() {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center p-4">
      {/* Header */}
      <header className="w-full max-w-md flex items-center justify-between py-4 border-b border-slate-800 mb-6">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white leading-tight">
              Billetera Caja Chica
            </h1>
            <p className="text-xs text-slate-400">Control de Mensajería y Transporte</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 rounded-full border border-slate-700 text-xs text-emerald-400">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span className="font-medium">Offline-Ready</span>
        </div>
      </header>

      {/* Main Container */}
      <main className="w-full max-w-md flex flex-col gap-4">
        {/* Balance Card Placeholder */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-850 border border-slate-700 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Fondo Mensual Base</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-extrabold text-white tracking-tight">
            $200.00 <span className="text-sm font-normal text-slate-400">USD</span>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-700/50 flex items-center justify-between text-xs text-slate-300">
            <span>Produbanco / Efectivo</span>
            <span className="text-emerald-400 font-semibold">100% Disponible</span>
          </div>
        </div>

        {/* System Status / Task 1 Scaffolding Check */}
        <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Estado del Sistema</span>
          </div>
          <ul className="text-xs text-slate-400 space-y-1.5 pl-1">
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              React + TypeScript + Vite Scaffolding configurado
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              Tailwind CSS y diseño adaptado a móviles
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              Vitest configurado para tests unitarios
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              Librerías Dexie.js, jsPDF y SheetJS listas
            </li>
          </ul>
        </div>
      </main>
    </div>
  );
}
