import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from './App';
import { db, limpiarBaseDatosParaPruebas, registrarMovimiento } from './db/db';

describe('App', () => {
  beforeEach(async () => {
    await limpiarBaseDatosParaPruebas();
  });

  it('renders initial scaffolding header', () => {
    render(<App />);
    expect(screen.getByText('Billetera Caja Chica')).toBeInTheDocument();
    expect(screen.getByText('$200.00')).toBeInTheDocument();
  });

  it('opens AutoReimburseModal when Cobrar button is clicked and completes reimbursement', async () => {
    // Seed pending debt of $15.00
    await registrarMovimiento({
      tipo: 'GASTO',
      categoria: 'ALIMENTACION',
      metodoPago: 'DEUNA_PERSONAL',
      montoBase: 15.00,
      comisionBancaria: 0,
      impuestoDigitalIVA: 0,
      montoTotalDebitado: 0,
      estadoReembolso: 'PENDIENTE',
      nota: 'Almuerzo de trabajo',
    });

    render(<App />);

    // Wait for Dexie live query to load debt and render Cobrar button
    const cobrarBtn = await screen.findByRole('button', { name: /Cobrar/i }, { timeout: 3000 });
    fireEvent.click(cobrarBtn);

    // Modal should open
    await waitFor(() => {
      expect(screen.getByText('Auto-Reembolso y Liquidación')).toBeInTheDocument();
    });

    // Confirm reimbursement
    const confirmBtn = screen.getByRole('button', { name: /Confirmar Transferencia/i });
    fireEvent.click(confirmBtn);

    // Toast and movement registered
    await waitFor(async () => {
      const movimientos = await db.movimientos.toArray();
      const autoReembolso = movimientos.find((m) => m.tipo === 'AUTO_REEMBOLSO');
      expect(autoReembolso).toBeDefined();
      expect(autoReembolso?.montoBase).toBe(15.00);
      expect(autoReembolso?.comisionBancaria).toBe(0.20);
      expect(autoReembolso?.montoTotalDebitado).toBe(15.20);
      expect(autoReembolso?.metodoPago).toBe('DEBITO_PRODUBANCO');
    });
  });
});
