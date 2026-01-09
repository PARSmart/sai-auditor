# Product Requirements Document (PRD)
## Sistema de Auditoría de Inventario de Equipos Arrendados

**Proyecto**: Auditor de Equipos - Alimentación para el Bienestar
**Regional**: Occidente
**Fecha**: 8 de Enero de 2026
**Versión**: 1.2
**Autor**: Jefe de Informática Regional Occidente / Antigravity AI

---

## 1. Resumen Ejecutivo

### 1.1 Contexto del Negocio
Alimentación para el Bienestar (anteriormente DICONSA) - Regional Occidente requiere validar el inventario de equipos de cómputo arrendados distribuidos en 10 almacenes rurales en Jalisco y Colima.

### 1.2 Problema a Resolver
**Situación Actual**:
- No existe un sistema centralizado para validar inventario de equipos arrendados
- La validación manual es propensa a errores de transcripción (confusión de caracteres: O vs 0, I vs 1)
- No hay evidencia fotográfica del estado físico de los equipos
- Proceso lento y manual que requiere visitas físicas a cada almacén

**Impacto del Problema**:
- Riesgo de pérdida o mal registro de activos arrendados
- Imposibilidad de validar el estado físico de los equipos de forma remota
- Dificultad para auditar y cruzar información con resguardos físicos
- Falta de trazabilidad sobre qué usuario tiene qué equipo

### 1.3 Solución Propuesta
Aplicación web progresiva (PWA) que permite a los usuarios:
1. **Autenticarse** con su número de expediente/empleado
2. **Seleccionar** el tipo de equipo que tienen (Laptop, Escritorio, Multifuncional)
3. **Escanear** códigos QR/Barras de los equipos usando la cámara del móvil
4. **Fotografiar** evidencia visual de cada componente del kit
5. **Agregar observaciones** sobre el estado físico
6. **Enviar** toda la información a un sistema centralizado

**Procesamiento Posterior**:
- Orquestador de IA (Gemini SDK) procesa las fotos con etiquetas ilegibles usando OCR
- Sistema genera reporte de discrepancias (equipos faltantes, sobrantes, mal asignados)
- Administrador cruza información con Excel maestro de inventario

### 1.4 Objetivos del Proyecto

**Objetivos de Negocio**:
- ✅ Validar 100% del inventario de equipos arrendados en Regional Occidente
- ✅ Reducir tiempo de auditoría de semanas a días
- ✅ Obtener evidencia fotográfica del estado de todos los equipos
- ✅ Identificar discrepancias entre inventario teórico y real
- ✅ Evaluar honestidad de usuarios comparando capturas vs resguardos físicos

**Objetivos Técnicos**:
- ✅ Aplicación usable para personal con escolaridad hasta secundaria
- ✅ Funcional en dispositivos móviles (cámara trasera para fotos claras)
- ✅ Costo de operación: $0/mes (planes gratuitos de Supabase + Vercel + Drive)
- ✅ Tiempo de captura por usuario: < 5 minutos
- ✅ Procesamiento automatizado con IA para equipos con etiquetas dañadas

---

## 2. Alcance del Proyecto

### 2.1 En Alcance (MVP - Fase 1)

#### Funcionalidades de Usuario Final
1. **Autenticación Simple**
   - Login con número de expediente/empleado
   - Sin contraseñas (matching con base de datos de empleados)
   - Confirmación visual: "¿Eres [NOMBRE] de [ADSCRIPCIÓN]?"

2. **Selección de Tipo de Equipo**
   - 3 opciones: 💻 Laptop, 🖥️ Escritorio, 🖨️ Multifuncional
   - Interfaz con botones grandes y claros

3. **Captura Guiada (Wizard)**
   - **Paso 1 - Escaneo**: Activación de cámara en modo escáner de QR/Barras
   - **Paso 2 - Fotografías**: Captura de fotos según tipo de equipo:
     - Laptop: 3 fotos (Pantalla, Periféricos [teclado/mouse], Docking Station/Candado)
     - Escritorio: 2 fotos (Equipo completo con monitor, UPS)
     - Multifuncional: 1 foto (Equipo completo)
   - **Paso 3 - Observaciones**: Campo de texto libre para reportar estado
   - **Fallback**: Si código es ilegible, permitir entrada manual + checkbox "Etiqueta dañada"

