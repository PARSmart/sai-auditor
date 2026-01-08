# Arquitectura Técnica del Sistema
## Auditor de Equipos - Alimentación para el Bienestar

**Fecha**: 6 de Enero de 2026
**Versión**: 1.0
**Estado**: Diseño Aprobado

---

## 1. Visión General de la Arquitectura

### 1.1 Principios Arquitectónicos

El sistema sigue los siguientes principios fundamentales:

1. **Simplicidad sobre Complejidad**: Diseño minimalista que prioriza facilidad de uso
2. **Costo Cero**: Uso exclusivo de planes gratuitos (Supabase, Vercel)
3. **Mobile-First**: Optimizado para dispositivos móviles con pantallas pequeñas
4. **Procesamiento Diferido**: IA procesa datos en lote, no en tiempo real
5. **Defense in Depth**: Múltiples capas de validación (cliente, servidor, base de datos)
6. **Offline-Capable** (Futuro): Capacidad de trabajo sin conexión

### 1.2 Diagrama de Arquitectura de Alto Nivel

```
┌─────────────────────────────────────────────────────────────────┐
│                    USUARIOS FINALES (Personal de Almacenes)       │
│                    📱 Smartphones (Android/iOS)                  │
└────────────┬────────────────────────────────────────────────────┘
             │
             │ HTTPS
             ▼
┌────────────────────────────────────────────────────────────────┐
│                       VERCEL EDGE NETWORK                        │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │              NEXT.JS APPLICATION (SSR + CSR)              │ │
│  │                                                           │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐ │ │
│  │  │  Login   │  │Selección │  │ Escaneo  │  │  Fotos   │ │ │
│  │  │  Page    │  │  Equipo  │  │  QR/Bar  │  │  Upload  │ │ │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘ │ │
│  │                                                           │ │
│  │  ┌───────────────────────────────────────────────────┐   │ │
│  │  │     API ROUTES (Serverless Functions)            │   │ │
│  │  │  /api/upload-foto   /api/validate-expediente     │   │ │
│  │  └───────────────────────────────────────────────────┘   │ │
│  └───────────────────────────────────────────────────────────┘ │
└────────────┬───────────────────────────────┬────────────────────┘
             │                               │
             │ PostgreSQL                    │ Supabase Storage API
             │ Client SDK                    │ (Client SDK)
             ▼                               ▼
┌────────────────────────┐    ┌────────────────────────────────┐
│   SUPABASE CLOUD       │    │   SUPABASE STORAGE             │
│ ┌────────────────────┐ │    │ ┌────────────────────────────┐ │
│ │  PostgreSQL 15     │ │    │ │  Bucket: evidencias        │ │
│ │  - empleados       │ │    │ │    ├─ 2026/                │ │
│ │  - inventario_     │ │    │ │    │  └─ ALM-VALLARTA/     │ │
│ │    maestro         │ │    │ │    │     └─ 679-JPEREZ/    │ │
│ │  - capturas        │ │    │ │    │        ├─ foto1.jpg   │ │
│ │  - capturas_fotos  │ │    │ │    │        └─ foto2.jpg   │ │
│ └────────────────────┘ │    │ └────────────────────────────┘ │
│ ┌────────────────────┐ │    │                                │
│ │  Row Level         │ │    │                                │
│ │  Security (RLS)    │ │    │                                │
│ │  - Políticas       │ │    │                                │
│ └────────────────────┘ │    │                                │
└────────────────────────┘    └────────────────────────────────┘└────────────────────────┘    ┌────────────────────────────────┐
                              │   ORQUESTADOR IA (Offline)     │
                              │ ┌────────────────────────────┐ │
     ⬅ REPORTE              │ │  Gemini 2.5 Flash OCR      │ │
        (CSV/Excel)           │ │  - Procesa etiquetas       │ │
                              │ │    ilegibles               │ │
                              │ │  - Cruza con inventario    │ │
                              │ │  - Genera discrepancias    │ │
                              │ └────────────────────────────┘ │
                              └────────────────────────────────┘
                                      ▲
                                      │ (Script Node.js ejecutado
                                      │  manualmente por admin)
```

---

## 2. Stack Tecnológico Detallado

### 2.1 Frontend

| Componente | Tecnología | Versión | Justificación |
|------------|------------|---------|---------------|
| **Framework** | Next.js (Pages Router) | 14.2+ | SSR + CSR, SEO, API Routes integradas |
| **Lenguaje** | TypeScript | 5.3+ | Type safety, mejor DX, menos bugs |
| **UI Framework** | Tailwind CSS | 3.4+ | Utility-first, mobile-first, customizable |
| **Escaneo QR/Barras** | html5-qrcode | 2.3+ | Soporte cross-browser, cámara trasera |
| **Estado Global** | React Context API | (React 18) | Simple, sin dependencias externas |
| **HTTP Client** | Supabase JS Client | 2.39+ | Integración nativa con Supabase |
| **Compresión de Imágenes** | browser-image-compression | 2.0+ | Reduce tamaño antes de subir |

