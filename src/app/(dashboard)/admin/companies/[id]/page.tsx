"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Briefcase,
  Calendar,
  Edit,
  Mail,
  MapPin,
  Plus,
  Trash2,
  Users,
} from "lucide-react";
import { Header } from "@/components/ui/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Badge, getStatusBadgeVariant } from "@/components/ui/badge";
import { billing, companies } from "@/lib/api";
import { formatDate, formatDateTime, getStatusLabel } from "@/lib/utils";

type CompanyUser = {
  id: string;
  email: string;
  name?: string;
  title?: string;
  avatarUrl?: string;
  secondaryPhone?: string;
  companyRole?: string;
  status?: string;
};

type Job = {
  id: string;
  title: string;
  status: string;
  city?: string;
  createdAt?: string;
  _count?: { applications?: number };
};

type Application = {
  id: string;
  status: string;
  appliedAt?: string;
  candidate?: { fullName?: string };
  job?: { title?: string };
};

type Plan = { id: string; name: string; price: number };

type DrawerMode = "jobs" | "applications" | null;

function toArray<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (Array.isArray((payload as Record<string, unknown> | undefined)?.items))
    return ((payload as Record<string, unknown>).items as T[]) ?? [];
  if (Array.isArray((payload as Record<string, unknown> | undefined)?.jobs))
    return ((payload as Record<string, unknown>).jobs as T[]) ?? [];
  if (
    Array.isArray(
      (payload as Record<string, unknown> | undefined)?.applications,
    )
  )
    return ((payload as Record<string, unknown>).applications as T[]) ?? [];
  if (Array.isArray((payload as Record<string, unknown> | undefined)?.users))
    return ((payload as Record<string, unknown>).users as T[]) ?? [];
  return [];
}

