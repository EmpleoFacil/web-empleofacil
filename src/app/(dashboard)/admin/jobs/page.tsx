"use client";

import { useState, useMemo } from "react";
import { useUrlSearchParam } from "@/lib/use-url-search-param";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Briefcase,
  Search,
  Filter,
  MapPin,
  Users,
  Building2,
  Eye,
  Pause,
  Play,
  BarChart3,
  XCircle,
  DollarSign,
} from "lucide-react";
import Link from "next/link";
import { Header } from "@/components/ui/header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, getStatusBadgeVariant } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { JobPreviewDrawer } from "@/components/jobs/job-preview-drawer";
import { companies, jobs, dashboard } from "@/lib/api";
import { getStatusLabel, getModalityLabel } from "@/lib/utils";
import { listQueryOptions, queryKeys } from "@/lib/query-config";

type AdminJobRow = {
  id: string;
  title: string;
  city: string | null;
  modality?: string | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  status: string;
  createdAt: string;
  company: { id: string; name: string };
  _count?: { applications: number };
  applications?: number;
};

type JobsListResponse = {
  items: AdminJobRow[];
  total: number;
  page: number;
  totalPages: number;
};

type AdminSummaryMetric = { value: number; trend?: number };
type AdminJobsSummary = {
  active?: AdminSummaryMetric;
  paused?: AdminSummaryMetric;
  closed?: AdminSummaryMetric;
  applications?: AdminSummaryMetric;
};

async function fetchAdminSummary(): Promise<AdminJobsSummary> {
  try {
    const res = await jobs.getAdminSummary();
    return res.data as AdminJobsSummary;
  } catch {
    const [activeRes, pausedRes, closedRes, dashRes] = await Promise.all([
      jobs.getAdminJobs({ status: "active", limit: 1, page: 1 }),
      jobs.getAdminJobs({ status: "paused", limit: 1, page: 1 }),
      jobs.getAdminJobs({ status: "closed", limit: 1, page: 1 }),
      dashboard.getAdmin(),
    ]);
    return {
      active: { value: activeRes.data.total ?? 0, trend: undefined },
      paused: { value: pausedRes.data.total ?? 0, trend: undefined },
      closed: { value: closedRes.data.total ?? 0, trend: undefined },
      applications: {
        value: dashRes.data?.kpis?.applications?.value ?? 0,
        trend: undefined,
      },
    };
  }
}