**Justificación del Pages Router**:
- ✅ Más estable que App Router (menos bugs)
- ✅ Patrón familiar para equipo (SSG + SSR)
- ✅ Menor curva de aprendizaje
- ✅ Suficiente para las necesidades del proyecto

### 2.2 Backend

| Componente | Tecnología | Versión | Justificación |
|------------|------------|---------|---------------|
| **Hosting** | Vercel | - | Deploy automático, HTTPS gratis, Edge Network |
| **API Functions** | Next.js API Routes | - | Serverless, auto-scaling, 0 config |
| **Base de Datos** | Supabase PostgreSQL | 15 | Managed, RLS integrado, plan gratuito generoso |
| **ORM/Client** | Supabase JS SDK | 2.39+ | Type-safe, auto-generated types |
| **Storage** | Supabase Storage | - | Integración nativa, fácil uso, RLS |

**Justificación de Cambio a Supabase Storage**:
- ❌ Google Drive Service Account tiene limitaciones de cuota (0GB) en cuentas gratuitas.
- ✅ Supabase Storage funciona "out of the box" con el plan gratuito.
- ✅ Menor complejidad de autenticación (mismo cliente JS).

### 2.3 Inteligencia Artificial (Procesamiento Posterior)

| Componente | Tecnología | Versión | Justificación |
|------------|------------|---------|---------------|
| **OCR / Vision** | Gemini 2.5 Flash | - | Multimodal, rápido, económico |
| **SDK** | @google/generative-ai | 0.2+ | Oficial de Google, bien documentado |
| **Orquestador** | Node.js Script | 20+ | Ejecutado manualmente por admin |
| **Prompting** | Structured Output | - | Garantiza JSON válido de respuestas |

**Estrategia de Procesamiento**:
```
1. Admin ejecuta: node scripts/procesar-inventario.js
2. Script lee capturas con etiqueta_legible = false
3. Para cada foto:
   - Descarga de Google Drive
   - Envía a Gemini Vision con prompt estructurado
   - Extrae: SERIAL, MARCA, MODELO
   - Valida formato (ej. serial debe ser alfanumérico)
4. Cruza con inventario maestro
5. Genera reporte CSV con discrepancias
```

### 2.4 DevOps y Monitoreo

| Componente | Herramienta | Plan | Propósito |
|------------|-------------|------|-----------|
| **CI/CD** | Vercel Git Integration | Gratuito | Deploy automático en push a main |
| **Monitoring** | Vercel Analytics | Gratuito | Core Web Vitals, errores |
| **Logs** | Vercel Logs | Gratuito | Debugging de API Routes |
| **Database Monitoring** | Supabase Dashboard | Gratuito | Queries lentas, uso de recursos |
| **Errors** | Console logs | - | Captura en frontend con try/catch |

---

## 3. Modelo de Datos (Base de Datos Supabase)

### 3.1 Esquema de Tablas

#### Tabla: `empleados`
**Propósito**: Catálogo de personal autorizado para usar la aplicación

| Columna | Tipo | Constraints | Descripción |
|---------|------|-------------|-------------|
| `expediente` | INTEGER | PRIMARY KEY | Número de empleado único (ej. 679, 11727) |
| `nombre_completo` | VARCHAR(200) | NOT NULL | Nombre completo del empleado |
| `area_nombre` | VARCHAR(100) | NOT NULL | Almacén/área de adscripción (ej. CONTABILIDAD, JALISCO (PAL)) |
| `descripcion_puesto` | VARCHAR(200) | - | Puesto del empleado |
| `tipo_plaza` | VARCHAR(50) | - | CONFIANZA o SINDICALIZADO |
| `activo` | BOOLEAN | DEFAULT true | Si el empleado está activo |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | Fecha de creación |
| `updated_at` | TIMESTAMPTZ | DEFAULT now() | Fecha de última actualización |

**Índices**:
```sql
CREATE INDEX idx_empleados_area ON empleados(area_nombre);
CREATE INDEX idx_empleados_activo ON empleados(activo) WHERE activo = true;
```

---

#### Tabla: `inventario_maestro`
**Propósito**: Inventario de equipos arrendados (importado desde Excel)

| Columna | Tipo | Constraints | Descripción |
|---------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | ID único generado |
| `unidad_operativa` | VARCHAR(100) | NOT NULL | Ej. UNIDAD OPERATIVA JALISCO |
| `proveedor` | VARCHAR(200) | - | Ej. FOCUS ON SERVICES, S.A. DE C.V. |
| `serial` | VARCHAR(100) | NOT NULL, UNIQUE | Número de serie del componente (CLAVE) |
| `marca` | VARCHAR(50) | - | Ej. DELL, KYOCERA, KENSINGTON |
| `modelo` | VARCHAR(100) | - | Ej. Latitude 3420, P2319H |
| `tipo_equipo` | VARCHAR(100) | - | Ej. L2_Equipo Portatil Avanzado, MULTIFUNCIONAL |
| `observaciones` | TEXT | - | Observaciones del inventario maestro |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | Fecha de importación |
| `updated_at` | TIMESTAMPTZ | DEFAULT now() | Fecha de última actualización |

