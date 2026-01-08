'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { LogOut, Package, User, PlusCircle } from 'lucide-react'

export default function DashboardPage() {
    const router = useRouter()
    const [user, setUser] = useState<{ nombre: string, expediente: string } | null>(null)

    useEffect(() => {
        // Verificar sesión "simulada"
        const expediente = localStorage.getItem('user_expediente')
        const nombre = localStorage.getItem('user_name')

        if (!expediente) {
            router.push('/')
            return
        }

        setUser({
            nombre: nombre || 'Usuario',
            expediente
        })
    }, [router])

    const handleLogout = () => {
        localStorage.clear()
        router.push('/')
    }

    if (!user) return null

    return (
        <div className="min-h-screen bg-background relative overflow-hidden">
            {/* Background Gradients */}
            <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px]" />

            {/* Header */}
            <header className="glass-dark border-b border-white/5 sticky top-0 z-50">
                <div className="container mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="bg-primary/20 p-2 rounded-lg">
                            <Package className="text-primary w-6 h-6" />
                        </div>
                        <span className="font-bold text-lg tracking-tight">Auditor SAI</span>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="hidden md:flex flex-col items-end">
                            <span className="text-sm font-medium">{user.nombre}</span>
                            <span className="text-xs text-muted-foreground">Exp: {user.expediente}</span>
                        </div>
                        <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center border border-white/10">
                            <User size={16} />
                        </div>
                        <Button variant="ghost" onClick={handleLogout} size="icon" className="text-muted-foreground hover:text-destructive transition-colors">
                            <LogOut size={20} />
                        </Button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="container mx-auto px-6 py-8 space-y-8 relative z-10">

                <div className="space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <h1 className="text-3xl font-bold">Panel de Control</h1>
                    <p className="text-muted-foreground">Bienvenido al sistema de auditoría de inventarios.</p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Card 1 */}
                    <Link href="/dashboard/capture" className="glass p-6 rounded-xl border border-white/5 hover:border-primary/50 transition-colors group cursor-pointer block">
                        <div className="flex justify-between items-start mb-4">
                            <div className="bg-blue-500/20 p-3 rounded-lg group-hover:bg-blue-500/30 transition-colors">
                                <PlusCircle className="text-blue-400 w-6 h-6" />
                            </div>
                            <span className="text-xs font-mono text-muted-foreground bg-secondary px-2 py-1 rounded">ACCIÓN</span>
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-xl font-bold">Nueva Captura</h3>
                            <p className="text-sm text-muted-foreground">Registrar equipo e inventario</p>
                        </div>
                    </Link>

                    {/* Placeholder Cards */}
                    <div className="glass p-6 rounded-xl border border-white/5 opacity-50">
                        <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                            Próximamente
                        </div>
                    </div>
                    <div className="glass p-6 rounded-xl border border-white/5 opacity-50">
                        <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                            Próximamente
                        </div>
                    </div>
                </div>

            </main>
        </div>
    )
}
