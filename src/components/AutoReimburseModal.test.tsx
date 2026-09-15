import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AutoReimburseModal } from './AutoReimburseModal';

describe('AutoReimburseModal', () => {
  const onConfirmarReembolso = vi.fn();
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly with default full reimbursement breakdown and $0.20 SPI fee', () => {
    render(
      <AutoReimburseModal
        isOpen={true}
        onClose={onClose}
        saldoPendiente={25.50}
        costoTransferenciaSPI={0.20}
        onConfirmarReembolso={onConfirmarReembolso}
      />
    );

    expect(screen.getByText(/Auto-Reembolso/i)).toBeInTheDocument();
    // Breakdown
    expect(screen.getAllByText('$25.50').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('+$0.20')).toBeInTheDocument();
    expect(screen.getByText('$25.70')).toBeInTheDocument();

    expect(screen.getByRole('button', { name: /Confirmar Transferencia/i })).toBeInTheDocument();
  });

  it('calls onConfirmarReembolso with full amount when clicking confirm button', async () => {
    onConfirmarReembolso.mockResolvedValueOnce(undefined);

    render(
      <AutoReimburseModal
        isOpen={true}
        onClose={onClose}
        saldoPendiente={18.75}
        costoTransferenciaSPI={0.20}
        onConfirmarReembolso={onConfirmarReembolso}
      />
    );

    const confirmBtn = screen.getByRole('button', { name: /Confirmar Transferencia/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(onConfirmarReembolso).toHaveBeenCalledTimes(1);
      expect(onConfirmarReembolso).toHaveBeenCalledWith(18.75, 0.20, undefined);
    });
  });

  it('allows custom note and includes it in onConfirmarReembolso', async () => {
    onConfirmarReembolso.mockResolvedValueOnce(undefined);

    render(
      <AutoReimburseModal
        isOpen={true}
        onClose={onClose}
        saldoPendiente={15.00}
        costoTransferenciaSPI={0.20}
        onConfirmarReembolso={onConfirmarReembolso}
      />
    );

    const noteInput = screen.getByPlaceholderText(/Nota o motivo opcional/i);
    fireEvent.change(noteInput, { target: { value: 'Transferencia banco Pichincha lunes' } });

    const confirmBtn = screen.getByRole('button', { name: /Confirmar Transferencia/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(onConfirmarReembolso).toHaveBeenCalledWith(
        15.00,
        0.20,
        'Transferencia banco Pichincha lunes'
      );
    });
  });

  it('supports partial reimbursement mode and recalculates total debited', async () => {
    onConfirmarReembolso.mockResolvedValueOnce(undefined);

    render(
      <AutoReimburseModal
        isOpen={true}
        onClose={onClose}
        saldoPendiente={30.00}
        costoTransferenciaSPI={0.20}
        onConfirmarReembolso={onConfirmarReembolso}
      />
    );

    // Click Cobro Parcial mode
    const partialTab = screen.getByRole('button', { name: /Cobro Parcial/i });
    fireEvent.click(partialTab);

    // Input partial amount
    const amountInput = screen.getByLabelText(/Monto a cobrar/i);
    fireEvent.change(amountInput, { target: { value: '10' } });

    // In partial mode with $10:
    // Monto: $10.00, SPI: +$0.20, Total debitado: $10.20
    expect(screen.getByText('$10.20')).toBeInTheDocument();

    const confirmBtn = screen.getByRole('button', { name: /Confirmar Transferencia/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(onConfirmarReembolso).toHaveBeenCalledWith(10.00, 0.20, undefined);
    });
  });

  it('disables confirm button and shows warning if partial amount exceeds pending balance', () => {
    render(
      <AutoReimburseModal
        isOpen={true}
        onClose={onClose}
        saldoPendiente={20.00}
        costoTransferenciaSPI={0.20}
        onConfirmarReembolso={onConfirmarReembolso}
      />
    );

    const partialTab = screen.getByRole('button', { name: /Cobro Parcial/i });
    fireEvent.click(partialTab);

    const amountInput = screen.getByLabelText(/Monto a cobrar/i);
    fireEvent.change(amountInput, { target: { value: '25.00' } });

    expect(screen.getByText(/excede la deuda pendiente/i)).toBeInTheDocument();
    const confirmBtn = screen.getByRole('button', { name: /Confirmar Transferencia/i });
    expect(confirmBtn).toBeDisabled();
  });

  it('handles saldoPendiente <= 0 cleanly with notification and disabled confirm', () => {
    render(
      <AutoReimburseModal
        isOpen={true}
        onClose={onClose}
        saldoPendiente={0}
        costoTransferenciaSPI={0.20}
        onConfirmarReembolso={onConfirmarReembolso}
      />
    );

    expect(screen.getByText(/No tienes reembolsos pendientes por cobrar/i)).toBeInTheDocument();
    const confirmBtn = screen.getByRole('button', { name: /Confirmar Transferencia/i });
    expect(confirmBtn).toBeDisabled();
  });

  it('calls onClose when clicking close or cancel button', () => {
    render(
      <AutoReimburseModal
        isOpen={true}
        onClose={onClose}
        saldoPendiente={12.00}
        costoTransferenciaSPI={0.20}
        onConfirmarReembolso={onConfirmarReembolso}
      />
    );

    const cancelBtn = screen.getByRole('button', { name: /Cancelar/i });
    fireEvent.click(cancelBtn);
    expect(onClose).toHaveBeenCalledTimes(1);

    const closeBtn = screen.getByLabelText('Cerrar');
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('does not render anything when isOpen is false', () => {
    const { container } = render(
      <AutoReimburseModal
        isOpen={false}
        onClose={onClose}
        saldoPendiente={12.00}
        costoTransferenciaSPI={0.20}
        onConfirmarReembolso={onConfirmarReembolso}
      />
    );

    expect(container.firstChild).toBeNull();
  });
});
