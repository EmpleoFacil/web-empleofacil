# EmpleoFacil Portal — Contexto 31 Mayo 2026

## Stack
- Next.js 16 App Router + Turbopack
- Tailwind CSS v4 + design tokens (hex)
- React Query (@tanstack/react-query)
- API: NestJS en `http://localhost:3001/api`
- Frontend: `http://localhost:3000`

## Roles y sus Rutas

### company_admin — 6 vistas
| Ruta | Propósito |
|------|-----------|
| `/dashboard` | KPIs, vacantes recientes, entrevistas, mensajes, plan banner |
| `/jobs` | Listado vacantes, filtrar, cambiar estado, eliminar |
| `/jobs/new` | Crear vacante (formulario + límites plan) |
| `/jobs/[id]` | Ver detalle + editar vacante |
| `/candidates` | Pipeline Kanban / tabla, filtrar, exportar CSV |
| `/candidates/[id]` | Perfil candidato, docs, historial, notas, enviar mensaje |
| `/interviews` | CRUD entrevistas, filtrar, recordatorios, resultados |
| `/messages` | Bandeja (pendientes/respondidos/enviados), plantillas |
| `/settings` | Info empresa, CRUD usuarios, ver/cambiar plan |

### super_admin — 5 vistas
| Ruta | Propósito |
|------|-----------|
| `/admin/dashboard` | KPIs globales, actividad reciente, empresas por plan |
| `/admin/jobs` | Todas las vacantes de la plataforma |
| `/admin/candidates` | Todos los candidatos + drawer detalle/docs/postulaciones |
| `/admin/companies` | CRUD empresas, cambiar estado |
| `/admin/companies/[id]` | Detalle empresa: info, usuarios, KPIs, vacantes, postulaciones |
| `/admin/commercial` | CRUD planes, pagos, asignar plan, config plataforma |

### Sin archivo aún
- `/register` — link en login
- `/forgot-password` — link en login
- `/admin/jobs/[id]` — detalle vacante global

## Estructura de Archivos
```
src/app/(dashboard)/
├── layout.tsx              ← COMPARTIDO (solo providers)
├── page.tsx                ← redirect a /login
├── dashboard/page.tsx      ← SOLO company
├── jobs/page.tsx           ← SOLO company
├── jobs/new/page.tsx       ← SOLO company
├── jobs/[id]/page.tsx      ← SOLO company (CREADO 31/Mayo)
├── candidates/page.tsx     ← SOLO company
├── candidates/[id]/page.tsx ← SOLO company
├── interviews/page.tsx     ← SOLO company
├── messages/page.tsx       ← SOLO company
├── settings/page.tsx       ← SOLO company
└── admin/
    ├── dashboard/page.tsx  ← SOLO admin
    ├── jobs/page.tsx       ← SOLO admin
    ├── candidates/page.tsx ← SOLO admin
    ├── companies/page.tsx  ← SOLO admin
    ├── companies/[id]/page.tsx ← SOLO admin
    └── commercial/page.tsx ← SOLO admin
```
Cada página es 100% independiente. Lo compartido: layout (providers), Sidebar, Header, componentes UI (Card, Button, Badge, StatCard, Table), `api.ts`, `auth-context.tsx`.

## Design Tokens
- Inter font (Google Fonts)
- Primary: `#0B5CFF` → hover `#004BDD` → soft `#EAF2FF`
- Bg: `#F8FAFC` | Surface: `#FFFFFF` | Border: `#E6ECF5` `#EEF2F7`
- Text: strong `#0F172A` → default `#334155` → muted `#64748B` → subtle `#94A3B8`
- Success: `#16A34A` / soft `#EAF8EF`
- Warning: `#F59E0B` / soft `#FFF5E6`
- Error: `#EF4444` / soft `#FEECEC`
- Purple: `#A855F7` / soft `#F5EAFE`
- Radii: inputs 14px, buttons 14px, cards 18-20px, sidebar items 12px, badges 999px
- Shadow card: `0 8px 24px rgba(15,23,42,0.04)`
- Sidebar: 272px, active bg `#EEF4FF` + text `#0B5CFF`
- Header: 76px, search input h-12, title 32px/700 + subtitle 15px/500
- KPI numbers: 40px/700, H1: 32px/700, H2: 22px/700, Body: 14px/500
- Table rows: 56-60px, divide `#EEF2F7`