**Índices**:
```sql
CREATE UNIQUE INDEX idx_inventario_serial ON inventario_maestro(serial);
CREATE INDEX idx_inventario_tipo ON inventario_maestro(tipo_equipo);
CREATE INDEX idx_inventario_unidad ON inventario_maestro(unidad_operativa);
```

**Nota Importante**:
El inventario actual NO tiene columna de USUARIO/RESGUARDANTE. Cada componente (monitor, laptop, candado) tiene su propio SERIAL. El sistema permitirá que los usuarios registren los componentes que tienen, y el cruce posterior identificará discrepancias.

---

#### Tabla: `capturas`
**Propósito**: Registros de equipos capturados por usuarios

| Columna | Tipo | Constraints | Descripción |
|---------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | ID único de la captura |
| `expediente_usuario` | INTEGER | FOREIGN KEY → empleados(expediente), NOT NULL | Quién capturó |
| `tipo_equipo_capturado` | VARCHAR(50) | NOT NULL | laptop, escritorio, multifuncional |
| `serial_escaneado` | VARCHAR(100) | - | Serie obtenida del escaneo QR/Barras |
| `serial_manual` | VARCHAR(100) | - | Serie ingresada manualmente (fallback) |
| `etiqueta_legible` | BOOLEAN | NOT NULL | true si se pudo escanear, false si requiere OCR |
| `observaciones` | TEXT | - | Comentarios del usuario sobre estado |
| `equipo_buen_estado` | BOOLEAN | DEFAULT false | Checkbox "Equipo en buen estado" |
| `tag_generado` | VARCHAR(100) | UNIQUE | TAG auto-generado (ej. JAL-679-LAPTOP-01) |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | Fecha de captura |

**Índices**:
```sql
CREATE INDEX idx_capturas_expediente ON capturas(expediente_usuario);
CREATE INDEX idx_capturas_etiqueta ON capturas(etiqueta_legible) WHERE etiqueta_legible = false;
CREATE INDEX idx_capturas_tag ON capturas(tag_generado);
```

**Relaciones**:
```sql
ALTER TABLE capturas
ADD CONSTRAINT fk_capturas_empleado
FOREIGN KEY (expediente_usuario)
REFERENCES empleados(expediente)
ON DELETE CASCADE;
```

---

#### Tabla: `capturas_fotos`
**Propósito**: URLs de fotos subidas a Google Drive asociadas a cada captura

| Columna | Tipo | Constraints | Descripción |
|---------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | ID único de la foto |
| `captura_id` | UUID | FOREIGN KEY → capturas(id), NOT NULL | Captura asociada |
| `orden` | INTEGER | NOT NULL | Orden de la foto (1, 2, 3) |
| `tipo_foto` | VARCHAR(50) | NOT NULL | pantalla, perifericos, docking, ups, completo |
| `url_drive` | TEXT | NOT NULL | URL completa de la foto en Drive |
| `drive_file_id` | VARCHAR(100) | - | ID del archivo en Drive (para eliminación) |
| `tamano_bytes` | BIGINT | - | Tamaño del archivo en bytes |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | Fecha de subida |

**Índices**:
```sql
CREATE INDEX idx_fotos_captura ON capturas_fotos(captura_id);
CREATE INDEX idx_fotos_tipo ON capturas_fotos(tipo_foto);
```

**Relaciones**:
```sql
ALTER TABLE capturas_fotos
ADD CONSTRAINT fk_fotos_captura
FOREIGN KEY (captura_id)
REFERENCES capturas(id)
ON DELETE CASCADE;
```

---

### 3.2 Diagrama Entidad-Relación

```
┌─────────────────┐
│   empleados     │
├─────────────────┤
│ expediente (PK) │───┐
│ nombre_completo │   │
│ area_nombre     │   │ 1
│ activo          │   │
└─────────────────┘   │
                      │
                      │
                      │ N
┌─────────────────────▼─────────┐
│        capturas               │
├───────────────────────────────┤
│ id (PK)                       │───┐
│ expediente_usuario (FK)       │   │
│ tipo_equipo_capturado         │   │ 1
│ serial_escaneado              │   │
│ serial_manual                 │   │
│ etiqueta_legible              │   │
│ tag_generado (UNIQUE)         │   │
└───────────────────────────────┘   │
                                    │
                                    │
                                    │ N
                      ┌─────────────▼─────────────┐
                      │    capturas_fotos         │
                      ├───────────────────────────┤
                      │ id (PK)                   │
                      │ captura_id (FK)           │
                      │ orden                     │
                      │ tipo_foto                 │
                      │ url_drive                 │
                      └───────────────────────────┘

┌───────────────────────────┐
│  inventario_maestro       │  (Sin relaciones directas,
├───────────────────────────┤   cruce por serial en script)
│ id (PK)                   │
│ serial (UNIQUE)           │
│ tipo_equipo               │
│ marca, modelo             │
└───────────────────────────┘
```