4. **Sincronización**
   - Subida automática de fotos a Google Drive (invisible para el usuario)
   - Guardado de metadata en Supabase
   - Confirmación visual: "✅ Equipo registrado exitosamente"

#### Funcionalidades de Administración (Fase 1)
1. **Dashboard de Progreso**
   - Visualizar % de capturas completadas por almacén
   - Listar equipos capturados vs equipos esperados

2. **Reporte de Discrepancias**
   - Equipos no registrados (faltantes)
   - Equipos registrados no asignados (sobrantes)
   - Equipos con etiquetas ilegibles (requieren OCR con IA)

3. **Procesamiento con IA (Script Independiente)**
   - Orquestador que lee capturas de Supabase
   - Procesa fotos con etiquetas dañadas usando Gemini OCR
   - Genera reporte en Excel/CSV con resultados del cruce

### 2.2 Fuera de Alcance (Futuras Fases)

#### Fase 2 (Opcional):
- Edición de inventario maestro desde la app
- Notificaciones push a usuarios que no han capturado
- Generación automática de resguardos digitales firmados
- Integración con sistema ERP de la empresa
- Reportes avanzados con gráficas y métricas

#### No Considerado:
- Aplicación móvil nativa (iOS/Android) - La PWA es suficiente
- Sistema de tickets/soporte dentro de la app
- Gestión de mantenimientos de equipos
- Control de préstamos de equipos

---

## 3. Usuarios y Stakeholders

### 3.1 Perfil de Usuarios

#### Usuario Primario: Personal Operativo (Capturistas)
| Característica | Descripción |
|---|---|
| **Rol** | Jefe de Almacén, Subjefe, Administrativo, Capturista |
| **Cantidad** | ~40-50 usuarios distribuidos en 10 almacenes |
| **Ubicación** | Almacenes rurales en Jalisco y Colima |
| **Escolaridad** | Secundaria (promedio) |
| **Habilidades Técnicas** | Básicas - Uso de WhatsApp y apps sencillas |
| **Dispositivos** | Smartphones personales (Android/iOS) |
| **Conectividad** | Estable con redundancia de red (según usuario) |
| **Necesidades** | Interfaz extremadamente simple, botones grandes, lenguaje claro |

**Caso de Uso Principal**:
> "Como jefe de almacén, quiero registrar mis equipos rápidamente desde mi celular sin necesidad de escribir números de serie complicados, para cumplir con la auditoría sin errores."

#### Usuario Secundario: Administrador/Jefe de Informática
| Característica | Descripción |
|---|---|
| **Rol** | Jefe de Informática Regional Occidente |
| **Cantidad** | 1 usuario |
| **Responsabilidades** | Configurar sistema, lanzar auditorías, analizar reportes, validar inventario |
| **Habilidades Técnicas** | Avanzadas - Manejo de BD, scripts, análisis de datos |
| **Necesidades** | Herramientas de exportación, scripts de procesamiento IA, dashboards de progreso |

**Caso de Uso Principal**:
> "Como jefe de informática, quiero cruzar automáticamente las capturas de usuarios con mi inventario maestro, para identificar equipos faltantes o mal asignados sin revisión manual."

### 3.2 Stakeholders Clave
- **Dirección Regional Occidente**: Aprueba presupuesto y valida cumplimiento de auditorías
- **Equipo de Soporte (Jefe de Informática)**: Implementa, mantiene y da soporte al sistema
- **Personal de Almacenes**: Usa la aplicación para registrar equipos

---

## 4. Requisitos Funcionales

### RF-01: Autenticación de Usuario
**Prioridad**: ALTA
**Historia de Usuario**: Como usuario, quiero ingresar con mi número de expediente para acceder sin recordar contraseñas.

**Criterios de Aceptación**:
- Sistema acepta número de expediente (ej. 679, 1234)
- Busca en tabla `empleados` de Supabase
- Si existe: Muestra modal "¿Eres [NOMBRE COMPLETO] de [ADSCRIPCIÓN]?"
  - Botones: [Sí, continuar] / [No, corregir]
- Si no existe: Mensaje "Expediente no encontrado. Verifica con tu supervisor."
- Sesión se mantiene en `localStorage` para no pedir expediente en cada captura del mismo día

