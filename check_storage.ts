
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Cargar variables de entorno locales
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Faltan variables de entorno de Supabase');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStorage() {
    console.log('--- Verificando Supabase Storage ---');
    try {
        const { data, error } = await supabase.storage.listBuckets();

        if (error) {
            console.error('Error listando buckets:', error.message);
            return;
        }

        console.log('Buckets encontrados:');
        if (data.length === 0) {
            console.log('0 buckets. (Necesitaremos crear "evidencia" o "capturas")');
        } else {
            data.forEach(b => console.log(` - ${b.name} (public: ${b.public})`));
        }

        // Intentar crear un bucket si no existe
        const bucketName = 'evidencia';
        const existing = data.find(b => b.name === bucketName);

        if (!existing) {
            console.log(`Intentando crear bucket '${bucketName}'...`);
            // Nota: Crear buckets desde cliente a veces requiere service_role, no anon.
            // Probaremos con anon por si acaso, si falla, pediremos al usuario crearla.
            const { data: newBucket, error: createError } = await supabase.storage.createBucket(bucketName, {
                public: true
            });

            if (createError) {
                console.error('No se pudo crear el bucket autom\u00e1ticamente:', createError.message);
                console.log('ACCION REQUERIDA: Crear bucket público "evidencia" en el dashboard de Supabase.');
            } else {
                console.log('Bucket "evidencia" creado correctamente.');
            }
        } else {
            console.log(`Bucket '${bucketName}' ya existe.`);
        }

    } catch (err: any) {
        console.error('Excepci\u00f3n:', err.message);
    }
}

checkStorage();
