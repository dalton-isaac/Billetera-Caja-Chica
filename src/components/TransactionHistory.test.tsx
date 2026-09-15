import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TransactionHistory } from './TransactionHistory';
import type { Movimiento } from '../types';

const mockMovimientos: Movimiento[] = [
  {
    id: 'm-1',
    fechaHora: '2026-09-15T08:30:00.000Z',
    tipo: 'GASTO',
    categoria: 'METRO',
    metodoPago: 'DEBITO_PRODUBANCO',
    montoBase: 0.45,
    comisionBancaria: 0,
    impuestoDigitalIVA: 0,
    montoTotalDebitado: 0.45,
    estadoReembolso: 'NO_APLICA',
    nota: 'Viaje a oficina San Blas',
  },
  {
    id: 'm-2',
    fechaHora: '2026-09-15T09:15:00.000Z',
    tipo: 'GASTO',
    categoria: 'UBER',
    metodoPago: 'DEBITO_PRODUBANCO',
    montoBase: 5.00,
    comisionBancaria: 0,
    impuestoDigitalIVA: 0.75,
    montoTotalDebitado: 5.75,
    estadoReembolso: 'NO_APLICA',
    nota: 'Traslado a Cumbayá',
  },
  {
    id: 'm-3',
    fechaHora: '2026-09-15T12:00:00.000Z',
    tipo: 'GASTO',
    categoria: 'ALIMENTACION',
    metodoPago: 'EFECTIVO_CAJA',
    montoBase: 3.50,
    comisionBancaria: 0,
    impuestoDigitalIVA: 0,
    montoTotalDebitado: 3.50,
    estadoReembolso: 'NO_APLICA',
    nota: 'Almuerzo ejecutivo',
  },
  {
    id: 'm-4',
    fechaHora: '2026-09-15T14:30:00.000Z',
    tipo: 'GASTO',
    categoria: 'INDRIVE',
    metodoPago: 'DEUNA_PERSONAL',
    montoBase: 6.00,
    comisionBancaria: 0,
    impuestoDigitalIVA: 0,
    montoTotalDebitado: 0,
    estadoReembolso: 'PENDIENTE',
    nota: 'Regreso a casa',
  },
  {
    id: 'm-5',
    fechaHora: '2026-09-15T16:00:00.000Z',
    tipo: 'RETIRO_CAJERO',
    categoria: 'RETIRO_CAJERO',
    metodoPago: 'DEBITO_PRODUBANCO',
    montoBase: 40.00,
    comisionBancaria: 0,
    impuestoDigitalIVA: 0,
    montoTotalDebitado: 40.00,
    estadoReembolso: 'NO_APLICA',
    nota: 'Retiro cajero CCI',
  },
];