**Mockup de Pantalla**:
```
┌─────────────────────────────────┐
│  🏢 Auditoría de Equipos        │
│                                 │
│  Ingresa tu Número de Expediente│
│  ┌───────────────────────────┐ │
│  │         679               │ │
│  └───────────────────────────┘ │
│                                 │
│  ┌─────────────────────────────┐│
│  │     CONTINUAR ➡️            ││
│  └─────────────────────────────┘│
└─────────────────────────────────┘
```

---

### RF-02: Selección de Tipo de Equipo
**Prioridad**: ALTA
**Historia de Usuario**: Como usuario, quiero seleccionar el tipo de equipo que tengo para que la app me pida las fotos correctas.

**Criterios de Aceptación**:
- Pantalla muestra 3 botones grandes con iconos:
  - 💻 Laptop (Kit completo: monitor, teclado, mouse, docking, candado)
  - 🖥️ Escritorio (CPU + Monitor + UPS)
  - 🖨️ Multifuncional
- Al seleccionar, avanza automáticamente a pantalla de escaneo
- Usuario puede regresar con botón "⬅️ Atrás" sin perder la sesión

**Lógica de Navegación**:
```
Login → Selección de Equipo → Escaneo QR/Barras → Captura de Fotos → Observaciones → Confirmación
```

---

### RF-03: Escaneo de Códigos QR/Barras
**Prioridad**: ALTA
**Historia de Usuario**: Como usuario, quiero escanear el código de barras del equipo con la cámara para evitar errores al escribir.

**Criterios de Aceptación**:
- Activa cámara trasera del dispositivo en modo escáner
- Soporta formatos: Code-128, Code-39, QR Code (común en etiquetas de activos)
- Al detectar código:
  - Sonido/vibración de confirmación
  - Muestra código en pantalla: "✅ Serie detectada: 2N7TR83"
  - Realiza consulta inmediata a `inventario_maestro`
  - Botón "Confirmar" / "Escanear de nuevo"
- **Validación Inmediata**:
  - Si el serial existe en BD: Muestra "✅ Encontrado: [Descripción del Equipo]".
  - Si no existe: Muestra "⚠️ No registrado en BD (Se permitirá continuar)".
- **Fallback**:
  - Botón "❌ Etiqueta ilegible / No tiene código"
  - Abre input manual: "Ingresa serie manualmente o déjalo en blanco"
  - Checkbox: "☐ Etiqueta dañada (procesar con IA después)"

**Tecnología**: html5-qrcode library (modo Pro para cámara trasera)

**Ejemplo de Código (Integración)**:
```typescript
const scanner = new Html5Qrcode("scanner-container");

scanner.start(
  { facingMode: "environment" }, // Cámara trasera
  { fps: 10, qrbox: { width: 250, height: 250 } },
  (decodedText) => {
    // Guardar serie escaneada
    setSerialNumber(decodedText);
    playSuccessSound();
  },
  (error) => {
    // Ignorar errores de escaneo continuo
  }
);
```

---

### RF-04: Captura de Evidencia Fotográfica
**Prioridad**: ALTA
**Historia de Usuario**: Como usuario, quiero que la app me guíe para tomar las fotos necesarias sin confundirme.

**Criterios de Aceptación**:
- Sistema presenta carrusel/wizard según tipo de equipo:

#### Laptop (3 fotos):
```
Foto 1: 📸 "Toma foto de la PANTALLA del equipo encendido"
Foto 2: 📸 "Toma foto del TECLADO y MOUSE"
Foto 3: 📸 "Toma foto del DOCKING STATION y CANDADO"
```

#### Escritorio (2 fotos):
```
Foto 1: 📸 "Toma foto del EQUIPO COMPLETO (CPU y Monitor)"
Foto 2: 📸 "Toma foto del UPS (No-break)"
```

#### Multifuncional (1 foto):
```
Foto 1: 📸 "Toma foto de la MULTIFUNCIONAL completa"
```

- Cada foto permite:
  - ✅ "Usar esta foto"
  - 🔄 "Tomar de nuevo"
- Progreso visual: "Foto 2 de 3" (barra de progreso)
- Compresión en cliente antes de subir (reducir tamaño a max 2MB por foto)

---

### RF-05: Observaciones y Estado del Equipo
**Prioridad**: MEDIA
**Historia de Usuario**: Como usuario, quiero agregar observaciones sobre el estado físico del equipo para reportar daños o faltantes.