export default function AdminCompanyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const companyId = String(id ?? "");
  const queryClient = useQueryClient();
  const [drawer, setDrawer] = useState<DrawerMode>(null);
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<CompanyUser | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);

  const { data: company, isPending } = useQuery({
    queryKey: ["admin-company-detail", companyId],
    queryFn: () =>
      companies
        .getAdminById(companyId)
        .then((res) => res.data as Record<string, unknown>),
    enabled: !!companyId,
  });

  const { data: usersData } = useQuery({
    queryKey: ["admin-company-users", companyId],
    queryFn: () => companies.getUsers(companyId).then((res) => res.data),
    enabled: !!companyId,
  });

  const { data: jobsData } = useQuery({
    queryKey: ["admin-company-jobs", companyId],
    queryFn: () => companies.getJobs(companyId).then((res) => res.data),
    enabled: !!companyId,
  });

  const { data: appsData } = useQuery({
    queryKey: ["admin-company-applications", companyId],
    queryFn: () => companies.getApplications(companyId).then((res) => res.data),
    enabled: !!companyId,
  });

  const { data: metrics } = useQuery({
    queryKey: ["admin-company-metrics", companyId],
    queryFn: () =>
      companies
        .getMetrics(companyId)
        .then(
          (res) =>
            res.data as Record<string, { value?: number; trend?: number }>,
        ),
    enabled: !!companyId,
  });

  const { data: plans } = useQuery({
    queryKey: ["billing-plans-for-company-detail"],
    queryFn: () =>
      billing
        .getPlans()
        .then(
          (res) =>
            (Array.isArray(res.data)
              ? res.data
              : (res.data.items ?? [])) as Plan[],
        ),
  });

  const users = useMemo(() => toArray<CompanyUser>(usersData), [usersData]);
  const jobs = useMemo(() => toArray<Job>(jobsData), [jobsData]);
  const applications = useMemo(
    () => toArray<Application>(appsData),
    [appsData],
  );

  const updateCompanyMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      companies.updateAdmin(companyId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin-company-detail", companyId],
      });
      setEditModalOpen(false);
    },
  });

  const changePlanMutation = useMutation({
    mutationFn: (planId: string) => companies.assignPlan(companyId, planId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin-company-detail", companyId],
      });
      setPlanModalOpen(false);
    },
  });

  const createUserMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      companies.createUser(companyId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin-company-users", companyId],
      });
      setUserModalOpen(false);
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({
      userId,
      payload,
    }: {
      userId: string;
      payload: Record<string, unknown>;
    }) => {
      try {
        return await companies.updateUser(companyId, userId, payload);
      } catch {
        return await companies.updateUser(companyId, userId, {
          ...payload,
          userId,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin-company-users", companyId],
      });
      setEditingUser(null);
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      try {
        return await companies.deleteUser(companyId, userId);
      } catch {
        return await companies.updateUser(companyId, userId, {
          status: "inactive",
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin-company-users", companyId],
      });
    },
  });

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#0B5CFF] border-t-transparent" />
      </div>
    );
  }

  const companyName = String(company?.name ?? "Empresa");
  const companyCity = String(company?.city ?? "Sin ciudad");
  const companyStatus = String(company?.status ?? "active");

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Header
        title="Detalle de empresa"
        subtitle="Consulta la informacion operativa y comercial de la empresa."
        actions={
          <>
            <Button className="h-11" onClick={() => setPlanModalOpen(true)}>
              Cambiar plan
            </Button>
            <Button
              variant="outline"
              className="h-11"
              onClick={() => setUserModalOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Agregar usuario
            </Button>
            <Button
              variant="outline"
              className="h-11"
              onClick={() => setEditModalOpen(true)}
            >
              <Edit className="h-4 w-4" />
              Editar empresa
            </Button>
          </>
        }
      />

      <div className="space-y-5 p-6">
        <p className="text-sm font-semibold text-[#64748B]">
          <Link
            href="/admin/companies"
            className="text-[#0B5CFF] hover:text-[#004BDD]"
          >
            Empresas
          </Link>{" "}
          › Detalle de empresa
        </p>

        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
            <div>
              <p className="text-4xl font-bold text-[#0F172A]">{companyName}</p>
              <p className="mt-1 inline-flex items-center gap-1 text-sm text-[#64748B]">
                <MapPin className="h-4 w-4" />
                {companyCity}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <Badge variant={getStatusBadgeVariant(companyStatus)}>
                  {getStatusLabel(companyStatus)}
                </Badge>
                <span className="text-sm text-[#64748B]">
                  Desde {formatDate(String(company?.createdAt ?? ""))}
                </span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-[#64748B]">Plan actual</p>
              <p className="text-lg font-bold text-[#0F172A]">
                {String(
                  (company?.plan as { name?: string } | undefined)?.name ??
                    "Sin plan",
                )}
              </p>
              <p className="text-sm text-[#64748B]">
                Renovación{" "}
                {company?.renewalDate
                  ? formatDate(String(company.renewalDate))
                  : "--"}
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          <StatCard
            title="Vacantes activas"
            value={
              metrics?.activeJobs?.value ??
              jobs.filter((j) => j.status === "active").length
            }
            trend={metrics?.activeJobs?.trend}
            period="hace 30 días"
            icon={Briefcase}
            iconBg="bg-[#EAF2FF]"
            iconColor="text-[#0B5CFF]"
          />
          <StatCard
            title="Postulaciones"
            value={metrics?.applications?.value ?? applications.length}
            trend={metrics?.applications?.trend}
            period="hace 30 días"
            icon={Users}
            iconBg="bg-[#EAF8EF]"
            iconColor="text-[#16A34A]"
          />
          <StatCard
            title="Entrevistas programadas"
            value={metrics?.interviews?.value ?? 0}
            trend={metrics?.interviews?.trend}
            period="hace 7 días"
            icon={Calendar}
            iconBg="bg-[#F5EAFE]"
            iconColor="text-[#A855F7]"
          />
          <StatCard
            title="Contrataciones"
            value={metrics?.hired?.value ?? 0}
            trend={metrics?.hired?.trend}
            period="hace 30 días"
            icon={Users}
            iconBg="bg-[#FFF5E6]"
            iconColor="text-[#F59E0B]"
          />
          <StatCard
            title="Tasa de respuesta"
            value={`${metrics?.responseRate?.value ?? 0}%`}
            trend={metrics?.responseRate?.trend}
            period="hace 30 días"
            icon={Mail}
            iconBg="bg-[#EAF2FF]"
            iconColor="text-[#0B5CFF]"
          />
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          <Card className="xl:col-span-5">
            <CardContent className="space-y-3 p-5">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-[#0F172A]">
                  Información de la empresa
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditModalOpen(true)}
                >
                  Editar
                </Button>
              </div>
              <InfoRow label="Nombre" value={companyName} />
              <InfoRow label="Correo" value={String(company?.email ?? "-")} />
              <InfoRow label="Teléfono" value={String(company?.phone ?? "-")} />
              <InfoRow
                label="Teléfono secundario"
                value={String(company?.secondaryPhone ?? "-")}
              />
              <InfoRow
                label="Sitio web"
                value={String(company?.website ?? "-")}
              />
              <InfoRow label="Ciudad" value={companyCity} />
              <InfoRow
                label="Dirección"
                value={String(company?.address ?? "-")}
              />
            </CardContent>
          </Card>

          <Card className="xl:col-span-7">
            <CardContent className="p-0">
              <div className="flex items-center justify-between border-b border-[#EEF2F7] px-5 py-4">
                <h3 className="text-lg font-bold text-[#0F172A]">
                  Usuarios de la empresa
                </h3>
              </div>
              <table className="w-full">
                <thead className="border-b border-[#EEF2F7] bg-[#F8FAFC]">
                  <tr>
                    {[
                      "Usuario",
                      "Correo",
                      "Teléfono extra",
                      "Rol y acciones",
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-[#64748B]"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EEF2F7]">
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="relative h-9 w-9 overflow-hidden rounded-full bg-[#EAF2FF]">
                            {u.avatarUrl ? (
                              <Image
                                src={u.avatarUrl}
                                alt={u.name || u.email}
                                fill
                                sizes="36px"
                                className="object-cover"
                              />
                            ) : (
                              <div className="flex h-9 w-9 items-center justify-center text-xs font-bold text-[#0B5CFF]">
                                {String(u.name ?? u.email ?? "U")
                                  .charAt(0)
                                  .toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-[#0F172A]">
                              {u.name || u.email}
                            </p>
                            <p className="text-xs text-[#64748B]">
                              {u.title || "Sin cargo"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-[#334155]">
                        {u.email}
                      </td>
                      <td className="px-4 py-3 text-sm text-[#334155]">
                        {u.secondaryPhone || "-"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              u.companyRole === "admin"
                                ? "info"
                                : u.companyRole === "editor"
                                  ? "success"
                                  : u.companyRole === "viewer"
                                    ? "purple"
                                    : "default"
                            }
                          >
                            {u.companyRole || "-"}
                          </Badge>
                          <button
                            type="button"
                            className="rounded-lg border border-[#E6ECF5] p-1.5 text-[#0B5CFF] hover:bg-[#F8FAFC]"
                            onClick={() => setEditingUser(u)}
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            className="rounded-lg border border-[#FEE2E2] p-1.5 text-[#EF4444] hover:bg-[#FEF2F2]"
                            onClick={() => {
                              if (
                                !window.confirm(`¿Eliminar usuario ${u.email}?`)
                              )
                                return;
                              deleteUserMutation.mutate(u.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!users.length && (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-4 py-10 text-center text-sm text-[#64748B]"
                      >
                        Sin usuarios
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          <Card className="xl:col-span-6">
            <CardContent className="space-y-3 p-5">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-[#0F172A]">
                  Vacantes recientes
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDrawer("jobs")}
                >
                  Ver todas
                </Button>
              </div>
              {jobs.slice(0, 3).map((job) => (
                <div
                  key={job.id}
                  className="rounded-xl border border-[#E6ECF5] p-3"
                >
                  <p className="text-sm font-bold text-[#0F172A]">
                    {job.title}
                  </p>
                  <p className="text-xs text-[#64748B]">
                    {job.city || "-"} •{" "}
                    {formatDate(String(job.createdAt ?? ""))}
                  </p>
                  <p className="text-xs text-[#64748B]">
                    Postulaciones: {job._count?.applications ?? 0}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="xl:col-span-6">
            <CardContent className="space-y-3 p-5">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-[#0F172A]">
                  Postulaciones (resumen)
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDrawer("applications")}
                >
                  Ver reporte
                </Button>
              </div>
              <InfoRow label="Total" value={String(applications.length)} />
              <InfoRow
                label="En proceso"
                value={String(
                  applications.filter((a) =>
                    [
                      "reviewing",
                      "preselected",
                      "interview_scheduled",
                    ].includes(a.status),
                  ).length,
                )}
              />
              <InfoRow
                label="Descartadas"
                value={String(
                  applications.filter((a) => a.status === "rejected").length,
                )}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {planModalOpen && (
        <PlanModal
          plans={plans ?? []}
          currentPlanId={String(
            (company?.plan as { id?: string } | undefined)?.id ?? "",
          )}
          onClose={() => setPlanModalOpen(false)}
          onSubmit={(planId) => changePlanMutation.mutate(planId)}
          loading={changePlanMutation.isPending}
        />
      )}
      {userModalOpen && (
        <AddUserModal
          onClose={() => setUserModalOpen(false)}
          onSubmit={(payload) => createUserMutation.mutate(payload)}
          loading={createUserMutation.isPending}
        />
      )}
      {editingUser && (
        <EditUserModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSubmit={(payload) =>
            updateUserMutation.mutate({ userId: editingUser.id, payload })
          }
          loading={updateUserMutation.isPending}
        />
      )}
      {editModalOpen && (
        <EditCompanyModal
          company={company ?? {}}
          onClose={() => setEditModalOpen(false)}
          onSubmit={(payload) => updateCompanyMutation.mutate(payload)}
          loading={updateCompanyMutation.isPending}
        />
      )}
      {drawer && (
        <CompanyDrawer
          mode={drawer}
          jobs={jobs}
          applications={applications}
          onClose={() => setDrawer(null)}
        />
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-[#64748B]">{label}</span>
      <span className="font-semibold text-[#0F172A] text-right">{value}</span>
    </div>
  );
}

function PlanModal({
  plans,
  currentPlanId,
  onClose,
  onSubmit,
  loading,
}: {
  plans: Plan[];
  currentPlanId: string;
  onClose: () => void;
  onSubmit: (planId: string) => void;
  loading: boolean;
}) {
  const [planId, setPlanId] = useState(currentPlanId);
  return (
    <ModalShell title="Cambiar plan" onClose={onClose}>
      <div className="space-y-2">
        {plans.map((plan) => (
          <label
            key={plan.id}
            className="flex items-center justify-between rounded-xl border border-[#E6ECF5] p-3"
          >
            <div>
              <p className="font-semibold text-[#0F172A]">{plan.name}</p>
              <p className="text-xs text-[#64748B]">
                C$ {plan.price.toLocaleString()} / mes
              </p>
            </div>
            <input
              type="radio"
              checked={planId === plan.id}
              onChange={() => setPlanId(plan.id)}
            />
          </label>
        ))}
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button onClick={() => onSubmit(planId)} disabled={loading || !planId}>
          {loading ? "Guardando..." : "Cambiar plan"}
        </Button>
      </div>
    </ModalShell>
  );
}

function AddUserModal({
  onClose,
  onSubmit,
  loading,
}: {
  onClose: () => void;
  onSubmit: (payload: Record<string, unknown>) => void;
  loading: boolean;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("editor");
  const [secondaryPhone, setSecondaryPhone] = useState("");
  const [password, setPassword] = useState("");
  return (
    <ModalShell title="Agregar usuario" onClose={onClose}>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit({ email, companyRole: role, secondaryPhone, password });
        }}
      >
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Correo"
          className="h-11 w-full rounded-xl border border-[#E6ECF5] px-3 text-sm"
          required
        />
        <input
          value={secondaryPhone}
          onChange={(e) => setSecondaryPhone(e.target.value)}
          placeholder="Teléfono extra (opcional)"
          className="h-11 w-full rounded-xl border border-[#E6ECF5] px-3 text-sm"
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="h-11 w-full rounded-xl border border-[#E6ECF5] px-3 text-sm"
        >
          <option value="admin">Administrador</option>
          <option value="recruiter">Reclutador</option>
          <option value="editor">Editor</option>
          <option value="viewer">Visor</option>
        </select>
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          placeholder="Contraseña temporal"
          className="h-11 w-full rounded-xl border border-[#E6ECF5] px-3 text-sm"
          required
        />
        <div className="flex justify-end gap-2">
          <Button variant="outline" type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Creando..." : "Crear usuario"}
          </Button>
        </div>
      </form>
    </ModalShell>
  );
}

function EditUserModal({
  user,
  onClose,
  onSubmit,
  loading,
}: {
  user: CompanyUser;
  onClose: () => void;
  onSubmit: (payload: Record<string, unknown>) => void;
  loading: boolean;
}) {
  const [name, setName] = useState(user.name ?? "");
  const [title, setTitle] = useState(user.title ?? "");
  const [secondaryPhone, setSecondaryPhone] = useState(
    user.secondaryPhone ?? "",
  );
  const [role, setRole] = useState(user.companyRole ?? "editor");
  const [status, setStatus] = useState(user.status ?? "active");
  return (
    <ModalShell title="Editar usuario" onClose={onClose}>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit({ name, title, companyRole: role, secondaryPhone, status });
        }}
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre"
          className="h-11 w-full rounded-xl border border-[#E6ECF5] px-3 text-sm"
        />
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Cargo"
          className="h-11 w-full rounded-xl border border-[#E6ECF5] px-3 text-sm"
        />
        <input
          value={secondaryPhone}
          onChange={(e) => setSecondaryPhone(e.target.value)}
          placeholder="Teléfono extra (opcional)"
          className="h-11 w-full rounded-xl border border-[#E6ECF5] px-3 text-sm"
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="h-11 w-full rounded-xl border border-[#E6ECF5] px-3 text-sm"
        >
          <option value="admin">Administrador</option>
          <option value="recruiter">Reclutador</option>
          <option value="editor">Editor</option>
          <option value="viewer">Visor</option>
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="h-11 w-full rounded-xl border border-[#E6ECF5] px-3 text-sm"
        >
          <option value="active">Activo</option>
          <option value="inactive">Inactivo</option>
        </select>
        <div className="flex justify-end gap-2">
          <Button variant="outline" type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Guardando..." : "Guardar"}
          </Button>
        </div>
      </form>
    </ModalShell>
  );
}

function EditCompanyModal({
  company,
  onClose,
  onSubmit,
  loading,
}: {
  company: Record<string, unknown>;
  onClose: () => void;
  onSubmit: (payload: Record<string, unknown>) => void;
  loading: boolean;
}) {
  const [name, setName] = useState(String(company.name ?? ""));
  const [email, setEmail] = useState(String(company.email ?? ""));
  const [phone, setPhone] = useState(String(company.phone ?? ""));
  const [secondaryPhone, setSecondaryPhone] = useState(
    String(company.secondaryPhone ?? ""),
  );
  const [city, setCity] = useState(String(company.city ?? ""));
  const [address, setAddress] = useState(String(company.address ?? ""));
  const [website, setWebsite] = useState(String(company.website ?? ""));
  return (
    <ModalShell title="Editar empresa" onClose={onClose}>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit({
            name,
            email,
            phone,
            secondaryPhone,
            city,
            address,
            website,
          });
        }}
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre"
          className="h-11 w-full rounded-xl border border-[#E6ECF5] px-3 text-sm"
        />
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Correo"
          className="h-11 w-full rounded-xl border border-[#E6ECF5] px-3 text-sm"
        />
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Teléfono"
          className="h-11 w-full rounded-xl border border-[#E6ECF5] px-3 text-sm"
        />
        <input
          value={secondaryPhone}
          onChange={(e) => setSecondaryPhone(e.target.value)}
          placeholder="Teléfono secundario"
          className="h-11 w-full rounded-xl border border-[#E6ECF5] px-3 text-sm"
        />
        <input
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="Ciudad"
          className="h-11 w-full rounded-xl border border-[#E6ECF5] px-3 text-sm"
        />
        <input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Dirección"
          className="h-11 w-full rounded-xl border border-[#E6ECF5] px-3 text-sm"
        />
        <input
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          placeholder="Sitio web"
          className="h-11 w-full rounded-xl border border-[#E6ECF5] px-3 text-sm"
        />
        <div className="flex justify-end gap-2">
          <Button variant="outline" type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Guardando..." : "Guardar"}
          </Button>
        </div>
      </form>
    </ModalShell>
  );
}

function CompanyDrawer({
  mode,
  jobs,
  applications,
  onClose,
}: {
  mode: Exclude<DrawerMode, null>;
  jobs: Job[];
  applications: Application[];
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-[#0F172A]/35"
        onClick={onClose}
        aria-label="Cerrar"
      />
      <div className="relative h-full w-full max-w-xl overflow-y-auto bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#EEF2F7] bg-white px-5 py-4">
          <h3 className="text-lg font-bold text-[#0F172A]">
            {mode === "jobs"
              ? "Vacantes de la empresa"
              : "Postulaciones de la empresa"}
          </h3>
          <Button variant="outline" size="sm" onClick={onClose}>
            Cerrar
          </Button>
        </div>
        <div className="space-y-3 p-5">
          {mode === "jobs"
            ? jobs.map((job) => (
                <div
                  key={job.id}
                  className="rounded-xl border border-[#E6ECF5] p-3"
                >
                  <p className="text-sm font-bold text-[#0F172A]">
                    {job.title}
                  </p>
                  <p className="text-xs text-[#64748B]">
                    {job.city || "-"} •{" "}
                    {formatDate(String(job.createdAt ?? ""))}
                  </p>
                  <p className="text-xs text-[#64748B]">
                    Postulaciones: {job._count?.applications ?? 0}
                  </p>
                </div>
              ))
            : applications.map((app) => (
                <div
                  key={app.id}
                  className="rounded-xl border border-[#E6ECF5] p-3"
                >
                  <p className="text-sm font-bold text-[#0F172A]">
                    {app.candidate?.fullName || "Candidato"}
                  </p>
                  <p className="text-xs text-[#64748B]">
                    {app.job?.title || "Vacante"}
                  </p>
                  <p className="text-xs text-[#64748B]">
                    {getStatusLabel(app.status)} •{" "}
                    {formatDateTime(String(app.appliedAt ?? ""))}
                  </p>
                </div>
              ))}
        </div>
      </div>
    </div>
  );
}

function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/45 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white">
        <div className="flex items-center justify-between border-b border-[#EEF2F7] px-5 py-4">
          <h3 className="text-lg font-bold text-[#0F172A]">{title}</h3>
          <Button variant="outline" size="sm" onClick={onClose}>
            Cerrar
          </Button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
