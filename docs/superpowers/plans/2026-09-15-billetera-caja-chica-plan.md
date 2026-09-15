# Billetera de Control de Caja Chica PWA - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir una Progressive Web App (PWA) móvil instalable, 100% offline-first, para el control exacto de una caja chica mensual de $200.00 USD en Quito y valles, gestionando cuentas de Produbanco (caja chica), Efectivo físico y Banco Pichincha/De Una (personal y fondeado) con comisiones SPI e IVA digital.

**Architecture:** Arquitectura modular desacoplada con React + TypeScript y Vite. La lógica contable y de cálculo es una biblioteca pura testeada con Vitest. La persistencia es 100% local en IndexedDB vía Dexie.js con reactividad en vivo (`useLiveQuery`). Interfaz estilizada con Tailwind CSS optimizada para exteriores (modo calle, thumb-friendly, vibración háptica). Módulos de compresión en Canvas para fotos y exportación directa en PDF/Excel.

**Tech Stack:** React 18/19, TypeScript, Vite, Tailwind CSS, Lucide React, Dexie.js (`dexie`, `dexie-react-hooks`), `vite-plugin-pwa`, `jspdf`, `jspdf-autotable`, `xlsx`, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-15-billetera-caja-chica-design.md`

## Global Constraints

- Moneda fija: USD ($).
- Base mensual por defecto: $200.00 USD.
- Tarifa de comisión interbancaria SPI Produbanco -> Pichincha: $0.20 USD.
- Tarifa general de IVA digital Ecuador (Uber con tarjeta): 15% (0.15).
- Tarifas transporte estándar predeterminadas: Metro $0.45, Bus Urbano $0.35, Bus Valles $0.45 / $0.55 / $0.75.
- Funcionamiento 100% offline sin necesidad de conexión externa para operaciones diarias.
- Imágenes de comprobantes redimensionadas a máx. 1000px y comprimidas client-side antes de guardar en IndexedDB (<120 KB).

---

### Task 1: Scaffolding del Proyecto y Configuración Base

**Files:**
- Create: `package.json`
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `tailwind.config.js`
- Create: `postcss.config.js`
- Create: `index.html`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/index.css`

**Interfaces:**
- Produces: Estructura de proyecto Vite + React + TypeScript + Tailwind CSS ejecutable con Vitest configurado.

- [ ] **Step 1: Crear `package.json` con dependencias y scripts**
- [ ] **Step 2: Configurar `vite.config.ts`, `tailwind.config.js` y `postcss.config.js`**
- [ ] **Step 3: Configurar `tsconfig.json` y `tsconfig.node.json`**
- [ ] **Step 4: Crear `index.html` y estructura `src/` con punto de entrada**
- [ ] **Step 5: Instalar dependencias mediante `npm install`**
- [ ] **Step 6: Verificar compilación con `npm run build`**
- [ ] **Step 7: Commit del scaffolding base**

---

### Task 2: Motor Contable y Reglas de Negocio de Ecuador (Pure Functions & Unit Tests)

**Files:**
- Create: `src/types/index.ts`
- Create: `src/utils/accounting.ts`
- Test: `src/utils/accounting.test.ts`

**Interfaces:**
- Produces:
  - `calcularDesgloseGasto(categoria, metodoPago, montoBase, config): { montoBase, comisionBancaria, impuestoIVA, montoTotalDebitado, estadoReembolso }`
  - `calcularSaldosBolsillos(movimientos, baseMensual): { saldoProdubanco, saldoEfectivo, saldoPendienteReembolso, totalGastosMes }`
  - `calcularDiagnosticoArqueo(saldoRealBanco, saldoRealEfectivo, saldoTeoricoBanco, saldoTeoricoEfectivo): { cuadrado, diffBanco, diffEfectivo, pistas }`

- [ ] **Step 1: Escribir tests unitarios en `src/utils/accounting.test.ts` que validen:**
  - Uber con débito Produbanco genera 15% IVA.
  - inDrive/Uber con De Una (desde Produbanco) genera $0.20 de comisión bancaria y $0 de deuda personal.
  - inDrive con De Una (Personal) genera $0 de comisión bancaria y estado `PENDIENTE` de reembolso.
  - Retiro de cajero traspasa fondos de Banco a Efectivo sin ser gasto.
  - Auto-reembolso deduce de Produbanco `deuda + $0.20` y liquida la deuda personal.
  - Diagnóstico de arqueo detecta faltante de $0.35 y sugiere "posible pasaje de bus olvidado".
- [ ] **Step 2: Ejecutar tests y confirmar que fallan (`npx vitest run src/utils/accounting.test.ts`)**
- [ ] **Step 3: Implementar `src/types/index.ts` y las funciones puras en `src/utils/accounting.ts`**
- [ ] **Step 4: Ejecutar tests y confirmar que todos pasan al 100%**
- [ ] **Step 5: Commit del motor contable**

---

### Task 3: Capa de Persistencia Local Offline con Dexie.js (IndexedDB)

**Files:**
- Create: `src/db/db.ts`
- Test: `src/db/db.test.ts`