describe('TransactionHistory', () => {
  it('renders friendly empty state when there are no transactions', () => {
    render(
      <TransactionHistory
        movimientos={[]}
        onEditarMovimiento={vi.fn()}
        onEliminarMovimiento={vi.fn()}
      />
    );

    expect(screen.getByText('Historial de Movimientos (0)')).toBeInTheDocument();
    expect(screen.getByText('No se encontraron movimientos')).toBeInTheDocument();
  });

  it('renders all movements sorted chronologically (newest first)', () => {
    render(
      <TransactionHistory
        movimientos={mockMovimientos}
        onEditarMovimiento={vi.fn()}
        onEliminarMovimiento={vi.fn()}
      />
    );

    expect(screen.getByText('Historial de Movimientos (5)')).toBeInTheDocument();
    expect(screen.getByText('Metro de Quito')).toBeInTheDocument();
    expect(screen.getByText('Uber')).toBeInTheDocument();
    expect(screen.getByText('Alimentación')).toBeInTheDocument();
    expect(screen.getByText('inDrive')).toBeInTheDocument();
    expect(screen.getByText('Retiro Cajero')).toBeInTheDocument();

    // Verify notes and badges
    expect(screen.getByText('"Viaje a oficina San Blas"')).toBeInTheDocument();
    expect(screen.getByText('⚠️ Por Cobrar')).toBeInTheDocument();
  });

  it('filters movements by "Metro / Bus" tab', () => {
    render(
      <TransactionHistory
        movimientos={mockMovimientos}
        onEditarMovimiento={vi.fn()}
        onEliminarMovimiento={vi.fn()}
      />
    );

    const metroTab = screen.getByRole('button', { name: 'Metro / Bus' });
    fireEvent.click(metroTab);

    expect(screen.getByText('Historial de Movimientos (1)')).toBeInTheDocument();
    expect(screen.getByText('Metro de Quito')).toBeInTheDocument();
    expect(screen.queryByText('Uber')).not.toBeInTheDocument();
    expect(screen.queryByText('Retiro Cajero')).not.toBeInTheDocument();
  });

  it('filters movements by "Apps / Taxi" tab', () => {
    render(
      <TransactionHistory
        movimientos={mockMovimientos}
        onEditarMovimiento={vi.fn()}
        onEliminarMovimiento={vi.fn()}
      />
    );

    const appsTab = screen.getByRole('button', { name: 'Apps / Taxi' });
    fireEvent.click(appsTab);

    expect(screen.getByText('Historial de Movimientos (2)')).toBeInTheDocument();
    expect(screen.getByText('Uber')).toBeInTheDocument();
    expect(screen.getByText('inDrive')).toBeInTheDocument();
    expect(screen.queryByText('Metro de Quito')).not.toBeInTheDocument();
  });

  it('filters movements by "Efectivo" tab', () => {
    render(
      <TransactionHistory
        movimientos={mockMovimientos}
        onEditarMovimiento={vi.fn()}
        onEliminarMovimiento={vi.fn()}
      />
    );

    const efectivoTab = screen.getByRole('button', { name: 'Efectivo' });
    fireEvent.click(efectivoTab);

    expect(screen.getByText('Historial de Movimientos (1)')).toBeInTheDocument();
    expect(screen.getByText('Alimentación')).toBeInTheDocument();
    expect(screen.queryByText('Uber')).not.toBeInTheDocument();
  });

  it('filters movements by "De Una" tab', () => {
    render(
      <TransactionHistory
        movimientos={mockMovimientos}
        onEditarMovimiento={vi.fn()}
        onEliminarMovimiento={vi.fn()}
      />
    );

    const deUnaTab = screen.getByRole('button', { name: 'De Una' });
    fireEvent.click(deUnaTab);

    expect(screen.getByText('Historial de Movimientos (1)')).toBeInTheDocument();
    expect(screen.getByText('inDrive')).toBeInTheDocument();
    expect(screen.queryByText('Metro de Quito')).not.toBeInTheDocument();
  });

  it('filters movements by "Retiros" tab', () => {
    render(
      <TransactionHistory
        movimientos={mockMovimientos}
        onEditarMovimiento={vi.fn()}
        onEliminarMovimiento={vi.fn()}
      />
    );

    const retirosTab = screen.getByRole('button', { name: 'Retiros' });
    fireEvent.click(retirosTab);

    expect(screen.getByText('Historial de Movimientos (1)')).toBeInTheDocument();
    expect(screen.getByText('Retiro Cajero')).toBeInTheDocument();
    expect(screen.queryByText('Uber')).not.toBeInTheDocument();
  });

  it('filters movements dynamically using the search input', () => {
    render(
      <TransactionHistory
        movimientos={mockMovimientos}
        onEditarMovimiento={vi.fn()}
        onEliminarMovimiento={vi.fn()}
      />
    );

    const searchInput = screen.getByLabelText('Buscar movimientos');
    fireEvent.change(searchInput, { target: { value: 'Cumbayá' } });

    expect(screen.getByText('Historial de Movimientos (1)')).toBeInTheDocument();
    expect(screen.getByText('Uber')).toBeInTheDocument();
    expect(screen.queryByText('Metro de Quito')).not.toBeInTheDocument();

    // Clear search
    const clearBtn = screen.getByLabelText('Limpiar búsqueda');
    fireEvent.click(clearBtn);

    expect(screen.getByText('Historial de Movimientos (5)')).toBeInTheDocument();
  });

  it('triggers onEditarMovimiento when clicking Editar button on a transaction', () => {
    const onEditarMock = vi.fn();

    render(
      <TransactionHistory
        movimientos={mockMovimientos}
        onEditarMovimiento={onEditarMock}
        onEliminarMovimiento={vi.fn()}
      />
    );

    const editBtns = screen.getAllByRole('button', { name: /Editar/i });
    fireEvent.click(editBtns[0]); // first one is m-5 (Retiro Cajero) because of newest first

    expect(onEditarMock).toHaveBeenCalledTimes(1);
    expect(onEditarMock).toHaveBeenCalledWith(mockMovimientos[4]);
  });

  it('confirms and deletes transaction through confirmation modal', async () => {
    const onEliminarMock = vi.fn().mockResolvedValue(undefined);

    render(
      <TransactionHistory
        movimientos={mockMovimientos}
        onEditarMovimiento={vi.fn()}
        onEliminarMovimiento={onEliminarMock}
      />
    );

    const deleteBtns = screen.getAllByRole('button', { name: /Eliminar/i });
    fireEvent.click(deleteBtns[0]);

    // Modal prompt appears
    expect(screen.getByText('¿Eliminar movimiento?')).toBeInTheDocument();

    // Cancel first
    const cancelBtn = screen.getByRole('button', { name: 'Cancelar' });
    fireEvent.click(cancelBtn);
    expect(screen.queryByText('¿Eliminar movimiento?')).not.toBeInTheDocument();
    expect(onEliminarMock).not.toHaveBeenCalled();

    // Click delete again and confirm
    fireEvent.click(deleteBtns[0]);
    const confirmDeleteBtn = screen.getByRole('button', { name: 'Sí, Eliminar' });
    fireEvent.click(confirmDeleteBtn);

    await waitFor(() => {
      expect(onEliminarMock).toHaveBeenCalledWith('m-5');
      expect(screen.queryByText('¿Eliminar movimiento?')).not.toBeInTheDocument();
    });
  });

  it('renders receipt thumbnail and opens full photo modal when clicked', () => {
    const movimientosConFoto: Movimiento[] = [
      {
        ...mockMovimientos[0],
        id: 'mov-con-foto',
        comprobanteUrl: 'data:image/webp;base64,mock-receipt-data',
      },
    ];

    render(
      <TransactionHistory
        movimientos={movimientosConFoto}
        onEditarMovimiento={vi.fn()}
        onEliminarMovimiento={vi.fn()}
      />
    );

    // Thumbnail button should be visible
    const thumbnailBtn = screen.getByRole('button', { name: /Ver comprobante adjunto/i });
    expect(thumbnailBtn).toBeInTheDocument();
    expect(screen.getByText('Ver Recibo / Factura')).toBeInTheDocument();

    // Modal should not be open yet
    expect(screen.queryByText('Foto de Recibo / Factura')).not.toBeInTheDocument();

    // Click thumbnail
    fireEvent.click(thumbnailBtn);

    // Full photo modal is opened
    expect(screen.getByText('Foto de Recibo / Factura')).toBeInTheDocument();
    expect(screen.getByAltText('Comprobante completo')).toHaveAttribute(
      'src',
      'data:image/webp;base64,mock-receipt-data'
    );

    // Close modal via button
    const closeBtn = screen.getByRole('button', { name: /Cerrar Vista Previa/i });
    fireEvent.click(closeBtn);
    expect(screen.queryByText('Foto de Recibo / Factura')).not.toBeInTheDocument();
  });
});
