# Guía de Configuración de Google Drive Service Account

## ¿Qué es un Service Account y por qué lo necesitas?

Un **Service Account** es una cuenta especial de Google que pertenece a tu aplicación, no a un usuario humano. Es como darle a tu aplicación su propia "identidad" para que pueda acceder a Google Drive de forma automática.

### ¿Por qué NO usamos login de usuario normal?

**Problema**: Si usáramos el login tradicional de Google, cada usuario de tu aplicación (jefes de almacén, administrativos, capturistas) tendría que:
1. Tener una cuenta de Google personal
2. Dar permisos a tu aplicación
3. Loguearse cada vez que usen la app

**Solución con Service Account**: Tu aplicación usa su propia cuenta de Google en segundo plano (invisible para los usuarios). Los usuarios solo toman fotos y presionan "Guardar", sin saber que detrás se está subiendo a tu Google Drive de 2TB.

---

## Paso 1: Crear un Proyecto en Google Cloud Console

1. **Ir a Google Cloud Console**
   - URL: https://console.cloud.google.com/
   - Inicia sesión con tu cuenta de Google (la que tiene los 2TB de Drive)

2. **Crear un nuevo proyecto**
   - Haz clic en el selector de proyectos (arriba a la izquierda)
   - Haz clic en **"Nuevo Proyecto"**
   - Nombre del proyecto: `auditor-equipos-arca` (o el nombre que prefieras)
   - Organización: Déjalo en blanco si no tienes una
   - Haz clic en **"Crear"**

3. **Esperar confirmación**
   - Google tarda ~30 segundos en crear el proyecto
   - Verás una notificación cuando esté listo

---

## Paso 2: Habilitar la API de Google Drive

1. **Ir al menú de APIs y Servicios**
   - En el menú lateral (☰), ve a: **"APIs y servicios" → "Biblioteca"**

2. **Buscar Google Drive API**
   - En el buscador, escribe: `Google Drive API`
   - Haz clic en el resultado **"Google Drive API"**

3. **Habilitar la API**
   - Haz clic en el botón azul **"HABILITAR"**
   - Espera ~10 segundos

4. **Verificar que está habilitada**
   - Ve a **"APIs y servicios" → "APIs y servicios habilitados"**
   - Deberías ver **"Google Drive API"** en la lista

---

## Paso 3: Crear el Service Account

1. **Ir a Cuentas de Servicio**
   - Menú lateral (☰): **"APIs y servicios" → "Credenciales"**
   - Haz clic en **"+ CREAR CREDENCIALES"** (arriba)
   - Selecciona **"Cuenta de servicio"**

2. **Configurar la Cuenta de Servicio**
   - **Nombre de la cuenta de servicio**: `auditor-drive-uploader`
   - **ID de la cuenta de servicio**: Se genera automáticamente (algo como `auditor-drive-uploader@auditor-equipos-arca.iam.gserviceaccount.com`)
   - **Descripción**: `Service Account para subir fotos de equipos a Google Drive`
   - Haz clic en **"CREAR Y CONTINUAR"**

3. **Otorgar permisos (Paso 2 del asistente)**
   - En "Otorgar a esta cuenta de servicio acceso al proyecto"
   - **Rol**: Selecciona **"Editor"** (o déjalo en blanco, lo configuraremos directamente en Drive)
   - Haz clic en **"CONTINUAR"**

4. **Omitir acceso de usuarios (Paso 3)**
   - Haz clic en **"LISTO"** (no necesitas dar acceso a otros usuarios)

---

## Paso 4: Generar la Clave JSON (El archivo más importante)

1. **Encontrar tu Service Account**
   - En **"Credenciales"**, ve a la sección **"Cuentas de servicio"**
   - Verás tu cuenta `auditor-drive-uploader@...`

2. **Crear la clave**
   - Haz clic en el email de la cuenta de servicio
   - Ve a la pestaña **"CLAVES"**
   - Haz clic en **"AGREGAR CLAVE" → "Crear clave nueva"**
   - Selecciona **"JSON"**
   - Haz clic en **"CREAR"**

