-- MIGRATION: 20260108_hub_spoke_schema.sql
-- DESCRIPCION: Agrega columnas para validacion de seriales por componente y actualiza constraints.
-- AUTOR: Assistant
-- FECHA: 2026-01-08

-- 1. Agregar columnas a capturas_fotos
ALTER TABLE capturas_fotos 
ADD COLUMN IF NOT EXISTS serial_componente TEXT,
ADD COLUMN IF NOT EXISTS estado_validacion TEXT;

-- 2. Asegurar que estado_validacion tenga valores consistentes (Opcional, pero recomendado como check)
ALTER TABLE capturas_fotos DROP CONSTRAINT IF EXISTS capturas_fotos_estado_validacion_check;
ALTER TABLE capturas_fotos ADD CONSTRAINT capturas_fotos_estado_validacion_check 
CHECK (estado_validacion IN ('MATCH', 'NO_MATCH', 'MANUAL', 'OMITIDO', 'PENDIENTE'));

-- Comentarios
COMMENT ON COLUMN capturas_fotos.serial_componente IS 'Numero de serie del componente especifico (ej. del Mouse o Monitor)';
COMMENT ON COLUMN capturas_fotos.estado_validacion IS 'Resultado de la validacion contra DB: MATCH, NO_MATCH, etc.';
