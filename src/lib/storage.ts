
import { createClient } from '@supabase/supabase-js';

// Usar variables de entorno de servidor si existen, o las públicas
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Importante: Para subir archivos sin RLS restrictivo, a veces se prefiere la Service Role Key si está disponible backend-side.
// Si solo tenemos la anon key, el usuario debe configurar políticas RLS "INSERT for authenticated" o "public".

// Crear cliente específico para operaciones administrativas de almacenamiento (si hay service role)
const storageClient = createClient(supabaseUrl, supabaseKey);

const BUCKET_NAME = 'evidencias';

/**
 * Sube un archivo a Supabase Storage manteniendo la estructura de carpetas.
 * Retorna la URL pública.
 */
export async function uploadToSupabaseStorage(
    fileBuffer: Buffer,
    path: string, // Ej: "2026/JALISCO/679 - GEMA/foto.jpg"
    contentType: string
): Promise<{ id: string; webViewLink: string; name: string }> {

    // 1. Asegurar que el bucket existe (Solo intentarlo, ignorar error si existe)
    // Nota: Esto es opcional, idealmente el bucket ya existe.
    // await storageClient.storage.createBucket(BUCKET_NAME, { public: true }).catch(() => {});

    // 2. Subir archivo
    // Supabase sobrescribe por defecto si upsert: true
    const { data, error } = await storageClient
        .storage
        .from(BUCKET_NAME)
        .upload(path, fileBuffer, {
            contentType: contentType,
            upsert: true
        });

    if (error) {
        console.error('Error subiendo a Supabase Storage:', error);
        throw new Error(`Supabase Upload Failed: ${error.message}`);
    }

    // 3. Obtener URL Pública
    const { data: publicUrlData } = storageClient
        .storage
        .from(BUCKET_NAME)
        .getPublicUrl(path);

    return {
        id: data.path, // Usamos el path como ID
        name: path.split('/').pop() || 'unknown',
        webViewLink: publicUrlData.publicUrl
    };
}
