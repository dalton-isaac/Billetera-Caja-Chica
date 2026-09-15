import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Wallet, ShieldCheck, CheckCircle2, Scale } from 'lucide-react';
import type {
  CategoriaGasto,
  MetodoPago,
  Movimiento,
  RegistroArqueo,
  SubcategoriaOtro,
  TipoMovimiento,
} from './types';
import { db, obtenerConfiguracion, registrarMovimiento, registrarArqueo, eliminarMovimiento } from './db/db';
import { calcularDesgloseGasto, calcularSaldosBolsillos, CONFIG_DEFAULT } from './utils/accounting';
import { BalanceCards } from './components/BalanceCards';
import { PaymentSelector } from './components/PaymentSelector';
import { QuickActionGrid } from './components/QuickActionGrid';
import { TransactionHistory } from './components/TransactionHistory';
import { EditTransactionModal } from './components/EditTransactionModal';
import { AutoReimburseModal } from './components/AutoReimburseModal';
import { ArqueoModal } from './components/ArqueoModal';
import { vibrarExito } from './utils/vibration';

export default function App() {
  const [metodoPago, setMetodoPago] = useState<MetodoPago>('DEBITO_PRODUBANCO');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isAutoReimburseOpen, setIsAutoReimburseOpen] = useState<boolean>(false);
  const [isArqueoOpen, setIsArqueoOpen] = useState<boolean>(false);
  const [editingMovimiento, setEditingMovimiento] = useState<Movimiento | null>(null);

  // Consulta reactiva en vivo con Dexie
  const movimientos = useLiveQuery(() => db.movimientos.toArray()) ?? [];
  const configEntity = useLiveQuery(() => db.configuracion.get('default'));
  const config = configEntity ?? CONFIG_DEFAULT;

  useEffect(() => {
    obtenerConfiguracion();
  }, []);

  // Cálculo en tiempo real de saldos de los 3 bolsillos
  const saldos = calcularSaldosBolsillos(movimientos, config.baseMensual);

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const handleRegistrarGastoRapido = async ({
    categoria,
    montoBase,
    subcategoriaOtro,
    nota,
    tipo = 'GASTO',
  }: {
    categoria: CategoriaGasto;
    montoBase: number;
    subcategoriaOtro?: SubcategoriaOtro;
    nota?: string;
    tipo?: TipoMovimiento;
  }) => {
    try {
      const isRetiro = tipo === 'RETIRO_CAJERO' || categoria === 'RETIRO_CAJERO';

      if (isRetiro) {
        await registrarMovimiento({
          tipo: 'RETIRO_CAJERO',
          categoria: 'RETIRO_CAJERO',
          metodoPago: 'DEBITO_PRODUBANCO',
          montoBase,
          comisionBancaria: 0,
          impuestoDigitalIVA: 0,
          montoTotalDebitado: montoBase,
          estadoReembolso: 'NO_APLICA',
          nota: nota || 'Retiro de efectivo cajero Produbanco',
        });
        vibrarExito();
        setToastMessage(`🏧 Retiro registrado: +$${montoBase.toFixed(2)} en efectivo`);
        return;
      }

      const desglose = calcularDesgloseGasto(categoria, metodoPago, montoBase, config);

      await registrarMovimiento({
        tipo: 'GASTO',
        categoria,
        subcategoriaOtro,
        metodoPago,
        montoBase: desglose.montoBase,
        comisionBancaria: desglose.comisionBancaria,
        impuestoDigitalIVA: desglose.impuestoDigitalIVA,
        montoTotalDebitado: desglose.montoTotalDebitado,
        estadoReembolso: desglose.estadoReembolso,
        nota,
      });

      vibrarExito();

      const formatNombre = categoria.replace('_', ' ');
      setToastMessage(`✅ ${formatNombre} registrado: $${desglose.montoBase.toFixed(2)}`);
    } catch (error) {
      console.error('Error registrando movimiento:', error);
      setToastMessage('❌ Error al guardar el movimiento en el dispositivo');
    }
  };

  const handleCobrarReembolso = () => {
    setIsAutoReimburseOpen(true);
  };

  const handleConfirmarReembolso = async (
    montoReembolso: number,
    comisionSPI: number,
    nota?: string,
  ) => {
    try {
      await registrarMovimiento({
        tipo: 'AUTO_REEMBOLSO',
        categoria: 'OTROS',
        metodoPago: 'DEBITO_PRODUBANCO',
        montoBase: montoReembolso,
        comisionBancaria: comisionSPI,
        impuestoDigitalIVA: 0,
        montoTotalDebitado: montoReembolso + comisionSPI,
        estadoReembolso: 'REEMBOLSADO',
        nota: nota || 'Auto-reembolso de caja chica a cuenta personal Banco Pichincha',
      });

      vibrarExito();
      setToastMessage(`⚡ Reembolso registrado: +$${montoReembolso.toFixed(2)} liquidado`);
      setIsAutoReimburseOpen(false);
    } catch (error) {
      console.error('Error registrando auto-reembolso:', error);
      setToastMessage('❌ Error al guardar el auto-reembolso');
      throw error;
    }
  };

  const handleGuardarArqueo = async (
    registro: Omit<RegistroArqueo, 'id' | 'fechaHora'>,
  ) => {
    try {
      await registrarArqueo(registro);
      vibrarExito();
      if (registro.estado === 'CUADRADO') {
        setToastMessage('⚖️ ¡Acta guardada! Tu caja está 100% cuadrada');
      } else {
        setToastMessage('⚠️ Acta guardada: Descuadre registrado para auditoría');
      }
    } catch (error) {
      console.error('Error guardando arqueo:', error);
      setToastMessage('❌ Error al guardar el arqueo en el dispositivo');
      throw error;
    }
  };

  const handleEditarMovimiento = async (movimientoActualizado: Movimiento) => {
    try {
      await db.movimientos.put(movimientoActualizado);
      vibrarExito();
      setToastMessage('✏️ Movimiento actualizado');
      setEditingMovimiento(null);
    } catch (error) {
      console.error('Error actualizando movimiento:', error);
      setToastMessage('❌ Error al actualizar el movimiento');
      throw error;
    }
  };

  const handleEliminarMovimiento = async (id: string) => {
    try {
      await eliminarMovimiento(id);
      vibrarExito();
      setToastMessage('🗑️ Movimiento eliminado');
    } catch (error) {
      console.error('Error eliminando movimiento:', error);
      setToastMessage('❌ Error al eliminar el movimiento');
      throw error;
    }
  };

  return (
    <div className="min-h-screen bg-slate-925 text-slate-100 flex flex-col items-center p-3 sm:p-5">
      {/* Toast Feedback Notification */}
      {toastMessage && (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-sm p-3 rounded-2xl bg-emerald-600 text-white font-bold text-xs sm:text-sm shadow-xl flex items-center justify-between animate-in slide-in-from-top-3 duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-white/80 hover:text-white text-xs ml-2 px-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header */}
      <header className="w-full max-w-md flex items-center justify-between py-3 border-b border-slate-800 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-2xl border border-emerald-500/20 shadow-inner">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight text-white leading-tight">
              Billetera Caja Chica
            </h1>
            <p className="text-[11px] text-slate-400">Mensajería y Transporte · Quito</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsArqueoOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-750 active:scale-95 border border-slate-700 hover:border-emerald-500/40 text-emerald-400 rounded-xl text-xs font-bold transition-all shadow-sm"
          >
            <Scale className="w-3.5 h-3.5" />
            <span>Arqueo de Caja</span>
          </button>
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-slate-850 rounded-full border border-slate-750 text-xs text-emerald-400 shadow-sm">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span className="font-semibold text-[11px]">Offline</span>
          </div>
        </div>
      </header>

      {/* Main Screen Content */}
      <main className="w-full max-w-md flex flex-col gap-4 pb-12">
        {/* Balances Section */}
        <BalanceCards saldos={saldos} onCobrarReembolso={handleCobrarReembolso} />

        {/* Payment Method Selector */}
        <PaymentSelector selected={metodoPago} onSelect={setMetodoPago} />

        {/* Quick 1-Tap Action Grid */}
        <QuickActionGrid
          metodoPago={metodoPago}
          onRegistrarGastoRapido={handleRegistrarGastoRapido}
          config={config}
        />

        {/* Transaction History & Search */}
        <TransactionHistory
          movimientos={movimientos}
          onEditarMovimiento={(m) => setEditingMovimiento(m)}
          onEliminarMovimiento={handleEliminarMovimiento}
        />
      </main>

      {/* Modal de Auto-Reembolso y Liquidación */}
      <AutoReimburseModal
        isOpen={isAutoReimburseOpen}
        onClose={() => setIsAutoReimburseOpen(false)}
        saldoPendiente={saldos.saldoPendienteReembolso}
        costoTransferenciaSPI={config.costoTransferenciaSPI}
        onConfirmarReembolso={handleConfirmarReembolso}
      />

      {/* Modal de Arqueo y Diagnóstico Predictivo */}
      <ArqueoModal
        isOpen={isArqueoOpen}
        onClose={() => setIsArqueoOpen(false)}
        saldoTeoricoBanco={saldos.saldoProdubanco}
        saldoTeoricoEfectivo={saldos.saldoEfectivo}
        onGuardarArqueo={handleGuardarArqueo}
      />

      {/* Modal de Edición de Movimiento */}
      <EditTransactionModal
        isOpen={editingMovimiento !== null}
        movimiento={editingMovimiento}
        onClose={() => setEditingMovimiento(null)}
        onGuardar={handleEditarMovimiento}
        config={config}
      />
    </div>
  );
}
