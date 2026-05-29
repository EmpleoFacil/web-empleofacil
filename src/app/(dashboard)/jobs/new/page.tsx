'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ArrowLeft, Save, Send, Info, Briefcase, Users, Eye } from 'lucide-react';
import Link from 'next/link';
import { Header } from '@/components/ui/header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api, jobs } from '@/lib/api';

interface JobFormData {
  title: string;
  categoryId: string;
  city: string;
  modality: string;
  employmentType: string;
  salaryMin: string;
  salaryMax: string;
  description: string;
  requirements: string[];
  benefits: string[];
  status: string;
}

const initialFormData: JobFormData = {
  title: '',
  categoryId: '',
  city: '',
  modality: 'presencial',
  employmentType: 'tiempo_completo',
  salaryMin: '',
  salaryMax: '',
  description: '',
  requirements: ['', '', '', ''],
  benefits: ['', '', '', ''],
  status: 'draft',
};

export default function NewJobPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<JobFormData>(initialFormData);
  const [showSuccess, setShowSuccess] = useState(false);

  const { data: categories } = useQuery({
    queryKey: ['job-categories'],
    queryFn: () => jobs.getCategories().then(res => res.data),
  });

  const { data: planLimits } = useQuery({
    queryKey: ['plan-limits'],
    queryFn: () => api.get('/companies/me/plan-limits').then(res => res.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => jobs.create(data),
    onSuccess: (_, variables) => {
      if (variables.status === 'active') {
        setShowSuccess(true);
      } else {
        router.push('/jobs');
      }
    },
  });

  const handleChange = (field: keyof JobFormData, value: string | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleArrayChange = (field: 'requirements' | 'benefits', index: number, value: string) => {
    setFormData(prev => {
      const arr = [...prev[field]];
      arr[index] = value;
      return { ...prev, [field]: arr };
    });
  };

  const handleSubmit = (publish: boolean) => {
    const data = {
      ...formData,
      salaryMin: formData.salaryMin ? parseInt(formData.salaryMin) : undefined,
      salaryMax: formData.salaryMax ? parseInt(formData.salaryMax) : undefined,
      requirements: formData.requirements.filter(r => r.trim()),
      benefits: formData.benefits.filter(b => b.trim()),
      status: publish ? 'active' : 'draft',
    };
    createMutation.mutate(data);
  };

  const canPublish = planLimits?.limits?.activeJobs?.remaining > 0;
  const filledRequirements = formData.requirements.filter(r => r.trim()).length;
  const filledBenefits = formData.benefits.filter(b => b.trim()).length;

  if (showSuccess) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <Send className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">¡Vacante publicada!</h2>
          <p className="mt-2 text-gray-600">Tu vacante ya está visible para los candidatos.</p>
          <div className="mt-6 flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => router.push('/jobs')}>
              Ver vacantes
            </Button>
            <Button className="flex-1" onClick={() => { setShowSuccess(false); setFormData(initialFormData); }}>
              Crear otra
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Crear / editar vacante" subtitle="Completa la información para publicar tu oportunidad laboral." />

      <div className="p-6">
        <div className="mb-6">
          <Link href="/jobs" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
            <ArrowLeft className="h-4 w-4" />
            Vacantes
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Información general */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Información general</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Título del puesto <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => handleChange('title', e.target.value)}
                      placeholder="Ej: Auxiliar de Limpieza"
                      className="w-full h-11 rounded-lg border border-gray-300 px-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Categoría <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.categoryId}
                      onChange={(e) => handleChange('categoryId', e.target.value)}
                      className="w-full h-11 rounded-lg border border-gray-300 px-4 text-sm focus:border-blue-500 focus:outline-none"
                    >
                      <option value="">Seleccionar categoría</option>
                      {categories?.map((cat: { id: string; name: string }) => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Ciudad <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => handleChange('city', e.target.value)}
                      placeholder="Ej: Managua, Nicaragua"
                      className="w-full h-11 rounded-lg border border-gray-300 px-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Modalidad <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.modality}
                      onChange={(e) => handleChange('modality', e.target.value)}
                      className="w-full h-11 rounded-lg border border-gray-300 px-4 text-sm focus:border-blue-500 focus:outline-none"
                    >
                      <option value="presencial">Presencial</option>
                      <option value="remoto">Remoto</option>
                      <option value="hibrido">Híbrido</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Tipo de jornada <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.employmentType}
                      onChange={(e) => handleChange('employmentType', e.target.value)}
                      className="w-full h-11 rounded-lg border border-gray-300 px-4 text-sm focus:border-blue-500 focus:outline-none"
                    >
                      <option value="tiempo_completo">Tiempo completo</option>
                      <option value="medio_tiempo">Medio tiempo</option>
                      <option value="por_hora">Por hora</option>
                      <option value="temporal">Temporal</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Salario desde (C$) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={formData.salaryMin}
                      onChange={(e) => handleChange('salaryMin', e.target.value)}
                      placeholder="6,000"
                      className="w-full h-11 rounded-lg border border-gray-300 px-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Salario hasta (C$)
                    </label>
                    <input
                      type="number"
                      value={formData.salaryMax}
                      onChange={(e) => handleChange('salaryMax', e.target.value)}
                      placeholder="7,000"
                      className="w-full h-11 rounded-lg border border-gray-300 px-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Descripción */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Descripción del puesto <span className="text-red-500">*</span>
                </h3>
                <div className="border border-gray-300 rounded-lg overflow-hidden">
                  <div className="flex items-center gap-1 border-b border-gray-200 bg-gray-50 px-3 py-2">
                    <button className="p-1.5 rounded hover:bg-gray-200 font-bold text-gray-600">B</button>
                    <button className="p-1.5 rounded hover:bg-gray-200 italic text-gray-600">I</button>
                    <button className="p-1.5 rounded hover:bg-gray-200 underline text-gray-600">U</button>
                    <span className="w-px h-4 bg-gray-300 mx-1" />
                    <button className="p-1.5 rounded hover:bg-gray-200 text-gray-600">≡</button>
                    <button className="p-1.5 rounded hover:bg-gray-200 text-gray-600">⋮≡</button>
                  </div>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    rows={6}
                    placeholder="Describe las responsabilidades y características del puesto..."
                    className="w-full px-4 py-3 text-sm focus:outline-none resize-none"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Requisitos y Beneficios */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Requisitos <span className="text-red-500">*</span>
                    </h3>
                    <span className="text-sm text-gray-500">{filledRequirements}/10</span>
                  </div>
                  <div className="space-y-3">
                    {formData.requirements.map((req, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-gray-400">•</span>
                        <input
                          type="text"
                          value={req}
                          onChange={(e) => handleArrayChange('requirements', i, e.target.value)}
                          placeholder={`Requisito ${i + 1}`}
                          className="flex-1 h-9 rounded-lg border border-gray-300 px-3 text-sm focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                    ))}
                    {formData.requirements.length < 10 && (
                      <button
                        onClick={() => setFormData(prev => ({ ...prev, requirements: [...prev.requirements, ''] }))}
                        className="text-sm text-blue-600 hover:text-blue-700"
                      >
                        + Agregar requisito
                      </button>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Beneficios</h3>
                    <span className="text-sm text-gray-500">{filledBenefits}/10</span>
                  </div>
                  <div className="space-y-3">
                    {formData.benefits.map((ben, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-gray-400">•</span>
                        <input
                          type="text"
                          value={ben}
                          onChange={(e) => handleArrayChange('benefits', i, e.target.value)}
                          placeholder={`Beneficio ${i + 1}`}
                          className="flex-1 h-9 rounded-lg border border-gray-300 px-3 text-sm focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                    ))}
                    {formData.benefits.length < 10 && (
                      <button
                        onClick={() => setFormData(prev => ({ ...prev, benefits: [...prev.benefits, ''] }))}
                        className="text-sm text-blue-600 hover:text-blue-700"
                      >
                        + Agregar beneficio
                      </button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4">
              <p className="text-sm text-red-500">* Campos obligatorios</p>
              <div className="flex items-center gap-3">
                <Button variant="outline" onClick={() => handleSubmit(false)} disabled={createMutation.isPending}>
                  <Save className="h-4 w-4" />
                  Guardar borrador
                </Button>
                <Button
                  onClick={() => handleSubmit(true)}
                  disabled={createMutation.isPending || !canPublish || !formData.title}
                >
                  <Send className="h-4 w-4" />
                  Publicar vacante
                </Button>
              </div>
            </div>
          </div>

          {/* Sidebar - Plan Limits */}
          <div className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Límites de tu plan</h3>
                <p className="text-sm text-gray-500 mb-6">Plan {planLimits?.plan?.name || 'Profesional'}</p>

                <div className="space-y-5">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <Briefcase className="h-4 w-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-700">Vacantes activas</span>
                      </div>
                      <span className="text-sm font-semibold text-gray-900">
                        {planLimits?.limits?.activeJobs?.current ?? 0} / {planLimits?.limits?.activeJobs?.max ?? 20}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100">
                      <div
                        className="h-2 rounded-full bg-blue-500"
                        style={{ width: `${((planLimits?.limits?.activeJobs?.current ?? 0) / (planLimits?.limits?.activeJobs?.max ?? 20)) * 100}%` }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-gray-500">restantes {planLimits?.limits?.activeJobs?.remaining ?? 0}</p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-700">Usuarios</span>
                      </div>
                      <span className="text-sm font-semibold text-gray-900">
                        {planLimits?.limits?.users?.current ?? 0} / {planLimits?.limits?.users?.max ?? 5}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100">
                      <div
                        className="h-2 rounded-full bg-blue-500"
                        style={{ width: `${((planLimits?.limits?.users?.current ?? 0) / (planLimits?.limits?.users?.max ?? 5)) * 100}%` }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-gray-500">restantes {planLimits?.limits?.users?.remaining ?? 0}</p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <Eye className="h-4 w-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-700">Candidatos visibles</span>
                      </div>
                      <span className="text-sm font-semibold text-gray-900">
                        {planLimits?.limits?.visibleCandidates?.current ?? 0} / {planLimits?.limits?.visibleCandidates?.max ?? 500}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100">
                      <div
                        className="h-2 rounded-full bg-blue-500"
                        style={{ width: `${((planLimits?.limits?.visibleCandidates?.current ?? 0) / (planLimits?.limits?.visibleCandidates?.max ?? 500)) * 100}%` }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-gray-500">restantes {planLimits?.limits?.visibleCandidates?.remaining ?? 0}</p>
                  </div>
                </div>

                <div className="mt-6 rounded-lg bg-blue-50 border border-blue-100 p-4">
                  <h4 className="font-medium text-gray-900 mb-1">¿Necesitas más?</h4>
                  <p className="text-sm text-gray-600 mb-3">Mejora tu plan y publica más vacantes.</p>
                  <Button variant="outline" size="sm" className="w-full">
                    Ver planes
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