**Interfaces:**
- Consumes: `Movimiento`, `RegistroArqueo`, `ConfiguracionSistema` de `src/types/index.ts`.
- Produces:
  - `db.movimientos`: Dexie Table
  - `db.arqueos`: Dexie Table
  - `db.configuracion`: Dexie Table
  - `inicializarBaseDatos()`: garantiza configuración inicial ($200.00 base, $0.20 SPI, 15% IVA).
  - `registrarMovimiento(movimiento)`: transacción atómica en IndexedDB.
  - `eliminarMovimiento(id)`: eliminación segura.

- [ ] **Step 1: Escribir test en `src/db/db.test.ts` para verificar la inicialización de la base de datos y transacciones**
- [ ] **Step 2: Ejecutar test y verificar que falla**
- [ ] **Step 3: Implementar la clase de base de datos Dexie en `src/db/db.ts` con índices óptimos**
- [ ] **Step 4: Ejecutar test y confirmar que pasa**
- [ ] **Step 5: Commit de la capa de persistencia**

---

### Task 4: Componentes de UI "Modo Calle 3 Segundos" (Header de Saldos, Accesos 1-Toque y Teclado)

**Files:**
- Create: `src/components/BalanceCards.tsx`
- Create: `src/components/PaymentSelector.tsx`
- Create: `src/components/QuickActionGrid.tsx`
- Create: `src/components/QuickAmountModal.tsx`
- Create: `src/utils/vibration.ts`

**Interfaces:**
- Consumes: `calcularDesgloseGasto` de `src/utils/accounting.ts`, `db` de `src/db/db.ts`.
- Produces:
  - `BalanceCards`: muestra Produbanco, Efectivo en Mano y Saldo Pendiente por Reembolsar con colores de alto contraste.
  - `PaymentSelector`: 4 botones grandes táctiles (`Débito Produbanco`, `Efectivo Caja`, `De Una de Produbanco`, `De Una Personal`).
  - `QuickActionGrid`: botones de 1 toque para Metro ($0.45), Bus ($0.35), Valles ($0.45/$0.55/$0.75), Uber, DiDi, inDrive, Taxi, Comida, Otros, Retiro Cajero.
  - `QuickAmountModal`: modal con teclado numérico gigante táctil para tarifas libres (Uber, inDrive, comida) sin estorbo del teclado del navegador.

- [ ] **Step 1: Implementar utilidad de vibración táctil `src/utils/vibration.ts`**
- [ ] **Step 2: Implementar `PaymentSelector.tsx` con estados activos claros e información contextual**
- [ ] **Step 3: Implementar `BalanceCards.tsx` con alertas visuales de saldo bajo o reembolsos pendientes**
- [ ] **Step 4: Implementar `QuickAmountModal.tsx` con teclado numérico nativo optimizado para pulgar**
- [ ] **Step 5: Implementar `QuickActionGrid.tsx` integrando registro inmediato y apertura de modal numérico**
- [ ] **Step 6: Verificar visualmente en `App.tsx` y testear registros rápidos**
- [ ] **Step 7: Commit de componentes de captura rápida**

---

### Task 5: Módulo de Auto-Reembolso y Liquidación de Deuda Personal

**Files:**
- Create: `src/components/AutoReimburseModal.tsx`
- Modify: `src/components/BalanceCards.tsx`
- Test: `src/components/AutoReimburseModal.test.tsx`

**Interfaces:**
- Consumes: `saldoPendienteReembolso` de saldos calculados.
- Produces:
  - Botón directo en la tarjeta de deuda: `[ ⚡ Cobrar $XX.XX a mi favor ]`.
  - `AutoReimburseModal`: Desglosa:
    * Deuda a tu favor: `$XX.XX`
    * Comisión transferencia interbancaria Produbanco: `$0.20`
    * Total debitado de Produbanco: `$(XX.XX + 0.20)`
  - Al confirmar, registra el movimiento contable que liquida la deuda y cuadra Produbanco.

- [ ] **Step 1: Escribir test del flujo de auto-reembolso verificando que genera la transacción y comisión de $0.20**
- [ ] **Step 2: Implementar `AutoReimburseModal.tsx` con confirmación visual**
- [ ] **Step 3: Conectar con el botón de la tarjeta en `BalanceCards.tsx`**
- [ ] **Step 4: Ejecutar tests y validar funcionamiento**
- [ ] **Step 5: Commit del módulo de auto-reembolso**

---

### Task 6: Módulo de Arqueo y Diagnóstico Predictivo de Descuadres

**Files:**
- Create: `src/components/ArqueoModal.tsx`
- Modify: `src/App.tsx`
- Test: `src/components/ArqueoModal.test.tsx`

**Interfaces:**
- Consumes: `calcularDiagnosticoArqueo` de `src/utils/accounting.ts`.
- Produces:
  - Formulario con 2 campos: Saldo real en Produbanco y Efectivo físico en mano.
  - Comparador en tiempo real con semáforo verde / rojo.
  - Despliegue de pistas inteligentes (ej. "¿Faltan $0.35? Revisa pasaje de bus olvidado").
  - Botón de "Guardar Acta de Arqueo" en la base de datos `db.arqueos`.