## Componentes UI (src/components/ui/)
| Archivo | Props |
|---------|-------|
| `card.tsx` | Card, CardHeader, CardTitle, CardContent |
| `button.tsx` | variant: primary/secondary/outline/ghost/danger |
| `badge.tsx` | variant: default/success/warning/danger/info/purple |
| `stat-card.tsx` | title, value, trend, period, icon |
| `table.tsx` | Table, TableHead, TableRow, TableCell, TableBody |
| `sidebar.tsx` | 272px, role-based items, company block, user profile |
| `header.tsx` | title, subtitle, search bar, notifications, profile |

## Estado por Funcionalidad

### company_admin
| Funcionalidad | Estado | Endpoint |
|--------------|--------|----------|
| ✅ Publicar vacante | Funcional | POST /jobs + GET /jobs/categories |
| ✅ Ver aplicantes (pipeline/tabla) | Funcional | GET /applications/company/pipeline + /applications/company |
| ✅ Ver detalle + editar vacante | **CREADA 31/Mayo** | GET /jobs/{id} + PATCH /jobs/{id} |
| ✅ Mensajes / responder | Funcional | GET/POST /messages, plantillas |
| ✅ CRUD entrevistas | Funcional | POST/PATCH /interviews, status, reminder, result |
| ✅ Configuración empresa | Funcional | GET/PATCH /companies/me, CRUD usuarios |
| ⚠️ Límites de plan | Solo UI informativa (frontend valida, backend debe rechazar si excede) | GET /companies/me/plan-limits |

### super_admin
| Funcionalidad | Estado | Endpoint |
|--------------|--------|----------|
| ✅ Crear / editar / eliminar empresas | Funcional | POST /companies, PATCH/DELETE /companies/admin/{id} |
| ✅ Cambiar estado empresa | Funcional | PATCH /companies/admin/{id}/status |
| ✅ CRUD usuarios en empresa | Funcional | POST /companies/admin/{companyId}/users |
| ✅ Asignar plan a empresa | Funcional | PATCH /billing/assign-plan o /companies/admin/{id}/plan |
| ✅ CRUD planes | Funcional | POST/PATCH/DELETE /billing/plans |
| ✅ Pagos manuales | Funcional | POST /billing/manual-payment |
| ❌ Detalle vacante global | No existe | `/admin/jobs/[id]` |

## API Client (src/lib/api.ts)
Exporta `api` (axios instance) + helpers organizados:
- `auth` — login, logout, getMe
- `dashboard` — getCompany, getAdmin
- `jobs` — CRUD + status + categories + admin
- `applications` — list, pipeline, export, notes, status
- `interviews` — CRUD, summary, reminder, result
- `messages` — CRUD, templates, resend, status
- `companies` — self profile + admin CRUD + users + plans
- `candidates` — admin list/detail + status + export
- `documents` — getByCandidate
- `billing` — plans, payments, assign, settings

## Endpoints Completos

### Auth
| POST /auth/login | Body: `{identifier, password}` |
| GET /auth/me | Restaurar sesión |

### Dashboard
| GET /dashboard/company | KPIs + recientes empresa |
| GET /dashboard/admin | KPIs globales admin |

### Jobs (Company)
| GET /jobs/company | Listar (?page&limit&search&status&city) |
| GET /jobs/company/summary | Conteos por estado |
| GET /jobs/categories | Dropdown formulario |
| GET /jobs/{id} | Detalle |
| POST /jobs | Crear |
| PATCH /jobs/{id} | Editar |
| PATCH /jobs/{id}/status | Cambiar estado |
| DELETE /jobs/{id} | Eliminar |

### Jobs (Admin)
| GET /jobs/admin | Listar global (?search&status&companyId&page&limit) |

### Applications (Company)
| GET /applications/company | Listar (?search&jobId&status) |
| GET /applications/company/summary | Conteos pipeline |
| GET /applications/company/pipeline | Kanban (?jobId) |
| GET /applications/company/export | CSV (?jobId) |
| GET /applications/{id} | Detalle postulación |
| PATCH /applications/{id}/status | Avanzar pipeline |
| POST /applications/{id}/notes | Nota interna |

