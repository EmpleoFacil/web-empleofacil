'use client';

import { useQuery } from '@tanstack/react-query';
import { MapPin, Briefcase, DollarSign, Clock } from 'lucide-react';
import { Drawer } from '@/components/ui/drawer';
import { Badge, getStatusBadgeVariant } from '@/components/ui/badge';
import { jobs } from '@/lib/api';
import { formatDate, getStatusLabel, getModalityLabel } from '@/lib/utils';

interface JobPreviewDrawerProps {
  jobId: string | null;
  onClose: () => void;
}

export function JobPreviewDrawer({ jobId, onClose }: JobPreviewDrawerProps) {
  const { data: job, isLoading } = useQuery({
    queryKey: ['job-preview', jobId],
    queryFn: () => jobs.getById(jobId!).then((res) => res.data),
    enabled: !!jobId,
  });

  if (!jobId) return null;

  const hasSalary = typeof job?.salaryMin === 'number' || typeof job?.salaryMax === 'number';
  const salaryText = hasSalary
    ? `C$ ${job?.salaryMin?.toLocaleString() ?? '-'} - C$ ${job?.salaryMax?.toLocaleString() ?? '-'}`
    : 'No definido';

  return (
    <Drawer title="Vista previa de vacante" onClose={onClose}>
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#0B5CFF] border-t-transparent" />
        </div>
      ) : job ? (
        <div className="space-y-6">
          <div>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h3 className="text-xl font-bold text-[#0F172A]">{job.title}</h3>
              <Badge variant={getStatusBadgeVariant(job.status)}>
                {getStatusLabel(job.status)}
              </Badge>
            </div>
            {job.company?.name && (
              <p className="mt-1 text-sm font-medium text-[#64748B]">{job.company.name}</p>
            )}
          </div>

          <div className="grid gap-3">
            <div className="flex items-center gap-2 text-sm text-[#475569]">
              <MapPin className="h-4 w-4 text-[#94A3B8]" />
              {job.city || 'Remoto'}
            </div>
            <div className="flex items-center gap-2 text-sm text-[#475569]">
              <Briefcase className="h-4 w-4 text-[#94A3B8]" />
              {getModalityLabel(job.modality)}
            </div>
            <div className="flex items-center gap-2 text-sm text-[#475569]">
              <DollarSign className="h-4 w-4 text-[#94A3B8]" />
              {salaryText}
            </div>
            <div className="flex items-center gap-2 text-sm text-[#475569]">
              <Clock className="h-4 w-4 text-[#94A3B8]" />
              Publicada {formatDate(job.createdAt)}
            </div>
          </div>

          {job.description && (
            <div>
              <h4 className="text-sm font-bold text-[#0F172A]">Descripción</h4>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[#475569]">
                {job.description}
              </p>
            </div>
          )}

          {job.requirements?.length > 0 && (
            <div>
              <h4 className="text-sm font-bold text-[#0F172A]">Requisitos</h4>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[#475569]">
                {job.requirements.map((req: string, i: number) => (
                  <li key={i}>{req}</li>
                ))}
              </ul>
            </div>
          )}

          {job.benefits?.length > 0 && (
            <div>
              <h4 className="text-sm font-bold text-[#0F172A]">Beneficios</h4>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[#475569]">
                {job.benefits.map((benefit: string, i: number) => (
                  <li key={i}>{benefit}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-[#64748B]">No se pudo cargar la vacante.</p>
      )}
    </Drawer>
  );
}
