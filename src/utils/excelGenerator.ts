import * as XLSX from 'xlsx';
import type { Movimiento, SaldosBolsillos } from '../types';

/**
 * Genera y descarga un archivo Excel (.xlsx) estructurado con dos hojas:
 * 1. "Movimientos": Detalle de transacciones, desglose de impuestos y comisiones.
 * 2. "Resumen Contable": Saldos en bolsillos, total gastado y parámetros contables.
 */
export function generarReporteExcel(
  movimientos: Movimiento[],
  saldos: SaldosBolsillos,
  mesTexto?: string,
  descargar = true,
): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();

  // 1. Hoja de Movimientos
  const rowsMovimientos = movimientos.map((m) => {
    const fecha = m.fechaHora.includes('T') ? m.fechaHora.split('T')[0] : m.fechaHora;
    const hora = m.fechaHora.includes('T')
      ? m.fechaHora.split('T')[1]?.substring(0, 5) || ''
      : '';

    let categoriaTexto = m.categoria ? m.categoria.replace('_', ' ') : m.tipo;
    if (m.tipo === 'AUTO_REEMBOLSO') {
      categoriaTexto = 'Auto-Reembolso Personal';
    } else if (m.tipo === 'RETIRO_CAJERO') {
      categoriaTexto = 'Retiro Cajero';
    } else if (m.tipo === 'FONDEO_BASE') {
      categoriaTexto = 'Fondeo Base';
    }

    const detalle = m.subcategoriaOtro || m.nota || categoriaTexto;

    const totalDebitado =
      m.montoTotalDebitado > 0
        ? m.montoTotalDebitado
        : m.montoBase + (m.impuestoDigitalIVA || 0) + (m.comisionBancaria || 0);

    return {
      ID: m.id,
      Fecha: fecha,
      Hora: hora,
      Categoría: categoriaTexto,
      Detalle: detalle,
      'Método de Pago': m.metodoPago,
      'Monto Base ($)': Number(m.montoBase.toFixed(2)),
      'IVA Digital 15% ($)': Number((m.impuestoDigitalIVA || 0).toFixed(2)),
      'Comisión SPI $0.20 ($)': Number((m.comisionBancaria || 0).toFixed(2)),
      'Total Debitado ($)': Number(totalDebitado.toFixed(2)),
      'Estado Reembolso': m.estadoReembolso,
      Notas: m.nota || '',
    };
  });

  const wsMovimientos = XLSX.utils.json_to_sheet(rowsMovimientos);
  XLSX.utils.book_append_sheet(wb, wsMovimientos, 'Movimientos');

  // 2. Hoja de Resumen Contable
  const totalReembolsos = movimientos
    .filter((m) => m.tipo === 'AUTO_REEMBOLSO')
    .reduce((acc, curr) => acc + curr.montoBase, 0);

  const rowsResumen = [
    { 'Concepto Contable': 'Fondo Base Asignado', 'Valor ($)': saldos.baseMensual },
    { 'Concepto Contable': 'Total Gastos Movilización', 'Valor ($)': saldos.totalGastosMes },
    { 'Concepto Contable': 'Saldo Banco Produbanco', 'Valor ($)': saldos.saldoProdubanco },
    { 'Concepto Contable': 'Saldo Efectivo en Mano', 'Valor ($)': saldos.saldoEfectivo },
    { 'Concepto Contable': 'Deuda Personal Pendiente (Por Reembolsar)', 'Valor ($)': saldos.saldoPendienteReembolso },
    { 'Concepto Contable': 'Total Auto-Reembolsos Cobrados', 'Valor ($)': Number(totalReembolsos.toFixed(2)) },
    { 'Concepto Contable': 'Periodo Reportado', 'Valor ($)': mesTexto || 'Mes Actual' },
    { 'Concepto Contable': 'Fecha de Generación', 'Valor ($)': new Date().toLocaleString('es-EC') },
  ];

  const wsResumen = XLSX.utils.json_to_sheet(rowsResumen);
  XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen Contable');

  const mesSanitizado = (mesTexto || 'General').trim().replace(/\s+/g, '_');
  const fileName = `Reporte_Caja_Chica_${mesSanitizado}.xlsx`;

  if (descargar) {
    XLSX.writeFile(wb, fileName);
  }

  return wb;
}