**Criterios de Aceptación**:
- Campo de texto libre: "Observaciones (opcional)"
- Placeholder: "Ej. Pantalla con rayón, teclado sucio, falta mouse, etc."
- Max 500 caracteres
- Checkbox: "☐ Equipo en buen estado" (desmarcado por defecto)
- Si checkbox marcado y hay observaciones, sistema pide confirmación

---

### RF-06: Guardado y Sincronización
**Prioridad**: ALTA
**Historia de Usuario**: Como usuario, quiero que mis fotos se guarden automáticamente para no perder mi trabajo.

**Criterios de Aceptación**:
- Al hacer clic en "Guardar y Enviar":
  1. Loading spinner: "Subiendo fotos a Drive..." (barra de progreso real)
  2. Fotos se suben a Google Drive con nomenclatura:
     ```
     /Fotos Inventario 2026/
       └─ [ALMACEN/AREA]/
          └─ [EXPEDIENTE] - [NOMBRE]/
             ├─ JAL-679-LAPTOP-01_pantalla.jpg
             ├─ JAL-679-LAPTOP-01_perifericos.jpg
             └─ JAL-679-LAPTOP-01_completo.jpg
     ```
  3. Metadata se guarda en Supabase tabla `capturas`:
     ```sql
     INSERT INTO capturas (
       expediente_usuario,
       tipo_equipo,
       serial_escaneado,
       serial_manual,
       etiqueta_legible,
       fotos_urls,  -- JSON array de URLs de Drive
       observaciones,
       created_at
     )
     ```
  4. Pantalla de confirmación: "✅ Equipo registrado exitosamente"
  5. Botón: "Registrar otro equipo" / "Salir"

**Manejo de Errores**:
- Si falla subida a Drive: Mensaje "Error al subir fotos. Verifica tu conexión."
- Fotos se guardan en IndexedDB local como backup
- Botón "Reintentar subida"

---

### RF-07: Dashboard de Administración
**Prioridad**: MEDIA
**Historia de Usuario**: Como administrador, quiero ver el progreso de capturas por almacén.

**Criterios de Aceptación**:
- Tabla con columnas:
  | Almacén | Usuarios | Equipos Esperados | Equipos Capturados | % Completado |
  |---------|----------|-------------------|-------------------|--------------|
  | ALM-VALLARTA | 5 | 15 | 12 | 80% |
  | ALM-COLIMA | 4 | 12 | 5 | 42% |

- Filtros:
  - Por estado: Solo almacenes rurales
  - Por % completado: < 50%, 50-80%, > 80%

- Botón: "Exportar reporte CSV"

---

### RF-08: Reporte de Discrepancias
**Prioridad**: ALTA
**Historia de Usuario**: Como administrador, quiero ver equipos faltantes o sobrantes para investigar.

**Criterios de Aceptación**:
- Compara tabla `capturas` vs Excel maestro de inventario
- Genera 3 listas:
  1. **Faltantes**: Equipos en inventario maestro NO capturados
     ```
     SERIE: 2N7TR83 | ASIGNADO A: Juan Pérez | ALMACÉN: Vallarta
     Estado: NO REGISTRADO
     ```
  2. **Sobrantes**: Equipos capturados NO en inventario maestro
     ```
     SERIE: XYZ123 | CAPTURADO POR: María López | ALMACÉN: Colima
     Estado: NO APARECE EN INVENTARIO
     ```
  3. **Con etiqueta ilegible**: Requieren procesamiento con IA
     ```
     EXPEDIENTE: 679 | TIPO: Laptop | FOTOS: [url1, url2, url3]
     Estado: PENDIENTE OCR
     ```

- Botón: "Procesar con IA" → Lanza script de orquestador

---

### RF-09: Validación Cruzada de Tipos (Anti-Error)
**Prioridad**: CRÍTICA
**Historia de Usuario**: Como administrador, quiero evitar que los usuarios registren un Mouse escaneando un código de Monitor por error.

