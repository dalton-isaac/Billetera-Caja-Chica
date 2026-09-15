import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QuickActionGrid } from './QuickActionGrid';

describe('QuickActionGrid', () => {
  const mockOnRegistrar = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders 1-tap quick action buttons correctly', () => {
    render(
      <QuickActionGrid
        metodoPago="EFECTIVO_CAJA"
        onRegistrarGastoRapido={mockOnRegistrar}
      />
    );

    expect(screen.getByText('Metro')).toBeInTheDocument();
    expect(screen.getByText('$0.45')).toBeInTheDocument();
    expect(screen.getByText('Bus Urbano')).toBeInTheDocument();
    expect(screen.getByText('$0.35')).toBeInTheDocument();
    expect(screen.getByText('Bus Valles')).toBeInTheDocument();
    expect(screen.getByText('Uber')).toBeInTheDocument();
    expect(screen.getByText('Taxi')).toBeInTheDocument();
    expect(screen.getByText('Retiro Cajero')).toBeInTheDocument();
  });

  it('records Metro transaction in 1 tap without opening a modal', () => {
    render(
      <QuickActionGrid
        metodoPago="EFECTIVO_CAJA"
        onRegistrarGastoRapido={mockOnRegistrar}
      />
    );

    const metroButton = screen.getByText('Metro').closest('button')!;
    fireEvent.click(metroButton);

    expect(mockOnRegistrar).toHaveBeenCalledTimes(1);
    expect(mockOnRegistrar).toHaveBeenCalledWith({
      categoria: 'METRO',
      montoBase: 0.45,
      tipo: 'GASTO',
    });
  });

  it('records Bus Urbano transaction in 1 tap without opening a modal', () => {
    render(
      <QuickActionGrid
        metodoPago="EFECTIVO_CAJA"
        onRegistrarGastoRapido={mockOnRegistrar}
      />
    );

    const busButton = screen.getByText('Bus Urbano').closest('button')!;
    fireEvent.click(busButton);

    expect(mockOnRegistrar).toHaveBeenCalledTimes(1);
    expect(mockOnRegistrar).toHaveBeenCalledWith({
      categoria: 'BUS_URBANO',
      montoBase: 0.35,
      tipo: 'GASTO',
    });
  });

  it('opens Bus Valles selector and registers Cumbayá ($0.45) on tap', () => {
    render(
      <QuickActionGrid
        metodoPago="EFECTIVO_CAJA"
        onRegistrarGastoRapido={mockOnRegistrar}
      />
    );

    const vallesButton = screen.getByText('Bus Valles').closest('button')!;
    fireEvent.click(vallesButton);

    expect(screen.getByText('Tarifa Bus a Valles')).toBeInTheDocument();
    expect(screen.getByText('Cumbayá / Mínimo')).toBeInTheDocument();

    const cumbayaButton = screen.getByText('Cumbayá / Mínimo').closest('button')!;
    fireEvent.click(cumbayaButton);

    expect(mockOnRegistrar).toHaveBeenCalledWith({
      categoria: 'BUS_VALLES',
      montoBase: 0.45,
      nota: 'Bus Valles: Cumbayá',
      tipo: 'GASTO',
    });
  });

  it('opens QuickAmountModal when Taxi is clicked and handles touch numeric input', async () => {
    render(
      <QuickActionGrid
        metodoPago="EFECTIVO_CAJA"
        onRegistrarGastoRapido={mockOnRegistrar}
      />
    );

    const taxiButton = screen.getByText('Taxi').closest('button')!;
    fireEvent.click(taxiButton);

    // Modal should be open
    expect(screen.getByText('Taxi Convencional')).toBeInTheDocument();

    // Type 3.50 using keypad buttons
    fireEvent.click(screen.getByRole('button', { name: '3' }));
    fireEvent.click(screen.getByRole('button', { name: '.' }));
    fireEvent.click(screen.getByRole('button', { name: '5' }));
    fireEvent.click(screen.getByRole('button', { name: '0' }));

    expect(screen.getByText('3.50')).toBeInTheDocument();

    // Confirm button
    const confirmBtn = screen.getByRole('button', { name: /Confirmar \$3\.50/i });
    fireEvent.click(confirmBtn);

    expect(mockOnRegistrar).toHaveBeenCalledWith(
      expect.objectContaining({
        categoria: 'TAXI',
        montoBase: 3.5,
        tipo: 'GASTO',
      })
    );
  });

  it('handles Retiro de Cajero and records RETIRO_CAJERO movement', () => {
    render(
      <QuickActionGrid
        metodoPago="DEBITO_PRODUBANCO"
        onRegistrarGastoRapido={mockOnRegistrar}
      />
    );

    const cajeroButton = screen.getByText('Retiro Cajero').closest('button')!;
    fireEvent.click(cajeroButton);

    expect(screen.getByText('Retiro de Cajero (Produbanco)')).toBeInTheDocument();

    // Click preset $20
    const preset20 = screen.getByRole('button', { name: '$20' });
    fireEvent.click(preset20);

    const confirmBtn = screen.getByRole('button', { name: /Confirmar \$20\.00/i });
    fireEvent.click(confirmBtn);

    expect(mockOnRegistrar).toHaveBeenCalledWith(
      expect.objectContaining({
        categoria: 'RETIRO_CAJERO',
        montoBase: 20,
        tipo: 'RETIRO_CAJERO',
      })
    );
  });
});
