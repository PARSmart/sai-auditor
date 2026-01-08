import { google } from 'googleapis';
import fs from 'fs/promises';
import { Readable } from 'stream';

// Configuración de credenciales de Google Drive
const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

async function getAuthClient() {
    // Determinar si usamos archivo (local) o credenciales directas (producción)
    const keyPath = process.env.GOOGLE_PRIVATE_KEY_PATH;

    if (keyPath) {
        // Modo Desarrollo / Local usando archivo JSON
        return new google.auth.GoogleAuth({
            keyFile: keyPath,
            scopes: SCOPES,
        });
    } else {
        // Modo Producción usando variables de entorno
        return new google.auth.GoogleAuth({
            credentials: {
                client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
                private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
            },
            scopes: SCOPES,
        });
    }
}

export async function uploadFileToDrive(
    fileBuffer: Buffer,
    fileName: string,
    folderId: string,
    mimeType: string
) {
    try {
        const auth = await getAuthClient();
        const drive = google.drive({ version: 'v3', auth });

        const fileMetadata = {
            name: fileName,
            parents: [folderId],
        };

        const media = {
            mimeType: mimeType,
            body: Readable.from(fileBuffer),
        };

        const response = await drive.files.create({
            requestBody: fileMetadata,
            media: media,
            fields: 'id, name, webViewLink, webContentLink',
            supportsAllDrives: true,
        });

        return response.data;
    } catch (error: any) {
        console.error('Error subiendo a Google Drive:', error.message);
        throw new Error(`Google Drive Upload Failed: ${error.message}`);
    }
}

/**
 * Función auxiliar para verificar si una carpeta existe, y si no, crearla.
 * Útil para organizar por Expediente o Almacén.
 */
/**
 * Crea una estructura de carpetas recursiva:
 * ROOT > AÑO > AREA > EMPLEADO
 */
export async function ensureFolderStructure(
    rootFolderId: string,
    year: string,
    areaName: string,
    employeeName: string
): Promise<string> {
    const auth = await getAuthClient();
    const drive = google.drive({ version: 'v3', auth });

    // 1. Carpeta AÑO (ej. "Fotos Inventario 2026")
    const yearFolderId = await findOrCreateFolder(drive, `Fotos Inventario ${year}`, rootFolderId);

    // 2. Carpeta AREA (ej. "JALISCO", "CONTABILIDAD")
    // Sanitize folder name just in case
    const safeArea = areaName.replace(/[\/\\]./g, '_');
    const areaFolderId = await findOrCreateFolder(drive, safeArea, yearFolderId);

    // 3. Carpeta EMPLEADO (ej. "679 - ABREO GARCIA GEMA")
    const safeEmployee = employeeName.replace(/[\/\\]./g, '_');
    const employeeFolderId = await findOrCreateFolder(drive, safeEmployee, areaFolderId);

    return employeeFolderId;
}

async function findOrCreateFolder(drive: any, folderName: string, parentId: string): Promise<string> {
    try {
        const query = `mimeType='application/vnd.google-apps.folder' and name='${folderName}' and '${parentId}' in parents and trashed=false`;

        const res = await drive.files.list({
            q: query,
            fields: 'files(id, name)',
            spaces: 'drive',
            includeItemsFromAllDrives: true,
            supportsAllDrives: true,
        });

        if (res.data.files && res.data.files.length > 0) {
            return res.data.files[0].id!;
        } else {
            const fileMetadata = {
                name: folderName,
                mimeType: 'application/vnd.google-apps.folder',
                parents: [parentId],
            };
            const file = await drive.files.create({
                requestBody: fileMetadata,
                fields: 'id',
                supportsAllDrives: true,
            });
            return file.data.id!;
        }
    } catch (error: any) {
        console.error(`Error en findOrCreateFolder (${folderName}):`, error.message);
        throw error;
    }
}
