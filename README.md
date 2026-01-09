# Auditor de Equipos - Alimentación para el Bienestar

Sistema Web Progresivo (PWA) para la auditoría y validación de inventario de equipos de cómputo arrendados.

## 🚀 Características
- **Autenticación Simple**: Acceso mediante número de expediente.
- **Escaneo Inteligente**: Lectura de códigos de barras/QR usando `html5-qrcode`.
- **Captura de Evidencia**: Flujo guiado para fotografiar equipos.
- **Sincronización Cloud**: Subida automática a Google Drive organizado por área y empleado.
- **Validación Cruzada Inteligente**: Previene errores de tipo (ej. Mouse registrado como Monitor) mediante matching de keywords.
- **Validación en Tiempo Real**: Cruce contra base de datos `inventario_maestro` en Supabase con lógica Fail-Open.

## 🛠 Tech Stack
- **Frontend**: Next.js 14 (Pages Router), Tailwind CSS v3, Lucide React.
- **Cámara/Scanner**: `react-webcam`, `html5-qrcode`.
- **Backend & Auth**: Supabase (PostgreSQL + RLS).
- **Storage**: Google Drive API (Service Account).

## 📦 Instalación

1.  **Clonar el repositorio**:
    ```bash
    git clone <repo-url>
    cd auditor-equipos-empresa
    ```

2.  **Instalar dependencias**:
    ```bash
    npm install
    ```

3.  **Configurar Variables de Entorno (`.env.local`)**:
    ```env
    NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
    NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
    GOOGLE_CLIENT_EMAIL=your_service_account_email
    GOOGLE_PRIVATE_KEY="your_private_key"
    GOOGLE_DRIVE_FOLDER_ID=your_root_folder_id
    ```

4.  **Correr en Desarrollo**:
    ```bash
    npm run dev
    ```

5.  **Despliegue**: Optimizado para Vercel.

## 📁 Estructura de Drive Generada
El sistema crea automáticamente la siguiente jerarquía:
```text
/Fotos Inventario 2026/
   ├── [AREA/ALMACEN]/
   │    ├── [EXPEDIENTE] - [NOMBRE]/
   │    │    ├── JAL-[EXP]-[TIPO]-01_etiqueta.jpg
   │    │    ├── JAL-[EXP]-[TIPO]-01_pantalla.jpg
```
