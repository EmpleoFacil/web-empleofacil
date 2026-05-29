'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Briefcase, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { auth } from '@/lib/api';
import Cookies from 'js-cookie';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await auth.login(email, password);
      Cookies.set('token', res.data.accessToken, { expires: 7 });
      
      if (res.data.user.role === 'super_admin') {
        router.push('/admin/dashboard');
      } else {
        router.push('/dashboard');
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'Credenciales inválidas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Form */}
      <div className="flex-1 flex items-center justify-center px-8">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8">
            <div className="h-12 w-12 rounded-xl bg-blue-600 flex items-center justify-center">
              <Briefcase className="h-7 w-7 text-white" />
            </div>
            <span className="text-2xl font-bold text-gray-900">Empleo Fácil</span>
          </div>

          <h1 className="text-3xl font-bold text-gray-900">Bienvenido de vuelta</h1>
          <p className="mt-2 text-gray-600">Ingresa a tu cuenta para continuar</p>

          {error && (
            <div className="mt-6 flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Correo electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@empresa.com"
                required
                className="w-full h-11 rounded-lg border border-gray-300 px-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full h-11 rounded-lg border border-gray-300 px-4 pr-11 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2">
                <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                <span className="text-sm text-gray-600">Recordarme</span>
              </label>
              <a href="/forgot-password" className="text-sm font-medium text-blue-600 hover:text-blue-700">
                ¿Olvidaste tu contraseña?
              </a>
            </div>

            <Button type="submit" className="w-full h-11" disabled={loading}>
              {loading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                'Iniciar sesión'
              )}
            </Button>
          </form>

          <p className="mt-8 text-center text-sm text-gray-600">
            ¿No tienes cuenta?{' '}
            <a href="/register" className="font-medium text-blue-600 hover:text-blue-700">
              Registra tu empresa
            </a>
          </p>
        </div>
      </div>

      {/* Right Panel - Branding */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-blue-600 to-blue-800 items-center justify-center p-12">
        <div className="max-w-lg text-center text-white">
          <h2 className="text-4xl font-bold">Encuentra el talento que necesitas</h2>
          <p className="mt-4 text-lg text-blue-100">
            Gestiona tus vacantes, candidatos y procesos de selección desde una sola plataforma.
          </p>
          <div className="mt-12 grid grid-cols-3 gap-6 text-center">
            <div>
              <p className="text-4xl font-bold">10k+</p>
              <p className="mt-1 text-sm text-blue-200">Candidatos activos</p>
            </div>
            <div>
              <p className="text-4xl font-bold">500+</p>
              <p className="mt-1 text-sm text-blue-200">Empresas</p>
            </div>
            <div>
              <p className="text-4xl font-bold">2k+</p>
              <p className="mt-1 text-sm text-blue-200">Vacantes publicadas</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
