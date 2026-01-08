'use client';

import { Html5QrcodeScanner, Html5QrcodeScanType, Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Camera, RefreshCw, StopCircle, AlertTriangle } from 'lucide-react';

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

            // Nueva instancia
            const html5QrCode = new Html5Qrcode(qrcodeRegionId);
            scannerRef.current = html5QrCode;

            await html5QrCode.start(
                activeCameraId,
                {
                    fps: 10,
                    qrbox: { width: 250, height: 250 },
                    aspectRatio: 1.0,
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
            {/* Usamos un wrapper "relative" para apilar el overlay SOBRE el video, NO ADENTRO */}
            <div className="w-full max-w-[400px] overflow-hidden rounded-lg bg-black border border-white/20 aspect-square relative flex items-center justify-center">

                {/* Contenedor EXCLUSIVO para html5-qrcode. React nunca debe tocar sus hijos. */}
                <div id={qrcodeRegionId} className="w-full h-full" />

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

            {/* Controles */}
            <div className="flex gap-2 w-full max-w-md">
                {!isScanning ? (
                    <Button onClick={startScanning} className="w-full" disabled={!!permissionError}>
                        <Camera className="mr-2" size={18} /> Iniciar Escáner
                    </Button>
                ) : (
                    <Button onClick={stopScanning} variant="destructive" className="w-full">
                        <StopCircle className="mr-2" size={18} /> Detener
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
