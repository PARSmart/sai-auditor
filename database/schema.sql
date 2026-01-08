-- ==================================================================
-- SCHEMA DE BASE DE DATOS - AUDITOR DE EQUIPOS
-- Sistema de Auditoría de Inventario de Equipos Arrendados
-- Alimentación para el Bienestar - Regional Occidente
-- ==================================================================
-- Fecha: 6 de Enero de 2026
-- Versión: 1.0
-- Database: PostgreSQL 15 (Supabase)
-- ==================================================================

-- ==================================================================
-- TABLA 1: empleados
-- Propósito: Catálogo de personal autorizado para usar la aplicación
-- ==================================================================

CREATE TABLE IF NOT EXISTS empleados (
  -- Identificador único
  expediente INTEGER PRIMARY KEY,

  -- Información del empleado
  nombre_completo VARCHAR(200) NOT NULL,
  area_nombre VARCHAR(100) NOT NULL,
  descripcion_puesto VARCHAR(200),
  tipo_plaza VARCHAR(50),

  -- Estado
  activo BOOLEAN DEFAULT true NOT NULL,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Comentarios de columnas
COMMENT ON COLUMN empleados.expediente IS 'Número de empleado único (ej. 679, 11727)';
COMMENT ON COLUMN empleados.nombre_completo IS 'Nombre completo del empleado (ej. ABREO GARCIA GEMA)';
COMMENT ON COLUMN empleados.area_nombre IS 'Almacén/área de adscripción (ej. CONTABILIDAD, JALISCO (PAL))';
COMMENT ON COLUMN empleados.tipo_plaza IS 'CONFIANZA o SINDICALIZADO';
COMMENT ON COLUMN empleados.activo IS 'Si el empleado está activo y puede usar la aplicación';

-- Índices para optimizar búsquedas
CREATE INDEX idx_empleados_area ON empleados(area_nombre);
CREATE INDEX idx_empleados_activo ON empleados(activo) WHERE activo = true;
CREATE INDEX idx_empleados_nombre ON empleados USING gin(to_tsvector('spanish', nombre_completo));

-- ==================================================================
-- TABLA 2: inventario_maestro
-- Propósito: Inventario de equipos arrendados (importado desde Excel)
-- ==================================================================

CREATE TABLE IF NOT EXISTS inventario_maestro (
  -- Identificador único
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Información del equipo
  unidad_operativa VARCHAR(100) NOT NULL,
  proveedor VARCHAR(200),
  serial VARCHAR(100) NOT NULL UNIQUE,
  marca VARCHAR(50),
  modelo VARCHAR(100),
  tipo_equipo VARCHAR(100),
  observaciones TEXT,
  
  -- Constraint: Normalización de mayúsculas
  CONSTRAINT serial_upper CHECK (serial = UPPER(serial)),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Comentarios de columnas
COMMENT ON COLUMN inventario_maestro.serial IS 'Número de serie del componente - CLAVE PRINCIPAL para match';
COMMENT ON COLUMN inventario_maestro.unidad_operativa IS 'Ej. UNIDAD OPERATIVA JALISCO';
COMMENT ON COLUMN inventario_maestro.proveedor IS 'Ej. FOCUS ON SERVICES, S.A. DE C.V.';
COMMENT ON COLUMN inventario_maestro.tipo_equipo IS 'Ej. L2_Equipo Portatil Avanzado, MULTIFUNCIONAL, L2_Monitor';

-- Índices para optimizar búsquedas
CREATE UNIQUE INDEX idx_inventario_serial ON inventario_maestro(serial);
CREATE INDEX idx_inventario_tipo ON inventario_maestro(tipo_equipo);
CREATE INDEX idx_inventario_unidad ON inventario_maestro(unidad_operativa);
CREATE INDEX idx_inventario_marca ON inventario_maestro(marca);

-- ==================================================================
-- TABLA 3: capturas
-- Propósito: Registros de equipos capturados por usuarios
-- ==================================================================

CREATE TABLE IF NOT EXISTS capturas (
  -- Identificador único
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relación con empleado
  expediente_usuario INTEGER NOT NULL REFERENCES empleados(expediente) ON DELETE CASCADE,

  -- Información del equipo capturado
  tipo_equipo_capturado VARCHAR(50) NOT NULL CHECK (tipo_equipo_capturado IN ('laptop', 'escritorio', 'multifuncional')),

  -- Serie (puede venir de escaneo o manual)
  serial_escaneado VARCHAR(100),
  serial_manual VARCHAR(100),
  etiqueta_legible BOOLEAN NOT NULL,

  -- Observaciones del usuario
  observaciones TEXT,
  equipo_buen_estado BOOLEAN DEFAULT false,

  -- TAG único generado automáticamente
  tag_generado VARCHAR(100) UNIQUE,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  -- Constraint: al menos uno de los dos seriales debe estar presente
  CONSTRAINT check_serial_presente CHECK (
    serial_escaneado IS NOT NULL OR serial_manual IS NOT NULL
  ),
  -- Constraint: Normalización de mayúsculas
  CONSTRAINT serial_escaneado_upper CHECK (serial_escaneado = UPPER(serial_escaneado)),
  CONSTRAINT serial_manual_upper CHECK (serial_manual = UPPER(serial_manual))
);

-- Comentarios de columnas
COMMENT ON COLUMN capturas.expediente_usuario IS 'Empleado que capturó el equipo';
COMMENT ON COLUMN capturas.tipo_equipo_capturado IS 'laptop, escritorio o multifuncional';
COMMENT ON COLUMN capturas.serial_escaneado IS 'Serie obtenida del escaneo QR/Barras';
COMMENT ON COLUMN capturas.serial_manual IS 'Serie ingresada manualmente (fallback)';
COMMENT ON COLUMN capturas.etiqueta_legible IS 'true si se pudo escanear, false si requiere OCR';
COMMENT ON COLUMN capturas.tag_generado IS 'TAG auto-generado (ej. JAL-679-LAPTOP-01)';

-- Índices para optimizar búsquedas
CREATE INDEX idx_capturas_expediente ON capturas(expediente_usuario);
CREATE INDEX idx_capturas_etiqueta ON capturas(etiqueta_legible) WHERE etiqueta_legible = false;
CREATE INDEX idx_capturas_tag ON capturas(tag_generado);
CREATE INDEX idx_capturas_tipo ON capturas(tipo_equipo_capturado);
CREATE INDEX idx_capturas_serial_escaneado ON capturas(serial_escaneado) WHERE serial_escaneado IS NOT NULL;

-- ==================================================================
-- TABLA 4: capturas_fotos
-- Propósito: URLs de fotos subidas a Google Drive
-- ==================================================================

CREATE TABLE IF NOT EXISTS capturas_fotos (
  -- Identificador único
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relación con captura
  captura_id UUID NOT NULL REFERENCES capturas(id) ON DELETE CASCADE,

  -- Información de la foto
  orden INTEGER NOT NULL CHECK (orden > 0),
  tipo_foto VARCHAR(50) NOT NULL CHECK (tipo_foto IN ('pantalla', 'perifericos', 'docking', 'ups', 'completo')),

  -- URLs de Drive
  url_drive TEXT NOT NULL,
  drive_file_id VARCHAR(100),

  -- Metadata
  tamano_bytes BIGINT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  -- Constraint: orden único por captura
  CONSTRAINT unique_orden_por_captura UNIQUE (captura_id, orden)
);

-- Comentarios de columnas
COMMENT ON COLUMN capturas_fotos.captura_id IS 'Captura asociada';
COMMENT ON COLUMN capturas_fotos.orden IS 'Orden de la foto (1, 2, 3...)';
COMMENT ON COLUMN capturas_fotos.tipo_foto IS 'pantalla, perifericos, docking, ups, completo';
COMMENT ON COLUMN capturas_fotos.url_drive IS 'URL completa de la foto en Drive (webViewLink)';
COMMENT ON COLUMN capturas_fotos.drive_file_id IS 'ID del archivo en Drive (para eliminación si es necesario)';

-- Índices para optimizar búsquedas
CREATE INDEX idx_fotos_captura ON capturas_fotos(captura_id);
CREATE INDEX idx_fotos_tipo ON capturas_fotos(tipo_foto);
CREATE INDEX idx_fotos_orden ON capturas_fotos(captura_id, orden);

-- ==================================================================
-- FUNCIONES Y TRIGGERS
-- ==================================================================

-- Función para actualizar el timestamp updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para empleados
CREATE TRIGGER set_updated_at_empleados
BEFORE UPDATE ON empleados
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Trigger para inventario_maestro
CREATE TRIGGER set_updated_at_inventario
BEFORE UPDATE ON inventario_maestro
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ==================================================================
-- ROW LEVEL SECURITY (RLS) - Políticas de Seguridad
-- ==================================================================

-- Nota: Este sistema NO usa Supabase Auth tradicional.
-- La autenticación es un simple matching del expediente.
-- Por tanto, las políticas RLS son más permisivas.

-- Habilitar RLS en todas las tablas
ALTER TABLE empleados ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventario_maestro ENABLE ROW LEVEL SECURITY;
ALTER TABLE capturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE capturas_fotos ENABLE ROW LEVEL SECURITY;

-- ==================================================================
-- POLÍTICA 1: empleados (Solo lectura)
-- ==================================================================

CREATE POLICY "Permitir lectura de empleados activos"
ON empleados
FOR SELECT
USING (activo = true);

-- ==================================================================
-- POLÍTICA 2: inventario_maestro (Solo lectura)
-- ==================================================================

CREATE POLICY "Permitir lectura de inventario maestro"
ON inventario_maestro
FOR SELECT
USING (true);

-- ==================================================================
-- POLÍTICA 3: capturas (CRUD)
-- ==================================================================

-- Permitir INSERT solo si el expediente es válido
CREATE POLICY "Permitir inserción de capturas con expediente válido"
ON capturas
FOR INSERT
WITH CHECK (
  expediente_usuario IN (
    SELECT expediente FROM empleados WHERE activo = true
  )
);

-- Permitir SELECT de todas las capturas (para reportes)
CREATE POLICY "Permitir lectura de todas las capturas"
ON capturas
FOR SELECT
USING (true);

-- Permitir UPDATE solo de las propias capturas (por si se implementa edición)
CREATE POLICY "Permitir actualización de propias capturas"
ON capturas
FOR UPDATE
USING (
  expediente_usuario IN (
    SELECT expediente FROM empleados WHERE activo = true
  )
);

-- ==================================================================
-- POLÍTICA 4: capturas_fotos (CRUD vinculado a capturas)
-- ==================================================================

-- Permitir INSERT de fotos asociadas a capturas válidas
CREATE POLICY "Permitir inserción de fotos para capturas válidas"
ON capturas_fotos
FOR INSERT
WITH CHECK (
  captura_id IN (SELECT id FROM capturas)
);

-- Permitir SELECT de todas las fotos
CREATE POLICY "Permitir lectura de todas las fotos"
ON capturas_fotos
FOR SELECT
USING (true);

-- ==================================================================
-- VISTAS ÚTILES PARA REPORTES
-- ==================================================================

-- Vista: Capturas con información del empleado
CREATE OR REPLACE VIEW v_capturas_con_empleado AS
SELECT
  c.id,
  c.tag_generado,
  c.tipo_equipo_capturado,
  c.serial_escaneado,
  c.serial_manual,
  c.etiqueta_legible,
  c.observaciones,
  c.equipo_buen_estado,
  c.created_at,
  c.expediente_usuario, -- Added for statistics
  e.expediente,
  e.nombre_completo,
  e.area_nombre,
  -- Contar fotos asociadas
  (SELECT COUNT(*) FROM capturas_fotos WHERE captura_id = c.id) as total_fotos
FROM capturas c
INNER JOIN empleados e ON c.expediente_usuario = e.expediente;

COMMENT ON VIEW v_capturas_con_empleado IS 'Vista con capturas enriquecidas con información del empleado';

-- Vista: Estadísticas de captura por almacén
CREATE OR REPLACE VIEW v_estadisticas_por_almacen AS
SELECT
  area_nombre as almacen,
  COUNT(DISTINCT expediente_usuario) as total_usuarios,
  COUNT(*) as total_equipos_capturados,
  SUM(CASE WHEN tipo_equipo_capturado = 'laptop' THEN 1 ELSE 0 END) as laptops,
  SUM(CASE WHEN tipo_equipo_capturado = 'escritorio' THEN 1 ELSE 0 END) as escritorios,
  SUM(CASE WHEN tipo_equipo_capturado = 'multifuncional' THEN 1 ELSE 0 END) as multifuncionales,
  SUM(CASE WHEN etiqueta_legible = false THEN 1 ELSE 0 END) as equipos_sin_etiqueta_legible,
  SUM(CASE WHEN equipo_buen_estado = true THEN 1 ELSE 0 END) as equipos_buen_estado
FROM v_capturas_con_empleado
GROUP BY area_nombre
ORDER BY total_equipos_capturados DESC;

COMMENT ON VIEW v_estadisticas_por_almacen IS 'Estadísticas agregadas de capturas por almacén';

-- ==================================================================
-- FUNCIONES ÚTILES PARA LA APLICACIÓN
-- ==================================================================

-- Función: Validar si un expediente existe y está activo
CREATE OR REPLACE FUNCTION validar_expediente(p_expediente INTEGER)
RETURNS TABLE (
  expediente INTEGER,
  nombre_completo VARCHAR(200),
  area_nombre VARCHAR(100),
  activo BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.expediente,
    e.nombre_completo,
    e.area_nombre,
    e.activo
  FROM empleados e
  WHERE e.expediente = p_expediente
    AND e.activo = true;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION validar_expediente IS 'Valida si un expediente existe y está activo';

-- Función: Generar TAG único para una captura
CREATE OR REPLACE FUNCTION generar_tag_captura(
  p_expediente INTEGER,
  p_tipo_equipo VARCHAR(50)
)
RETURNS VARCHAR(100) AS $$
DECLARE
  v_consecutivo INTEGER;
  v_tag VARCHAR(100);
BEGIN
  -- Contar cuántos equipos de este tipo ya registró el usuario
  SELECT COUNT(*) INTO v_consecutivo
  FROM capturas
  WHERE expediente_usuario = p_expediente
    AND tipo_equipo_capturado = p_tipo_equipo;

  -- Incrementar consecutivo
  v_consecutivo := v_consecutivo + 1;

  -- Generar TAG: JAL-{expediente}-{tipo_upper}-{consecutivo_padded}
  v_tag := 'JAL-' ||
           p_expediente || '-' ||
           UPPER(p_tipo_equipo) || '-' ||
           LPAD(v_consecutivo::TEXT, 2, '0');

  RETURN v_tag;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generar_tag_captura IS 'Genera un TAG único para una captura (ej. JAL-679-LAPTOP-01)';

-- ==================================================================
-- DATOS DE EJEMPLO (Solo para testing, eliminar en producción)
-- ==================================================================

-- Insertar un empleado de ejemplo
-- INSERT INTO empleados (expediente, nombre_completo, area_nombre, descripcion_puesto, tipo_plaza)
-- VALUES (679, 'ABREO GARCIA GEMA', 'CONTABILIDAD', 'PROFESIONISTA ESPECIALIZADO(A) - F', 'CONFIANZA');

-- Insertar un equipo de ejemplo en inventario maestro
-- INSERT INTO inventario_maestro (unidad_operativa, proveedor, serial, marca, modelo, tipo_equipo)
-- VALUES ('UNIDAD OPERATIVA JALISCO', 'FOCUS ON SERVICES, S.A. DE C.V.', '2N7TR83', 'DELL', 'P2319H', 'L2_Monitor');

-- ==================================================================
-- SCRIPT DE VERIFICACIÓN
-- ==================================================================

-- Verificar que todas las tablas se crearon correctamente
DO $$
DECLARE
  tabla_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO tabla_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN ('empleados', 'inventario_maestro', 'capturas', 'capturas_fotos');

  IF tabla_count = 4 THEN
    RAISE NOTICE '✅ Todas las tablas se crearon correctamente';
  ELSE
    RAISE EXCEPTION '❌ Error: Solo se crearon % de 4 tablas', tabla_count;
  END IF;
END $$;

-- Verificar que los índices se crearon
DO $$
DECLARE
  index_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND tablename IN ('empleados', 'inventario_maestro', 'capturas', 'capturas_fotos');

  RAISE NOTICE '✅ Se crearon % índices en total', index_count;
END $$;

-- ==================================================================
-- FIN DEL SCHEMA
-- ==================================================================