3. **Guardar el archivo JSON**
   - Se descargará automáticamente un archivo con un nombre como:
     `auditor-equipos-arca-a1b2c3d4e5f6.json`

   **🔴 IMPORTANTE:**
   - Este archivo es como la "llave maestra" de tu aplicación
   - NUNCA lo subas a GitHub, GitLab, o lo compartas públicamente
   - Guárdalo en un lugar seguro (ej. en tu computadora local o en variables de entorno de Vercel)

4. **Contenido del archivo JSON** (ejemplo):
   ```json
   {
     "type": "service_account",
     "project_id": "auditor-equipos-arca",
     "private_key_id": "a1b2c3d4...",
     "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBA...",
     "client_email": "auditor-drive-uploader@auditor-equipos-arca.iam.gserviceaccount.com",
     "client_id": "123456789...",
     "auth_uri": "https://accounts.google.com/o/oauth2/auth",
     "token_uri": "https://oauth2.googleapis.com/token",
     ...
   }
   ```

---

## Paso 5: Dar Acceso al Service Account a tu Google Drive

Ahora que tienes el Service Account, necesitas darle permisos para subir archivos a TU Google Drive de 2TB.

### Opción A: Compartir una carpeta específica (RECOMENDADO)

1. **Crear carpeta en Google Drive**
   - Ve a tu Google Drive (drive.google.com)
   - Crea una carpeta llamada: `Fotos Inventario Equipos`
   - Dentro, puedes crear subcarpetas: `Jalisco/`, `Colima/`, etc.

2. **Compartir con el Service Account**
   - Haz clic derecho en la carpeta → **"Compartir"**
   - En "Agregar personas y grupos", pega el email del Service Account:
     ```
     auditor-drive-uploader@auditor-equipos-arca.iam.gserviceaccount.com
     ```
   - Rol: Selecciona **"Editor"** (para que pueda subir archivos)
   - **Desactiva** la opción "Notificar a las personas" (es una cuenta de robot, no necesita notificaciones)
   - Haz clic en **"Compartir"** o **"Enviar"**

3. **Obtener el ID de la carpeta**
   - Abre la carpeta en Google Drive
   - La URL se verá así: `https://drive.google.com/drive/folders/1a2b3c4d5e6f7g8h9i0j`
   - Copia el ID: `1a2b3c4d5e6f7g8h9i0j`
   - **Guarda este ID**, lo usarás en tu código como `GOOGLE_DRIVE_FOLDER_ID`

### Opción B: Acceso completo a todo tu Drive (NO RECOMENDADO)

Si quieres que el Service Account pueda subir archivos a cualquier carpeta de tu Drive:
- Comparte **"Mi unidad"** completo con el email del Service Account
- **Riesgo**: Si alguien roba tu archivo JSON, podría subir/borrar CUALQUIER archivo de tu Drive

**Conclusión**: Usa la Opción A (carpeta específica) para mayor seguridad.

---

## Paso 6: Configurar las Variables de Entorno

Para que tu aplicación use el Service Account, debes configurar variables de entorno.

### En desarrollo local (archivo `.env.local`):

Crea un archivo `.env.local` en la raíz de tu proyecto:

```bash
# Google Drive Service Account
GOOGLE_DRIVE_FOLDER_ID=1_Wt06tnFNpeGztdLg4kMtvx2uvXwEGzp
GOOGLE_SERVICE_ACCOUNT_EMAIL=n8n-drive-workflow@parsmart.iam.gserviceaccount.com
# Use el archivo 'parsmart-295ca0523ba0.json' para la clave privada
GOOGLE_PRIVATE_KEY_PATH="./parsmart-295ca0523ba0.json"
GOOGLE_API_KEY=AIzaSyAT2dSPJ0rgRyozuY-yX6O6Qk-v9xDwD50

```

**📌 Cómo obtener estos valores del JSON:**
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`: Copia el valor de `client_email`
- `GOOGLE_PRIVATE_KEY`: Copia TODO el valor de `private_key` (incluye los saltos de línea `\n`)

**🔴 IMPORTANTE:** Agrega `.env.local` a tu `.gitignore`:
```gitignore
# Archivos sensibles
.env.local
*.json
!package.json
```

### En producción (Vercel):

1. Ve a tu proyecto en Vercel Dashboard
2. **Settings → Environment Variables**
3. Agrega las 3 variables (mismo nombre y valores que arriba)
4. Importante: Selecciona **"Production"** y **"Preview"** como scopes

---

## Paso 7: Verificar que Todo Funciona

Crea un script de prueba para validar la configuración:

**Archivo**: `scripts/test-drive-upload.js`

```javascript
import { google } from 'googleapis';
import fs from 'fs';

