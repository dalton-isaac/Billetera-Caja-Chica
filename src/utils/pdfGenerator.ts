import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Movimiento, SaldosBolsillos } from '../types';

/**
 * Genera el documento formal de rendición de cuentas de caja chica en formato PDF.
 * Incluye cabecera institucional, bloque KPI resumen, tabla detallada de gastos
 * y pie de página con firmas de descargo para la empresa.
 */
export function generarReportePDF(
  movimientos: Movimiento[],
  saldos: SaldosBolsillos,
  mesTexto?: string,
  nombreMensajero?: string,
  descargar = true,
): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const periodo = mesTexto || 'Mes Actual';
  const responsable = nombreMensajero || 'Isaac Alarcón (Mensajería)';
  const fechaEmision = new Date().toLocaleDateString('es-EC', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // 1. Cabecera Corporativa
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, 210, 24, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(
    'INFORME DE RENDICIÓN DE CAJA CHICA - MENSAJERÍA Y TRANSPORTE',
    14,
    11,
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text('Operaciones Urbanas y Valles · Quito, Ecuador', 14, 18);

  // 2. Metadatos de Emisión
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85); // slate-700
  doc.text(`Quito, Ecuador - Fecha de emisión: ${fechaEmision}`, 14, 31);
  doc.text(`Periodo Reportado: ${periodo}`, 14, 36);
  doc.text(`Responsable de Movilización: ${responsable}`, 14, 41);

  // 3. Bloque KPI Resumen
  const totalReembolsos = movimientos
    .filter((m) => m.tipo === 'AUTO_REEMBOLSO')
    .reduce((acc, curr) => acc + curr.montoBase, 0);

  autoTable(doc, {
    startY: 46,
    head: [
      [
        'Base Asignada',
        'Total Gastos',
        'Saldo Produbanco',
        'Saldo Efectivo',
        'Auto-Reembolsos Cobrados',
      ],
    ],
    body: [
      [
        `$${saldos.baseMensual.toFixed(2)}`,
        `$${saldos.totalGastosMes.toFixed(2)}`,
        `$${saldos.saldoProdubanco.toFixed(2)}`,
        `$${saldos.saldoEfectivo.toFixed(2)}`,
        `$${totalReembolsos.toFixed(2)}`,
      ],
    ],
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59], // slate-800
      textColor: 255,
      halign: 'center',
      fontSize: 8,
      fontStyle: 'bold',
    },
    bodyStyles: {
      halign: 'center',
      fontSize: 9,
      fontStyle: 'bold',
      textColor: [15, 23, 42],
    },
    styles: {
      cellPadding: 2,
    },
  });

  // 4. Tabla Detallada de Transacciones
  const startYTabla = ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 65) + 6;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('DETALLE INDIVIDUAL DE MOVIMIENTOS Y GASTOS', 14, startYTabla - 2);

  const tableRows = movimientos.map((m) => {
    let fechaFormateada = m.fechaHora;
    try {
      const d = new Date(m.fechaHora);
      if (!isNaN(d.getTime())) {
        const dia = String(d.getDate()).padStart(2, '0');
        const mes = String(d.getMonth() + 1).padStart(2, '0');
        const anio = d.getFullYear();
        fechaFormateada = `${dia}/${mes}/${anio}`;
      } else if (m.fechaHora.includes('T')) {
        fechaFormateada = m.fechaHora.split('T')[0];
      }
    } catch {
      fechaFormateada = m.fechaHora.split('T')[0] || m.fechaHora;
    }

    let concepto = m.categoria ? m.categoria.replace('_', ' ') : m.tipo;
    if (m.tipo === 'RETIRO_CAJERO') {
      concepto = 'Retiro Cajero';
    } else if (m.tipo === 'AUTO_REEMBOLSO') {
      concepto = 'Auto-Reembolso';
    } else if (m.tipo === 'FONDEO_BASE') {
      concepto = 'Fondeo Base';
    } else if (m.categoria === 'OTROS') {
      concepto = `Otros (${m.subcategoriaOtro || 'Varios'})`;
    }

    let metodoPagoStr = m.metodoPago as string;
    if (m.metodoPago === 'DEBITO_PRODUBANCO') metodoPagoStr = 'Débito Produbanco';
    else if (m.metodoPago === 'EFECTIVO_CAJA') metodoPagoStr = 'Efectivo Caja';
    else if (m.metodoPago === 'DEUNA_PRODUBANCO') metodoPagoStr = 'De Una (Produbanco)';
    else if (m.metodoPago === 'DEUNA_PERSONAL') metodoPagoStr = 'De Una (Personal)';

    const total =
      m.montoTotalDebitado > 0
        ? m.montoTotalDebitado
        : m.montoBase + (m.impuestoDigitalIVA || 0) + (m.comisionBancaria || 0);

    return [
      fechaFormateada,
      concepto,
      metodoPagoStr,
      `$${m.montoBase.toFixed(2)}`,
      `$${(m.impuestoDigitalIVA || 0).toFixed(2)}`,
      `$${(m.comisionBancaria || 0).toFixed(2)}`,
      `$${total.toFixed(2)}`,
      m.nota || '-',
    ];
  });

  autoTable(doc, {
    startY: startYTabla,
    head: [
      [
        'Fecha',
        'Concepto',
        'Método de Pago',
        'Tarifa Base ($)',
        'IVA Digital ($)',
        'Comis. SPI ($)',
        'Total ($)',
        'Notas',
      ],
    ],
    body: tableRows,
    theme: 'striped',
    headStyles: {
      fillColor: [5, 150, 105], // emerald-600
      textColor: 255,
      fontSize: 7.5,
      halign: 'center',
      fontStyle: 'bold',
    },
    bodyStyles: {
      fontSize: 7,
      textColor: [30, 41, 59],
      cellPadding: 1.8,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 20, halign: 'center' },
      1: { cellWidth: 26 },
      2: { cellWidth: 27 },
      3: { cellWidth: 20, halign: 'right' },
      4: { cellWidth: 19, halign: 'right' },
      5: { cellWidth: 19, halign: 'right' },
      6: { cellWidth: 20, halign: 'right' },
      7: { cellWidth: 'auto' },
    },
  });

  // 5. Pie de Página con Firmas
  let finalY = ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 200) + 25;
  if (finalY > 255) {
    doc.addPage();
    finalY = 35;
  }

  doc.setDrawColor(148, 163, 184); // slate-400
  doc.setLineWidth(0.5);

  // Firma Responsable
  doc.line(20, finalY, 85, finalY);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('Firma Responsable de Movilización', 20, finalY + 4.5);
  doc.setFont('helvetica', 'normal');
  doc.text(responsable, 20, finalY + 8.5);
  doc.text('C.I.: ___________________________', 20, finalY + 12.5);

  // Firma y Sello Contabilidad / Administración
  doc.line(125, finalY, 190, finalY);
  doc.setFont('helvetica', 'bold');
  doc.text('Recibido Contabilidad / Administración', 125, finalY + 4.5);
  doc.setFont('helvetica', 'normal');
  doc.text('Firma y Sello de Recepción', 125, finalY + 8.5);
  doc.text('Fecha Recibido: _____/_____/2026', 125, finalY + 12.5);

  const mesSanitizado = periodo.trim().replace(/\s+/g, '_');
  const fileName = `Rendicion_Caja_Chica_Quito_${mesSanitizado}.pdf`;

  if (descargar) {
    doc.save(fileName);
  }

  return doc;
}
