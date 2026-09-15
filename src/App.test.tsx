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

  it('opens ArqueoModal when Arqueo de Caja button is clicked and saves audit record', async () => {
    render(<App />);

    const arqueoBtn = screen.getByRole('button', { name: /Arqueo de Caja/i });
    fireEvent.click(arqueoBtn);

    // Modal should open
    await waitFor(() => {
      expect(screen.getByText('¿Me cuadra la caja?')).toBeInTheDocument();
      expect(screen.getByText('¡Tu caja está 100% cuadrada!')).toBeInTheDocument();
    });

    // Save audit
    const saveBtn = screen.getByRole('button', { name: /Guardar Acta de Arqueo/i });
    fireEvent.click(saveBtn);

    // Verify persisted in db.arqueos
    await waitFor(async () => {
      const arqueos = await db.arqueos.toArray();
      expect(arqueos.length).toBe(1);
      expect(arqueos[0].estado).toBe('CUADRADO');
      expect(arqueos[0].saldoTeoricoBanco).toBe(200.00);
      expect(arqueos[0].saldoRealBanco).toBe(200.00);
    });

    // Verify toast
    expect(screen.getByText(/¡Acta guardada! Tu caja está 100% cuadrada/i)).toBeInTheDocument();
  });

  it('allows editing a transaction from history and updates balances and DB in real time', async () => {
    // Seed initial transaction
    await registrarMovimiento({
      id: 'test-edit-mov',
      tipo: 'GASTO',
      categoria: 'UBER',
      metodoPago: 'DEBITO_PRODUBANCO',
      montoBase: 5.00,
      comisionBancaria: 0,
      impuestoDigitalIVA: 0.75,
      montoTotalDebitado: 5.75,
      estadoReembolso: 'NO_APLICA',
      nota: 'Viaje inicial',
    });

    render(<App />);

    // Wait for movement to render in history
    const editBtn = await screen.findByRole('button', { name: /Editar/i }, { timeout: 3000 });
    fireEvent.click(editBtn);

    // EditTransactionModal should open
    await waitFor(() => {
      expect(screen.getByText('Editar Movimiento')).toBeInTheDocument();
    });

    // Change amount from 5.00 to 10.00
    const montoInput = screen.getByLabelText('Monto Base');
    fireEvent.change(montoInput, { target: { value: '10.00' } });

    // Save changes
    const saveChangesBtn = screen.getByRole('button', { name: /Guardar Cambios/i });
    fireEvent.click(saveChangesBtn);

    // Verify DB updated
    await waitFor(async () => {
      const mov = await db.movimientos.get('test-edit-mov');
      expect(mov?.montoBase).toBe(10.00);
      expect(mov?.impuestoDigitalIVA).toBe(1.50);
      expect(mov?.montoTotalDebitado).toBe(11.50);
    });

    // Toast feedback
    expect(screen.getByText('✏️ Movimiento actualizado')).toBeInTheDocument();
  });

  it('allows deleting a transaction from history with confirmation and updates DB', async () => {
    // Seed initial transaction
    await registrarMovimiento({
      id: 'test-delete-mov',
      tipo: 'GASTO',
      categoria: 'BUS_URBANO',
      metodoPago: 'EFECTIVO_CAJA',
      montoBase: 0.35,
      comisionBancaria: 0,
      impuestoDigitalIVA: 0,
      montoTotalDebitado: 0.35,
      estadoReembolso: 'NO_APLICA',
    });

    render(<App />);

    // Wait for movement in history
    const deleteBtn = await screen.findByRole('button', { name: /Eliminar/i }, { timeout: 3000 });
    fireEvent.click(deleteBtn);

    // Confirmation dialog appears
    await waitFor(() => {
      expect(screen.getByText('¿Eliminar movimiento?')).toBeInTheDocument();
    });

    // Confirm deletion
    const confirmBtn = screen.getByRole('button', { name: 'Sí, Eliminar' });
    fireEvent.click(confirmBtn);

    // Verify removed from DB
    await waitFor(async () => {
      const mov = await db.movimientos.get('test-delete-mov');
      expect(mov).toBeUndefined();
    });

    // Toast feedback
    expect(screen.getByText('🗑️ Movimiento eliminado')).toBeInTheDocument();
  });

  it('opens ReportsModal when Reportes & Exportar button is clicked', async () => {
    render(<App />);

    const reportesBtn = screen.getByRole('button', { name: /Reportes & Exportar/i });
    fireEvent.click(reportesBtn);

    await waitFor(() => {
      expect(screen.getByText('Reportes y Respaldo')).toBeInTheDocument();
      expect(screen.getByText('Descargar Reporte PDF')).toBeInTheDocument();
      expect(screen.getByText('Descargar Excel (.xlsx)')).toBeInTheDocument();
    });
  });
});


