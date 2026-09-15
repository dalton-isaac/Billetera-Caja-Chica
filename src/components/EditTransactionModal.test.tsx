import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EditTransactionModal } from './EditTransactionModal';
import type { Movimiento } from '../types';

const mockMovimientoUber: Movimiento = {
  id: 'mov-1',
  fechaHora: '2026-09-15T10:30:00.000Z',
  tipo: 'GASTO',
  categoria: 'UBER',
  metodoPago: 'DEBITO_PRODUBANCO',
  montoBase: 5.00,
  comisionBancaria: 0,
  impuestoDigitalIVA: 0.75,
  montoTotalDebitado: 5.75,
  estadoReembolso: 'NO_APLICA',
  nota: 'Viaje reunión',
};

const mockMovimientoOtro: Movimiento = {
  id: 'mov-2',
  fechaHora: '2026-09-15T11:00:00.000Z',
  tipo: 'GASTO',
  categoria: 'OTROS',
  subcategoriaOtro: 'PARQUEADERO',
  metodoPago: 'EFECTIVO_CAJA',
  montoBase: 2.00,
  comisionBancaria: 0,
  impuestoDigitalIVA: 0,
  montoTotalDebitado: 2.00,
  estadoReembolso: 'NO_APLICA',
  nota: 'Parqueadero CCI',
};

