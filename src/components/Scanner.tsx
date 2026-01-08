'use client';

import { Html5QrcodeScanner, Html5QrcodeScanType, Html5Qrcode, Html5QrcodeScannerState, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Camera, RefreshCw, StopCircle, AlertTriangle } from 'lucide-react';
import styles from './Scanner.module.css';

interface ScannerProps {
    onScanSuccess: (decodedText: string, decodedResult: any) => void;
    onScanError?: (errorMessage: string) => void;
    onClose?: () => void;
}

const qrcodeRegionId = "html5qr-code-full-region";

export const Scanner: React.FC<ScannerProps> = ({ onScanSuccess, onScanError, onClose }) => {
    const [isScanning, setIsScanning] = useState(false);
    const [cameras, setCameras] = useState<any[]>([]);
    const [activeCameraId, setActiveCameraId] = useState<string | null>(null);
    const [permissionError, setPermissionError] = useState<string | null>(null);

    // Refs para control de estado asíncrono robusto
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const isMounted = useRef(true);
    const isStarting = useRef(false);

    useEffect(() => {
        isMounted.current = true;

        // 1. Verificación HTTPS
        if (typeof window !== 'undefined' && !window.isSecureContext && window.location.hostname !== 'localhost') {
            const msg = '⚠️ CRÍTICO: El acceso a cámara requiere HTTPS. No funcionará mediante IP local (192.168.x.x).';
            console.error(msg);
            setPermissionError(msg);
            if (onScanError) onScanError(msg);
            return;
        }

        // 2. Obtener Cámaras
        Html5Qrcode.getCameras().then(devices => {
            if (!isMounted.current) return;

            if (devices && devices.length) {
                setCameras(devices);
                const backCamera = devices.find(d => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('trasera'));
                setActiveCameraId(backCamera ? backCamera.id : devices[0].id);
            } else {
                setPermissionError('No se detectaron cámaras.');
            }
        }).catch(err => {
            if (!isMounted.current) return;
            console.error('Error obteniendo cámaras', err);
            let msg = 'No se pudo acceder a la cámara.';
            if (err.name === 'NotAllowedError') msg = 'Permiso de cámara denegado.';
            if (err.name === 'NotFoundError') msg = 'No se encontró hardware de cámara.';
            setPermissionError(msg);
            if (onScanError) onScanError(msg);
        });

        // 3. CLEANUP ROBUSTO (Manejo de Race Conditions)
        return () => {
            isMounted.current = false;
            const scanner = scannerRef.current;

            if (scanner) {
                // Si está escaneando, detener la cámara (Hardware)
                // IMPORTANTE: No llamamos a scanner.clear() aquí porque React 
                // ya está desmontando el DOM. Modificar el DOM durante el unmount
                // causa el error "NotFoundError: Failed to execute 'removeChild'".
                try {
                    if (scanner.isScanning) {
                        scanner.stop().catch(err => console.warn('Error cleanup stop:', err));
                    }
                } catch (e) {
                    console.warn('Error cleanup:', e);
                }
            }
        };
    }, []);

    const startScanning = async () => {
        if (!activeCameraId || isStarting.current || permissionError) return;

        isStarting.current = true;

        try {
            // Asegurar limpieza previa si existe instancia
            if (scannerRef.current) {
                try {
                    if (scannerRef.current.isScanning) {
                        await scannerRef.current.stop();
                    }
                    scannerRef.current.clear();
                } catch (e) {
                    console.warn('Limpieza previa error:', e);
                }
            }

            // Nueva instancia con configuración de formatos específicos
            const html5QrCode = new Html5Qrcode(qrcodeRegionId, {
                // FASE 1: Limitar formatos a industriales específicos (+70% velocidad)
                formatsToSupport: [
                    Html5QrcodeSupportedFormats.CODE_128,  // Inventario Dell, HP, Lenovo
                    Html5QrcodeSupportedFormats.EAN_13,    // Periféricos retail
                    Html5QrcodeSupportedFormats.CODE_39,   // Activos legacy
                    Html5QrcodeSupportedFormats.QR_CODE    // Flexibilidad futura
                ],
                verbose: false // Desactivar logging para producción
            });
            scannerRef.current = html5QrCode;

            await html5QrCode.start(
                activeCameraId,
                {
                    // FASE 1: Optimización de Decodificación
                    fps: 20, // Aumentado de 10 a 20 para mejor motion tolerance
                    qrbox: function (viewfinderWidth, viewfinderHeight) {
                        // FASE 2: Área rectangular dinámica para códigos lineales
                        const qrboxWidth = Math.floor(viewfinderWidth * 0.8);
                        const qrboxHeight = Math.floor(viewfinderHeight * 0.25);
                        return { width: qrboxWidth, height: qrboxHeight };
                    },
                    aspectRatio: 1.0,
                    // FASE 1: Solicitar alta resolución (1080p) con fallback automático
                    videoConstraints: {
                        width: { ideal: 1920 },
                        height: { ideal: 1080 },
                        facingMode: 'environment'
                    }
                },
                (decodedText, decodedResult) => {
                    if (!isMounted.current) return;
                    stopScanning(); // Detener al encontrar
                    onScanSuccess(decodedText, decodedResult);
                },
                (errorMessage) => {
                    // Ignorar errores frame a frame
                }
            );

            if (isMounted.current) {
                setIsScanning(true);

                // FASE 3: Control Avanzado de Cámara (Focus + Zoom)
                try {
                    // Usar API de html5-qrcode para obtener capacidades
                    const capabilities: any = html5QrCode.getRunningTrackCapabilities();

                    // Construir constraints solo con capacidades soportadas
                    const advancedConstraints: any = {};

                    // Focus Mode: Preferir 'continuous', fallback a 'auto'
                    if (capabilities.focusMode && capabilities.focusMode.includes('continuous')) {
                        advancedConstraints.focusMode = 'continuous';
                    } else if (capabilities.focusMode && capabilities.focusMode.includes('auto')) {
                        advancedConstraints.focusMode = 'auto';
                    }

                    // Zoom: Aplicar 1.5x si está disponible (mejor lectura de códigos pequeños)
                    if (capabilities.zoom && capabilities.zoom.max >= 1.5) {
                        advancedConstraints.zoom = 1.5;
                    }

                    // Aplicar constraints usando la API de html5-qrcode
                    if (Object.keys(advancedConstraints).length > 0) {
                        await html5QrCode.applyVideoConstraints({ advanced: [advancedConstraints] });
                        console.log('✅ [Scanner] Constraints avanzados aplicados:', advancedConstraints);
                    } else {
                        console.warn('⚠️ [Scanner] Dispositivo no soporta focus/zoom avanzado');
                    }
                } catch (constraintError) {
                    // Error en constraints no es crítico, continuar escaneando
                    console.warn('[Scanner] Error aplicando constraints de cámara:', constraintError);
                }
            } else {
                // Si se desmontó durante el start, detener inmediatamente
                html5QrCode.stop().then(() => html5QrCode.clear()).catch(console.error);
            }

        } catch (err: any) {
            console.error('Error iniciando scanner', err);
            if (isMounted.current && onScanError) onScanError(err.message || 'Error al iniciar');
        } finally {
            isStarting.current = false;
        }
    };

    const stopScanning = async () => {
        if (!scannerRef.current) return;

        try {
            if (scannerRef.current.isScanning) {
                await scannerRef.current.stop();
            }
            scannerRef.current.clear();
            if (isMounted.current) {
                setIsScanning(false);
                scannerRef.current = null;
            }
        } catch (err) {
            console.error('Error deteniendo scanner', err);
        }
    };

    return (
        <div className="flex flex-col items-center space-y-4 w-full">
            {/* Area de Escaneo y Overlay */}
            <div className="w-full max-w-[400px] overflow-hidden rounded-xl bg-black border border-white/20 aspect-square relative flex items-center justify-center shadow-2xl">

                {/* Contenedor EXCLUSIVO para html5-qrcode. React nunca debe tocar sus hijos. */}
                <div id={qrcodeRegionId} className="w-full h-full" />

                {/* FASE 4: Línea Láser Animada (solo cuando está escaneando activamente) */}
                {isScanning && <div className={styles.laserLine} />}

                {/* Overlay controlado por React (Posicionado absolutamente sobre el scanner) */}
                {!isScanning && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/80 text-muted-foreground text-sm flex flex-col gap-2 pointer-events-none">
                        {permissionError ? (
                            <>
                                <AlertTriangle className="text-yellow-500 mb-2" />
                                <span className="text-center px-4">{permissionError}</span>
                            </>
                        ) : (
                            <span>Cámara inactiva</span>
                        )}
                    </div>
                )}
            </div>

            <div className="flex flex-col gap-3 w-full max-w-[400px]">
                {!isScanning ? (
                    <Button onClick={startScanning} className="w-full h-12 text-base font-semibold" disabled={!!permissionError}>
                        <Camera className="mr-2" size={20} /> Iniciar Escáner
                    </Button>
                ) : (
                    <Button onClick={stopScanning} variant="destructive" className="w-full h-12 text-base font-semibold">
                        <StopCircle className="mr-2" size={20} /> Detener Escaneo
                    </Button>
                )}
            </div>

            {/* Selector (Info) */}
            {isScanning && cameras.length > 1 && (
                <div className="text-xs text-muted-foreground">
                    Cámara activa: {cameras.find(c => c.id === activeCameraId)?.label || 'Principal'}
                </div>
            )}
        </div>
    );
};
