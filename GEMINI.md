# Contexto del Proyecto: Auditor de Equipos - Alimentación para el Bienestar

Este archivo sirve como contexto maestro para el Agente Gemini. Describe el propósito, arquitectura, convenciones y estructura del proyecto.

## 1. Visión General
**Tipo de Proyecto**: Sistema Web Progresivo (PWA) desarrollado en Next.js.
**Propósito**: Auditoría y validación de inventario de equipos de cómputo arrendados mediante escaneo de QR/Barras y evidencia fotográfica.
**Estado**: En desarrollo activo (Fase 2: Captura Core).

## 2. Stack Tecnológico

| Capa | Tecnología | Detalles |
| :--- | :--- | :--- |
| **Frontend** | Next.js 16.1.1 | Pages Router (según estructura) / App Router (híbrido en transición) |
| **UI** | React 19, Tailwind CSS v4 | Componentes funcionales, Mobile-First |
| **Lenguaje** | TypeScript | Estrictamente tipado (`tsconfig.json` target ES2017) |
| **Base de Datos** | Supabase | PostgreSQL + Row Level Security (RLS) |
| **Almacenamiento** | Supabase Storage | Estructura jerárquica simulando carpetas (Año/Area/Empleado) |
| **Hardware** | html5-qrcode | Escaneo de códigos (QR, Code-128, etc.) con acceso a cámara trasera |

## 3. Arquitectura y Patrones Clave

### 3.1 Modelo de "Radiografía" (Hub & Spoke)
El sistema valida el inventario con granularidad de **componente**, no solo de equipo.
- **Dashboard**: Muestra el "Kit" esperado (Laptop, Monitor, Mouse).
- **Validación**: Cada componente se escanea/valida individualmente.
- **Estados**: Pendiente, Capturado, No Encontrado, No Existe Físicamente.

### 3.2 Lógica de Validación "Fail-Open"
- **Serial NO en BD**: Se permite el registro con advertencia (prioriza la realidad física sobre la teórica).
- **Tipo Incorrecto**: Se bloquea si el serial existe pero es de otro tipo (ej. escanear un Monitor cuando se pide Mouse).

### 3.3 Estrategia de Almacenamiento
Aunque la documentación original menciona Google Drive, la implementación actual (`src/app/api/upload/route.ts`) usa **Supabase Storage** manteniendo una estructura de carpetas lógica:
`{AÑO}/{AREA_NORMALIZADA}/{EXPEDIENTE_NOMBRE}/{TIPO_EQUIPO}_{TIMESTAMP}.jpg`

### 3.4 Autenticación Simplificada
- No usa Supabase Auth tradicional (email/password).
- Usa un **matching simple por número de expediente** contra la tabla `empleados`.
- La seguridad confía en la validación del expediente y controles físicos, priorizando la UX (cero fricción).

## 4. Estructura de Directorios Clave

```text
/
├── ARQUITECTURA_TECNICA.md    # Referencia técnica detallada (Lectura obligatoria)
├── PRD.md                     # Requisitos de producto y User Stories
├── src/
│   ├── app/
│   │   ├── api/               # Next.js API Routes (Backend Serverless)
│   │   │   └── upload/        # Lógica de subida a Supabase Storage
│   │   └── ...
│   ├── components/
│   │   ├── Scanner.tsx        # Componente crítico: Manejo de cámara y html5-qrcode
│   │   └── ui/                # Componentes base (Button, Input)
│   └── lib/
│       ├── supabaseClient.ts  # Cliente singleton de Supabase
│       └── storage.ts         # Abstracción de operaciones de storage
├── supabase/
│   └── migrations/            # Esquema de BD (SQL)
└── public/                    # Assets estáticos
```

## 5. Comandos y Desarrollo

### Scripts (`package.json`)
- `npm run dev`: Inicia servidor de desarrollo (puerto 3000 por defecto).
- `npm run build`: Construye la aplicación para producción.
- `npm run lint`: Ejecuta ESLint.

### Variables de Entorno (`.env.local`)
Requeridas para funcionamiento local:
```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
# Variables de Google Drive (Legacy/Opcional si se usa solo Supabase Storage)
```

## 6. Detalles de Implementación Críticos

### Escáner (`Scanner.tsx`)
- **HTTPS Obligatorio**: El acceso a `getUserMedia` requiere contexto seguro. En local funciona en `localhost`, pero en red requiere HTTPS.
- **Configuración**: Prioriza cámara trasera (`facingMode: 'environment'`), intenta resolución 1080p, y aplica optimizaciones de foco/zoom si el hardware lo soporta.
- **Limpieza**: Manejo estricto de limpieza del scanner para evitar fugas de memoria y errores de DOM en React 19.

### API de Subida (`route.ts`)
- Recibe `FormData` con archivo y metadatos.
- Valida la existencia del empleado en BD antes de subir.
- Normaliza nombres de carpetas para evitar caracteres inválidos.
- Retorna URL pública/firmada para visualización.

## 7. Referencias
- Para dudas de negocio: Ver `PRD.md`.
- Para dudas de flujo de datos: Ver `ARQUITECTURA_TECNICA.md`.