**Criterios de Aceptación**:
- El sistema debe conocer las "Palabras Clave" asociadas a cada tipo de componente (ej. Monitor -> ['MONITOR', 'DISPLAY']).
- Al validar un serial que **SÍ EXISTE** en `inventario_maestro`:
  - Compara el campo `tipo_equipo` de la BD contra las keywords del componente seleccionado.
  - **Coincidencia (Match)**: Permite continuar (Estado: CAPTURED).
  - **No Coincidencia (Mismatch)**: 
    - Bloquea el avance.
    - Muestra alerta roja: "⛔ TIPO INCORRECTO. El serial pertenece a [TIPO_BD] pero estás capturando [TIPO_SELECCIONADO]".
    - Botón obligatorio: "⬅️ Retornar y corregir".
- **Lógica Fail-Open**: Si el serial **NO EXISTE** en BD, se ignora la validación de tipo y se permite continuar con advertencia (Estado: NOT_FOUND_DB).

---

## 5. Requisitos No Funcionales

### RNF-01: Usabilidad
- **Tiempo de capacitación**: < 10 minutos por usuario (tutorial en video corto)
- **Tamaño de botones**: Mínimo 48x48px (estándar mobile)
- **Contraste de colores**: WCAG AA (accesibilidad para baja visión)
- **Idioma**: 100% español con vocabulario sencillo (evitar tecnicismos)

### RNF-02: Performance
- **Tiempo de carga inicial**: < 3 segundos en 4G
- **Tiempo de escaneo**: < 2 segundos para detectar código
- **Tiempo de subida de fotos**: < 30 segundos para 3 fotos (2MB cada una)
- **Procesamiento con IA**: < 5 minutos para lote de 100 equipos

### RNF-03: Escalabilidad
- **Usuarios concurrentes**: 50 usuarios simultáneos
- **Fotos totales**: ~1,500 fotos (50 usuarios x 30 equipos promedio)
- **Almacenamiento Drive**: ~3 GB (2MB x 1,500 fotos)
- **Base de datos**: Plan gratuito de Supabase soporta hasta 500MB (suficiente para metadata)

### RNF-04: Seguridad
- **Autenticación**: Sin contraseñas (matching por número de expediente)
- **Autorización**: Solo usuarios en base de datos pueden acceder
- **Datos sensibles**: No se almacenan credenciales ni datos financieros
- **HTTPS**: Obligatorio en producción (Vercel lo provee por defecto)

### RNF-05: Compatibilidad
- **Navegadores**: Chrome, Safari, Firefox (últimas 2 versiones)
- **Dispositivos**: iOS 14+, Android 8+ (95% de dispositivos en México)
- **Orientación**: Vertical (portrait) - bloqueada para evitar confusión

### RNF-06: Disponibilidad
- **Uptime**: 99% (Vercel + Supabase tienen SLA de 99.9%)
- **Backup**: Fotos en Google Drive (redundancia automática), BD con backup diario automático de Supabase

---

## 6. Supuestos y Restricciones

### Supuestos
1. ✅ Todos los usuarios tienen smartphone con cámara funcional
2. ✅ Los equipos tienen etiquetas con códigos QR o de barras (o al menos número de serie visible)
3. ✅ La conectividad en almacenes rurales es estable (confirmado por usuario)
4. ✅ El administrador tiene cuenta de Google con 2TB de almacenamiento disponible
5. ✅ Los usuarios tomarán fotos con calidad suficiente para OCR (si es necesario)
6. ✅ El Excel maestro de inventario es la fuente de verdad

### Restricciones
1. ❌ Presupuesto: $0/mes (planes gratuitos únicamente)
2. ❌ Tiempo de implementación: MVP en 3-4 semanas
3. ❌ No se puede instalar apps nativas (solo PWA web)
4. ❌ No hay equipo de QA dedicado (testing manual por el administrador)
5. ❌ La aplicación debe funcionar offline para captura local (futuro, no MVP)

---

## 7. Tecnologías y Stack Técnico

### Frontend
- **Framework**: Next.js 14+ (Pages Router por simplicidad)
- **Lenguaje**: TypeScript
- **UI**: Tailwind CSS (responsive mobile-first)
- **Escaneo**: html5-qrcode (soporte QR + Barcode)
- **Cámara**: MediaDevices API (Web API nativa)
- **Estado**: React Context API (simple, sin sobrecarga)

### Backend
- **Platform**: Vercel (hosting + serverless functions)
- **API Routes**: Next.js API Routes para subir fotos a Drive
- **Base de Datos**: Supabase PostgreSQL
- **Autenticación**: Matching simple contra tabla `empleados` (sin Supabase Auth)

