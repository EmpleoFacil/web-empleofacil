'use client';

import Image from 'next/image';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Briefcase, Eye, EyeOff, AlertCircle, ArrowRight } from 'lucide-react';
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
      const apiError = err as { response?: { data?: { message?: string } } };
      setError(apiError.response?.data?.message || 'Credenciales invalidas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-[100dvh] overflow-hidden bg-[#eef0f3]">
      <div className="absolute inset-y-0 left-0 w-[53vw] bg-[linear-gradient(145deg,#060b17_0%,#111827_54%,#1d4ed8_100%)]" />

      <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-[1400px] items-center px-5 py-8 sm:px-8 lg:px-10">
        <div className="grid w-full overflow-hidden rounded-[2rem] bg-white shadow-[0_26px_80px_-42px_rgba(15,23,42,0.55)] lg:grid-cols-[1fr_1fr]">
          <section className="relative min-h-[500px] bg-[#0a1020] p-4 sm:p-5 lg:min-h-[750px]">
            <div className="relative flex h-full flex-col overflow-hidden rounded-[1.55rem] bg-[#eaf3ff]">
              <div className="absolute left-6 top-6 z-[1] text-xs font-semibold text-white">Empleo Facil</div>
              <div className="absolute right-6 top-5 z-[1] flex items-center gap-3">
                <a href="/register" className="text-xs font-semibold text-white/90 transition hover:text-white">Registrarse</a>
                <a href="/register" className="rounded-full border border-white/65 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white hover:text-slate-950">Unirse</a>
              </div>

              <Image
                src="/login-hero.png"
                alt="Profesional revisando vacantes desde su telefono"
                width={900}
                height={900}
                className="h-full min-h-[500px] w-full object-cover object-center lg:min-h-[750px]"
                priority
              />

              <div className="absolute inset-x-0 bottom-0 h-40 bg-[linear-gradient(to_top,rgba(7,13,28,0.82),transparent)]" />
              <div className="absolute bottom-6 left-6 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-blue-700">
                  <Briefcase className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Equipo de operaciones</p>
                  <p className="text-xs text-white/75">Talento verificado</p>
                </div>
              </div>
              <div className="absolute bottom-6 right-6 flex gap-2">
                <span className="h-9 w-9 rounded-full border border-white/55" />
                <span className="h-9 w-9 rounded-full border border-white/55" />
              </div>
            </div>
          </section>

          <div className="flex min-h-[500px] items-center justify-center px-6 py-10 sm:px-10 lg:min-h-[750px] lg:px-20">
            <section className="w-full max-w-md">
              <div className="mb-12 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600">
                    <Briefcase className="h-5 w-5 text-white" />
                  </div>
                  <p className="text-lg font-semibold tracking-tight text-slate-950">Empleo Facil</p>
                </div>
                <button className="rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600" type="button">
                  ES
                </button>
              </div>

              <h1 className="text-center text-4xl font-semibold text-slate-950">Hola, empresas</h1>
              <p className="mt-3 text-center text-sm leading-6 text-slate-500">Bienvenido a Empleo Facil.</p>

              {error && (
                <div className="mt-6 flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="mt-8 space-y-4">
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-slate-700">Correo electronico</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu@empresa.com"
                    required
                    className="h-11 w-full rounded-lg border border-slate-300 bg-white px-4 text-sm text-slate-900 transition placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-3 focus:ring-blue-100"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-medium text-slate-700">Contrasena</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="........"
                      required
                      className="h-11 w-full rounded-lg border border-slate-300 bg-white px-4 pr-11 text-sm text-slate-900 transition placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-3 focus:ring-blue-100"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 z-10 cursor-pointer text-slate-400 transition hover:text-slate-600"
                      aria-label={showPassword ? 'Ocultar contrasena' : 'Mostrar contrasena'}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4 text-xs">
                  <label className="inline-flex items-center gap-2 text-slate-600">
                    <input type="checkbox" className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                    Recordarme
                  </label>
                  <a href="/forgot-password" className="font-medium text-blue-700 transition hover:text-blue-600">
                    Olvidaste tu contrasena?
                  </a>
                </div>

                <div className="flex items-center gap-3 py-1 text-xs text-slate-400">
                  <span className="h-px flex-1 bg-slate-200" />
                  <span>o</span>
                  <span className="h-px flex-1 bg-slate-200" />
                </div>

                <Button type="submit" className="h-11 w-full rounded-full bg-[#ef4444] text-sm font-semibold hover:bg-[#dc2626] focus:ring-red-500" disabled={loading}>
                  {loading ? (
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <span className="inline-flex items-center gap-2">
                      Iniciar sesion
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  )}
                </Button>
              </form>

              <p className="mt-6 text-center text-xs text-slate-500">
                No tienes cuenta?{' '}
                <a href="/register" className="font-semibold text-red-500 transition hover:text-red-600">
                  Registra tu empresa
                </a>
              </p>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
