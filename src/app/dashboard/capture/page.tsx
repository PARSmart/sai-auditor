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
    validationKeywords?: string[] // Palabras clave para validar tipo (coincidencia parcial)
}

const EQUIPMENT_CONFIG: Record<string, ComponentConfig[]> = {
    laptop: [
        { id: 'serie_monitor', label: 'Monitor Externo', validationKeywords: ['MONITOR', 'PANTALLA', 'DISPLAY'] },
        { id: 'serie_laptop', label: 'Laptop (Etiqueta)', description: 'Parte inferior o bajo batería', validationKeywords: ['PORTATIL', 'LAPTOP', 'NOTEBOOK', 'DELL LATITUDE'] },
        { id: 'serie_docking', label: 'Docking Station', validationKeywords: ['DOCKING', 'REPLICADOR', 'DOCK'] },
        { id: 'serie_candado', label: 'Candado de Seguridad', validationKeywords: ['CANDADO', 'LOCK', 'SECURITY'] },
        { id: 'serie_mouse', label: 'Mouse', validationKeywords: ['MOUSE', 'RATON'] },
        { id: 'serie_teclado', label: 'Teclado Externo', validationKeywords: ['TECLADO', 'KEYBOARD'] },
        { id: 'serie_cargador', label: 'Cargador', validationKeywords: ['CARGADOR', 'ADAPTADOR', 'AC ADAPTER'] }
    ],
    escritorio: [
        { id: 'serie_monitor', label: 'Monitor Principal', validationKeywords: ['MONITOR', 'PANTALLA', 'DISPLAY'] },
        { id: 'serie_pc', label: 'CPU / Gabinete', validationKeywords: ['CPU', 'GABINETE', 'OPTIPLEX', 'K6', 'Z2', 'DESKTOP', 'COMPUTADORA'] },
        { id: 'serie_mouse', label: 'Mouse', validationKeywords: ['MOUSE', 'RATON'] },
        { id: 'serie_teclado', label: 'Teclado', validationKeywords: ['TECLADO', 'KEYBOARD'] },
        { id: 'serie_ups', label: 'UPS (No-Break)', validationKeywords: ['UPS', 'NO-BREAK', 'NO BREAK', 'REGULADOR'] }
    ],
    multifuncional: [
        { id: 'completo', label: 'Multifuncional / Impresora', description: 'Vista general', validationKeywords: ['MULTIFUNCIONAL', 'IMPRESORA', 'SCANNER', 'PRINTER'] }
    ]
}

// --- ESTADO DE CADA COMPONENTE ---
// Almacena la evidencia individual
interface ComponentEvidence {
    id: string // ID del componente (ej. 'serie_mouse')
    status: 'PENDING' | 'CAPTURED' | 'NOT_FOUND_DB' | 'SKIPPED' | 'WRONG_TYPE'
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
    const [tempValidation, setTempValidation] = useState<{ status: 'PENDING' | 'CAPTURED' | 'NOT_FOUND_DB' | 'SKIPPED' | 'WRONG_TYPE', msg?: string } | null>(null)
    const [isManual, setIsManual] = useState(false)
    const [scannerActive, setScannerActive] = useState(true)

    // ESTADO DE SESIÓN (PERSISTENCIA)
    const [currentCaptureId, setCurrentCaptureId] = useState<string | null>(null)
    const [currentTag, setCurrentTag] = useState<string>('')