---

### 3.3 Row Level Security (RLS) - Políticas de Seguridad

**Política 1: Empleados - Solo lectura**
```sql
-- Los usuarios solo pueden leer su propio perfil
CREATE POLICY "Users can read own profile"
ON empleados FOR SELECT
USING (true);  -- Permitir lectura a todos (la tabla no tiene datos sensibles)
```

**Política 2: Capturas - CRUD por usuario**
```sql
-- Usuarios solo pueden crear capturas con su propio expediente
CREATE POLICY "Users can insert own captures"
ON capturas FOR INSERT
WITH CHECK (
  expediente_usuario IN (
    SELECT expediente FROM empleados WHERE activo = true
  )
);

-- Usuarios solo pueden ver sus propias capturas
CREATE POLICY "Users can view own captures"
ON capturas FOR SELECT
USING (expediente_usuario = current_setting('app.expediente_usuario')::INTEGER);
```

**Nota**: En este caso, NO usaremos Supabase Auth (sin login con contraseña). La "autenticación" será un simple matching del expediente. Por tanto, el RLS será más permisivo, confiando en la capa de aplicación.

**Política Simplificada (Sin Auth)**:
```sql
-- Permitir SELECT/INSERT a usuarios autenticados via aplicación
-- La seguridad real está en la validación del expediente en el frontend/backend
ALTER TABLE capturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE capturas_fotos ENABLE ROW LEVEL SECURITY;

-- Permitir operaciones para usuarios con expediente válido
CREATE POLICY "Allow operations for valid users"
ON capturas FOR ALL
USING (
  expediente_usuario IN (SELECT expediente FROM empleados WHERE activo = true)
);

CREATE POLICY "Allow photo operations for valid captures"
ON capturas_fotos FOR ALL
USING (
  captura_id IN (SELECT id FROM capturas)
);
```

---

## 4. Flujos de Trabajo Técnicos

### 4.1 Flujo de Autenticación

```
[Usuario] → Ingresa expediente (ej. 679)
   ↓
[Frontend] → Valida formato (solo números)
   ↓
[Frontend] → POST /api/validate-expediente
   ↓
[API Route] → Query a Supabase:
              SELECT expediente, nombre_completo, area_nombre
              FROM empleados
              WHERE expediente = $1 AND activo = true
   ↓
[Supabase] → Retorna empleado o null
   ↓
[API Route] → If null: { success: false, error: "No encontrado" }
              If found: { success: true, empleado: {...} }
   ↓
[Frontend] → Muestra modal: "¿Eres [NOMBRE] de [AREA]?"
   ↓
[Usuario] → Confirma
   ↓
[Frontend] → Guarda en localStorage:
             {
               expediente: 679,
               nombreCompleto: "ABREO GARCIA GEMA",
               areaNombre: "CONTABILIDAD"
             }
   ↓
[Frontend] → Redirige a /seleccion-equipo
```

**Código de Ejemplo**:
```typescript
// pages/api/validate-expediente.ts
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const { expediente } = req.body;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY! // Backend only
  );

  const { data, error } = await supabase
    .from('empleados')
    .select('expediente, nombre_completo, area_nombre')
    .eq('expediente', expediente)
    .eq('activo', true)
    .single();

  if (error || !data) {
    return res.status(404).json({ success: false, error: 'Expediente no encontrado' });
  }

  return res.status(200).json({ success: true, empleado: data });
}
```

---

### 4.2 Flujo de Escaneo y Captura de Fotos