describe('EditTransactionModal', () => {
  it('does not render when isOpen is false or movimiento is null', () => {
    const { container, rerender } = render(
      <EditTransactionModal
        isOpen={false}
        movimiento={mockMovimientoUber}
        onClose={vi.fn()}
        onGuardar={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();

    rerender(
      <EditTransactionModal
        isOpen={true}
        movimiento={null}
        onClose={vi.fn()}
        onGuardar={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders initial movement values correctly', () => {
    render(
      <EditTransactionModal
        isOpen={true}
        movimiento={mockMovimientoUber}
        onClose={vi.fn()}
        onGuardar={vi.fn()}
      />
    );

    expect(screen.getByText('Editar Movimiento')).toBeInTheDocument();
    const inputMonto = screen.getByLabelText('Monto Base') as HTMLInputElement;
    expect(inputMonto.value).toBe('5.00');

    const inputNota = screen.getByLabelText('Nota / Motivo') as HTMLInputElement;
    expect(inputNota.value).toBe('Viaje reunión');

    expect(screen.getByText('Uber')).toBeInTheDocument();
  });

  it('recalculates 15% digital IVA automatically when modifying base amount for Uber with card', () => {
    render(
      <EditTransactionModal
        isOpen={true}
        movimiento={mockMovimientoUber}
        onClose={vi.fn()}
        onGuardar={vi.fn()}
      />
    );

    const inputMonto = screen.getByLabelText('Monto Base');
    fireEvent.change(inputMonto, { target: { value: '10.00' } });

    // 10.00 * 0.15 = 1.50 IVA -> total 11.50
    expect(screen.getByText('+$1.50')).toBeInTheDocument();
    expect(screen.getByText('$11.50')).toBeInTheDocument();
  });

  it('recalculates commission when switching to De Una (Produbanco)', () => {
    render(
      <EditTransactionModal
        isOpen={true}
        movimiento={mockMovimientoOtro}
        onClose={vi.fn()}
        onGuardar={vi.fn()}
      />
    );

    // Switch payment method to De Una (Produbanco)
    const deUnaBtn = screen.getByRole('button', { name: /De Una \(Produbanco\)/i });
    fireEvent.click(deUnaBtn);

    // Expect SPI commission of $0.20 and total $2.20
    expect(screen.getByText('+$0.20')).toBeInTheDocument();
    expect(screen.getByText('$2.20')).toBeInTheDocument();
  });

  it('allows changing subcategory and note, then calls onGuardar with updated model', async () => {
    const onGuardarMock = vi.fn().mockResolvedValue(undefined);
    const onCloseMock = vi.fn();

    render(
      <EditTransactionModal
        isOpen={true}
        movimiento={mockMovimientoOtro}
        onClose={onCloseMock}
        onGuardar={onGuardarMock}
      />
    );

    // Change subcategory to Peaje
    const subcatSelect = screen.getByLabelText('Subcategoría');
    fireEvent.change(subcatSelect, { target: { value: 'PEAJE' } });

    // Change note
    const notaInput = screen.getByLabelText('Nota / Motivo');
    fireEvent.change(notaInput, { target: { value: 'Peaje túnel Guayasamín' } });

    // Change amount to 1.00
    const montoInput = screen.getByLabelText('Monto Base');
    fireEvent.change(montoInput, { target: { value: '1.00' } });

    // Submit changes
    const saveBtn = screen.getByRole('button', { name: /Guardar Cambios/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(onGuardarMock).toHaveBeenCalledTimes(1);
      expect(onGuardarMock).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'mov-2',
          montoBase: 1.00,
          subcategoriaOtro: 'PEAJE',
          nota: 'Peaje túnel Guayasamín',
          montoTotalDebitado: 1.00,
        })
      );
      expect(onCloseMock).toHaveBeenCalledTimes(1);
    });
  });

  it('prevents saving when base amount is 0 or empty and displays error', async () => {
    const onGuardarMock = vi.fn();

    render(
      <EditTransactionModal
        isOpen={true}
        movimiento={mockMovimientoUber}
        onClose={vi.fn()}
        onGuardar={onGuardarMock}
      />
    );

    const inputMonto = screen.getByLabelText('Monto Base');
    fireEvent.change(inputMonto, { target: { value: '0' } });

    const saveBtn = screen.getByRole('button', { name: /Guardar Cambios/i });
    fireEvent.click(saveBtn);

    expect(screen.getByText('El monto base debe ser mayor a 0.00')).toBeInTheDocument();
    expect(onGuardarMock).not.toHaveBeenCalled();
  });

  it('calls onClose when clicking Cancelar or close button', () => {
    const onCloseMock = vi.fn();

    render(
      <EditTransactionModal
        isOpen={true}
        movimiento={mockMovimientoUber}
        onClose={onCloseMock}
        onGuardar={vi.fn()}
      />
    );

    const cancelBtn = screen.getByRole('button', { name: /Cancelar/i });
    fireEvent.click(cancelBtn);
    expect(onCloseMock).toHaveBeenCalledTimes(1);

    const closeIconBtn = screen.getByLabelText('Cerrar');
    fireEvent.click(closeIconBtn);
    expect(onCloseMock).toHaveBeenCalledTimes(2);
  });

  it('displays existing receipt photo and allows removing it before saving', async () => {
    const onGuardarMock = vi.fn().mockResolvedValue(undefined);
    const movConFoto: Movimiento = {
      ...mockMovimientoUber,
      id: 'mov-con-recibo',
      comprobanteUrl: 'data:image/webp;base64,existing-photo-data',
    };

    render(
      <EditTransactionModal
        isOpen={true}
        movimiento={movConFoto}
        onClose={vi.fn()}
        onGuardar={onGuardarMock}
      />
    );

    // Should show photo preview
    expect(screen.getByText('Comprobante guardado')).toBeInTheDocument();
    expect(screen.getByAltText('Recibo adjunto')).toHaveAttribute(
      'src',
      'data:image/webp;base64,existing-photo-data'
    );

    // Remove photo
    const removeBtn = screen.getByRole('button', { name: /✕ Quitar foto/i });
    fireEvent.click(removeBtn);

    // Now attach button should be displayed
    expect(screen.getByText('📷 Adjuntar Recibo / Factura')).toBeInTheDocument();

    // Save
    const saveBtn = screen.getByRole('button', { name: /Guardar Cambios/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(onGuardarMock).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'mov-con-recibo',
          comprobanteUrl: undefined,
        })
      );
    });
  });
});
