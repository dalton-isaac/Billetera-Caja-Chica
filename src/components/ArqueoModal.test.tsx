import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ArqueoModal } from './ArqueoModal';
import { db, limpiarBaseDatosParaPruebas, registrarArqueo } from '../db/db';

describe('ArqueoModal', () => {
  const onClose = vi.fn();
  const onGuardarArqueo = vi.fn();

  beforeEach(async () => {
    vi.clearAllMocks();
    await limpiarBaseDatosParaPruebas();
  });

  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <ArqueoModal
        isOpen={false}
        onClose={onClose}
        saldoTeoricoBanco={150.00}
        saldoTeoricoEfectivo={20.00}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('shows green badge "¡Tu caja está 100% cuadrada!" on perfect match', () => {
    render(
      <ArqueoModal
        isOpen={true}
        onClose={onClose}
        saldoTeoricoBanco={150.00}
        saldoTeoricoEfectivo={20.00}
        onGuardarArqueo={onGuardarArqueo}
      />
    );

    expect(screen.getByText('¿Me cuadra la caja?')).toBeInTheDocument();
    expect(screen.getByText('¡Tu caja está 100% cuadrada!')).toBeInTheDocument();
    expect(screen.queryByText('Descuadre detectado')).not.toBeInTheDocument();
  });

  it('shows red alert "Descuadre detectado" with diff and smart clues when balances mismatch', () => {
    render(
      <ArqueoModal
        isOpen={true}
        onClose={onClose}
        saldoTeoricoBanco={100.00}
        saldoTeoricoEfectivo={10.00}
        onGuardarArqueo={onGuardarArqueo}
      />
    );

    // Initial state: perfect match
    expect(screen.getByText('¡Tu caja está 100% cuadrada!')).toBeInTheDocument();

    // Bank mismatch of -$0.20 (missing SPI fee)
    const bancoInput = screen.getByLabelText(/Saldo real en mi app de Produbanco/i);
    fireEvent.change(bancoInput, { target: { value: '99.80' } });

    // Cash mismatch of -$0.35 (missing bus fare)
    const efectivoInput = screen.getByLabelText(/Efectivo real en mi billetera/i);
    fireEvent.change(efectivoInput, { target: { value: '9.65' } });

    // Should now show red alert "Descuadre detectado"
    expect(screen.getByText('Descuadre detectado')).toBeInTheDocument();
    expect(screen.queryByText('¡Tu caja está 100% cuadrada!')).not.toBeInTheDocument();

    // Smart clues box should appear with both predictions
    expect(screen.getByText(/Pistas Inteligentes de Descuadre/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Posible comisión SPI de Produbanco no anotada \(\$0\.20\)/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Posible pasaje de bus urbano olvidado \(\$0\.35\)/i)
    ).toBeInTheDocument();
  });

  it('shows Metro de Quito smart clue when cash discrepancy is -$0.45', () => {
    render(
      <ArqueoModal
        isOpen={true}
        onClose={onClose}
        saldoTeoricoBanco={50.00}
        saldoTeoricoEfectivo={10.00}
        onGuardarArqueo={onGuardarArqueo}
      />
    );

    const efectivoInput = screen.getByLabelText(/Efectivo real en mi billetera/i);
    fireEvent.change(efectivoInput, { target: { value: '9.55' } });

    expect(screen.getByText('Descuadre detectado')).toBeInTheDocument();
    expect(
      screen.getByText(/Posible pasaje de Metro de Quito olvidado \(\$0\.45\)/i)
    ).toBeInTheDocument();
  });

  it('saves audit and calls onGuardarArqueo with correct CUADRADO status and values', async () => {
    onGuardarArqueo.mockResolvedValueOnce(undefined);

    render(
      <ArqueoModal
        isOpen={true}
        onClose={onClose}
        saldoTeoricoBanco={180.50}
        saldoTeoricoEfectivo={15.00}
        onGuardarArqueo={onGuardarArqueo}
      />
    );

    const saveBtn = screen.getByRole('button', { name: /Guardar Acta de Arqueo/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(onGuardarArqueo).toHaveBeenCalledTimes(1);
      expect(onGuardarArqueo).toHaveBeenCalledWith({
        saldoRealBanco: 180.50,
        saldoTeoricoBanco: 180.50,
        diferenciaBanco: 0,
        saldoRealEfectivo: 15.00,
        saldoTeoricoEfectivo: 15.00,
        diferenciaEfectivo: 0,
        estado: 'CUADRADO',
        observaciones: undefined,
      });
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it('saves audit with DESCUADRE status and observations', async () => {
    onGuardarArqueo.mockResolvedValueOnce(undefined);

    render(
      <ArqueoModal
        isOpen={true}
        onClose={onClose}
        saldoTeoricoBanco={100.00}
        saldoTeoricoEfectivo={20.00}
        onGuardarArqueo={onGuardarArqueo}
      />
    );

    // Modify values
    const bancoInput = screen.getByLabelText(/Saldo real en mi app de Produbanco/i);
    fireEvent.change(bancoInput, { target: { value: '90.00' } });

    const efectivoInput = screen.getByLabelText(/Efectivo real en mi billetera/i);
    fireEvent.change(efectivoInput, { target: { value: '25.00' } });

    const obsInput = screen.getByLabelText(/Observaciones \/ notas opcionales/i);
    fireEvent.change(obsInput, { target: { value: 'Sobrante en efectivo por verificar' } });

    const saveBtn = screen.getByRole('button', { name: /Guardar Acta de Arqueo/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(onGuardarArqueo).toHaveBeenCalledTimes(1);
      expect(onGuardarArqueo).toHaveBeenCalledWith({
        saldoRealBanco: 90.00,
        saldoTeoricoBanco: 100.00,
        diferenciaBanco: -10.00,
        saldoRealEfectivo: 25.00,
        saldoTeoricoEfectivo: 20.00,
        diferenciaEfectivo: 5.00,
        estado: 'DESCUADRE',
        observaciones: 'Sobrante en efectivo por verificar',
      });
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it('calls onClose when close button is clicked', () => {
    render(
      <ArqueoModal
        isOpen={true}
        onClose={onClose}
        saldoTeoricoBanco={100.00}
        saldoTeoricoEfectivo={20.00}
      />
    );

    const closeBtn = screen.getByRole('button', { name: /✕ Cerrar/i });
    fireEvent.click(closeBtn);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('persists audit directly to db when onGuardarArqueo prop is omitted', async () => {
    render(
      <ArqueoModal
        isOpen={true}
        onClose={onClose}
        saldoTeoricoBanco={50.00}
        saldoTeoricoEfectivo={10.00}
      />
    );

    const saveBtn = screen.getByRole('button', { name: /Guardar Acta de Arqueo/i });
    fireEvent.click(saveBtn);

    await waitFor(async () => {
      const arqueos = await db.arqueos.toArray();
      expect(arqueos.length).toBe(1);
      expect(arqueos[0].estado).toBe('CUADRADO');
      expect(arqueos[0].saldoRealBanco).toBe(50.00);
      expect(arqueos[0].saldoRealEfectivo).toBe(10.00);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it('allows toggling history accordion and viewing previous arqueos', async () => {
    // Seed an audit in db
    await registrarArqueo({
      saldoRealBanco: 120.00,
      saldoTeoricoBanco: 120.00,
      diferenciaBanco: 0,
      saldoRealEfectivo: 15.00,
      saldoTeoricoEfectivo: 15.00,
      diferenciaEfectivo: 0,
      estado: 'CUADRADO',
      observaciones: 'Arqueo previo del mediodía',
    });

    render(
      <ArqueoModal
        isOpen={true}
        onClose={onClose}
        saldoTeoricoBanco={120.00}
        saldoTeoricoEfectivo={15.00}
      />
    );

    const historyToggleBtn = await screen.findByText(/Historial de Arqueos/i);
    fireEvent.click(historyToggleBtn);

    await waitFor(() => {
      expect(screen.getByText(/"Arqueo previo del mediodía"/i)).toBeInTheDocument();
    });
  });
});