```
[Usuario] → Selecciona "Laptop" en /seleccion-equipo
   ↓
[Frontend] → Redirige a /captura?tipo=laptop
   ↓
[Frontend] → Activa cámara trasera (html5-qrcode)
   │
   ├─ Escaneo exitoso → Guarda serial en state
   │  ↓
   │  Muestra: "✅ Serie detectada: D9HSR93"
   │  ↓
   │  Botón "Confirmar" → Avanza a captura de fotos
   │
   └─ Escaneo falla → Botón "Etiqueta ilegible"
      ↓
      Muestra input manual (opcional) + checkbox "Etiqueta dañada"
      ↓
      Avanza a captura de fotos

[Frontend] → Carrusel de fotos (3 fotos para laptop)
   │
   │ Foto 1: "Toma foto de la PANTALLA"
   │  ↓ [Captura] → Comprime imagen (max 2MB)
   │  ↓ Guarda en state: foto1Blob
   │
   │ Foto 2: "Toma foto del TECLADO y MOUSE"
   │  ↓ [Captura] → Comprime imagen
   │  ↓ Guarda en state: foto2Blob
   │
   │ Foto 3: "Toma foto del DOCKING STATION"
   │  ↓ [Captura] → Comprime imagen
   │  ↓ Guarda en state: foto3Blob
   │
   ↓
[Frontend] → Pantalla de observaciones
   ↓ [Usuario ingresa observaciones]
   ↓ [Usuario marca "Equipo en buen estado"]
   ↓ Clic en "Guardar y Enviar"
   ↓
[Frontend] → Loading: "Subiendo fotos..." (barra de progreso)
   ↓
[Frontend] → POST /api/upload-captura
             Body: {
               expediente: 679,
               tipoEquipo: "laptop",
               serialEscaneado: "D9HSR93" | null,
               serialManual: "manual..." | null,
               etiquetaLegible: true | false,
               observaciones: "...",
               equipoBuenEstado: true | false,
               fotos: [
                 { orden: 1, tipo: "pantalla", base64: "..." },
                 { orden: 2, tipo: "perifericos", base64: "..." },
                 { orden: 3, tipo: "docking", base64: "..." }
               ]
             }
   ↓
[API Route /api/upload-captura] → Procesa:
   1. Genera TAG único: "JAL-679-LAPTOP-01"
   2. Para cada foto:
      - Sube a Google Drive vía Service Account
      - Organiza en carpeta: /Inventario-Equipos/Jalisco/ALM-CONTABILIDAD/679-ABREO/
      - Obtiene URL: https://drive.google.com/file/d/...
   3. Inserta en Supabase:
      - INSERT INTO capturas (...)
      - INSERT INTO capturas_fotos (...) (3 filas)
   4. Retorna: { success: true, tag: "JAL-679-LAPTOP-01" }
   ↓
[Frontend] → Muestra: "✅ Equipo registrado exitosamente. TAG: JAL-679-LAPTOP-01"
   ↓
[Frontend] → Botones: [Registrar otro equipo] [Salir]
```

---

### 4.3 Flujo de Subida a Google Drive (Detalle Técnico)

**Código de Ejemplo** (`pages/api/upload-captura.ts`):

```typescript
import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';
import { Readable } from 'stream';

export default async function handler(req, res) {
  const { expediente, tipoEquipo, serialEscaneado, serialManual, etiquetaLegible, observaciones, equipoBuenEstado, fotos } = req.body;

  // 1. Autenticar con Google Drive usando Service Account
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/drive.file'],
  });

  const drive = google.drive({ version: 'v3', auth });

  // 2. Obtener info del empleado para nombre de carpeta
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: empleado } = await supabase
    .from('empleados')
    .select('nombre_completo, area_nombre')
    .eq('expediente', expediente)
    .single();

  // 3. Generar TAG único
  const tag = await generarTagUnico(supabase, expediente, tipoEquipo);

  // 4. Crear estructura de carpetas en Drive (si no existe)
  const folderPath = `Inventario-Equipos/Jalisco/${empleado.area_nombre}/${expediente}-${empleado.nombre_completo}`;
  const folderId = await crearCarpetasSiNoExiste(drive, folderPath, process.env.GOOGLE_DRIVE_FOLDER_ID!);

  // 5. Subir cada foto
  const fotosUrls = [];
  for (const foto of fotos) {
    const buffer = Buffer.from(foto.base64, 'base64');
    const stream = Readable.from(buffer);

    const fileMetadata = {
      name: `${tag}-${foto.tipo}.jpg`,
      parents: [folderId],
    };

    const media = {
      mimeType: 'image/jpeg',
      body: stream,
    };

    const file = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, webViewLink',
    });

    fotosUrls.push({
      orden: foto.orden,
      tipoFoto: foto.tipo,
      urlDrive: file.data.webViewLink,
      driveFileId: file.data.id,
      tamanioBytes: buffer.length,
    });
  }

  // 6. Guardar en Supabase
  const { data: captura, error: errorCaptura } = await supabase
    .from('capturas')
    .insert({
      expediente_usuario: expediente,
      tipo_equipo_capturado: tipoEquipo,
      serial_escaneado: serialEscaneado,
      serial_manual: serialManual,
      etiqueta_legible: etiquetaLegible,
      observaciones,
      equipo_buen_estado: equipoBuenEstado,
      tag_generado: tag,
    })
    .select()
    .single();

  if (errorCaptura) {
    return res.status(500).json({ success: false, error: errorCaptura.message });
  }

  // 7. Insertar fotos en capturas_fotos
  const fotosInsert = fotosUrls.map(f => ({
    captura_id: captura.id,
    ...f,
  }));

  await supabase.from('capturas_fotos').insert(fotosInsert);

  // 8. Retornar éxito
  return res.status(200).json({
    success: true,
    tag,
    capturaId: captura.id,
    fotosSubidas: fotosUrls.length,
  });
}

// Función auxiliar para generar TAG único
async function generarTagUnico(supabase, expediente, tipoEquipo) {
  // Contar cuántos equipos de este tipo ya registró el usuario
  const { count } = await supabase
    .from('capturas')
    .select('id', { count: 'exact', head: true })
    .eq('expediente_usuario', expediente)
    .eq('tipo_equipo_capturado', tipoEquipo);

  const consecutivo = (count || 0) + 1;
  return `JAL-${expediente}-${tipoEquipo.toUpperCase()}-${String(consecutivo).padStart(2, '0')}`;
}

// Función auxiliar para crear estructura de carpetas
async function crearCarpetasSiNoExiste(drive, path, rootFolderId) {
  const folders = path.split('/');
  let currentFolderId = rootFolderId;

  for (const folderName of folders) {
    // Buscar si ya existe
    const { data } = await drive.files.list({
      q: `name='${folderName}' and '${currentFolderId}' in parents and mimeType='application/vnd.google-apps.folder'`,
      fields: 'files(id)',
    });

    if (data.files && data.files.length > 0) {
      currentFolderId = data.files[0].id;
    } else {
      // Crear carpeta
      const folder = await drive.files.create({
        requestBody: {
          name: folderName,
          mimeType: 'application/vnd.google-apps.folder',
          parents: [currentFolderId],
        },
        fields: 'id',
      });

      currentFolderId = folder.data.id;
    }
  }

  return currentFolderId;
}
```

