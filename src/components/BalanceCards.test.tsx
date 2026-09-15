import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BalanceCards } from './BalanceCards';
import type { SaldosBolsillos } from '../types';

describe('BalanceCards', () => {
  const defaultSaldos: SaldosBolsillos = {
    saldoProdubanco: 180.50,
    saldoEfectivo: 19.50,
    saldoPendienteReembolso: 0.00,
    totalGastosMes: 20.00,
    baseMensual: 200.00,
  };

  it('renders balances for Produbanco, Efectivo, and monthly budget correctly', () => {
    render(<BalanceCards saldos={defaultSaldos} />);

    expect(screen.getByText('Produbanco')).toBeInTheDocument();
    expect(screen.getByText('$180.50')).toBeInTheDocument();

    expect(screen.getByText('Efectivo')).toBeInTheDocument();
    expect(screen.getByText('$19.50')).toBeInTheDocument();

    expect(screen.getByText('A mi favor')).toBeInTheDocument();
    expect(screen.getByText('$0.00')).toBeInTheDocument();
    expect(screen.getByText('Sin reembolsos pendientes')).toBeInTheDocument();
  });

  it('highlights pending reimbursement when saldoPendienteReembolso > 0 and displays cobrar button', () => {
    const onCobrar = vi.fn();
    const saldosConDeuda: SaldosBolsillos = {
      ...defaultSaldos,
      saldoPendienteReembolso: 8.50,
    };

    render(<BalanceCards saldos={saldosConDeuda} onCobrarReembolso={onCobrar} />);

    expect(screen.getByText('$8.50')).toBeInTheDocument();
    expect(screen.getByText('Pendiente')).toBeInTheDocument();

    const cobrarBtn = screen.getByRole('button', { name: /Cobrar/i });
    expect(cobrarBtn).toBeInTheDocument();

    fireEvent.click(cobrarBtn);
    expect(onCobrar).toHaveBeenCalledTimes(1);
  });
});
