import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function POST(request: NextRequest) {
    try {
        const { expediente, tipo_equipo } = await request.json();

        if (!expediente || !tipo_equipo) {
            return NextResponse.json({ error: 'Faltan datos' }, { status: 400 });
        }

        // 1. BUSCAR SESIÓN ACTIVA (Resume)
        const { data: activeSession } = await supabase
            .from('capturas')
            .select('id, tag_generado, created_at, capturas_fotos(*)')
            .eq('expediente_usuario', expediente)
            .eq('tipo_equipo_capturado', tipo_equipo)
            .eq('status', 'IN_PROGRESS')
            .single();

        if (activeSession) {
            return NextResponse.json({
                mode: 'RESUME',
                id: activeSession.id,
                tag: activeSession.tag_generado,
                photos: activeSession.capturas_fotos
            });
        }

        // 2. CREAR NUEVA SESIÓN (Start)

        // A. Obtener datos de empleado para el TAG
        const { data: empleado } = await supabase
            .from('empleados')
            .select('area_nombre')
            .eq('expediente', expediente)
            .single();

        const areaCode = (empleado?.area_nombre || 'GEN').substring(0, 3).toUpperCase();
        const year = new Date().getFullYear();
        const tipoCode = tipo_equipo.substring(0, 3).toUpperCase(); // LAP, ESC, MUL

        // B. Generar TAG Maestro: AREA-EXP-TIPO-AÑO
        // Ej: JAL-679-LAP-2026
        const newTag = `${areaCode}-${expediente}-${tipoCode}-${year}`;

        // C. Insertar (Early Insert)
        const { data: newSession, error: insertError } = await supabase
            .from('capturas')
            .insert({
                expediente_usuario: expediente,
                tipo_equipo_capturado: tipo_equipo,
                tag_generado: newTag,
                status: 'IN_PROGRESS',
                etiqueta_legible: true, // Default
                no_serie: 'PENDING' // Satisfacer Constraint check_serial_presente
            })
            .select()
            .single();

        if (insertError) {
            // Manejo de colisión
            if (insertError.code === '23505') { // Unique violation
                // Intentar recuperar la sesión existente por TAG
                const { data: existingSession, error: fetchError } = await supabase
                    .from('capturas')
                    .select('id, tag_generado, status, capturas_fotos(*)')
                    .eq('tag_generado', newTag)
                    .single();

                if (existingSession && existingSession.status === 'IN_PROGRESS') {
                    return NextResponse.json({
                        mode: 'RESUME',
                        id: existingSession.id,
                        tag: existingSession.tag_generado,
                        photos: existingSession.capturas_fotos
                    });
                }

                return NextResponse.json({
                    error: 'Ya existe una auditoría completada para este equipo en este ciclo (' + year + ').'
                }, { status: 409 });
            }
            throw insertError;
        }

        return NextResponse.json({
            mode: 'NEW',
            id: newSession.id,
            tag: newSession.tag_generado,
            photos: []
        });

    } catch (error: any) {
        console.error('Session Init Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