---

### 4.4 Flujo de Procesamiento con IA (Orquestador Offline)

```
[Admin] → Ejecuta: node scripts/procesar-inventario.js
   ↓
[Script] → Lee contexto:
           - Equipos con etiqueta_legible = false
           - Fotos asociadas (capturas_fotos)
   ↓
[Script] → Para cada captura:
   │
   │ 1. Descarga fotos desde Google Drive
   │    ↓
   │ 2. Envía a Gemini Vision API:
   │    {
   │      prompt: "Extrae el número de serie visible en esta foto de etiqueta de equipo de cómputo. Retorna solo el número de serie sin espacios.",
   │      image: base64EncodedImage,
   │      generationConfig: {
   │        response_mime_type: "application/json",
   │        response_schema: {
   │          type: "object",
   │          properties: {
   │            serial: { type: "string" },
   │            confianza: { type: "number" }
   │          }
   │        }
   │      }
   │    }
   │    ↓
   │ 3. Recibe respuesta:
   │    { serial: "D9HSR93", confianza: 0.95 }
   │    ↓
   │ 4. Si confianza > 0.8:
   │       - Actualiza capturas SET serial_escaneado = "D9HSR93"
   │    Else:
   │       - Marca como "Requiere revisión manual"
   │
   ↓
[Script] → Cruza con inventario_maestro:
           SELECT * FROM inventario_maestro
           WHERE serial = 'D9HSR93'
   │
   │ Caso 1: Encontrado → Match exitoso
   │ Caso 2: No encontrado → "Equipo sobrante"
   │
   ↓
[Script] → Genera reporte de discrepancias:
   │
   │ FALTANTES: Equipos en inventario_maestro NO en capturas
   │ SOBRANTES: Equipos en capturas NO en inventario_maestro
   │ CON ERRORES: Equipos con confianza < 0.8
   │
   ↓
[Script] → Exporta a CSV:
           - reporte-discrepancias-2026-01-06.csv
           - estadisticas.json
   ↓
[Admin] → Revisa y toma acciones correctivas
```

---

## 5. Decisiones Arquitectónicas Clave

### 5.1 ¿Por qué NO usamos Supabase Auth?

**Análisis**:
| Opción | Pros | Contras |
|--------|------|---------|
| **Supabase Auth** | ✅ Seguridad robusta<br>✅ RLS nativo<br>✅ Sesiones gestionadas | ❌ Requiere email/contraseña<br>❌ Usuarios no técnicos olvidarán contraseñas<br>❌ Complejidad innecesaria |
| **Matching simple por expediente** | ✅ UX extremadamente simple<br>✅ Sin contraseñas que olvidar<br>✅ Login en 2 clics | ❌ Menos seguro (sin autenticación real)<br>❌ Confiamos en honestidad del usuario |

**Decisión Final**: **Matching simple por expediente**

**Justificación**:
- ✅ La aplicación no maneja datos financieros ni personales sensibles
- ✅ El riesgo de "suplantación" es bajo (¿quién querría registrar equipos de otro?)
- ✅ La prioridad es **adopción masiva** sin fricciones
- ✅ El admin tiene resguardos físicos para validar honestidad

**Trade-off Aceptado**: Menor seguridad a cambio de UX extremadamente simple.

---

### 5.2 ¿Por qué Supabase Storage en lugar de Google Drive?

