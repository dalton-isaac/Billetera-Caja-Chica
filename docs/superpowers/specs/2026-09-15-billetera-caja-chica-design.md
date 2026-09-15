# Especificación y Diseño Arquitectónico: Billetera de Caja Chica para Mensajería y Transporte

**Fecha:** 2026-09-15  
**Estado:** Aprobado para Planificación  
**Tipo:** Progressive Web App (PWA) Offline-First  
**Ubicación de Operación:** Quito y Valles (Ecuador)  

---

## 1. Resumen Ejecutivo y Objetivos

El sistema es una **Progressive Web App (PWA) móvil instalable y 100% offline**, diseñada para gestionar con precisión matemática un fondo mensual de **$200.00 USD de caja chica** destinado a movilización, transporte y mensajería en la ciudad de Quito y sus valles (Cumbayá, Tumbaco, Los Chillos).

### Problemas que resuelve:
1. **Descuadre bancario en la cuenta de Produbanco (Caja Chica):** Desglosa correctamente retiros de cajero, débitos con tarjeta física, comisiones de transferencias interbancarias y recargos tributarios.
2. **Impuesto del 15% de IVA Digital en Uber con tarjeta:** Automatiza el cálculo tributario para pagos con débito empresarial o permite el registro neto al negociar pago en efectivo/transferencia directa.
3. **El canal "De Una" (Banco Pichincha) y su dualidad:** Distingue cuándo el pago por De Una se financió transfiriendo dinero de Produbanco (costo de transferencia $0.20 sin generar deuda) vs. cuándo se usó dinero personal del mensajero (genera reembolso pendiente).
4. **Comisiones bancarias no registradas:** Registra de manera automática los **$0.20** de costo SPI que cobra Produbanco al transferir hacia Banco Pichincha.
5. **Realidad de transporte en Quito:** Botones de acceso rápido de un toque para Metro ($0.45), Bus Urbano ($0.35), Buses hacia los Valles ($0.40 a $0.75), taxis convencionales y apps de movilidad (inDrive, Uber, DiDi).
6. **Arqueo y Rendición de Cuentas:** Comparación instantánea entre saldos teóricos y reales con alertas predictivas de descuadre, y generación de reportes mensuales en PDF y Excel para la empresa.

---

## 2. Modelo Financiero y Reglas Contables

### A. Los 3 Bolsillos Virtuales
* **Bolsillo 1: Cuenta Produbanco (Caja Chica Base $200.00):**
  * Saldo inicial mensual: $200.00 (configurable).
  * Egresos:
    - Pagos directos con tarjeta de débito (Uber con 15% IVA digital).
    - Retiros de cajero (traspaso a efectivo en mano).
    - Transferencias a Pichincha para pagar con De Una: `Monto_Gasto + $0.20`.
    - Auto-reembolsos cobrados: `Monto_Deuda_Personal + $0.20`.
* **Bolsillo 2: Efectivo en Mano (Caja Chica Física):**
  * Saldo inicial: $0.00.
  * Ingresos: Retiros de cajero desde Produbanco.
  * Egresos: Monedas y billetes para buses urbanos, metro en ventanilla, taxis y gastos varios en efectivo.
* **Bolsillo 3: Bolsillo Personal (Banco Pichincha / De Una):**
  * No afecta los fondos de la empresa al momento del gasto personal.
  * Acumula una cuenta por cobrar: `Pendiente por Reembolsar`.
  * Se liquida al ejecutar *"Auto-reembolsar de Produbanco"*.

---

### B. Matriz de Métodos de Pago Operativos

| Método de Pago Seleccionado | Origen de Fondos | Costo Bancario | Impacto en Produbanco | Impacto en Efectivo | Impacto en Deuda Personal |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`DEBITO_PRODUBANCO`** | Tarjeta física | $0.00 | -(Monto + IVA 15% si es Uber) | $0.00 | $0.00 |
| **`EFECTIVO_CAJA`** | Monedas/Billetes físicos | $0.00 | $0.00 | -Monto | $0.00 |
| **`DEUNA_PRODUBANCO`** | Transferencia previa Produbanco $\rightarrow$ Pichincha | $0.20 (SPI) | -(Monto + $0.20) | $0.00 | $0.00 |
| **`DEUNA_PERSONAL`** | Fondos propios de ahorros Pichincha | $0.00 | $0.00 | $0.00 | +Monto (por cobrar) |

---

### C. Fórmulas de Arqueo y Conciliación

$$\text{Saldo Teórico Produbanco} = \text{Fondo Base} - \sum \text{Débitos Tarjeta} - \sum \text{Retiros Cajero} - \sum \text{De Una Produbanco (Monto + \$0.20)} - \sum \text{Auto-Reembolsos (Monto + \$0.20)}$$

$$\text{Saldo Teórico Efectivo} = \sum \text{Retiros Cajero} - \sum \text{Gastos Efectivo}$$

$$\text{Deuda Pendiente a Favor} = \sum \text{Gastos De Una Personal} - \sum \text{Auto-Reembolsos Cobrados}$$

$$\text{Descuadre Produbanco} = \text{Saldo Real Banco} - \text{Saldo Teórico Produbanco}$$
$$\text{Descuadre Efectivo} = \text{Efectivo Real Billetera} - \text{Saldo Teórico Efectivo}$$

---

## 3. Tarifas de Transporte Parametrizadas (Quito y Valles)

