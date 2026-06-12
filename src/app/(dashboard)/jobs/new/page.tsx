'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Briefcase, Eye, Save, Send, Users } from 'lucide-react';
import { Header } from '@/components/ui/header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { OptionChecklistPicker } from '@/components/ui/option-checklist-picker';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { companies, jobs } from '@/lib/api';
import { BENEFIT_CATEGORIES, REQUIREMENT_CATEGORIES } from '@/lib/job-option-presets';

type JobCategory = { id: string; name: string };

type JobFormData = {
  title: string;
  categoryId: string;
  customCategory: string;
  city: string;
  modality: string;
  employmentType: string;
  salaryMin: string;
  salaryMax: string;
  expiresAt: string;
  description: string;
  requirements: string[];
  benefits: string[];
};

type PlanMetric = {
  current?: number;
  max?: number;
  remaining?: number;
};

type PlanLimits = {
  plan?: { name?: string };
  limits?: {
    activeJobs?: PlanMetric;
    users?: PlanMetric;
    visibleCandidates?: PlanMetric;
  };
};

const initialFormData: JobFormData = {
  title: '',
  categoryId: '',
  customCategory: '',
  city: '',
  modality: 'presencial',
  employmentType: 'tiempo_completo',
  salaryMin: '',
  salaryMax: '',
  expiresAt: getDefaultExpiryDate(),
  description: '',
  requirements: [],
  benefits: [],
};

