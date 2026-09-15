import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QuickAmountModal } from './QuickAmountModal';

describe('QuickAmountModal', () => {
  const onConfirm = vi.fn();
  const onClose = vi.fn();

  it('calculates 15% digital IVA for Uber when paid with DEBITO_PRODUBANCO', () => {
    render(
      <QuickAmountModal
        isOpen={true}
        onClose={onClose}
        categoria="UBER"
        metodoPago="DEBITO_PRODUBANCO"
        onConfirm={onConfirm}
      />
    );

    expect(screen.getByText('Uber')).toBeInTheDocument();

    // Type 10.00
    fireEvent.click(screen.getByRole('button', { name: '1' }));
    fireEvent.click(screen.getByRole('button', { name: '0' }));

    // 15% of $10 is $1.50, total $11.50
    expect(screen.getByText('+ IVA Digital 15% (Uber):')).toBeInTheDocument();
    expect(screen.getByText('+$1.50')).toBeInTheDocument();
    expect(screen.getByText('$11.50')).toBeInTheDocument();

    const confirmBtn = screen.getByRole('button', { name: /Confirmar \$10\.00/i });
    fireEvent.click(confirmBtn);

    expect(onConfirm).toHaveBeenCalledWith({
      categoria: 'UBER',
      montoBase: 10,
      subcategoriaOtro: undefined,
      nota: undefined,
      tipo: 'GASTO',
    });
  });

  it('shows SPI commission of $0.20 when paid with DEUNA_PRODUBANCO', () => {
    render(
      <QuickAmountModal
        isOpen={true}
        onClose={onClose}
        categoria="TAXI"
        metodoPago="DEUNA_PRODUBANCO"
        onConfirm={onConfirm}
      />
    );

    // Type 4.00
    fireEvent.click(screen.getByRole('button', { name: '4' }));

    expect(screen.getByText('+ Comisión SPI (Produbanco):')).toBeInTheDocument();
    expect(screen.getByText('+$0.20')).toBeInTheDocument();
    expect(screen.getByText('$4.20')).toBeInTheDocument();
  });

  it('allows selecting subcategory and adding note for OTROS', () => {
    render(
      <QuickAmountModal
        isOpen={true}
        onClose={onClose}
        categoria="OTROS"
        metodoPago="EFECTIVO_CAJA"
        onConfirm={onConfirm}
      />
    );

    expect(screen.getByText('Otros Gastos')).toBeInTheDocument();

    // Select Parqueadero
    const parqueoBtn = screen.getByRole('button', { name: /🅿️ Parqueadero/i });
    fireEvent.click(parqueoBtn);

    // Type 1.50
    fireEvent.click(screen.getByRole('button', { name: '1' }));
    fireEvent.click(screen.getByRole('button', { name: '.' }));
    fireEvent.click(screen.getByRole('button', { name: '5' }));

    // Note input
    const noteInput = screen.getByPlaceholderText(/Nota o motivo opcional/i);
    fireEvent.change(noteInput, { target: { value: 'Parqueo CCI reunión' } });

    const confirmBtn = screen.getByRole('button', { name: /Confirmar \$1\.50/i });
    fireEvent.click(confirmBtn);

    expect(onConfirm).toHaveBeenCalledWith({
      categoria: 'OTROS',
      montoBase: 1.5,
      subcategoriaOtro: 'PARQUEADERO',
      nota: 'Parqueo CCI reunión',
      tipo: 'GASTO',
    });
  });
});
