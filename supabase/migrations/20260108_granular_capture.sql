-- MIGRATION: 20260108_granular_capture.sql
-- DESCRIPCION: Actualiza el modelo de datos para soportar la "Radiografia Completa" de equipos.
-- AUTOR: Assistant
-- FECHA: 2026-01-08

-- 1. Actualizar el Constraint de tipos de foto permitidos
-- Primero eliminamos el constraint existente
ALTER TABLE capturas_fotos DROP CONSTRAINT IF EXISTS capturas_fotos_tipo_foto_check;

-- Luego lo recreamos con la lista expandida
ALTER TABLE capturas_fotos ADD CONSTRAINT capturas_fotos_tipo_foto_check 
CHECK (tipo_foto IN (
    -- Tipos Anteriores (Compatibilidad)
    'etiqueta', 'pantalla', 'perifericos', 'docking', 'completo', 'ups',
    -- Nuevos Tipos Granulares (Laptop)
    'serie_monitor', 
    'serie_laptop', 
    'serie_docking', 
    'serie_candado', 
    'serie_mouse', 
    'serie_teclado', 
    'serie_cargador',
    -- Nuevos Tipos Granulares (Escritorio)
    'serie_pc', 
    'serie_ups'
));

-- 2. Agregar columna para componentes omitidos (JSONB) en la tabla principal
-- Esto permitirá guardar un array como ["serie_candado", "serie_docking"] cuando no existan
ALTER TABLE capturas 
ADD COLUMN IF NOT EXISTS componentes_omitidos JSONB DEFAULT '[]'::jsonb;

-- Comentario para documentación
COMMENT ON COLUMN capturas.componentes_omitidos IS 'Array de strings con los tipos de foto/componentes que el usuario marcó como NO APLICA o NO ENCONTRADO';
