'use client'

import React, { useRef, useState, useCallback } from 'react'
import Webcam from 'react-webcam'
import { Button } from '@/components/ui/Button'
import { Camera, RefreshCw, X } from 'lucide-react'

interface CameraCaptureProps {
    onCapture: (imageSrc: string | null) => void;
    label?: string;
}

export function CameraCapture({ onCapture, label = 'Tomar Foto' }: CameraCaptureProps) {
    const webcamRef = useRef<Webcam>(null)
    const [imgSrc, setImgSrc] = useState<string | null>(null)
    const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment')

    const capture = useCallback(() => {
        if (webcamRef.current) {
            const image = webcamRef.current.getScreenshot()
            setImgSrc(image)
            onCapture(image)
        }
    }, [webcamRef, onCapture])

    const retake = () => {
        setImgSrc(null)
        onCapture(null)
    }

    const flipCamera = () => {
        setFacingMode(prev => prev === 'user' ? 'environment' : 'user')
    }

    return (
        <div className="space-y-4">
            {imgSrc ? (
                <div className="relative rounded-lg overflow-hidden border border-white/10 shadow-lg">
                    <img src={imgSrc} alt="Captura" className="w-full h-auto" />
                    <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
                        <Button onClick={retake} variant="destructive" className="glass-dark hover:bg-red-500/20">
                            <RefreshCw className="mr-2 h-4 w-4" /> Retomar
                        </Button>
                    </div>
                </div>
            ) : (
                <div className="relative rounded-lg overflow-hidden bg-black aspect-video flex items-center justify-center border border-white/10 shadow-lg">
                    <Webcam
                        audio={false}
                        ref={webcamRef}
                        screenshotFormat="image/jpeg"
                        videoConstraints={{
                            facingMode: facingMode
                        }}
                        className="w-full h-full object-cover"
                    />

                    <div className="absolute top-4 right-4">
                        <Button onClick={flipCamera} size="icon" variant="ghost" className="bg-black/50 text-white rounded-full hover:bg-black/70">
                            <RefreshCw className="h-5 w-5" />
                        </Button>
                    </div>

                    <div className="absolute bottom-6 left-0 right-0 flex justify-center">
                        <Button
                            onClick={capture}
                            className="rounded-full h-16 w-16 bg-white border-4 border-gray-300 hover:bg-gray-100 transition-all shadow-xl"
                            aria-label="Capturar"
                        >
                            <div className="h-12 w-12 bg-white rounded-full border-2 border-black/10" />
                        </Button>
                    </div>
                </div>
            )}

            {label && !imgSrc && (
                <p className="text-center text-sm text-muted-foreground">{label}</p>
            )}
        </div>
    )
}