### Servicios Externos
- **Storage**: Google Drive (con Service Account)
- **IA/OCR**: Gemini 2.5 Flash (procesamiento posterior de fotos)
- **Orquestador**: Script Node.js independiente (ejecutado manualmente por admin)

### DevOps
- **Control de versiones**: Git + GitHub
- **CI/CD**: Vercel (deploy automático en push a `main`)
- **Monitoring**: Vercel Analytics + Supabase Dashboard

---

## 8. Métricas de Éxito

### Métricas de Adopción
- ✅ 100% de usuarios completan tutorial inicial
- ✅ 90% de usuarios registran todos sus equipos en < 1 semana
- ✅ < 5% de usuarios solicitan soporte técnico

### Métricas de Calidad de Datos
- ✅ < 10% de equipos con etiquetas ilegibles (requieren OCR)
- ✅ 95% de series escaneadas coinciden con inventario maestro
- ✅ 100% de equipos tienen al menos 1 foto de evidencia

### Métricas de Eficiencia
- ✅ Tiempo promedio de captura: < 5 minutos por usuario
- ✅ Reducción de tiempo total de auditoría: de semanas a días
- ✅ 0 errores de transcripción (gracias al escaneo)

### Métricas Técnicas
- ✅ 99% uptime del sistema
- ✅ < 2 segundos de carga de página
- ✅ 0 fotos perdidas (todas en Drive)

---

## 9. Riesgos y Mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| **Usuarios no saben usar la app** | Media | Alto | Tutorial en video corto + botones grandes + lenguaje simple |
| **Códigos de barras dañados/ilegibles** | Alta | Medio | Fallback a entrada manual + OCR con Gemini para fotos |
| **Fotos de mala calidad** | Media | Medio | Validación en cliente (min 800x600px) + instrucciones claras |
| **Plan gratuito de Supabase se llena** | Baja | Medio | Monitoreo de uso + fotos en Drive (no en Supabase) |
| **Service Account de Drive comprometido** | Baja | Alto | Archivo JSON nunca en repo + variables de entorno + permisos mínimos |
| **Conectividad falla durante captura** | Baja | Medio | Fotos en IndexedDB local + retry automático |
| **Excel maestro desactualizado** | Media | Alto | Proceso de validación pre-auditoría + fecha de última actualización visible |

---

## 10. Plan de Rollout

### Fase 1: Piloto (Semana 1)
- Desplegar app en Vercel (URL de prueba)
- Probar con 2 almacenes (10 usuarios)
- Recolectar feedback y ajustar UX
- Validar funcionamiento de escaneo y subida de fotos

### Fase 2: Rollout Gradual (Semana 2-3)
- Capacitar a jefes de almacén (video tutorial)
- Activar para 5 almacenes adicionales
- Soporte activo por WhatsApp
- Monitoreo diario de progreso

### Fase 3: Rollout Completo (Semana 4)
- Activar para los 3 almacenes restantes
- Procesamiento con IA de equipos con etiquetas ilegibles
- Generación de reporte final de discrepancias
- Entrega de resultados a Dirección Regional

---

## 11. Apéndices

### Apéndice A: Glosario
- **Expediente**: Número de empleado único
- **Adscripción**: Almacén/área al que pertenece el empleado
- **Kit**: Conjunto completo de componentes de un equipo (ej. laptop + teclado + mouse + docking)
- **TAG**: Identificador único generado automáticamente (ej. JAL-679-LAPTOP-01)
- **Service Account**: Cuenta de Google que pertenece a la aplicación, no a un usuario humano
- **OCR**: Reconocimiento Óptico de Caracteres (extraer texto de imágenes)

### Apéndice B: Referencias
- Documentación Supabase: https://supabase.com/docs
- Documentación html5-qrcode: https://scanapp.org/html5-qrcode-docs/
- Documentación Google Drive API: https://developers.google.com/drive/api/guides/about-sdk
- Documentación Gemini SDK: https://ai.google.dev/gemini-api/docs

---

**Aprobaciones Requeridas**:
- [ ] Jefe de Informática Regional Occidente
- [ ] Dirección Regional Occidente

**Fecha de Aprobación**: __________________

**Firma**: __________________