**Análisis**:
| Opción | Pros | Contras |
|--------|------|---------|
| **Supabase Storage** | ✅ Integración nativa<br>✅ RLS para fotos<br>✅ SDK unificado | ❌ 1GB en plan gratuito para storage (se debe monitorear) |
| **Google Drive** | ✅ 2TB teóricos | ❌ Requiere Service Account y API Keys complejas<br>❌ Errores de cuota experimentados |

**Decisión Final**: **Supabase Storage**

**Justificación**:
- ✅ Simplicidad técnica
- ✅ Eliminación de middleware complejo (googleapis)
- ✅ Funcionó correctamente en pruebas

**Trade-off Aceptado**: Gestión más estricta del espacio en disco (1GB).

---

### 5.3 ¿Por qué procesamiento de IA en lote (offline) en lugar de tiempo real?

**Análisis**:
| Opción | Pros | Contras |
|--------|------|---------|
| **OCR en tiempo real (durante captura)** | ✅ UX fluida<br>✅ Feedback inmediato | ❌ Costo por foto (Gemini API)<br>❌ Latencia de 2-3seg por foto<br>❌ Usuario espera |
| **OCR en lote (script offline)** | ✅ Solo procesa fotos necesarias<br>✅ Costo reducido<br>✅ Usuario no espera | ❌ Admin debe ejecutar script<br>❌ Resultados diferidos |

**Decisión Final**: **OCR en lote (offline)**

**Justificación**:
- ✅ Solo ~10-15% de equipos tienen etiquetas ilegibles (estimado)
- ✅ No*   **Granularidad "Radiografía" (Hub & Spoke)**:
    *   **Dashboard**: El usuario ve el "Kit Completo" y selecciona qué capturar.
    *   **Serial por Componente**: Cada componente (Monitor, Mouse, etc.) requiere escanear/ingresar su serial individual.
    *   **Validación Individual**: Se valida cada serial contra la BD.
    *   **Estados**: Pendiente, Capturado (Verde), No Encontrado en BD (Amarillo), No Existe Físicamente (Rojo).

### 4.2 Almacenamiento (Supabase)
*   **Tabla `capturas_fotos` (Actualizada)**:
    *   `serial_componente` (TEXT): Serial del periférico específico.
    *   `estado_validacion` (TEXT): 'MATCH', 'NO_MATCH', 'MANUAL', 'OMITIDO'.
*   **Bucket**: `evidencias` (Publico/Privado con RLS).
| Recurso | Límite | Uso Estimado | % Usado |
|---------|--------|--------------|---------|
| **Almacenamiento BD** | 500 MB | ~5 MB (metadata) | 1% |
| **Egress (transferencia)** | 5 GB/mes | ~100 MB/mes | 2% |
| **Rows en BD** | Sin límite | ~1,500 capturas + ~4,500 fotos = 6,000 rows | OK |
| **Conexiones simultáneas** | 60 | ~10 (50 usuarios no simultáneos) | 17% |

**Conclusión**: ✅ El plan gratuito es suficiente sin riesgo de excederlo.

---

### 6.2 Plan Gratuito de Vercel

**Límites del Plan Gratuito**:
| Recurso | Límite | Uso Estimado | % Usado |
|---------|--------|--------------|---------|
| **Bandwidth** | 100 GB/mes | ~5 GB (páginas + imágenes comprimidas) | 5% |
| **Function Invocations** | 100,000/mes | ~5,000 (50 usuarios x 100 calls) | 5% |
| **Function Duration** | 1,000 horas/mes | ~2 horas (uploads a Drive) | 0.2% |

**Conclusión**: ✅ El plan gratuito es holgadamente suficiente.

---

### 6.3 Plan Gratuito de Google Drive API

**Límites del Plan Gratuito**:
| Recurso | Límite | Uso Estimado | % Usado |
|---------|--------|--------------|---------|
| **Queries per Day** | 1,000,000,000 | ~1,500 (subidas) + ~500 (orquestador) | 0.0002% |
| **Queries per User per 100s** | 1,000 | ~10 | 1% |
| **Almacenamiento** | 2 TB (cuenta personal) | ~3 GB (1,500 fotos x 2MB) | 0.15% |

**Conclusión**: ✅ El plan gratuito no tiene riesgo de excederse.

---

## 7. Seguridad y Mejores Prácticas

### 7.1 Protección del Service Account

**Riesgos**:
- 🔴 Si el archivo JSON se expone, alguien podría subir/borrar archivos de Drive
- 🔴 Si se sube a GitHub, queda expuesto públicamente

**Mitigaciones Implementadas**:
1. ✅ Archivo JSON **nunca** en el repositorio (agregado a `.gitignore`)
2. ✅ Credenciales en variables de entorno (`GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY`)
3. ✅ Service Account solo tiene permisos en carpeta específica, no en todo Drive
4. ✅ Scope mínimo necesario: `drive.file` (solo archivos que crea la app)

**Código de .gitignore**:
```gitignore
# Service Account
*.json
!package.json
!tsconfig.json

# Environment variables
.env
.env.local
.env.production
```