function getDefaultExpiryDate(days = 30) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function PlanProgress({ label, metric, icon }: { label: string; metric?: PlanMetric; icon: React.ReactNode }) {
  const current = metric?.current ?? 0;
  const max = metric?.max ?? 0;
  const remaining = metric?.remaining ?? Math.max(0, max - current);
  const pct = max > 0 ? Math.min(100, Math.round((current / max) * 100)) : 0;

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-medium text-[#334155]">{label}</span>
        </div>
        <span className="text-sm font-semibold text-[#0F172A]">
          {current} / {max}
        </span>
      </div>
      <div className="h-2 rounded-full bg-[#F1F5F9]">
        <div className="h-2 rounded-full bg-[#0B5CFF]" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1 text-xs text-[#64748B]">restantes {remaining}</p>
    </div>
  );
}

export default function NewJobPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<JobFormData>(initialFormData);
  const [showSuccess, setShowSuccess] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);

  const { data: categories } = useQuery({
    queryKey: ['job-categories'],
    queryFn: () => jobs.getCategories().then((res) => res.data as JobCategory[]),
  });

  const categoriesWithOther = useMemo(
    () => [...(categories ?? []), { id: 'other', name: 'Otros' }],
    [categories]
  );

  const { data: planLimits } = useQuery({
    queryKey: ['plan-limits'],
    queryFn: () => companies.getPlanLimits().then((res) => res.data as PlanLimits),
  });

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => jobs.create(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['plan-limits'] });
      queryClient.invalidateQueries({ queryKey: ['company-plan-limits'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-company'] });
      if (variables.status === 'active') {
        setShowSuccess(true);
      } else {
        setDraftSaved(true);
      }
    },
  });

  const handleChange = (field: keyof JobFormData, value: string | string[]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (publish: boolean) => {
    setDraftSaved(false);

    if (publish && !canPublish) {
      router.push('/settings?quotaExceeded=jobs');
      return;
    }

    const payload = {
      ...formData,
      categoryId: formData.categoryId || undefined,
      customCategory:
        formData.categoryId === 'other' ? formData.customCategory.trim() || undefined : undefined,
      salaryMin: formData.salaryMin ? parseInt(formData.salaryMin, 10) : undefined,
      salaryMax: formData.salaryMax ? parseInt(formData.salaryMax, 10) : undefined,
      expiresAt: formData.expiresAt ? new Date(`${formData.expiresAt}T23:59:59`).toISOString() : undefined,
      requirements: formData.requirements.filter((item) => item.trim()),
      benefits: formData.benefits.filter((item) => item.trim()),
      status: publish ? 'active' : 'draft',
    };

    createMutation.mutate(payload);
  };

  const canPublish = (planLimits?.limits?.activeJobs?.remaining ?? 0) > 0;

  if (showSuccess) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/50 p-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#EAF8EF]">
            <Send className="h-8 w-8 text-[#16A34A]" />
          </div>
          <h2 className="text-2xl font-bold text-[#0F172A]">Vacante publicada</h2>
          <p className="mt-2 text-[#475569]">La vacante ya esta visible para candidatos.</p>
          <div className="mt-6 flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => router.push('/jobs')}>
              Ver vacantes
            </Button>
            <Button
              className="flex-1"
              onClick={() => {
                setShowSuccess(false);
                setFormData(initialFormData);
              }}
            >
              Crear otra
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Header
        title="Crear / editar vacante"
        subtitle="Completa la informacion para publicar tu oportunidad laboral."
      />

      <div className="p-6">
        <div className="mb-6 text-sm font-semibold text-[#64748B]">
          <Link href="/jobs" className="text-[#0B5CFF] hover:text-[#004BDD]">
            Vacantes
          </Link>
          <span className="mx-2">›</span>
          <span>Nueva vacante</span>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Card>
              <CardContent className="p-6">
                <h3 className="mb-6 text-lg font-semibold text-[#0F172A]">Informacion general</h3>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <label className="mb-1.5 block text-sm font-medium text-[#334155]">
                      Titulo del puesto <span className="text-[#EF4444]">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => handleChange('title', e.target.value)}
                      className="h-11 w-full rounded-lg border border-[#D1D9E6] px-4 text-sm focus:border-[#0B5CFF] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-[#334155]">
                      Categoria <span className="text-[#EF4444]">*</span>
                    </label>
                    <select
                      value={formData.categoryId}
                      onChange={(e) => handleChange('categoryId', e.target.value)}
                      className="h-11 w-full rounded-lg border border-[#D1D9E6] px-4 text-sm focus:border-[#0B5CFF] focus:outline-none"
                    >
                      <option value="">Seleccionar categoria</option>
                      {categoriesWithOther.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                    {formData.categoryId === 'other' && (
                      <input
                        type="text"
                        value={formData.customCategory}
                        onChange={(e) => handleChange('customCategory', e.target.value)}
                        placeholder="Escribe la categoria"
                        className="mt-3 h-11 w-full rounded-lg border border-[#D1D9E6] px-4 text-sm focus:border-[#0B5CFF] focus:outline-none"
                      />
                    )}
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-[#334155]">
                      Ciudad <span className="text-[#EF4444]">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => handleChange('city', e.target.value)}
                      className="h-11 w-full rounded-lg border border-[#D1D9E6] px-4 text-sm focus:border-[#0B5CFF] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-[#334155]">
                      Modalidad <span className="text-[#EF4444]">*</span>
                    </label>
                    <select
                      value={formData.modality}
                      onChange={(e) => handleChange('modality', e.target.value)}
                      className="h-11 w-full rounded-lg border border-[#D1D9E6] px-4 text-sm focus:border-[#0B5CFF] focus:outline-none"
                    >
                      <option value="presencial">Presencial</option>
                      <option value="remoto">Remoto</option>
                      <option value="hibrido">Hibrido</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-[#334155]">
                      Tipo de jornada <span className="text-[#EF4444]">*</span>
                    </label>
                    <select
                      value={formData.employmentType}
                      onChange={(e) => handleChange('employmentType', e.target.value)}
                      className="h-11 w-full rounded-lg border border-[#D1D9E6] px-4 text-sm focus:border-[#0B5CFF] focus:outline-none"
                    >
                      <option value="tiempo_completo">Tiempo completo</option>
                      <option value="medio_tiempo">Medio tiempo</option>
                      <option value="por_hora">Por hora</option>
                      <option value="temporal">Temporal</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-[#334155]">
                      Salario desde (C$) <span className="text-[#EF4444]">*</span>
                    </label>
                    <input
                      type="number"
                      value={formData.salaryMin}
                      onChange={(e) => handleChange('salaryMin', e.target.value)}
                      onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
                      className="h-11 w-full rounded-lg border border-[#D1D9E6] px-4 text-sm focus:border-[#0B5CFF] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-[#334155]">Salario hasta (C$)</label>
                    <input
                      type="number"
                      value={formData.salaryMax}
                      onChange={(e) => handleChange('salaryMax', e.target.value)}
                      onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
                      className="h-11 w-full rounded-lg border border-[#D1D9E6] px-4 text-sm focus:border-[#0B5CFF] focus:outline-none"
                    />
                  </div>

                  <div className="md:col-span-2 rounded-2xl border border-[#D8E1EE] bg-[#F8FAFC] p-4">
                    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                      <div className="flex-1">
                        <label className="mb-1.5 block text-sm font-medium text-[#334155]">
                          Caducidad de la vacante <span className="text-[#EF4444]">*</span>
                        </label>
                        <input
                          type="date"
                          value={formData.expiresAt}
                          min={new Date().toISOString().slice(0, 10)}
                          onChange={(e) => handleChange('expiresAt', e.target.value)}
                          className="h-11 w-full rounded-lg border border-[#D1D9E6] bg-white px-4 text-sm focus:border-[#0B5CFF] focus:outline-none"
                        />
                        <p className="mt-2 text-xs text-[#64748B]">
                          Al llegar esta fecha, la vacante se cerrara automaticamente.
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {[15, 30, 45, 60].map((days) => (
                          <button
                            key={days}
                            type="button"
                            onClick={() => handleChange('expiresAt', getDefaultExpiryDate(days))}
                            className="rounded-full border border-[#D1D9E6] bg-white px-3 py-2 text-xs font-semibold text-[#334155] transition hover:border-[#0B5CFF] hover:text-[#0B5CFF]"
                          >
                            {days} dias
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h3 className="mb-4 text-lg font-semibold text-[#0F172A]">
                  Descripcion del puesto <span className="text-[#EF4444]">*</span>
                </h3>
                <RichTextEditor
                  value={formData.description}
                  onChange={(html) => handleChange('description', html)}
                  placeholder="Describe las responsabilidades y caracteristicas del puesto..."
                  minHeightClassName="min-h-[220px]"
                />
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <OptionChecklistPicker
                  title="Requisitos"
                  accent="green"
                  categories={REQUIREMENT_CATEGORIES}
                  selected={formData.requirements}
                  onChange={(items) => handleChange('requirements', items)}
                  max={10}
                  searchPlaceholder="Buscar o agregar requisito"
                />
                <p className="px-2 text-sm text-[#64748B]">
                  Puedes elegir sugerencias o escribir uno propio y agregarlo.
                </p>
              </div>

              <div className="space-y-2">
                <OptionChecklistPicker
                  title="Beneficios"
                  accent="blue"
                  categories={BENEFIT_CATEGORIES}
                  selected={formData.benefits}
                  onChange={(items) => handleChange('benefits', items)}
                  max={10}
                  searchPlaceholder="Buscar o agregar beneficio"
                />
                <p className="px-2 text-sm text-[#64748B]">
                  Si no aparece el beneficio, puedes escribirlo manualmente y agregarlo.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4">
              <p className="text-sm text-[#EF4444]">* Campos obligatorios</p>
              <div className="flex items-center gap-3">
                <Button variant="outline" onClick={() => handleSubmit(false)} disabled={createMutation.isPending}>
                  <Save className="h-4 w-4" />
                  Guardar borrador
                </Button>
                <Button
                  onClick={() => handleSubmit(true)}
                  disabled={
                    createMutation.isPending ||
                    !formData.title ||
                    !formData.expiresAt ||
                    (formData.categoryId === 'other' && !formData.customCategory.trim())
                  }
                >
                  <Send className="h-4 w-4" />
                  Publicar vacante
                </Button>
              </div>
            </div>

            {draftSaved && <p className="text-sm font-semibold text-[#16A34A]">Borrador guardado correctamente.</p>}
          </div>

          <div className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <h3 className="mb-2 text-lg font-semibold text-[#0F172A]">Limites de tu plan</h3>
                <p className="mb-6 text-sm text-[#64748B]">Plan {planLimits?.plan?.name || 'Profesional'}</p>

                <div className="space-y-5">
                  <PlanProgress
                    label="Vacantes activas"
                    metric={planLimits?.limits?.activeJobs}
                    icon={<Briefcase className="h-4 w-4 text-[#94A3B8]" />}
                  />
                  <PlanProgress
                    label="Usuarios"
                    metric={planLimits?.limits?.users}
                    icon={<Users className="h-4 w-4 text-[#94A3B8]" />}
                  />
                  <PlanProgress
                    label="Candidatos visibles"
                    metric={planLimits?.limits?.visibleCandidates}
                    icon={<Eye className="h-4 w-4 text-[#94A3B8]" />}
                  />
                </div>

                <div className="mt-6 rounded-lg border border-[#DCEBFF] bg-[#EAF2FF] p-4">
                  <h4 className="mb-1 font-medium text-[#0F172A]">Necesitas mas?</h4>
                  <p className="mb-3 text-sm text-[#475569]">Mejora tu plan y publica mas vacantes.</p>
                  <Button variant="outline" size="sm" className="w-full" onClick={() => router.push('/settings?quotaExceeded=jobs')}>
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