### Candidates (Admin)
| GET /candidates | Listar (?search&status&city&page&limit) |
| GET /candidates/summary | KPIs |
| GET /candidates/{id} | Detalle |
| GET /candidates/{id}/applications | Postulaciones |
| GET /candidates/{id}/documents | Documentos |
| PATCH /candidates/{id}/status | Estado |
| GET /candidates/export | CSV |

### Interviews
| GET /interviews/company | Listar (?status&jobId&search&dateFrom&dateTo) |
| GET /interviews/company/summary | Conteos |
| POST /interviews | Crear |
| PATCH /interviews/{id} | Editar |
| PATCH /interviews/{id}/status | scheduled→confirmed→completed (o cancelled) |
| POST /interviews/{id}/reminder | Enviar notificación |
| POST /interviews/{id}/result | Feedback/resultado |

### Messages
| GET /messages/company | Listar (?candidateId) |
| POST /messages | Enviar |
| POST /messages/{id}/resend | Reenviar |
| PATCH /messages/{id}/status | Leído/respondido |
| GET /messages/templates | Listar plantillas |
| POST /messages/templates | Crear plantilla |
| DELETE /messages/templates/{id} | Eliminar |

### Companies (self)
| GET /companies/me | Perfil |
| PATCH /companies/me | Actualizar |
| GET /companies/me/users | Listar usuarios |
| POST /companies/me/users | Crear |
| PATCH /companies/me/users/{id} | Editar |
| DELETE /companies/me/users/{id} | Eliminar |
| GET /companies/me/plan-limits | Límites (activeJobs, users, visibleCandidates) |
| GET /companies/billing/company-plan | Plan actual + fechas |
| GET /companies/plans | Planes disponibles para elegir |
| PATCH /companies/me/plan | Cambiar plan |

### Companies (Admin)
| GET /companies/admin/list | Listar (?status&planId&search&page) |
| GET /companies/admin/summary | Conteos |
| GET /companies/admin/{id} | Detalle |
| GET /companies/admin/{id}/users | Usuarios |
| GET /companies/admin/{id}/metrics | KPIs |
| GET /companies/admin/{id}/jobs | Vacantes |
| GET /companies/admin/{id}/applications | Postulaciones |
| POST /companies | Crear |
| PATCH /companies/admin/{id} | Editar |
| PATCH /companies/admin/{id}/status | Activar/suspender |
| PATCH /companies/admin/{id}/plan | Asignar plan |
| POST /companies/admin/{id}/users | Agregar usuario |
| DELETE /companies/admin/{id} | Eliminar |

### Billing / Commercial
| GET /billing/plans | Listar |
| POST /billing/plans | Crear |
| PATCH /billing/plans/{id} | Editar |
| DELETE /billing/plans/{id} | Eliminar |
| GET /billing/payments | Pagos (?status&page) |
| POST /billing/manual-payment | Registrar cobro |
| PATCH /billing/assign-plan | Asignar plan a empresa |
| GET /billing/platform-settings | Config global |
| PATCH /billing/platform-settings | Guardar config |

## Sesión / Auth Flow
- Login: POST /auth/login → body `{identifier, password}` → recibe token
- Token guardado en cookie `token`
- GET /auth/me en mount del layout (valida sesión + obtiene rol)
- Redirección: `company_admin` → `/dashboard`, `super_admin` → `/admin/dashboard`
- 401 → limpia cookie + redirect a `/login`

## Decisiones Técnicas
- api.ts baseURL: `http://localhost:3001/api` (ya configurado, NO usar .env)
- Cada página es `'use client'` con React Query
- NO hay Server Components ni Server Actions en las páginas de dashboard
- Paginación: page + limit (default 10-15), respuesta `{items, total, totalPages}`
- Export CSV: respuesta blob, se descarga con `window.open` o fetch+blob

## Prioridades Pendientes
1. Crear `/admin/jobs/[id]` (detalle vacante global)
2. Crear `/register` (registro público empresas)
3. Crear `/forgot-password`
4. Conectar login real + test role redirect
5. Backend debe rechazar si excede plan limits (frontend solo UI)