---

### 7.2 Validación en Múltiples Capas

**Capa 1 - Frontend**:
```typescript
// Validar formato de expediente
if (!/^\d+$/.test(expediente)) {
  setError('El expediente debe contener solo números');
  return;
}

// Validar tamaño de foto
if (fotoBlob.size > 2 * 1024 * 1024) {
  setError('La foto es muy grande. Máximo 2MB');
  return;
}
```

**Capa 2 - API Route**:
```typescript
// Validar que el expediente existe
const { data: empleado } = await supabase
  .from('empleados')
  .select('expediente')
  .eq('expediente', expediente)
  .eq('activo', true)
  .single();

if (!empleado) {
  return res.status(403).json({ error: 'Expediente no válido' });
}
```

**Capa 3 - Base de Datos**:
```sql
-- Foreign Key Constraint
ALTER TABLE capturas
ADD CONSTRAINT fk_capturas_empleado
FOREIGN KEY (expediente_usuario)
REFERENCES empleados(expediente);

-- Check Constraint
ALTER TABLE capturas
ADD CONSTRAINT check_tipo_equipo
CHECK (tipo_equipo_capturado IN ('laptop', 'escritorio', 'multifuncional'));
```

---

### 7.3 Manejo de Errores y Resiliencia

**Estrategia de Retry para Subida de Fotos**:
```typescript
async function subirFotoConRetry(foto, maxIntentos = 3) {
  for (let intento = 1; intento <= maxIntentos; intento++) {
    try {
      const url = await subirFotoDrive(foto);
      return url;
    } catch (error) {
      console.error(`Intento ${intento} falló:`, error);

      if (intento === maxIntentos) {
        // Guardar en IndexedDB como backup
        await guardarFotoLocal(foto);
        throw new Error('No se pudo subir la foto. Se guardó localmente.');
      }

      // Esperar antes de reintentar (backoff exponencial)
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, intento - 1)));
    }
  }
}
```

---

## 8. Roadmap de Implementación

### Fase 1: Fundación (Semana 1)
- [x] Crear proyecto Next.js con TypeScript
- [x] Configurar Supabase (proyecto + tablas)
- [x] Implementar autenticación simple por expediente
- [x] Pantalla de login y validación

### Fase 2: Captura Core (Semana 2)
- [ ] Integrar html5-qrcode para escaneo
- [ ] Implementar carrusel de fotos
- [ ] Comprimir imágenes en cliente
- [ ] API Route para subir a Google Drive
- [ ] Guardar metadata en Supabase

### Fase 3: Dashboard Admin (Semana 3)
- [ ] Dashboard de progreso por almacén
- [ ] Visualización de capturas completadas
- [ ] Exportación a CSV de datos

### Fase 4: Orquestador IA (Semana 4)
- [ ] Script de procesamiento con Gemini OCR
- [ ] Cruce con inventario maestro
- [ ] Generación de reporte de discrepancias
- [ ] Testing end-to-end

---

## 9. Monitoreo y Métricas

### 9.1 Métricas de Aplicación
- **Tiempo promedio de captura por usuario**: Meta < 5 minutos
- **Tasa de éxito de escaneo QR**: Meta > 85%
- **Tamaño promedio de foto comprimida**: Meta < 1.5 MB
- **Tasa de error en subida a Drive**: Meta < 2%

### 9.2 Métricas de Negocio
- **% de completitud por almacén**: Meta 100% en 1 semana
- **Equipos con etiqueta ilegible**: Esperado < 15%
- **Discrepancias identificadas**: Equipos faltantes/sobrantes
- **Satisfacción del usuario**: Encuesta post-captura (NPS)

---

## 10. Conclusiones y Próximos Pasos

### 10.1 Fortalezas de la Arquitectura
✅ **Costo Cero**: Aprovecha planes gratuitos sin riesgo de excederlos
✅ **Simplicidad**: Stack minimalista, fácil de mantener
✅ **Escalabilidad**: Puede crecer a 500 usuarios sin cambios arquitectónicos
✅ **UX Optimizada**: Diseñada para usuarios no técnicos

### 10.2 Riesgos Mitigados
✅ **Seguridad del Service Account**: Credenciales en variables de entorno
✅ **Pérdida de Fotos**: Retry automático + backup en IndexedDB
✅ **Escalabilidad de Costos**: Google Drive absorbe crecimiento de fotos

### 10.3 Próximos Pasos
1. ✅ Aprobar arquitectura con el usuario
2. [ ] Configurar Service Account de Google Drive
3. [ ] Generar código base del proyecto
4. [ ] Implementar Fase 1 (Fundación)
5. [ ] Testing con 2 almacenes piloto

---

**Fecha de Creación**: 6 de Enero de 2026
**Autor**: Claude Code (Ingeniero Líder)
**Estado**: Pendiente de Aprobación del Usuario
