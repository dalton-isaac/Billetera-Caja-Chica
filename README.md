# Billetera de Control de Caja Chica - Mensajería y Transporte (Quito y Valles)

[![PWA Offline First](https://img.shields.io/badge/PWA-100%25%20Offline%20First-emerald?style=flat-square&logo=pwa)](https://github.com/dalton-isaac/Billetera-Caja-Chica)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-cyan?style=flat-square&logo=react)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38bdf8?style=flat-square&logo=tailwindcss)](https://tailwindcss.com/)
[![Tests](https://img.shields.io/badge/Tests-128%20Passed%20(100%25)-brightgreen?style=flat-square&logo=vitest)](https://vitest.dev/)

Aplicación web progresiva (**PWA**) ultra-rápida, ergonómica y 100% offline para el control contable, arqueo y rendición de cuentas de caja chica en operaciones de mensajería y trámites en el Distrito Metropolitano de Quito y sus valles.

---

## 🎯 Objetivo y Filosofía del Sistema

En la mensajería diaria en Quito y los valles (Cumbayá, Tumbaco, Valle de Los Chillos), el mensajero enfrenta dos problemas críticos:
1. **Mezcla de fondos propios y de la empresa:** Pagar una carrera rápida con la app personal de *De Una* o efectivo propio y luego olvidar cobrarlo, perdiendo dinero de su bolsillo.
2. **Descuadres bancarios por impuestos ocultos:** El Banco debita comisiones SPI ($0.20) o retenciones de IVA digital (15% en Uber) que no aparecen en el recibo de la app de transporte, provocando descuadres con la administración al momento de rendir cuentas.

**Billetera de Control de Caja Chica** resuelve estos problemas mediante un modelo contable de 3 bolsillos con recálculo automático de reglas tributarias y bancarias ecuatorianas, botones táctiles de 1-toque para transporte público y capacidad de generación de reportes en PDF y Excel con fotos de comprobantes.

---

## 💰 Modelo Financiero de los 3 Bolsillos (*Tri-Pocket Accounting*)

El sistema mantiene tres saldos independientes y reconciliados en tiempo real:

```
                  ┌─────────────────────────────────┐
                  │ Fondo de Caja Chica Corporativo │
                  └──────────────┬──────────────────┘
                                 │
         ┌───────────────────────┴───────────────────────┐
         ▼                                               ▼
┌──────────────────────────────┐                ┌──────────────────────────────┐
│  Bolsillo 1: Débito Banco    │  Retiro Cajero │   Bolsillo 2: Efectivo       │
│  (Cuenta Produbanco Corp.)   ├───────────────►│   (Billetes y Monedas Físicas│
│  - Tarjeta de débito         │  (Sin costo)   │   - Metro, buses urbanos     │
│  - De Una Produbanco         │                │   - Peajes, parqueos, taxis  │
└──────────────┬───────────────┘                └──────────────────────────────┘
               ▲
               │ Flujo "Cobrar" (Auto-reembolso)
               │ Transfiere deuda + $0.20 SPI banco
               │
┌──────────────┴───────────────┐
│  Bolsillo 3: De Una Personal │
│  (Fondeo Propio / Deuda)     │
│  - Dinero propio adelantado  │
│  - Saldo en rojo a cobrar    │
└──────────────────────────────┘
```

1. **Produbanco Débito (Cuenta Corporativa):**
   - Dinero en la cuenta bancaria de la empresa asignado para los gastos.
   - Se utiliza para: pasajes de Metro pagados con tarjeta física de débito o contactless, pagos mediante De Una vinculados a Produbanco, o carreras de Uber debitadas en tarjeta.
2. **Efectivo en Mano (Caja Chica Física):**
   - Billetes y monedas en el bolsillo del mensajero.
   - Se incrementa mediante el registro de **Retiros de Cajero** desde Produbanco (traspaso interno que no afecta la caja chica global).
   - Se consume en buses urbanos, buses a los valles, peajes, parqueaderos o taxis tradicionales.
3. **De Una Personal (Fondeo Propio / Deuda a Reembolsar):**
   - Registra cada gasto corporativo que el mensajero tuvo que pagar de urgencia con su cuenta personal de De Una (Banco Pichincha) o efectivo propio.
   - El sistema acumula un saldo visual en rojo: **"Te deben: $X.XX"**.
   - Con el botón **"Cobrar"**, se ejecuta el auto-reembolso: la caja chica salda la deuda al mensajero debitando de Produbanco el monto adeudado más los **$0.20** de la comisión de transferencia interbancaria SPI.

---

## 🇪🇨 Reglas Contables de Ecuador Integradas

* **IVA Digital 15% (Uber):**
  De acuerdo con la resolución del SRI para plataformas digitales extranjeras, las entidades bancarias ecuatorianas aplican una retención del **15% de IVA** sobre la tarifa base facturada por Uber. Al registrar un viaje en Uber con Débito Produbanco de `$10.00`, el sistema registra automáticamente `$1.50` de IVA digital y debita `$11.50` del saldo bancario.
* **Comisión SPI Interbancaria ($0.20):**
  Cada pago interbancario o transferencia hacia cuentas de terceros vía De Una Produbanco o durante el auto-reembolso descuenta la tarifa reglamentaria del Banco Central del Ecuador (BCE) de `$0.20`.
* **inDrive, DiDi y Taxis Convencionales:**
  Pagos directos al conductor sin recargo de IVA de plataformas internacionales.

---

## 🚌 Tarifario Oficial de Transporte (Quito y Valles)

El sistema incluye accesos rápidos de 1-toque ajustados a las tarifas vigentes:

| Servicio | Tarifa | Método Habitual | Comportamiento en la App |
| :--- | :--- | :--- | :--- |
| **Metro de Quito** | **$0.45** | Débito Produbanco / Efectivo | Botón directo de 1-toque con vibración háptica instantánea. |
| **Bus Urbano Quito** | **$0.35** | Efectivo en Mano | Botón directo de 1-toque con confirmación háptica. |
| **Bus Valles** | **$0.40 a $0.75** | Efectivo en Mano | Selector rápido modal con las paradas de Cumbayá, Tumbaco, Los Chillos, Conocoto, Pifo ($0.40, $0.45, $0.50, $0.55, $0.60, $0.65, $0.70, $0.75). |
| **Uber / DiDi / inDrive** | Variable | Débito / De Una / Efectivo | Teclado táctil ergonómico con presets ($1, $2, $3, $5, $10, $15) y cálculo automático de IVA. |
| **Alimentación / Refrigerio**| Variable | Efectivo / De Una | Registro rápido con desglose de factura. |
| **Retiro de Cajero** | $10, $20, $50... | Débito Produbanco | Traspaso contable automático: resta de Produbanco y suma al Efectivo en Mano. |
| **Otros Gastos** | Variable | Cualquiera | Parqueaderos, peajes, recargas de datos móviles, guías de encomienda o mantenimiento. |

---

## 📱 Guía de Instalación PWA en Celular y Modo Offline

La aplicación es una **Progressive Web App (PWA)** completa con Service Worker y base de datos local en **IndexedDB (Dexie.js)**. Funciona en túneles del Metro, parqueaderos subterráneos y sin conexión a internet.

### En Android (Google Chrome / Brave / Edge):
1. Abre la dirección de la aplicación en el navegador de tu celular.
2. Pulsa en el banner que aparece al fondo **"Agregar Billetera a la pantalla principal"** o toca el menú de 3 puntos verticales (`⋮`) arriba a la derecha.
3. Selecciona **"Instalar aplicación"** o **"Agregar a la pantalla principal"**.
4. Listo: se creará un icono independiente en el menú de aplicaciones que inicia a pantalla completa como una app nativa de Android.

### En iPhone / iOS (Safari):
1. Abre la URL en el navegador **Safari** (obligatorio en iOS).
2. Toca el botón **Compartir** en la barra inferior (el cuadrado con la flecha hacia arriba: ⎋).
3. Desliza hacia abajo y pulsa **"Agregar al inicio"** (*Add to Home Screen*).
4. Pulsa **"Agregar"** en la esquina superior derecha.
5. La app se abrirá sin barra de navegación, con soporte completo de notch y Safe Area.

---

## ⚖️ Arqueo Diario Inteligente y Rendición de Cuentas

### Arqueo Físico en 60 Segundos
Al finalizar la jornada laboral o el turno:
1. Pulsa el botón **"Arqueo de Caja"** en el panel principal.
2. Ingresa la cantidad de billetes y monedas que tienes físicamente en tu bolsillo ($20, $10, $5, $1, ¢50, ¢25, ¢10, ¢5, ¢1).
3. El sistema calcula el total físico y lo contrasta automáticamente contra el saldo teórico esperado según los movimientos registrados:
   - **CUADRADO (Diferencia $0.00):** La caja física coincide con la contabilidad.
   - **SOBRANTE (+$$):** Hay más dinero físico del registrado.
   - **FALTANTE (-$$):** Hay menos dinero físico del esperado.
4. Permite agregar una justificación u observación y guarda una auditoría inmutable con fecha y hora.

### Rendición de Cuentas Formal (PDF y Excel)
En el menú **"Rendición & Reportes"**:
- **Descargar Reporte PDF:** Genera un documento corporativo formal con membrete, balance de apertura, resumen de egresos por categoría, detalle cronológico de cada carrera y gasto, auditoría de arqueos y galería fotográfica de recibos/facturas adjuntos.
- **Exportar a Excel (.xlsx):** Genera una hoja de cálculo con formato contable profesional, fórmulas de suma y columnas detalladas (Fecha, Categoría, Detalle, Método de Pago, Monto Base, IVA Digital, Comisión SPI, Total Debitado, Estado de Reembolso).
- **Copia de Seguridad y Restauración (JSON):** Exporta todos los datos para respaldo en Google Drive o restaura información en un nuevo dispositivo con 1 clic.

---

## 🛠️ Stack Tecnológico y Arquitectura

- **Framework:** [React 19](https://react.dev/) + [TypeScript 5](https://www.typescriptlang.org/)
- **Empaquetador y Build Tool:** [Vite 6](https://vitejs.dev/)
- **Estilos:** [Tailwind CSS 4](https://tailwindcss.com/) (Tema oscuro con ergonomía de alto contraste para exteriores)
- **Persistencia Local:** [Dexie.js](https://dexie.com/) (Wrapper reactivo y tipado sobre IndexedDB)
- **Soporte Offline & PWA:** [vite-plugin-pwa](https://vite-pwa-org.netlify.app/) con Workbox (Cache-First para assets y fuentes)
- **Reportes:** [jsPDF](https://github.com/parallax/jsPDF) + [jspdf-autotable](https://github.com/simonbengtsson/jsPDF-AutoTable) y [SheetJS (xlsx)](https://sheetjs.com/)
- **Compresión de Imágenes:** Compresión canvas en cliente a formato WebP (<100 KB por comprobante)
- **Testing:** [Vitest 3](https://vitest.dev/) + [React Testing Library](https://testing-library.com/)

---

## 💻 Instrucciones de Desarrollo Local

### Prerrequisitos
- [Node.js](https://nodejs.org/) v18.0.0 o superior
- [npm](https://www.npmjs.com/) v9.0.0 o superior

### Instalación
Clonar el repositorio e instalar las dependencias del proyecto:

```bash
git clone https://github.com/dalton-isaac/Billetera-Caja-Chica.git
cd Billetera-Caja-Chica
npm install
```

### Comandos de Ejecución

| Comando | Descripción |
| :--- | :--- |
| `npm run dev` | Inicia el servidor de desarrollo local con recarga rápida (HMR). |
| `npm test` | Ejecuta la suite de pruebas automatizadas con Vitest (128 tests). |
| `npm run build` | Valida TypeScript (`tsc -b`) y compila los bundles minificados para producción en `dist/`. |
| `npm run preview` | Levanta un servidor local sirviendo la versión compilada de producción en `dist/`. |

---

## 📄 Licencia

Este proyecto está desarrollado bajo la licencia MIT. Diseñado para optimizar la logística y el bienestar financiero de los mensajeros en Ecuador.
