'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Save, Send, Info, Briefcase, Users, Eye,
  MapPin, Clock, DollarSign, Trash2, Play, Pause, AlertCircle
} from 'lucide-react';
import Link from 'next/link';
import { Header } from '@/components/ui/header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge, getStatusBadgeVariant } from '@/components/ui/badge';
import { Table, TableHead, TableHeader, TableRow, TableCell, TableBody } from '@/components/ui/table';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { jobs, applications as appsApi, companies } from '@/lib/api';
import { formatDate, getStatusLabel } from '@/lib/utils';

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const id = params.id as string;

  const [formData, setFormData] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const forceEdit = searchParams.get('edit') === '1';
  const editing = isEditing || forceEdit;

  const { data: jobData, isLoading } = useQuery({
    queryKey: ['job', id],
    queryFn: () => jobs.getById(id!).then((res) => res.data),
    enabled: !!id,
  });

  const { data: categories } = useQuery({
    queryKey: ['job-categories'],
    queryFn: () => jobs.getCategories().then((res) => res.data),
  });

  const { data: applications } = useQuery({
    queryKey: ['job-applications', id],
    queryFn: () => appsApi.getByCompany({ jobId: id, limit: 50 }).then((res) => res.data),
    enabled: !!id,
  });

  const { data: planLimits } = useQuery({
    queryKey: ['plan-limits'],
    queryFn: () => companies.getPlanLimits().then((res) => res.data),
  });

  useEffect(() => {
    if (jobData) {
      setFormData({
        title: jobData.title || '',
        categoryId: jobData.categoryId || jobData.category?.id || '',
        city: jobData.city || '',
        modality: jobData.modality || 'presencial',
        employmentType: jobData.employmentType || 'tiempo_completo',
        salaryMin: jobData.salaryMin?.toString() || '',
        salaryMax: jobData.salaryMax?.toString() || '',
        description: jobData.description || '',
        requirements: jobData.requirements?.length ? jobData.requirements : [''],
        benefits: jobData.benefits?.length ? jobData.benefits : [''],
      });
    }
  }, [jobData]);

  const updateMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => jobs.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job', id] });
      queryClient.invalidateQueries({ queryKey: ['jobs-company'] });
      setIsEditing(false);
    },
    onError: (error: any) => {
      alert('Error al actualizar: ' + (error.response?.data?.message || error.message));
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: (status: string) => jobs.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job', id] });
      queryClient.invalidateQueries({ queryKey: ['jobs-company'] });
    },
    onError: (error: any) => {
      alert('Error al cambiar estado: ' + (error.response?.data?.message || error.message));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => jobs.delete(id),
    onSuccess: () => {
      router.push('/jobs');
    },
    onError: (error: any) => {
      alert('Error al eliminar: ' + (error.response?.data?.message || error.message));
    },
  });

  const handleChange = (field: string, value: string | string[]) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleArrayChange = (field: 'requirements' | 'benefits', index: number, value: string) => {
    setFormData((prev: any) => {
      const arr = [...prev[field]];
      arr[index] = value;
      return { ...prev, [field]: arr };
    });
  };

  const handleSave = () => {
    const data = {
      ...formData,
      salaryMin: formData.salaryMin ? parseInt(formData.salaryMin) : undefined,
      salaryMax: formData.salaryMax ? parseInt(formData.salaryMax) : undefined,
      requirements: formData.requirements.filter((r: string) => r.trim()),
      benefits: formData.benefits.filter((b: string) => b.trim()),
    };
    updateMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <p className="text-[#64748B]">Cargando vacante...</p>
      </div>
    );
  }

  if (!jobData) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-[#EF4444]" />
          <p className="mt-3 text-[#64748B]">Vacante no encontrada</p>
          <Button variant="outline" className="mt-4" onClick={() => router.push('/jobs')}>
            Volver a vacantes
          </Button>
        </div>
      </div>
    );
  }

  const applicationsList = applications?.items || applications || [];
  const applicationsCount = jobData._count?.applications ?? applications?.total ?? 0;

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Header title={jobData.title} subtitle="Detalle y ediciÃ³n de la vacante." />

      <div className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/jobs" className="inline-flex items-center gap-2 text-sm text-[#64748B] hover:text-[#334155]">
            <ArrowLeft className="h-4 w-4" />
            Vacantes
          </Link>
          <div className="flex items-center gap-2">
            <Badge variant={getStatusBadgeVariant(jobData.status)} className="text-sm px-3 py-1">
              {getStatusLabel(jobData.status)}
            </Badge>
            {jobData.status === 'active' ? (
              <Button variant="outline" size="sm" onClick={() => updateStatusMutation.mutate('paused')}>
                <Pause className="h-4 w-4" />
                Pausar
              </Button>
            ) : jobData.status !== 'closed' ? (
              <Button variant="outline" size="sm" onClick={() => updateStatusMutation.mutate('active')}>
                <Play className="h-4 w-4" />
                Activar
              </Button>
            ) : null}
            {editing ? (
              <Button variant="outline" size="sm" onClick={() => { setIsEditing(false); if (forceEdit) router.replace(`/jobs/${id}`); }}>
                Cancelar
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                Editar
              </Button>
            )}
            <Button variant="danger" size="sm" onClick={() => setShowDeleteConfirm(true)}>
              <Trash2 className="h-4 w-4" />
              Eliminar
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* InformaciÃ³n general */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-[#0F172A] mb-6">InformaciÃ³n general</h3>
                {editing ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-[#334155] mb-1.5">
                        TÃ­tulo del puesto <span className="text-[#EF4444]">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData?.title || ''}
                        onChange={(e) => handleChange('title', e.target.value)}
                        placeholder="Ej: Auxiliar de Limpieza"
                        className="w-full h-11 rounded-lg border border-[#D1D9E6] px-4 text-sm focus:border-[#0B5CFF] focus:outline-none focus:ring-1 focus:ring-[#0B5CFF]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#334155] mb-1.5">CategorÃ­a</label>
                      <select
                        value={formData?.categoryId || ''}
                        onChange={(e) => handleChange('categoryId', e.target.value)}
                        className="w-full h-11 rounded-lg border border-[#D1D9E6] px-4 text-sm focus:border-[#0B5CFF] focus:outline-none"
                      >
                        <option value="">Seleccionar categorÃ­a</option>
                        {categories?.map((cat: { id: string; name: string }) => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#334155] mb-1.5">Ciudad</label>
                      <input
                        type="text"
                        value={formData?.city || ''}
                        onChange={(e) => handleChange('city', e.target.value)}
                        placeholder="Ej: Managua, Nicaragua"
                        className="w-full h-11 rounded-lg border border-[#D1D9E6] px-4 text-sm focus:border-[#0B5CFF] focus:outline-none focus:ring-1 focus:ring-[#0B5CFF]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#334155] mb-1.5">Modalidad</label>
                      <select
                        value={formData?.modality || 'presencial'}
                        onChange={(e) => handleChange('modality', e.target.value)}
                        className="w-full h-11 rounded-lg border border-[#D1D9E6] px-4 text-sm focus:border-[#0B5CFF] focus:outline-none"
                      >
                        <option value="presencial">Presencial</option>
                        <option value="remoto">Remoto</option>
                        <option value="hibrido">HÃ­brido</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#334155] mb-1.5">Tipo de jornada</label>
                      <select
                        value={formData?.employmentType || 'tiempo_completo'}
                        onChange={(e) => handleChange('employmentType', e.target.value)}
                        className="w-full h-11 rounded-lg border border-[#D1D9E6] px-4 text-sm focus:border-[#0B5CFF] focus:outline-none"
                      >
                        <option value="tiempo_completo">Tiempo completo</option>
                        <option value="medio_tiempo">Medio tiempo</option>
                        <option value="por_hora">Por hora</option>
                        <option value="temporal">Temporal</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#334155] mb-1.5">Salario desde (C$)</label>
                      <input
                        type="number"
                        value={formData?.salaryMin || ''}
                        onChange={(e) => handleChange('salaryMin', e.target.value)}
                        onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
                        placeholder="6,000"
                        className="w-full h-11 rounded-lg border border-[#D1D9E6] px-4 text-sm focus:border-[#0B5CFF] focus:outline-none focus:ring-1 focus:ring-[#0B5CFF]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#334155] mb-1.5">Salario hasta (C$)</label>
                      <input
                        type="number"
                        value={formData?.salaryMax || ''}
                        onChange={(e) => handleChange('salaryMax', e.target.value)}
                        onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
                        placeholder="7,000"
                        className="w-full h-11 rounded-lg border border-[#D1D9E6] px-4 text-sm focus:border-[#0B5CFF] focus:outline-none focus:ring-1 focus:ring-[#0B5CFF]"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div>
                      <p className="text-xs text-[#64748B] mb-1">CategorÃ­a</p>
                      <p className="text-sm font-medium text-[#0F172A]">{jobData.category?.name || 'Sin categorÃ­a'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#64748B] mb-1">Ciudad</p>
                      <p className="text-sm font-medium text-[#0F172A] flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-[#94A3B8]" />
                        {jobData.city || 'Remoto'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-[#64748B] mb-1">Modalidad</p>
                      <p className="text-sm font-medium text-[#0F172A] capitalize">{jobData.modality || 'Presencial'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#64748B] mb-1">Jornada</p>
                      <p className="text-sm font-medium text-[#0F172A] capitalize">
                        {jobData.employmentType?.replace(/_/g, ' ') || 'Tiempo completo'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-[#64748B] mb-1">Salario</p>
                      <p className="text-sm font-medium text-[#0F172A] flex items-center gap-1">
                        <DollarSign className="h-3.5 w-3.5 text-[#94A3B8]" />
                        {jobData.salaryMin ? `C$ ${jobData.salaryMin.toLocaleString()}` : '-'}
                        {jobData.salaryMax ? ` - C$ ${jobData.salaryMax.toLocaleString()}` : ''}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-[#64748B] mb-1">Publicado</p>
                      <p className="text-sm font-medium text-[#0F172A] flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-[#94A3B8]" />
                        {formatDate(jobData.createdAt)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-[#64748B] mb-1">Actualizado</p>
                      <p className="text-sm font-medium text-[#0F172A]">{formatDate(jobData.updatedAt)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#64748B] mb-1">Postulaciones</p>
                      <p className="text-sm font-medium text-[#0F172A]">{applicationsCount}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* DescripciÃ³n */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-[#0F172A] mb-4">DescripciÃ³n del puesto</h3>
                {editing ? (
                  <RichTextEditor
                    value={formData?.description || ''}
                    onChange={(html) => handleChange('description', html)}
                    placeholder="Describe las responsabilidades y caracteristicas del puesto..."
                    minHeightClassName="min-h-[220px]"
                  />
                ) : (
                  <div
                    className="prose prose-sm max-w-none text-[#475569]"
                    dangerouslySetInnerHTML={{ __html: jobData.description || '<p>Sin descripcion</p>' }}
                  />
                )}
              </CardContent>
            </Card>

            {/* Requisitos y Beneficios */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-[#0F172A] mb-4">Requisitos</h3>
                  {editing ? (
                    <div className="space-y-3">
                      {formData?.requirements?.map((req: string, i: number) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className="text-[#94A3B8]">â€¢</span>
                          <input
                            type="text"
                            value={req}
                            onChange={(e) => handleArrayChange('requirements', i, e.target.value)}
                            placeholder={`Requisito ${i + 1}`}
                            className="flex-1 h-9 rounded-lg border border-[#D1D9E6] px-3 text-sm focus:border-[#0B5CFF] focus:outline-none"
                          />
                        </div>
                      ))}
                      <button
                        onClick={() => setFormData((prev: any) => ({ ...prev, requirements: [...prev.requirements, ''] }))}
                        className="text-sm text-[#0B5CFF] hover:text-[#004BDD]"
                      >
                        + Agregar requisito
                      </button>
                    </div>
                  ) : (
                    <ul className="space-y-2">
                      {jobData.requirements?.length ? jobData.requirements.map((req: string, i: number) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-[#475569]">
                          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#0B5CFF]" />
                          {req}
                        </li>
                      )) : (
                        <p className="text-sm text-[#94A3B8]">Sin requisitos especificados</p>
                      )}
                    </ul>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-[#0F172A] mb-4">Beneficios</h3>
                  {editing ? (
                    <div className="space-y-3">
                      {formData?.benefits?.map((ben: string, i: number) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className="text-[#94A3B8]">â€¢</span>
                          <input
                            type="text"
                            value={ben}
                            onChange={(e) => handleArrayChange('benefits', i, e.target.value)}
                            placeholder={`Beneficio ${i + 1}`}
                            className="flex-1 h-9 rounded-lg border border-[#D1D9E6] px-3 text-sm focus:border-[#0B5CFF] focus:outline-none"
                          />
                        </div>
                      ))}
                      <button
                        onClick={() => setFormData((prev: any) => ({ ...prev, benefits: [...prev.benefits, ''] }))}
                        className="text-sm text-[#0B5CFF] hover:text-[#004BDD]"
                      >
                        + Agregar beneficio
                      </button>
                    </div>
                  ) : (
                    <ul className="space-y-2">
                      {jobData.benefits?.length ? jobData.benefits.map((ben: string, i: number) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-[#475569]">
                          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#16A34A]" />
                          {ben}
                        </li>
                      )) : (
                        <p className="text-sm text-[#94A3B8]">Sin beneficios especificados</p>
                      )}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Save button when editing */}
            {editing && (
              <div className="flex justify-end">
                <Button onClick={handleSave} disabled={updateMutation.isPending}>
                  <Save className="h-4 w-4" />
                  Guardar cambios
                </Button>
              </div>
            )}

            {/* Postulaciones */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-[#0F172A] mb-4">
                  Postulaciones ({applicationsCount})
                </h3>
                {applicationsList.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Candidato</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Fecha</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {applicationsList.slice(0, 10).map((app: any) => (
                        <TableRow key={app.id}>
                          <TableCell>
                            <Link
                              href={`/candidates/${app.candidateId || app.id}`}
                              className="font-medium text-[#0B5CFF] hover:text-[#004BDD]"
                            >
                              {app.candidate?.fullName || app.candidate?.name || app.fullName || 'Candidato'}
                            </Link>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getStatusBadgeVariant(app.status)}>
                              {getStatusLabel(app.status)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-[#475569]">
                            {formatDate(app.appliedAt || app.createdAt)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-sm text-[#64748B] py-4 text-center">
                    AÃºn no hay postulaciones para esta vacante.
                  </p>
                )}
                {applicationsList.length > 10 && (
                  <Link
                    href={`/candidates?jobId=${id}`}
                    className="mt-3 inline-block text-sm text-[#0B5CFF] hover:text-[#004BDD]"
                  >
                    Ver todas las postulaciones â†’
                  </Link>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* LÃ­mites del plan */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-[#0F172A] mb-2">LÃ­mites de tu plan</h3>
                <p className="text-sm text-[#64748B] mb-6">Plan {planLimits?.plan?.name || 'Profesional'}</p>
                <div className="space-y-5">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <Briefcase className="h-4 w-4 text-[#94A3B8]" />
                        <span className="text-sm font-medium text-[#334155]">Vacantes activas</span>
                      </div>
                      <span className="text-sm font-semibold text-[#0F172A]">
                        {planLimits?.limits?.activeJobs?.current ?? 0} / {planLimits?.limits?.activeJobs?.max ?? 20}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-[#F1F5F9]">
                      <div
                        className="h-2 rounded-full bg-[#0B5CFF] transition-all"
                        style={{ width: `${((planLimits?.limits?.activeJobs?.current ?? 0) / (planLimits?.limits?.activeJobs?.max ?? 20)) * 100}%` }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-[#64748B]">restantes {planLimits?.limits?.activeJobs?.remaining ?? 0}</p>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-[#94A3B8]" />
                        <span className="text-sm font-medium text-[#334155]">Usuarios</span>
                      </div>
                      <span className="text-sm font-semibold text-[#0F172A]">
                        {planLimits?.limits?.users?.current ?? 0} / {planLimits?.limits?.users?.max ?? 5}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-[#F1F5F9]">
                      <div
                        className="h-2 rounded-full bg-[#0B5CFF] transition-all"
                        style={{ width: `${((planLimits?.limits?.users?.current ?? 0) / (planLimits?.limits?.users?.max ?? 5)) * 100}%` }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-[#64748B]">restantes {planLimits?.limits?.users?.remaining ?? 0}</p>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <Eye className="h-4 w-4 text-[#94A3B8]" />
                        <span className="text-sm font-medium text-[#334155]">Candidatos visibles</span>
                      </div>
                      <span className="text-sm font-semibold text-[#0F172A]">
                        {planLimits?.limits?.visibleCandidates?.current ?? 0} / {planLimits?.limits?.visibleCandidates?.max ?? 500}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-[#F1F5F9]">
                      <div
                        className="h-2 rounded-full bg-[#0B5CFF] transition-all"
                        style={{ width: `${((planLimits?.limits?.visibleCandidates?.current ?? 0) / (planLimits?.limits?.visibleCandidates?.max ?? 500)) * 100}%` }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-[#64748B]">restantes {planLimits?.limits?.visibleCandidates?.remaining ?? 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Resumen de la vacante */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-[#0F172A] mb-4">Resumen</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[#64748B]">Estado</span>
                    <Badge variant={getStatusBadgeVariant(jobData.status)}>
                      {getStatusLabel(jobData.status)}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[#64748B]">Postulaciones</span>
                    <span className="font-medium text-[#0F172A]">{applicationsCount}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[#64748B]">Publicado</span>
                    <span className="font-medium text-[#0F172A]">{formatDate(jobData.createdAt)}</span>
                  </div>
                  {jobData.updatedAt && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[#64748B]">Actualizado</span>
                      <span className="font-medium text-[#0F172A]">{formatDate(jobData.updatedAt)}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Acciones rÃ¡pidas */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-[#0F172A] mb-4">Acciones rÃ¡pidas</h3>
                <div className="space-y-2">
                  <Link href={`/candidates?jobId=${id}`}>
                    <Button variant="outline" className="w-full justify-start">
                      <Users className="h-4 w-4" />
                      Ver postulaciones
                    </Button>
                  </Link>
                  {jobData.status === 'active' && (
                    <Button variant="outline" className="w-full justify-start" onClick={() => updateStatusMutation.mutate('paused')}>
                      <Pause className="h-4 w-4" />
                      Pausar vacante
                    </Button>
                  )}
                  {jobData.status === 'paused' && (
                    <Button variant="outline" className="w-full justify-start" onClick={() => updateStatusMutation.mutate('active')}>
                      <Play className="h-4 w-4" />
                      Reactivar vacante
                    </Button>
                  )}
                  <Button variant="outline" className="w-full justify-start" onClick={() => updateStatusMutation.mutate('closed')}>
                    <AlertCircle className="h-4 w-4" />
                    Cerrar vacante
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/50">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#FEECEC]">
              <Trash2 className="h-6 w-6 text-[#EF4444]" />
            </div>
            <h3 className="text-lg font-semibold text-[#0F172A]">Â¿Eliminar vacante?</h3>
            <p className="mt-2 text-sm text-[#64748B]">
              Esta acciÃ³n no se puede deshacer. Se eliminarÃ¡n todas las postulaciones asociadas.
            </p>
            <div className="mt-6 flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowDeleteConfirm(false)}>
                Cancelar
              </Button>
              <Button variant="danger" className="flex-1" onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending}>
                Eliminar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