1. **Metro de Quito:**
   - Tarifa estándar: **$0.45**
   - Tarifa preferencial: **$0.22**
   - Tarifa integrada Metro + Trole/Ecovía: **$0.60**
2. **Buses Urbanos Quito & Trole / Ecovía:**
   - Tarifa estándar vigente: **$0.35**
   - Tarifa preferencial: **$0.17**
3. **Buses hacia los Valles (Interparroquiales):**
   - Cumbayá: **$0.40 - $0.45**
   - Tumbaco: **$0.50 - $0.55**
   - Los Chillos (San Rafael / Sangolquí / Conocoto): **$0.45 - $0.55**
   - Tramos largos (Pifo / Yaruquí / El Quinche / Amaguaña): **$0.65 - $0.75 - $1.00**
4. **Apps de Transporte (Tarifa Libre):**
   - inDrive, Uber, DiDi, Taxi Convencional.

---

## 4. Arquitectura de Software y Componentes

### Pila Tecnológica
- **Entorno:** Node.js + Vite + TypeScript.
- **Librería UI:** React 18 / 19 + Lucide React (iconografía limpia).
- **Estilos:** Tailwind CSS con paleta optimizada para exteriores (alto contraste, zonas táctiles amplias para pulgar, modo oscuro automático).
- **Motor Offline:** PWA con Service Worker (`vite-plugin-pwa` + Workbox) para caché completa del frontend y funcionamiento sin conexión.
- **Base de Datos Local:** IndexedDB manejado a través de **Dexie.js** (tipado con TypeScript, reactividad con `useLiveQuery`, transacciones seguras).
- **Compresión de Comprobantes:** HTML5 Canvas client-side compressor (imágenes redimensionadas a máx. 1000px y comprimidas a WebP/JPEG ~100KB antes de almacenarlas).
- **Exportación de Reportes:**
  - `jspdf` + `jspdf-autotable` para PDF formal de rendición de cuentas.
  - `xlsx` para hojas de cálculo Excel.
  - Exportación/Importación de copia de seguridad en JSON.

---

## 5. Modelo de Datos (TypeScript)

```typescript
export interface Movimiento {
  id: string; // UUID v4
  fechaHora: string; // ISO string 2026-09-15T10:30:00-05:00
  tipo: 'GASTO' | 'RETIRO_CAJERO' | 'FONDEO_BASE' | 'AUTO_REEMBOLSO';
  
  categoria:
    | 'METRO'
    | 'BUS_URBANO'
    | 'BUS_VALLES'
    | 'TAXI'
    | 'UBER'
    | 'DIDI'
    | 'INDRIVE'
    | 'ALIMENTACION'
    | 'OTROS';
  
  subcategoriaOtro?:
    | 'PARQUEADERO'
    | 'PEAJE'
    | 'RECARGA_DATOS'
    | 'COPIAS_GUIAS'
    | 'ENCOMIENDA'
    | 'MANTENIMIENTO'
    | 'VARIOS';
  
  metodoPago:
    | 'DEBITO_PRODUBANCO'
    | 'EFECTIVO_CAJA'
    | 'DEUNA_PRODUBANCO'
    | 'DEUNA_PERSONAL';
  
  montoBase: number;
  comisionBancaria: number; // $0.20 para transferencias SPI Produbanco -> Pichincha
  impuestoDigitalIVA: number; // 15% para Uber pagado con tarjeta Produbanco
  montoTotalDebitado: number;
  
  estadoReembolso: 'NO_APLICA' | 'PENDIENTE' | 'REEMBOLSADO';
  
  nota?: string;
  comprobanteUrl?: string; // Data URL base64 optimizada
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

export interface ConfiguracionSistema {
  baseMensual: number; // $200.00
  costoTransferenciaSPI: number; // $0.20
  porcentajeIVADigital: number; // 15
  vibracionTactil: boolean;
}
```

---

## 6. Módulos y Vistas de Usuario

1. **Barra Superior de Balances y Acceso Rápido:**
   - Saldo Produbanco en tiempo real.
   - Saldo Efectivo en mano en tiempo real.
   - Tarjeta destacada de *"Pendiente por Cobrar"* con botón directo de auto-reembolso.
2. **Panel de Registro Express (1 Toque / 3 Segundos):**
   - Accesos directos: Metro ($0.45), Bus Urbano ($0.35), Bus Valles ($0.45/$0.55/$0.75), Taxi, Uber, DiDi, inDrive, Comida, Otros.
   - Selector de los 4 métodos de pago claramente diferenciados.
   - Teclado numérico táctil optimizado para ingresar tarifas libres en segundos.
3. **Módulo de Arqueo y Conciliación:**
   - Comprobación instantánea con semáforo verde/rojo y diagnóstico guiado.
4. **Historial de Movimientos:**
   - Filtros por transporte, app, método de pago y rango de fechas.
   - Edición y eliminación con actualización reactiva instantánea.
5. **Rendición de Cuentas y Exportación:**
   - Descarga de PDF formal membretado listo para entregar a la empresa.
   - Descarga en Excel y respaldo JSON.

---

## 7. Plan de Git y Versionamiento Personal

- Inicialización de repositorio Git local (`git init`).
- Configuración de `.gitignore` para proyectos Vite + React.
- Commits atómicos y descriptivos en cada paso de implementación.
- Facilidad para vincular el repositorio remoto personal en GitHub (`git remote add origin ...` y `git push`).
