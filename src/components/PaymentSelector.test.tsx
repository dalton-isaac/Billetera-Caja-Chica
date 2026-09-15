import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PaymentSelector } from './PaymentSelector';

describe('PaymentSelector', () => {
  it('renders all 4 payment methods with descriptions and badges', () => {
    const onSelect = vi.fn();
    render(<PaymentSelector selected="DEBITO_PRODUBANCO" onSelect={onSelect} />);

    expect(screen.getByText('Débito Produbanco')).toBeInTheDocument();
    expect(screen.getByText('+15% IVA si es Uber')).toBeInTheDocument();

    expect(screen.getByText('Efectivo Caja')).toBeInTheDocument();
    expect(screen.getByText('Monedas/Billetes')).toBeInTheDocument();

    expect(screen.getByText('De Una (Produbanco)')).toBeInTheDocument();
    expect(screen.getByText('+$0.20 comisión SPI, $0 deuda')).toBeInTheDocument();

    expect(screen.getByText('De Una (Personal)')).toBeInTheDocument();
    expect(screen.getByText('Puesto de mi bolsillo, genera deuda')).toBeInTheDocument();
  });

  it('indicates the active payment method and triggers callback on select', () => {
    const onSelect = vi.fn();
    render(<PaymentSelector selected="DEBITO_PRODUBANCO" onSelect={onSelect} />);

    const efectivoBtn = screen.getByText('Efectivo Caja').closest('button')!;
    fireEvent.click(efectivoBtn);

    expect(onSelect).toHaveBeenCalledWith('EFECTIVO_CAJA');
  });
});
