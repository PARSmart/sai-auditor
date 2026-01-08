'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { AlertCircle, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const [expediente, setExpediente] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (!expediente) {
      setError('Por favor ingrese su número de expediente')
      setLoading(false)
      return
    }

    try {
      // Validar expediente en Supabase
      const { data, error: dbError } = await supabase
        .from('empleados')
        .select('*')
        .eq('expediente', parseInt(expediente))
        .eq('activo', true)
        .single()

      if (dbError || !data) {
        setError('Expediente no encontrado o inactivo.')
        setLoading(false)
        return
      }

      // Login exitoso (Simulado por ahora, podríamos guardar cookie)
      // Guardar info básica en localStorage para persistencia simple en esta fase
      localStorage.setItem('user_expediente', expediente)
      localStorage.setItem('user_name', data.nombre_completo)

      router.push('/dashboard')

    } catch (err) {
      console.error(err)
      setError('Ocurrió un error al intentar ingresar.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 relative overflow-hidden bg-background">

      {/* Background Gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-primary/20 rounded-full blur-[100px]" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[100px]" />

      <div className="w-full max-w-md space-y-8 z-10">

        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-tight text-white drop-shadow-sm">
            Auditor SAI
          </h1>
          <p className="text-muted-foreground">
            Sistema de Auditoría de Inventarios
          </p>
        </div>

        <div className="glass-dark p-8 rounded-2xl border border-white/10 space-y-6 animate-in fade-in slide-in-from-bottom-5 duration-700">
          <div className="space-y-2 text-center">
            <h2 className="text-2xl font-semibold tracking-tight">Bienvenido</h2>
            <p className="text-sm text-muted-foreground">Ingrese su número de expediente para continuar</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Input
                placeholder="Ej. 679"
                value={expediente}
                onChange={(e) => setExpediente(e.target.value)}
                type="number"
                className="bg-black/20 border-white/10 focus:border-primary/50 text-center text-lg tracking-widest"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-400 text-sm justify-center bg-red-500/10 p-2 rounded-md border border-red-500/20">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <Button
              type="submit"
              className="w-full text-lg font-semibold h-14"
              disabled={loading}
            >
              {loading ? <Loader2 className="animate-spin mr-2" /> : 'Ingresar'}
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground opacity-50">
          Version 1.0.0 &bull; © 2026 Soporte TI
        </p>
      </div>
    </main>
  )
}
