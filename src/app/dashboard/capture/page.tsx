'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { CameraCapture } from '@/components/CameraCapture'
import { Scanner } from '@/components/Scanner'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { AlertCircle, CheckCircle2, ChevronRight, Loader2, Save, Search, Camera, Ban, LayoutGrid, ArrowLeft } from 'lucide-react'

// --- CONFIGURACION DE COMPONENTES ---
// Define la estructura de cada "Tarjeta" en el Dashboard
interface ComponentConfig {
    id: string
    label: string
    description?: string // Ej. "CPU + Monitor"
    icon?: string
}

const EQUIPMENT_CONFIG: Record<string, ComponentConfig[]> = {
    laptop: [
        { id: 'serie_monitor', label: 'Monitor Externo' },
        { id: 'serie_laptop', label: 'Laptop (Etiqueta)', description: 'Parte inferior o bajo batería' },
        { id: 'serie_docking', label: 'Docking Station' },
        { id: 'serie_candado', label: 'Candado de Seguridad' },
        { id: 'serie_mouse', label: 'Mouse' },
        { id: 'serie_teclado', label: 'Teclado Externo' },
        { id: 'serie_cargador', label: 'Cargador' }
    ],
    escritorio: [
        { id: 'serie_monitor', label: 'Monitor Principal' },
        { id: 'serie_pc', label: 'CPU / Gabinete' },
        { id: 'serie_mouse', label: 'Mouse' },
        { id: 'serie_teclado', label: 'Teclado' },
        { id: 'serie_ups', label: 'UPS (No-Break)' }
    ],
    multifuncional: [
        { id: 'completo', label: 'Multifuncional / Impresora', description: 'Vista general' }
    ]
}

// --- ESTADO DE CADA COMPONENTE ---
// Almacena la evidencia individual
interface ComponentEvidence {
    id: string // ID del componente (ej. 'serie_mouse')
    status: 'PENDING' | 'CAPTURED' | 'NOT_FOUND_DB' | 'SKIPPED'
    serial: string // Serial capturado
    validationMsg?: string // Mensaje de validación (ej. "Encontrado: Dell Mouse")
    photoBlob?: Blob
    photoPreview?: string
}

