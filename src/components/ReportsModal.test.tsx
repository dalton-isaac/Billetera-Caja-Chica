import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ReportsModal } from './ReportsModal';
import type { Movimiento, SaldosBolsillos } from '../types';
import * as pdfGen from '../utils/pdfGenerator';
import * as excelGen from '../utils/excelGenerator';
import * as backupMod from '../utils/backupRestore';

describe('ReportsModal', () => {
  const mockSaldos: SaldosBolsillos = {
    baseMensual: 200.0,
    saldoProdubanco: 190.0,
    saldoEfectivo: 9.55,
    saldoPendienteReembolso: 0.0,
    totalGastosMes: 10.45,
  };

  const mockMovimientos: Movimiento[] = [
    {
      id: 'mov-1',
      fechaHora: '2026-09-15T09:00:00.000Z',
      tipo: 'GASTO',
      categoria: 'METRO',
      metodoPago: 'EFECTIVO_CAJA',
      montoBase: 0.45,
      comisionBancaria: 0,
      impuestoDigitalIVA: 0,
      montoTotalDebitado: 0.45,
      estadoReembolso: 'NO_APLICA',
    },
    {
      id: 'mov-2',
      fechaHora: '2026-08-10T14:00:00.000Z',
      tipo: 'GASTO',
      categoria: 'UBER',
      metodoPago: 'DEBITO_PRODUBANCO',
      montoBase: 10.0,
      comisionBancaria: 0,
      impuestoDigitalIVA: 1.5,
      montoTotalDebitado: 11.5,
      estadoReembolso: 'NO_APLICA',
    },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <ReportsModal
        isOpen={false}
        onClose={vi.fn()}
        movimientos={mockMovimientos}
        saldos={mockSaldos}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders correctly with report options and buttons when isOpen is true', () => {
    render(
      <ReportsModal
        isOpen={true}
        onClose={vi.fn()}
        movimientos={mockMovimientos}
        saldos={mockSaldos}
      />,
    );

    expect(screen.getByText('Reportes y Respaldo')).toBeInTheDocument();
    expect(screen.getByText('Descargar Reporte PDF')).toBeInTheDocument();
    expect(screen.getByText('Descargar Excel (.xlsx)')).toBeInTheDocument();
    expect(screen.getByText('Exportar Respaldo JSON')).toBeInTheDocument();
    expect(screen.getByText('Importar Respaldo JSON')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(
      <ReportsModal
        isOpen={true}
        onClose={onClose}
        movimientos={mockMovimientos}
        saldos={mockSaldos}
      />,
    );

    const closeBtn = screen.getByLabelText('Cerrar modal');
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('triggers PDF generation when Descargar Reporte PDF is clicked', () => {
    const pdfSpy = vi.spyOn(pdfGen, 'generarReportePDF').mockImplementation(() => ({} as any));

    render(
      <ReportsModal
        isOpen={true}
        onClose={vi.fn()}
        movimientos={mockMovimientos}
        saldos={mockSaldos}
      />,
    );

    const btn = screen.getByRole('button', { name: /Descargar Reporte PDF/i });
    fireEvent.click(btn);

    expect(pdfSpy).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/Reporte PDF descargado/i)).toBeInTheDocument();
  });

  it('triggers Excel generation when Descargar Excel (.xlsx) is clicked', () => {
    const excelSpy = vi.spyOn(excelGen, 'generarReporteExcel').mockImplementation(() => ({} as any));

    render(
      <ReportsModal
        isOpen={true}
        onClose={vi.fn()}
        movimientos={mockMovimientos}
        saldos={mockSaldos}
      />,
    );

    const btn = screen.getByRole('button', { name: /Descargar Excel \(\.xlsx\)/i });
    fireEvent.click(btn);

    expect(excelSpy).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/Reporte Excel descargado/i)).toBeInTheDocument();
  });

  it('triggers JSON export when Exportar Respaldo JSON is clicked', async () => {
    const exportSpy = vi
      .spyOn(backupMod, 'exportarBackupJSON')
      .mockResolvedValue('{"mock": true}');

    render(
      <ReportsModal
        isOpen={true}
        onClose={vi.fn()}
        movimientos={mockMovimientos}
        saldos={mockSaldos}
      />,
    );

    const btn = screen.getByRole('button', { name: /Exportar Respaldo JSON/i });
    fireEvent.click(btn);

    await waitFor(() => {
      expect(exportSpy).toHaveBeenCalledTimes(1);
      expect(screen.getByText(/Copia de seguridad JSON descargada/i)).toBeInTheDocument();
    });
  });

  it('allows importing a JSON backup and confirms restoration', async () => {
    const importSpy = vi.spyOn(backupMod, 'importarBackupJSON').mockResolvedValue(true);
    const onRestored = vi.fn();

    render(
      <ReportsModal
        isOpen={true}
        onClose={vi.fn()}
        movimientos={mockMovimientos}
        saldos={mockSaldos}
        onBackupRestored={onRestored}
      />,
    );

    const fileInput = screen.getByLabelText('Archivo de respaldo JSON');
    const mockFile = new File(['{"datos":{}}'], 'backup.json', { type: 'application/json' });

    // Mock FileReader behavior
    const mockFileReader = {
      readAsText: vi.fn(function (this: any) {
        this.onload({ target: { result: '{"datos":{}}' } });
      }),
    };
    vi.spyOn(window, 'FileReader').mockImplementation(() => mockFileReader as any);

    fireEvent.change(fileInput, { target: { files: [mockFile] } });

    // Confirmation alert appears
    await waitFor(() => {
      expect(screen.getByText('Confirmar Restauración')).toBeInTheDocument();
    });

    const confirmBtn = screen.getByRole('button', { name: /Sí, Restaurar Datos/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(importSpy).toHaveBeenCalledWith('{"datos":{}}');
      expect(onRestored).toHaveBeenCalledTimes(1);
      expect(screen.getByText(/Base de datos restaurada con éxito/i)).toBeInTheDocument();
    });
  });
});