- [ ] **Step 1: Escribir test para `ArqueoModal.tsx` verificando comparaciones y sugerencias**
- [ ] **Step 2: Implementar `ArqueoModal.tsx` con diseño limpio e intuitivo**
- [ ] **Step 3: Conectar el botón flotante/menú de Arqueo en `App.tsx`**
- [ ] **Step 4: Validar diagnósticos con casos de prueba**
- [ ] **Step 5: Commit del módulo de arqueo**

---

### Task 7: Historial de Movimientos, Edición y Búsqueda

**Files:**
- Create: `src/components/TransactionHistory.tsx`
- Create: `src/components/EditTransactionModal.tsx`

**Interfaces:**
- Consumes: `db.movimientos` con `useLiveQuery`.
- Produces:
  - Lista de movimientos ordenada cronológicamente (más recientes primero).
  - Filtros rápidos: `Todos`, `Metro/Bus`, `Apps (Uber/DiDi/inDrive)`, `Efectivo`, `De Una`.
  - Opciones de editar nota/monto o eliminar transacción con confirmación.

- [ ] **Step 1: Implementar `TransactionHistory.tsx` con badges visuales de método de pago y montos**
- [ ] **Step 2: Implementar `EditTransactionModal.tsx` para correcciones de digitación rápida**
- [ ] **Step 3: Validar que la edición o eliminación recalcula instantáneamente los saldos en tiempo real**
- [ ] **Step 4: Commit del módulo de historial**

---

### Task 8: Reportes Formales (PDF para la Empresa, Excel y Respaldo JSON)

**Files:**
- Create: `src/utils/pdfGenerator.ts`
- Create: `src/utils/excelGenerator.ts`
- Create: `src/components/ReportsModal.tsx`

**Interfaces:**
- Consumes: Movimientos del mes, datos de arqueo y configuración.
- Produces:
  - `generarReportePDF(movimientos, saldos, mes)`: Documento formal membretado para entregar a contabilidad o jefatura, con desglose de transportes, IVA digital, comisiones y balance final.
  - `generarReporteExcel(movimientos)`: Archivo `.xlsx` con hojas de datos tabuladas.
  - `exportarBackupJSON()` / `importarBackupJSON()`: Respaldo completo para transferir a otro móvil.

- [ ] **Step 1: Implementar `pdfGenerator.ts` con jsPDF y jsPDF-AutoTable con diseño corporativo elegante**
- [ ] **Step 2: Implementar `excelGenerator.ts` usando SheetJS (`xlsx`)**
- [ ] **Step 3: Implementar `ReportsModal.tsx` con opciones de descarga y respaldo**
- [ ] **Step 4: Probar generación de archivos en el navegador**
- [ ] **Step 5: Commit del módulo de reportes**

---

### Task 9: Compresión de Fotos de Facturas y Configuración PWA 100% Offline

**Files:**
- Create: `src/utils/imageCompression.ts`
- Modify: `vite.config.ts` (configuración de `VitePWA`)
- Create: `public/pwa-192x192.png`, `public/pwa-512x512.png`
- Modify: `index.html` (meta tags PWA, theme-color `#0f172a`, mobile-web-app-capable)

**Interfaces:**
- Produces:
  - `comprimirImagen(file: File): Promise<string>`: Redimensiona a máx 1000px y comprime a WebP/JPEG <100KB en Canvas.
  - Service Worker registrado para cachear todos los assets de la app y funcionar sin conexión a internet.
  - Manifest que permite "Añadir a la pantalla de inicio" como app móvil nativa.

- [ ] **Step 1: Implementar `imageCompression.ts` con pruebas de compresión en Canvas**
- [ ] **Step 2: Configurar `VitePWA` en `vite.config.ts` con Workbox cache-first para modo offline estricto**
- [ ] **Step 3: Generar iconos de PWA e integrar manifiesto en `index.html`**
- [ ] **Step 4: Probar auditoría de PWA y carga offline**
- [ ] **Step 5: Commit de optimización PWA y comprobantes**

---

### Task 10: Integración Final, Verificación General y Push a GitHub Remoto

**Files:**
- Modify: `src/App.tsx`
- Modify: `README.md`

**Interfaces:**
- Consumes: Todos los módulos anteriores.
- Produces: Aplicación completa y desplegable, tests verdes, repositorio sincronizado con `https://github.com/dalton-isaac/Billetera-Caja-Chica.git`.

- [ ] **Step 1: Ejecutar la suite completa de tests (`npm test` o `npx vitest run`)**
- [ ] **Step 2: Ejecutar build de producción (`npm run build`) y verificar que no haya errores de TypeScript**
- [ ] **Step 3: Redactar `README.md` con manual de uso en la calle, instalación PWA y guía de arqueo**
- [ ] **Step 4: Realizar commit final con todo el proyecto ensamblado**
- [ ] **Step 5: Ejecutar push al repositorio remoto en GitHub (`git push -u origin main`)**