async function testDriveUpload() {
  try {
    // 1. Autenticar con Service Account
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/drive.file'],
    });

    const drive = google.drive({ version: 'v3', auth });

    // 2. Crear un archivo de prueba
    const fileMetadata = {
      name: 'test-conexion.txt',
      parents: [process.env.GOOGLE_DRIVE_FOLDER_ID],
    };

    const media = {
      mimeType: 'text/plain',
      body: fs.createReadStream('test-file.txt'), // Crea este archivo antes
    };

    // 3. Subir archivo
    const file = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, name, webViewLink',
    });

    console.log('✅ Archivo subido exitosamente!');
    console.log('ID del archivo:', file.data.id);
    console.log('Ver en Drive:', file.data.webViewLink);

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testDriveUpload();
```

**Ejecutar el test:**
```bash
# Crear archivo de prueba
echo "Hola desde el Service Account" > test-file.txt

# Ejecutar script
node scripts/test-drive-upload.js
```

**Si todo está bien, verás:**
```
✅ Archivo subido exitosamente!
ID del archivo: 1x2y3z4a5b6c7d8e9f0g
Ver en Drive: https://drive.google.com/file/d/1x2y3z4a5b6c7d8e9f0g/view
```

---

## Resumen de lo que tienes ahora

✅ **Service Account creado**: `auditor-drive-uploader@...`
✅ **Archivo JSON con credenciales**: Guardado de forma segura
✅ **API de Google Drive habilitada**: En tu proyecto de Google Cloud
✅ **Carpeta en Drive compartida**: Con permisos de Editor para el Service Account
✅ **Variables de entorno configuradas**: En `.env.local` y Vercel
✅ **Script de prueba funcionando**: Confirmación de que puedes subir archivos

---

## Próximos Pasos

Ahora que tienes el Service Account configurado, lo integraremos en tu aplicación para:

1. **Subir fotos desde el frontend**: Usando una API Route de Next.js (servidor)
2. **Organizar fotos por TAG**: Crear carpetas automáticas por almacén/usuario
3. **Obtener URLs públicas**: Para mostrar las fotos en la interfaz de administración
4. **Procesar con Gemini**: Extraer texto de las fotos usando OCR

---

## Troubleshooting (Solución de Problemas)

### Error: "Insufficient Permission"
**Causa**: El Service Account no tiene permisos en la carpeta de Drive
**Solución**: Verifica que hayas compartido la carpeta con el email del Service Account

### Error: "invalid_grant"
**Causa**: La `private_key` tiene formato incorrecto
**Solución**: Asegúrate de que los saltos de línea `\n` estén presentes en la clave

### Error: "File not found"
**Causa**: El `GOOGLE_DRIVE_FOLDER_ID` es incorrecto
**Solución**: Copia el ID directamente de la URL de la carpeta en Drive

### Las fotos se suben pero no las veo en Drive
**Causa**: Se están subiendo a "Mi unidad" del Service Account, no a tu Drive
**Solución**: Especifica siempre el parámetro `parents: [FOLDER_ID]` al subir archivos

---

## Seguridad y Mejores Prácticas

### ✅ DO (Hacer):
- Guardar el archivo JSON fuera del repositorio de código
- Usar variables de entorno para las credenciales
- Compartir solo la carpeta necesaria, no todo el Drive
- Rotar las claves cada 6-12 meses
- Usar scopes mínimos necesarios (`drive.file`, no `drive` completo)

### ❌ DON'T (No Hacer):
- NUNCA subir el archivo JSON a GitHub/GitLab
- NUNCA compartir el archivo JSON por email/WhatsApp
- NUNCA dar permisos de "Propietario" al Service Account
- NUNCA usar el Service Account desde el frontend (solo backend)
- NUNCA hardcodear las credenciales en el código

---

**Fecha de creación**: 6 de Enero de 2026
**Autor**: Claude Code (Asistente de Ingeniería)
**Versión**: 1.0
