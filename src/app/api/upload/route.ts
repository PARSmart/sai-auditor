import { NextRequest, NextResponse } from 'next/server';
import { uploadToSupabaseStorage } from '@/lib/storage';
import { supabase } from '@/lib/supabaseClient';

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const expediente = formData.get('expediente') as string;
        const tipoFoto = formData.get('tipo') as string; // 'etiqueta', 'pantalla', etc.

        if (!file || !expediente) {
            return NextResponse.json(
                { error: 'Faltan datos requeridos (archivo o expediente)' },
                { status: 400 }
            );
        }

        // 1. Obtener información del Empleado (Almacen, Nombre) desde Supabase
        const { data: empleado, error: dbError } = await supabase
            .from('empleados')
            .select('nombre_completo, area_nombre')
            .eq('expediente', parseInt(expediente))
            .single();

        if (dbError || !empleado) {
            console.error('Error buscando empleado:', dbError);
            return NextResponse.json({ error: 'Empleado no encontrado' }, { status: 404 });
        }

        const { nombre_completo, area_nombre } = empleado;

        // Convertir File a Buffer
        const buffer = Buffer.from(await file.arrayBuffer());

        // 2. Definir Path para Supabase Storage (Simulando carpetas)
        const currentYear = new Date().getFullYear().toString();
        const safeArea = (area_nombre || 'SIN_AREA').trim().replace(/[\/\\]./g, '_');
        const safeEmployee = `${expediente} - ${nombre_completo}`.replace(/[\/\\]./g, '_');

        // 3. Generar Nombre de Archivo
        const timestamp = Date.now();
        const cleanArea = safeArea.substring(0, 3).toUpperCase();
        const fileName = `${cleanArea}-${expediente}-${tipoFoto.toUpperCase()}_${timestamp}.${file.name.split('.').pop()}`;

        // Path Completo: 2026/AREA/EMPLEADO/ARCHIVO.jpg
        const fullPath = `${currentYear}/${safeArea}/${safeEmployee}/${fileName}`;

        const driveFile = await uploadToSupabaseStorage(
            buffer,
            fullPath,
            file.type || 'application/octet-stream'
        );

        return NextResponse.json({
            success: true,
            fileId: driveFile.id,
            webViewLink: driveFile.webViewLink,
            fileName: fileName,
            provider: 'supabase'
        });

    } catch (error: any) {
        console.error('Error en API Upload:', error);
        return NextResponse.json(
            { error: error.message || 'Error interno del servidor' },
            { status: 500 }
        );
    }
}
