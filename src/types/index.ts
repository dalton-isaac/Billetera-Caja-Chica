export type CategoriaGasto =
  | 'METRO'
  | 'BUS_URBANO'
  | 'BUS_VALLES'
  | 'TAXI'
  | 'UBER'
  | 'DIDI'
  | 'INDRIVE'
  | 'ALIMENTACION'
  | 'RETIRO_CAJERO'
  | 'OTROS';

export type SubcategoriaOtro =
  | 'PARQUEADERO'
  | 'PEAJE'
  | 'RECARGA_DATOS'
  | 'COPIAS_GUIAS'
  | 'ENCOMIENDA'
  | 'MANTENIMIENTO'
  | 'VARIOS';

export type MetodoPago =
  | 'DEBITO_PRODUBANCO'
  | 'EFECTIVO_CAJA'
  | 'DEUNA_PRODUBANCO'
  | 'DEUNA_PERSONAL';

export type TipoMovimiento =
  | 'GASTO'
  | 'RETIRO_CAJERO'
  | 'FONDEO_BASE'
  | 'AUTO_REEMBOLSO';

export type EstadoReembolso =
  | 'NO_APLICA'
  | 'PENDIENTE'
  | 'REEMBOLSADO';

export interface Movimiento {
  id: string;
  fechaHora: string;
  tipo: TipoMovimiento;
  categoria?: CategoriaGasto;
  subcategoriaOtro?: SubcategoriaOtro;
  metodoPago: MetodoPago;
  montoBase: number;
  comisionBancaria: number;
  impuestoDigitalIVA: number;
  montoTotalDebitado: number;
  estadoReembolso: EstadoReembolso;
  nota?: string;
  comprobanteUrl?: string;
}

export interface ConfiguracionSistema {
  baseMensual: number;
  costoTransferenciaSPI: number;
  porcentajeIVADigital: number;
  vibracionTactil: boolean;
}

export interface RegistroArqueo {
  id: string;
  fechaHora: string;
  saldoRealBanco: number;
  saldoTeoricoBanco: number;
  diferenciaBanco: number;
  saldoRealEfectivo: number;
  saldoTeoricoEfectivo: number;
  diferenciaEfectivo: number;
  estado: 'CUADRADO' | 'DESCUADRE';
  observaciones?: string;
}

export interface SaldosBolsillos {
  saldoProdubanco: number;
  saldoEfectivo: number;
  saldoPendienteReembolso: number;
  totalGastosMes: number;
  baseMensual: number;
}

export interface DiagnosticoArqueo {
  cuadrado: boolean;
  diffBanco: number;
  diffEfectivo: number;
  pistas: string[];
}

export interface DesgloseGasto {
  montoBase: number;
  comisionBancaria: number;
  impuestoDigitalIVA: number;
  impuestoIVA: number;
  montoTotalDebitado: number;
  estadoReembolso: EstadoReembolso;
}