export default function CapturePage() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    // FASE 0: SELECCION DE EQUIPO
    const [tipoEquipo, setTipoEquipo] = useState<string | null>(null) // 'laptop', 'escritorio', etc.
    // Si null -> Muestra selector. Si set -> Muestra Dashboard.

    // ESTADO GLOBAL (HUB)
    // Mapa de evidencias: Key = componentId
    const [evidence, setEvidence] = useState<Record<string, ComponentEvidence>>({})

    // ESTADO DETALLE (SPOKE)
    // ID del componente activo que se está capturando (null = Dashboard)
    const [activeComponentId, setActiveComponentId] = useState<string | null>(null)

    // ESTADOS TEMPORALES (Dentro del Detalle)
    const [tempSerial, setTempSerial] = useState('')
    const [tempValidation, setTempValidation] = useState<{ status: 'PENDING' | 'CAPTURED' | 'NOT_FOUND_DB' | 'SKIPPED', msg?: string } | null>(null)
    const [isManual, setIsManual] = useState(false)
    const [scannerActive, setScannerActive] = useState(true)

    // --- LOGICA DE FLUJO ---

    // 1. Iniciar Captura de un Componente (Click en Tarjeta)
    const openComponent = (compId: string) => {
        const existing = evidence[compId]
        setActiveComponentId(compId)
        // Reset estados temporales o cargar existentes si ya editó
        setTempSerial(existing?.serial || '')
        setTempValidation(existing ? { status: existing.status, msg: existing.validationMsg } : null)
        setIsManual(false)
        setScannerActive(true)
    }

    // 2. Validar Serial (Individual)
    const validateSerial = async (serialToValidate: string) => {
        if (!serialToValidate) return
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('inventario_maestro')
                .select('*')
                .eq('serial', serialToValidate.trim().toUpperCase())
                .single()

            if (data) {
                setTempValidation({
                    status: 'CAPTURED', // Provisional, espera foto
                    msg: `${data.descripcion} (${data.marca})`
                })
            } else {
                setTempValidation({
                    status: 'NOT_FOUND_DB',
                    msg: 'No registrado en BD Principal'
                })
            }
            setTempSerial(serialToValidate.trim().toUpperCase())
        } catch (err) {
            // Error de conexión u otro, asumimos no encontrado para no bloquear
            setTempValidation({
                status: 'NOT_FOUND_DB',
                msg: 'No se pudo validar (Offline/Error)'
            })
            setTempSerial(serialToValidate.trim().toUpperCase())
        } finally {
            setLoading(false)
        }
    }

    // 3. Guardar Foto y Cerrar Detalle
    const saveComponentEvidence = (blob: Blob, preview: string, skip = false) => {
        if (!activeComponentId) return

        const status = skip ? 'SKIPPED' : (tempValidation?.status || 'CAPTURED')

        const newEvidence: ComponentEvidence = {
            id: activeComponentId,
            status: status as any,
            serial: skip ? 'OMITIDO' : tempSerial,
            validationMsg: tempValidation?.msg,
            photoBlob: skip ? undefined : blob,
            photoPreview: skip ? undefined : preview
        }

        setEvidence(prev => ({
            ...prev,
            [activeComponentId]: newEvidence
        }))

        // Volver al Dashboard
        setActiveComponentId(null)
    }

    // 4. Guardado Final (Subir Todo)
    const handleFinalSave = async () => {
        setLoading(true)
        setError('')
        try {
            const expediente = localStorage.getItem('user_expediente')
            if (!expediente) throw new Error('No hay sesión de usuario')

            // A. Crear Header de Captura
            const { data: capturaFinal, error: insertError } = await supabase
                .from('capturas')
                .insert({
                    expediente_usuario: parseInt(expediente),
                    tipo_equipo_capturado: tipoEquipo,
                    observaciones: 'Captura Hub & Spoke',
                    // Campos legacy que ya no son el foco pero requeridos por constraint si no son null
                    // Asumimos valores por defecto para este flujo nuevo
                    etiqueta_legible: true,
                    equipo_buen_estado: true,
                    // Serial principal: Tratamos de deducirlo
                    serial_escaneado: evidence['serie_laptop']?.serial || evidence['serie_pc']?.serial || 'VARIOS',
                    componentes_omitidos: Object.values(evidence).filter(e => e.status === 'SKIPPED').map(e => e.id)
                })
                .select()
                .single()

            if (insertError) throw new Error('Error al crear captura: ' + insertError.message)

            // B. Subir Fotos e Insertar Detalles
            const itemsToUpload = Object.values(evidence).filter(e => e.status !== 'SKIPPED')

            for (const item of itemsToUpload) {
                if (!item.photoBlob) continue // Should not happen

                // 1. Subir a Storage
                const formData = new FormData()
                formData.append('file', item.photoBlob, `${item.id}.jpg`)
                formData.append('expediente', expediente)
                formData.append('tipo', item.id)

                const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData })
                if (!uploadRes.ok) throw new Error(`Error subiendo foto ${item.id}`)
                const uploadData = await uploadRes.json()

                // 2. Insertar Registro
                const { error: photoError } = await supabase
                    .from('capturas_fotos')
                    .insert({
                        captura_id: capturaFinal.id,
                        url_drive: uploadData.webViewLink,
                        tipo_foto: item.id,
                        drive_file_id: uploadData.fileId,
                        orden: 0, // Ya no es tan relevante el orden secuencial

                        // ✨ NUEVOS CAMPOS ✨
                        serial_componente: item.serial,
                        estado_validacion: item.status === 'NOT_FOUND_DB' ? 'NO_MATCH' : 'MATCH'
                    })

                if (photoError) throw new Error(`Error BD Item ${item.id}: ${photoError.message}`)
            }

            alert('¡Auditoría Completada con Éxito!')
            router.push('/dashboard')

        } catch (err: any) {
            console.error(err)
            setError(err.message || 'Error desconocido')
        } finally {
            setLoading(false)
        }
    }

    // --- RENDERERS ---

    // VISTA 1: SELECTOR TIPO
    if (!tipoEquipo) {
        return (
            <div className="min-h-screen bg-background p-6 flex flex-col items-center justify-center space-y-8 animate-in fade-in">
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-bold tracking-tight">Nueva Auditoría</h1>
                    <p className="text-muted-foreground">Selecciona el tipo de equipo a auditar</p>
                </div>

                <div className="grid grid-cols-1 gap-4 w-full max-w-md">
                    <Button
                        variant="outline"
                        className="h-24 text-lg border-primary/20 hover:bg-primary/10 hover:border-primary flex flex-col gap-2"
                        onClick={() => setTipoEquipo('laptop')}
                    >
                        <span>💻 Laptop</span>
                        <span className="text-xs font-normal text-muted-foreground">Incluye Docking y Periféricos</span>
                    </Button>
                    <Button
                        variant="outline"
                        className="h-24 text-lg border-primary/20 hover:bg-primary/10 hover:border-primary flex flex-col gap-2"
                        onClick={() => setTipoEquipo('escritorio')}
                    >
                        <span>🖥️ Escritorio</span>
                        <span className="text-xs font-normal text-muted-foreground">CPU, Monitor y UPS</span>
                    </Button>
                    <Button
                        variant="outline"
                        className="h-24 text-lg border-primary/20 hover:bg-primary/10 hover:border-primary flex flex-col gap-2"
                        onClick={() => setTipoEquipo('multifuncional')}
                    >
                        <span>🖨️ Multifuncional</span>
                        <span className="text-xs font-normal text-muted-foreground">Impresoras y Escáneres</span>
                    </Button>
                </div>
                <Button variant="ghost" onClick={() => router.back()}>Cancelar</Button>
            </div>
        )
    }

    // VISTA 2: DETALLE (CAPTURING)
    if (activeComponentId) {
        const config = EQUIPMENT_CONFIG[tipoEquipo].find(c => c.id === activeComponentId)!

        return (
            <div className="min-h-screen bg-background p-4 flex flex-col animate-in slide-in-from-right relative">
                {/* Header Detalle */}
                <div className="flex items-center gap-4 mb-6">
                    <Button variant="ghost" size="icon" onClick={() => setActiveComponentId(null)}>
                        <ArrowLeft />
                    </Button>
                    <div>
                        <h2 className="font-bold text-lg">{config.label}</h2>
                        <p className="text-xs text-muted-foreground">Captura de Serial y Evidencia</p>
                    </div>
                </div>

                {/* Paso 1: Serial */}
                {!tempValidation ? (
                    <div className="space-y-6 flex-1">
                        <div className="glass-dark p-4 rounded-xl space-y-4">
                            <div className="flex justify-center bg-black/40 p-1 rounded-lg w-fit mx-auto">
                                <button
                                    onClick={() => { setIsManual(false); setScannerActive(true) }}
                                    className={`px-4 py-2 text-xs font-medium rounded-md transition-all ${!isManual ? 'bg-primary text-black' : 'text-muted-foreground'}`}
                                >
                                    Escanear
                                </button>
                                <button
                                    onClick={() => { setIsManual(true); setScannerActive(false) }}
                                    className={`px-4 py-2 text-xs font-medium rounded-md transition-all ${isManual ? 'bg-primary text-black' : 'text-muted-foreground'}`}
                                >
                                    Manual
                                </button>
                            </div>

                            {!isManual ? (
                                <div className="bg-black rounded-lg overflow-visible relative min-h-[300px] flex flex-col">
                                    {scannerActive && <Scanner
                                        onScanSuccess={(txt) => validateSerial(txt)}
                                        onScanError={() => { }}
                                    />}
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <Input
                                        placeholder="Ingrese Serial..."
                                        value={tempSerial}
                                        onChange={(e) => setTempSerial(e.target.value)}
                                        className="text-lg uppercase"
                                    />
                                    <Button className="w-full" onClick={() => validateSerial(tempSerial)} disabled={!tempSerial}>
                                        Validar
                                    </Button>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-center">
                            <Button
                                variant="ghost"
                                className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                                onClick={() => {
                                    if (confirm('¿Este componente NO existe fisicamente?')) saveComponentEvidence(new Blob(), '', true)
                                }}
                            >
                                <Ban className="mr-2 h-4 w-4" /> No existe / No aplica
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6 flex-1 flex flex-col">
                        {/* Resultado Validación */}
                        <div className={`p-4 rounded-lg border ${tempValidation.status === 'NOT_FOUND_DB' ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-green-500/10 border-green-500/30'}`}>
                            <div className="flex items-center gap-2 mb-1">
                                {tempValidation.status === 'NOT_FOUND_DB' ? <AlertCircle className="text-yellow-500" size={20} /> : <CheckCircle2 className="text-green-500" size={20} />}
                                <span className={`font-bold ${tempValidation.status === 'NOT_FOUND_DB' ? 'text-yellow-500' : 'text-green-500'}`}>
                                    {tempValidation.status === 'NOT_FOUND_DB' ? 'NO REGISTRADO' : 'ENCONTRADO'}
                                </span>
                            </div>
                            <p className="text-sm opacity-80">{tempValidation.msg}</p>
                            <p className="text-xs font-mono mt-2 bg-black/20 p-1 rounded w-fit">{tempSerial}</p>
                        </div>

                        {/* Foto Evidencia */}
                        <div className="flex-1">
                            <CameraCapture
                                label={`Foto del Serial (${config.label})`}
                                onCapture={(src) => {
                                    if (src) {
                                        fetch(src).then(r => r.blob()).then(b => saveComponentEvidence(b, src))
                                    }
                                }}
                            />
                        </div>
                    </div>
                )}
            </div>
        )
    }

    // VISTA 3: DASHBOARD (HUB)
    const config = EQUIPMENT_CONFIG[tipoEquipo]
    const totalItems = config.length
    const capturedCount = Object.keys(evidence).length
    const progress = Math.round((capturedCount / totalItems) * 100)
    const isComplete = capturedCount === totalItems

    return (
        <div className="min-h-screen bg-background p-4 flex flex-col space-y-6 animate-in fade-in">
            {/* Header Dashboard */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold">Auditoría {tipoEquipo.charAt(0).toUpperCase() + tipoEquipo.slice(1)}</h1>
                    <p className="text-xs text-muted-foreground">{capturedCount} de {totalItems} componentes procesados</p>
                </div>
                <div className="text-right">
                    <span className="text-2xl font-bold text-primary">{progress}%</span>
                </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-2 gap-3">
                {config.map(item => {
                    const itemData = evidence[item.id]
                    let statusColor = 'border-white/10 bg-card'
                    let icon = <div className="w-3 h-3 rounded-full bg-white/20" /> // Pendiente

                    if (itemData) {
                        if (itemData.status === 'CAPTURED') {
                            statusColor = 'border-green-500/50 bg-green-500/10'
                            icon = <CheckCircle2 className="w-4 h-4 text-green-500" />
                        } else if (itemData.status === 'NOT_FOUND_DB') {
                            statusColor = 'border-yellow-500/50 bg-yellow-500/10'
                            icon = <AlertCircle className="w-4 h-4 text-yellow-500" />
                        } else if (itemData.status === 'SKIPPED') {
                            statusColor = 'border-red-500/50 bg-red-500/10 opacity-70'
                            icon = <Ban className="w-4 h-4 text-red-500" />
                        }
                    }

                    return (
                        <button
                            key={item.id}
                            onClick={() => openComponent(item.id)}
                            className={`relative p-4 rounded-xl border flex flex-col items-start gap-2 transition-all active:scale-95 ${statusColor}`}
                        >
                            <div className="flex justify-between w-full">
                                <span className="font-bold text-sm text-left leading-tight">{item.label}</span>
                                {icon}
                            </div>
                            {itemData ? (
                                <p className="text-[10px] opacity-70 truncate w-full text-left">
                                    {itemData.status === 'SKIPPED' ? 'No existe' : `S/N: ${itemData.serial}`}
                                </p>
                            ) : (
                                <p className="text-[10px] text-muted-foreground">Toque para capturar</p>
                            )}
                        </button>
                    )
                })}
            </div>

            {/* Footer Actions */}
            <div className="mt-auto pt-6 space-y-3">
                {error && (
                    <div className="bg-red-500/10 text-red-500 p-3 rounded text-sm flex gap-2 items-center">
                        <AlertCircle size={16} /> {error}
                    </div>
                )}

                <Button
                    className={`w-full h-14 text-lg ${isComplete ? 'bg-primary text-black hover:bg-primary/90' : 'bg-muted text-muted-foreground'}`}
                    disabled={!isComplete || loading}
                    onClick={handleFinalSave}
                >
                    {loading ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" />}
                    Finalizar Auditoría
                </Button>

                <Button variant="ghost" className="w-full" onClick={() => setTipoEquipo(null)}>
                    Cambiar Tipo de Equipo
                </Button>
            </div>
        </div>
    )
}