export default function AdminJobsPage() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({
    search: "",
    companyId: "",
    status: "",
    city: "",
    modality: "",
  });
  const [appliedFilters, setAppliedFilters] = useState({
    search: "",
    companyId: "",
    status: "",
    city: "",
    modality: "",
  });
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(true);
  const [previewJobId, setPreviewJobId] = useState<string | null>(null);

  useUrlSearchParam((search) => {
    const next = { search, companyId: "", status: "", city: "", modality: "" };
    setFilters(next);
    setAppliedFilters(next);
    setPage(1);
  });

  const filterKey = useMemo(
    () => ({
      search: appliedFilters.search,
      companyId: appliedFilters.companyId,
      status: appliedFilters.status,
      city: appliedFilters.city,
      modality: appliedFilters.modality,
    }),
    [
      appliedFilters.search,
      appliedFilters.companyId,
      appliedFilters.status,
      appliedFilters.city,
      appliedFilters.modality,
    ],
  );

  const { data: summary } = useQuery({
    queryKey: queryKeys.jobsAdminSummary,
    queryFn: fetchAdminSummary,
    ...listQueryOptions,
  });

  const { data: companiesData } = useQuery({
    queryKey: ["admin-job-companies"],
    queryFn: async () => {
      const res = await companies.getAdminList({ page: 1, limit: 200 });
      return (res.data?.companies ?? res.data?.items ?? []) as Array<{
        id: string;
        name: string;
      }>;
    },
    ...listQueryOptions,
  });

  const { data: jobsData, isFetching } = useQuery({
    queryKey: queryKeys.jobsAdmin(filterKey, page),
    queryFn: async () => {
      const params: Record<string, string | number> = { page, limit: 15 };
      const search = appliedFilters.search.trim();
      if (search) params.search = search;
      if (appliedFilters.companyId) params.companyId = appliedFilters.companyId;
      if (appliedFilters.status) params.status = appliedFilters.status;

      const res = await jobs.getAdminJobs(params);
      const data = res.data as JobsListResponse;

      let items = data.items ?? [];
      if (appliedFilters.city.trim()) {
        const cityLower = appliedFilters.city.trim().toLowerCase();
        items = items.filter((j) =>
          (j.city ?? "").toLowerCase().includes(cityLower),
        );
      }
      if (appliedFilters.modality) {
        items = items.filter(
          (j) => (j.modality ?? "") === appliedFilters.modality,
        );
      }

      return { ...data, items };
    },
    ...listQueryOptions,
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      jobs.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs-admin"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.jobsAdminSummary });
    },
  });

  const applyFilters = () => {
    setAppliedFilters(filters);
    setPage(1);
  };

  const clearFilters = () => {
    const empty = {
      search: "",
      companyId: "",
      status: "",
      city: "",
      modality: "",
    };
    setFilters(empty);
    setAppliedFilters(empty);
    setPage(1);
  };

  const metricCards = [
    {
      key: "active",
      title: "Activas",
      value: summary?.active?.value ?? 0,
      trend: summary?.active?.trend,
      icon: Play,
      iconBg: "bg-[#EAF8EF]",
      iconColor: "text-[#16A34A]",
    },
    {
      key: "paused",
      title: "Pausadas",
      value: summary?.paused?.value ?? 0,
      trend: summary?.paused?.trend,
      icon: Pause,
      iconBg: "bg-[#FFF5E6]",
      iconColor: "text-[#F59E0B]",
    },
    {
      key: "closed",
      title: "Cerradas",
      value: summary?.closed?.value ?? 0,
      trend: summary?.closed?.trend,
      icon: XCircle,
      iconBg: "bg-[#FEECEC]",
      iconColor: "text-[#EF4444]",
    },
    {
      key: "applications",
      title: "Total postulaciones",
      value: summary?.applications?.value ?? 0,
      trend: summary?.applications?.trend,
      icon: Users,
      iconBg: "bg-[#F5EAFE]",
      iconColor: "text-[#A855F7]",
    },
  ];

  const items = jobsData?.items ?? [];
  const companyOptions = companiesData ?? [];
  const cityOptions = Array.from(
    new Set(items.map((job) => job.city).filter(Boolean) as string[]),
  ).sort();
  const isInitialLoading = isFetching && !jobsData;

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Header
        title="Vacantes globales"
        subtitle="Supervisa todas las vacantes publicadas en la plataforma."
        actions={
          <Button
            variant="outline"
            onClick={() => setShowFilters((prev) => !prev)}
          >
            <Filter className="h-4 w-4" />
            Filtros
          </Button>
        }
      />

      <div className="space-y-5 p-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {metricCards.map((card) => (
            <StatCard
              key={card.key}
              title={card.title}
              value={card.value}
              trend={card.trend}
              period="mes anterior"
              icon={card.icon}
              iconBg={card.iconBg}
              iconColor={card.iconColor}
            />
          ))}
        </div>

        <Card className="rounded-[18px] border border-[#E6ECF5] shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
          <CardContent className="space-y-4 p-4 md:p-5">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-12">
              <div className="relative xl:col-span-4">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
                <input
                  type="text"
                  placeholder="Buscar puesto, empresa o ciudad..."
                  value={filters.search}
                  onChange={(e) =>
                    setFilters({ ...filters, search: e.target.value })
                  }
                  onKeyDown={(e) => e.key === "Enter" && applyFilters()}
                  className="h-10 w-full rounded-lg border border-[#E6ECF5] bg-white pl-9 pr-3 text-sm text-[#334155] placeholder:text-[#94A3B8] focus:border-[#0B5CFF] focus:outline-none focus:ring-2 focus:ring-[#EAF2FF]"
                />
              </div>
              <div className="xl:col-span-2">
                <select
                  value={filters.companyId}
                  onChange={(e) => {
                    const next = { ...filters, companyId: e.target.value };
                    setFilters(next);
                    setAppliedFilters(next);
                    setPage(1);
                  }}
                  className="h-10 w-full rounded-lg border border-[#E6ECF5] bg-white px-3 text-sm text-[#334155] focus:border-[#0B5CFF] focus:outline-none focus:ring-2 focus:ring-[#EAF2FF]"
                >
                  <option value="">Todas las empresas</option>
                  {companyOptions.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="xl:col-span-2">
                <select
                  value={filters.city}
                  onChange={(e) => {
                    const next = { ...filters, city: e.target.value };
                    setFilters(next);
                    setAppliedFilters(next);
                    setPage(1);
                  }}
                  className="h-10 w-full rounded-lg border border-[#E6ECF5] bg-white px-3 text-sm text-[#334155] placeholder:text-[#94A3B8] focus:border-[#0B5CFF] focus:outline-none focus:ring-2 focus:ring-[#EAF2FF]"
                >
                  <option value="">Todas las ciudades</option>
                  {cityOptions.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
              </div>
              <div className="xl:col-span-2">
                <select
                  value={filters.modality}
                  onChange={(e) => {
                    const next = { ...filters, modality: e.target.value };
                    setFilters(next);
                    setAppliedFilters(next);
                    setPage(1);
                  }}
                  className="h-10 w-full rounded-lg border border-[#E6ECF5] bg-white px-3 text-sm text-[#334155] focus:border-[#0B5CFF] focus:outline-none focus:ring-2 focus:ring-[#EAF2FF]"
                >
                  <option value="">Todas las modalidades</option>
                  <option value="presencial">Presencial</option>
                  <option value="remoto">Remoto</option>
                  <option value="hibrido">Híbrido</option>
                </select>
              </div>
              <div className="xl:col-span-2">
                <select
                  value={filters.status}
                  onChange={(e) => {
                    const next = { ...filters, status: e.target.value };
                    setFilters(next);
                    setAppliedFilters(next);
                    setPage(1);
                  }}
                  className="h-10 w-full rounded-lg border border-[#E6ECF5] bg-white px-3 text-sm text-[#334155] focus:border-[#0B5CFF] focus:outline-none focus:ring-2 focus:ring-[#EAF2FF]"
                >
                  <option value="">Todos los estados</option>
                  <option value="active">Activas</option>
                  <option value="paused">Pausadas</option>
                  <option value="closed">Cerradas</option>
                </select>
              </div>
            </div>
            {showFilters && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="h-10"
                  onClick={clearFilters}
                >
                  Limpiar
                </Button>
                <Button className="h-10" onClick={applyFilters}>
                  Aplicar
                </Button>
              </div>
            )}

            <div className="overflow-x-auto rounded-lg border border-[#E6ECF5]">
              <table className="min-w-full divide-y divide-[#E6ECF5] bg-white">
                <thead className="bg-[#F8FAFC]">
                  <tr>
                    {[
                      "Puesto",
                      "Empresa",
                      "Ciudad",
                      "Modalidad",
                      "Salario",
                      "Estado",
                      "Postulaciones",
                      "Acciones",
                    ].map((col) => (
                      <th
                        key={col}
                        className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#64748B]"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EEF2F7]">
                  {isInitialLoading ? (
                    <tr>
                      <td
                        className="px-4 py-10 text-center text-sm text-[#64748B]"
                        colSpan={8}
                      >
                        Cargando vacantes...
                      </td>
                    </tr>
                  ) : items.length ? (
                    items.map((job) => {
                      const applicationsCount =
                        job._count?.applications ?? job.applications ?? 0;
                      const hasSalary =
                        typeof job.salaryMin === "number" ||
                        typeof job.salaryMax === "number";
                      const salaryText = hasSalary
                        ? `C$ ${job.salaryMin?.toLocaleString() ?? "-"} - C$ ${job.salaryMax?.toLocaleString() ?? "-"}`
                        : "No definido";

                      return (
                        <tr key={job.id} className="hover:bg-[#F8FAFC]">
                          <td className="px-4 py-3">
                            <span className="font-medium text-[#0F172A]">
                              {job.title}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <Link
                              href={`/admin/companies/${job.company.id}`}
                              className="inline-flex items-center gap-1.5 text-sm font-medium text-[#0B5CFF] hover:text-[#004BDD]"
                            >
                              <Building2 className="h-4 w-4 text-[#94A3B8]" />
                              {job.company.name}
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-sm text-[#475569]">
                            <span className="inline-flex items-center gap-1.5">
                              <MapPin className="h-4 w-4 text-[#94A3B8]" />
                              {job.city || "Remoto"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-[#475569]">
                            {getModalityLabel(job.modality)}
                          </td>
                          <td className="px-4 py-3 text-sm text-[#334155]">
                            <span className="inline-flex items-center gap-1">
                              <DollarSign className="h-4 w-4 text-[#94A3B8]" />
                              {salaryText}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant={getStatusBadgeVariant(job.status)}>
                              {getStatusLabel(job.status)}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-[#0F172A]">
                            {applicationsCount}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                title="Ver"
                                onClick={() => setPreviewJobId(job.id)}
                                className="rounded-md border border-[#E6ECF5] p-1.5 text-[#64748B] hover:bg-[#F1F5F9]"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              {job.status === "active" ? (
                                <button
                                  type="button"
                                  title="Pausar"
                                  onClick={() =>
                                    updateStatusMutation.mutate({
                                      id: job.id,
                                      status: "paused",
                                    })
                                  }
                                  className="rounded-md border border-[#E6ECF5] p-1.5 text-[#F59E0B] hover:bg-amber-50"
                                >
                                  <Pause className="h-4 w-4" />
                                </button>
                              ) : job.status === "paused" ? (
                                <button
                                  type="button"
                                  title="Activar"
                                  onClick={() =>
                                    updateStatusMutation.mutate({
                                      id: job.id,
                                      status: "active",
                                    })
                                  }
                                  className="rounded-md border border-[#E6ECF5] p-1.5 text-[#16A34A] hover:bg-emerald-50"
                                >
                                  <Play className="h-4 w-4" />
                                </button>
                              ) : null}
                              {job.status !== "closed" && (
                                <button
                                  type="button"
                                  title="Cerrar"
                                  onClick={() =>
                                    updateStatusMutation.mutate({
                                      id: job.id,
                                      status: "closed",
                                    })
                                  }
                                  className="rounded-md border border-[#E6ECF5] p-1.5 text-[#64748B] hover:bg-[#F1F5F9]"
                                >
                                  <XCircle className="h-4 w-4" />
                                </button>
                              )}
                              <Link
                                href={`/admin/companies/${job.company.id}`}
                                title="Analítica empresa"
                                className="rounded-md border border-[#E6ECF5] p-1.5 text-[#64748B] hover:bg-[#F1F5F9]"
                              >
                                <BarChart3 className="h-4 w-4" />
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td className="px-4 py-12 text-center" colSpan={8}>
                        <Briefcase className="mx-auto h-8 w-8 text-[#CBD5E1]" />
                        <p className="mt-2 text-sm font-medium text-[#1E293B]">
                          No hay vacantes
                        </p>
                        <p className="mt-1 text-xs text-[#64748B]">
                          No se encontraron vacantes con los filtros actuales.
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {typeof jobsData?.total === "number" && jobsData.total > 0 && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-[#64748B]">
                  Mostrando {(page - 1) * 15 + 1} a{" "}
                  {Math.min(page * 15, jobsData.total)} de {jobsData.total}{" "}
                  vacantes
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                  >
                    Anterior
                  </Button>
                  <span className="text-sm font-medium text-[#64748B]">
                    {page} / {jobsData.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= jobsData.totalPages}
                    onClick={() => setPage(page + 1)}
                  >
                    Siguiente
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <JobPreviewDrawer
        jobId={previewJobId}
        onClose={() => setPreviewJobId(null)}
      />
    </div>
  );
}