    // FASE 1: INICIALIZAR / RECUPERAR SESIÓN
    useMemo(() => {
        if (!tipoEquipo) return

        const initSession = async () => {
            setLoading(true)
            try {
                const expediente = localStorage.getItem('user_expediente')
                if (!expediente) return

                const res = await fetch('/api/capture/init', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ expediente, tipo_equipo: tipoEquipo })
                })

                if (!res.ok) throw new Error('Error iniciando sesión')

                const data = await res.json()
                setCurrentCaptureId(data.id)
                setCurrentTag(data.tag)

                // Si es RESUME, hidratar evidencia
                if (data.mode === 'RESUME' && data.photos) {
                    const hydratedEvidence: Record<string, ComponentEvidence> = {}
                    data.photos.forEach((p: any) => {
                        hydratedEvidence[p.tipo_foto] = {
                            id: p.tipo_foto,
                            status: p.estado_validacion === 'NO_MATCH' ? 'NOT_FOUND_DB' : 'CAPTURED',
                            serial: p.serial_componente || 'S/N',
                            photoPreview: p.url_drive, // Ya existe
                            validationMsg: 'Recuperado de sesión anterior'
                        }
                    })
                    setEvidence(hydratedEvidence)
                    alert(`¡Sesión Recuperada! TAG: ${data.tag}`)
                }
            } catch (e) {
                console.error(e)
                setError('Error conectando con servidor de auditoría')
            } finally {
                setLoading(false)
            }
        }

        initSession()
    }, [tipoEquipo])

    // --- LOGICA DE FLUJO ---

    // 1. Iniciar Captura de un Componente (Click en Tarjeta)
    const openComponent = (compId: string) => {
        const existing = evidence[compId]

        // RULE: Unique Photo Check (Sustitución Controlada)
        if (existing?.status === 'CAPTURED' && existing.photoPreview) {
            if (!confirm('⚠️ Ya existe una fotografía para este componente.\n\n¿Deseas sustituirla por una nueva?')) {
                return // Cancelado por usuario
            }
        }

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
                // VALIDACIÓN CRUZADA DE TIPO
                const currentConfig = EQUIPMENT_CONFIG[tipoEquipo!].find(c => c.id === activeComponentId)
                const descripcionBD = (data.tipo_equipo || '') + ' ' + (data.descripcion || '')
                const descripcionUpper = descripcionBD.toUpperCase()

                // Verificar si incluye alguna keyword esperada
                const esTipoCorrecto = currentConfig?.validationKeywords?.some(keyword =>
                    descripcionUpper.includes(keyword)
                )

                // Si no tiene keywords definidas, asumimos correcto (comportamiento fallback)
                // O si encontró coincidencia
                if (!currentConfig?.validationKeywords || esTipoCorrecto) {
                    setTempValidation({
                        status: 'CAPTURED', // Provisional, espera foto
                        msg: `${data.descripcion} (${data.marca})`
                    })
                } else {
                    // BLOQUEO: Tipo incorrecto detectado y serial SÍ existe en BD
                    setTempValidation({
                        status: 'WRONG_TYPE',
                        msg: `El número de serie ${serialToValidate} No corresponde al dispositivo que quieres registrar (${currentConfig?.label}), Ya que dicho Número de serie corresponde a un "${data.tipo_equipo}" según la base de datos maestra. Presiona el botón de retornar y elige el correcto.`
                    })
                }
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

    // 3. GUARDADO INCREMENTAL (Photo-by-Photo)
    const saveComponentEvidence = async (blob: Blob, preview: string, skip = false) => {
        if (!activeComponentId || !currentCaptureId) return

        setLoading(true)
        try {
            const expediente = localStorage.getItem('user_expediente')!
            const status = skip ? 'SKIPPED' : (tempValidation?.status || 'CAPTURED')
            const serialValue = skip ? 'OMITIDO' : tempSerial

            // A. Subir a Storage
            const formData = new FormData()
            formData.append('file', blob, `${activeComponentId}.jpg`)
            formData.append('expediente', expediente)
            formData.append('tipo', activeComponentId)


            // Usamos la misma API de upload pero ahora el nombre se genera allá.
            const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData })
            if (!uploadRes.ok) throw new Error('Error subiendo imagen')
            const uploadData = await uploadRes.json()

            // B. Insertar en BD (Vinculado a currentCaptureId)
            const { error: dbError } = await supabase
                .from('capturas_fotos')
                .upsert({ // CHANGED: Upsert para permitir sustitución
                    captura_id: currentCaptureId,
                    tipo_foto: activeComponentId,
                    url_drive: uploadData.webViewLink,
                    drive_file_id: uploadData.fileId,
                    orden: 1, // Fix: Constraint requires > 0
                    serial_componente: serialValue,
                    estado_validacion: status === 'NOT_FOUND_DB' ? 'NO_MATCH' : 'MATCH'
                }, { onConflict: 'captura_id, tipo_foto' }) // Constraint UNIQUE

            if (dbError) throw dbError

            // C. Actualizar Estado Local (UI)
            const newEvidence: ComponentEvidence = {
                id: activeComponentId,
                status: status as any,
                serial: serialValue,
                validationMsg: tempValidation?.msg,
                photoBlob: blob,
                photoPreview: preview
            }

            setEvidence(prev => ({ ...prev, [activeComponentId]: newEvidence }))
            setActiveComponentId(null) // Volver al Dashboard

        } catch (e: any) {
            console.error(e)
            alert('Error guardando evidencia: ' + e.message)
        } finally {
            setLoading(false)
        }
    }

    // 4. CIERRE FINAL (Solo cambio de Status)
    const handleFinalSave = async () => {
        if (!currentCaptureId) return
        setLoading(true)
        try {
            // Solo actualizamos el status, ya que las fotos se guardaron incrementalmente
            // 4.1 Identificar Serial Principal para el Header
            let mainSerial = 'VARIOS'
            if (tipoEquipo === 'laptop') mainSerial = evidence['serie_laptop']?.serial || 'PENDING'
            if (tipoEquipo === 'escritorio') mainSerial = evidence['serie_pc']?.serial || 'PENDING'
            if (tipoEquipo === 'multifuncional') mainSerial = evidence['completo']?.serial || 'PENDING'

            // 4.2 Actualizar Header (Status + Serial Principal)
            const { error } = await supabase
                .from('capturas')
                .update({
                    status: 'COMPLETED',
                    no_serie: mainSerial
                })
                .eq('id', currentCaptureId)

            if (error) throw error

            alert('¡Auditoría Finalizada Correctamente!')
            router.push('/dashboard')
        } catch (e: any) {
            console.error(e)
            alert('Error finalizando: ' + e.message)
        } finally {
            setLoading(false)
        }
    }

    // --- RENDERERS ---

    // VISTA 1: SELECTOR TIPO
    if (!tipoEquipo) {
        return (
            <div className="min-h-screen bg-background p-6 flex flex-col items-center justify-center space-y-12 animate-in fade-in bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-background to-background">
                <div className="text-center space-y-4">
                    <div className="inline-block p-4 rounded-full bg-slate-900/50 border border-slate-800 mb-2 shadow-xl shadow-indigo-500/10">
                        <Search className="w-8 h-8 text-indigo-400" />
                    </div>
                    <h1 className="text-4xl font-bold tracking-tight text-white">Nueva Auditoría</h1>
                    <p className="text-slate-400 text-lg">Selecciona el tipo de equipo a auditar</p>
                </div>

                <div className="grid grid-cols-1 gap-4 w-full max-w-md">
                    <button
                        className="group relative h-28 w-full rounded-2xl border border-slate-800 bg-slate-900/40 hover:bg-slate-900/60 hover:border-indigo-500/50 transition-all duration-300 active:scale-[0.98] overflow-hidden text-left p-6 flex flex-col justify-center gap-1 shadow-lg"
                        onClick={() => setTipoEquipo('laptop')}
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <span className="text-2xl mb-1 block group-hover:scale-110 transition-transform origin-left w-fit">💻</span>
                        <span className="text-xl font-bold text-slate-200 group-hover:text-white transition-colors">Laptop</span>
                        <span className="text-xs text-slate-500 group-hover:text-indigo-300 transition-colors">Incluye Docking y Periféricos</span>
                        <ChevronRight className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-700 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" size={24} />
                    </button>

                    <button
                        className="group relative h-28 w-full rounded-2xl border border-slate-800 bg-slate-900/40 hover:bg-slate-900/60 hover:border-indigo-500/50 transition-all duration-300 active:scale-[0.98] overflow-hidden text-left p-6 flex flex-col justify-center gap-1 shadow-lg"
                        onClick={() => setTipoEquipo('escritorio')}
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <span className="text-2xl mb-1 block group-hover:scale-110 transition-transform origin-left w-fit">🖥️</span>
                        <span className="text-xl font-bold text-slate-200 group-hover:text-white transition-colors">Escritorio</span>
                        <span className="text-xs text-slate-500 group-hover:text-indigo-300 transition-colors">CPU, Monitor y UPS</span>
                        <ChevronRight className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-700 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" size={24} />
                    </button>

                    <button
                        className="group relative h-28 w-full rounded-2xl border border-slate-800 bg-slate-900/40 hover:bg-slate-900/60 hover:border-indigo-500/50 transition-all duration-300 active:scale-[0.98] overflow-hidden text-left p-6 flex flex-col justify-center gap-1 shadow-lg"
                        onClick={() => setTipoEquipo('multifuncional')}
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <span className="text-2xl mb-1 block group-hover:scale-110 transition-transform origin-left w-fit">🖨️</span>
                        <span className="text-xl font-bold text-slate-200 group-hover:text-white transition-colors">Multifuncional</span>
                        <span className="text-xs text-slate-500 group-hover:text-indigo-300 transition-colors">Impresoras y Escáneres</span>
                        <ChevronRight className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-700 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" size={24} />
                    </button>
                </div>

                <Button
                    variant="ghost"
                    onClick={() => router.back()}
                    className="text-slate-500 hover:text-white hover:bg-slate-800/50 w-full max-w-xs transition-colors"
                >
                    Cancelar
                </Button>
            </div>
        )
    }

    // VISTA 2: DETALLE (CAPTURING)
    if (activeComponentId) {
        const config = EQUIPMENT_CONFIG[tipoEquipo].find(c => c.id === activeComponentId)!

        return (
            <div className="min-h-screen bg-background p-4 flex flex-col animate-in slide-in-from-right relative pb-6">
                {/* Header Detalle */}
                <div className="flex items-center gap-4 mb-6 pt-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setActiveComponentId(null)}
                        className="h-10 w-10 rounded-xl border border-slate-800 bg-slate-900/50 hover:bg-slate-800 text-slate-400"
                    >
                        <ArrowLeft />
                    </Button>
                    <div>
                        <h2 className="font-bold text-xl text-foreground tracking-tight">{config.label}</h2>
                        <p className="text-xs text-slate-400 font-medium tracking-wide">Captura de Serial y Evidencia</p>
                    </div>
                </div>

                {/* Paso 1: Serial */}
                {!tempValidation ? (
                    <div className="space-y-6 flex-1 flex flex-col">
                        <div className="glass-dark p-1 rounded-2xl flex relative bg-slate-900/40 border-slate-800">
                            {/* Segmented Control Background Animation could go here but simple is fine for now */}
                            <button
                                onClick={() => { setIsManual(false); setScannerActive(true) }}
                                className={`flex-1 py-3 text-sm font-medium rounded-xl transition-all duration-300 flex items-center justify-center gap-2 ${!isManual ? 'bg-slate-800 text-white shadow-lg shadow-black/20' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                <Camera size={16} /> Escáner
                            </button>
                            <button
                                onClick={() => { setIsManual(true); setScannerActive(false) }}
                                className={`flex-1 py-3 text-sm font-medium rounded-xl transition-all duration-300 flex items-center justify-center gap-2 ${isManual ? 'bg-slate-800 text-white shadow-lg shadow-black/20' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                <LayoutGrid size={16} /> Manual
                            </button>
                        </div>

                        <div className="flex-1 flex flex-col">
                            {!isManual ? (
                                <div className="bg-black rounded-2xl overflow-hidden relative flex-1 min-h-[400px] border border-slate-800 shadow-2xl">
                                    <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/80 to-transparent z-10 pointer-events-none" />
                                    <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/80 to-transparent z-10 pointer-events-none" />

                                    {scannerActive && <Scanner
                                        onScanSuccess={(txt) => validateSerial(txt)}
                                        onScanError={() => { }}
                                    />}

                                    {/* Overlay Guide */}
                                    <div className="absolute inset-0 z-20 pointer-events-none flex items-center justify-center">
                                        <div className="w-[80%] h-[200px] border-2 border-white/20 rounded-xl relative">
                                            <div className="absolute top-0 left-0 w-8 h-8 border-l-2 border-t-2 border-primary rounded-tl-xl" />
                                            <div className="absolute top-0 right-0 w-8 h-8 border-r-2 border-t-2 border-primary rounded-tr-xl" />
                                            <div className="absolute bottom-0 left-0 w-8 h-8 border-l-2 border-b-2 border-primary rounded-bl-xl" />
                                            <div className="absolute bottom-0 right-0 w-8 h-8 border-r-2 border-b-2 border-primary rounded-br-xl" />
                                            <div className="absolute inset-0 bg-primary/5 animate-pulse" />
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-6 pt-10 px-2">
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest ml-1">Número de Serie</label>
                                        <Input
                                            placeholder="Escriba el serial..."
                                            value={tempSerial}
                                            onChange={(e) => setTempSerial(e.target.value)}
                                            className="text-xl uppercase h-14 bg-slate-900/50 border-slate-700 focus:border-indigo-500 focus:ring-indigo-500/20 rounded-xl px-4 tracking-wide font-mono"
                                            autoFocus
                                        />
                                    </div>

                                    <Button
                                        onClick={() => validateSerial(tempSerial)}
                                        disabled={!tempSerial}
                                        className="w-full h-14 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 rounded-2xl text-lg font-bold shadow-lg shadow-indigo-500/20"
                                    >
                                        Validar Serial
                                    </Button>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-center pt-4">
                            <button
                                className="group flex items-center gap-2 text-slate-500 hover:text-red-400 transition-colors px-6 py-3 rounded-xl hover:bg-red-500/10"
                                onClick={() => {
                                    if (confirm('¿Este componente NO existe fisicamente?')) saveComponentEvidence(new Blob(), '', true)
                                }}
                            >
                                <Ban className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                <span className="font-medium text-sm">Marcar como No Existe</span>
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6 flex-1 flex flex-col">
                        {/* Resultado Validación */}
                        <div className={`p-6 rounded-2xl border backdrop-blur-md relative overflow-hidden ${tempValidation.status === 'NOT_FOUND_DB' ? 'bg-yellow-950/20 border-yellow-500/30' :
                            tempValidation.status === 'WRONG_TYPE' ? 'bg-red-950/20 border-red-500/30' :
                                'bg-emerald-950/20 border-emerald-500/30 shadow-[0_0_30px_-5px_rgba(16,185,129,0.1)]'
                            }`}>

                            <div className="flex items-center gap-4 mb-3 relative z-10">
                                <div className={`p-3 rounded-full ${tempValidation.status === 'NOT_FOUND_DB' ? 'bg-yellow-500/20' :
                                    tempValidation.status === 'WRONG_TYPE' ? 'bg-red-500/20' : 'bg-emerald-500/20'
                                    }`}>
                                    {tempValidation.status === 'NOT_FOUND_DB' && <AlertCircle className="text-yellow-500" size={24} />}
                                    {tempValidation.status === 'WRONG_TYPE' && <Ban className="text-red-500" size={24} />}
                                    {tempValidation.status === 'CAPTURED' && <CheckCircle2 className="text-emerald-500" size={24} />}
                                </div>

                                <div>
                                    <h3 className={`font-bold text-lg tracking-tight ${tempValidation.status === 'NOT_FOUND_DB' ? 'text-yellow-500' :
                                        tempValidation.status === 'WRONG_TYPE' ? 'text-red-500' : 'text-emerald-500'
                                        }`}>
                                        {tempValidation.status === 'NOT_FOUND_DB' ? 'NO REGISTRADO' :
                                            tempValidation.status === 'WRONG_TYPE' ? 'TIPO INCORRECTO' : 'VALIDACIÓN EXITOSA'}
                                    </h3>
                                    <p className="text-xs text-slate-400 font-mono mt-1">{tempSerial}</p>
                                </div>
                            </div>

                            <p className="text-sm text-slate-300 leading-relaxed relative z-10 pl-[3.25rem]">{tempValidation.msg}</p>

                            {/* Botón Retornar Específico para Error de Tipo */}
                            {tempValidation.status === 'WRONG_TYPE' && (
                                <Button
                                    className="w-full mt-6 h-12 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold shadow-lg shadow-red-900/20"
                                    onClick={() => {
                                        setTempValidation(null)
                                        setTempSerial('')
                                        setIsManual(false)
                                        setScannerActive(true)
                                    }}
                                >
                                    <ArrowLeft className="mr-2" size={18} /> Retornar y corregir
                                </Button>
                            )}
                        </div>

                        {/* Foto Evidencia (Ocultar si hay error de tipo bloqueante) */}
                        {tempValidation.status !== 'WRONG_TYPE' && (
                            <div className="flex-1 flex flex-col justify-end">
                                <div className="rounded-3xl overflow-hidden border border-slate-800 shadow-2xl relative flex-1 min-h-[400px]">
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
                )}
            </div>
        )
    }

    // VISTA 3: DASHBOARD (HUB)
    if (!tipoEquipo) return null
    const config = EQUIPMENT_CONFIG[tipoEquipo]
    const totalItems = config.length
    const capturedCount = Object.keys(evidence).length
    const progress = Math.round((capturedCount / totalItems) * 100)
    const isComplete = capturedCount === totalItems

    return (
        <div className="min-h-screen bg-background p-4 flex flex-col space-y-6 animate-in fade-in pb-32">
            {/* Header Dashboard */}
            <div className="flex items-center justify-between pt-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">Auditoría {tipoEquipo.charAt(0).toUpperCase() + tipoEquipo.slice(1)}</h1>
                    <p className="text-sm text-slate-400 mt-1">{capturedCount} de {totalItems} completados</p>
                </div>
                <div className="text-right">
                    <span className="text-3xl font-bold text-primary">{progress}%</span>
                    <p className="text-[10px] text-slate-500 font-mono tracking-wider">{currentTag}</p>
                </div>
            </div>

            {/* Premium List (Vertical Stack) */}
            <div className="space-y-3">
                {config.map(item => {
                    const itemData = evidence[item.id]
                    const status = itemData?.status

                    // Estado Visual
                    let cardClasses = 'bg-slate-900/40 border-slate-800 hover:border-indigo-500/50 hover:bg-slate-900/60'
                    let textClasses = 'text-slate-200'
                    let iconBox = 'bg-slate-800 text-slate-400'
                    let Icon = AlertCircle
                    let statusText = 'PENDIENTE'

                    if (status === 'CAPTURED') {
                        cardClasses = 'bg-emerald-950/20 border-emerald-500/30 shadow-[0_0_15px_-3px_rgba(16,185,129,0.1)]'
                        textClasses = 'text-emerald-100'
                        iconBox = 'bg-emerald-500/20 text-emerald-400'
                        Icon = CheckCircle2
                        statusText = 'CAPTURADO'
                    } else if (status === 'NOT_FOUND_DB') {
                        cardClasses = 'bg-yellow-950/20 border-yellow-500/30'
                        textClasses = 'text-yellow-100'
                        iconBox = 'bg-yellow-500/20 text-yellow-400'
                        statusText = 'NO ENCONTRADO EN BD'
                    } else if (status === 'SKIPPED') {
                        cardClasses = 'bg-red-950/10 border-red-500/20 opacity-70'
                        textClasses = 'text-red-200'
                        iconBox = 'bg-red-500/10 text-red-400'
                        Icon = Ban
                        statusText = 'NO APLICA / NO EXISTE'
                    }

                    return (
                        <div
                            key={item.id}
                            onClick={() => openComponent(item.id)}
                            className={`
                                group relative overflow-hidden rounded-xl border p-4 transition-all duration-300 cursor-pointer active:scale-[0.98]
                                ${cardClasses}
                            `}
                        >
                            {/* Hover Glow */}
                            <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                            <div className="relative flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className={`p-3 rounded-xl transition-colors ${iconBox}`}>
                                        <Icon size={20} />
                                    </div>
                                    <div>
                                        <h3 className={`font-semibold ${textClasses}`}>
                                            {item.label}
                                        </h3>
                                        {itemData ? (
                                            <p className="text-xs text-slate-400 font-mono mt-0.5">
                                                {status === 'SKIPPED' ? 'Omitido' : status === 'NOT_FOUND_DB' ? `! S/N: ${itemData.serial}` : itemData.serial}
                                            </p>
                                        ) : (
                                            <p className="text-[10px] text-slate-500 font-medium tracking-wide uppercase">{statusText}</p>
                                        )}
                                    </div>
                                </div>

                                <ChevronRight className={`transition-transform duration-300 ${status === 'CAPTURED' ? 'text-emerald-500/50' : 'text-slate-600 group-hover:translate-x-1 group-hover:text-primary'}`} />
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Footer Actions (Floating) */}
            <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-slate-950 via-slate-950/95 to-transparent z-40">
                {error && (
                    <div className="mb-4 bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-sm flex gap-2 items-center animate-in slide-in-from-bottom-2">
                        <AlertCircle size={16} /> {error}
                    </div>
                )}

                <div className="flex gap-3">
                    <Button
                        variant="outline"
                        onClick={() => setTipoEquipo(null)}
                        className="h-14 px-6 rounded-2xl border-slate-700 bg-slate-900/80 hover:bg-slate-800 text-slate-300 font-medium shrink-0 flex gap-2 items-center transition-colors"
                    >
                        <ArrowLeft size={20} />
                        <span className="hidden sm:inline">Regresar</span>
                    </Button>

                    <Button
                        onClick={handleFinalSave}
                        className={`
                            flex-1 h-14 rounded-2xl text-lg font-bold shadow-lg shadow-indigo-500/20
                            transition-all duration-300
                            ${isComplete
                                ? 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white hover:scale-[1.02] active:scale-[0.98]'
                                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                            }
                        `}
                        disabled={!isComplete || loading}
                    >
                        {loading ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" />}
                        Finalizar Auditoría
                    </Button>
                </div>
            </div>
        </div>
    )
}
