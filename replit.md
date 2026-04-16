# Achilles — Sistema de Gestão de Encontro de Contas

## Overview
A React/TypeScript/Vite frontend application for managing financial billing ("Notas de Débito") between Unimed health cooperatives. Uses Supabase as the backend for authentication, database (PostgreSQL with RLS), and real-time.

## Architecture
- **Frontend**: React 18 + TypeScript + Vite, served on port 5000
- **Styling**: Tailwind CSS + Shadcn UI (Radix UI primitives)
- **State/Data**: TanStack Query (React Query) for server state, React Context for auth
- **Backend**: Supabase (Auth + PostgreSQL with Row Level Security)
- **Routing**: React Router v6
- **Forms**: React Hook Form + Zod validation

## Key Files & Directories
- `src/App.tsx` — Root component, routing, providers
- `src/contexts/AuthContext.tsx` — Auth state, role management (admin/financeiro/unimed_consulta/usuario)
- `src/integrations/supabase/client.ts` — Supabase client initialization
- `src/integrations/supabase/types.ts` — Auto-generated DB types
- `src/pages/` — All page components (Login, Dashboard, Unimeds, NotasDebito, etc.)
- `src/components/` — Shared components including AppLayout, AppSidebar, ProtectedRoute
- `src/hooks/` — Custom hooks (useAudit, use-toast, use-mobile)
- `supabase/migrations/` — Database schema SQL migrations (applied on Supabase side)

## Environment Variables (Secrets)
- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` — Supabase anon/public key

## Running the App
```bash
npm run dev   # Starts Vite dev server on port 5000
npm run build # Production build
```

## Features
- **Authentication**: Email/password login via Supabase Auth
- **RBAC**: Role-based access control (admin, financeiro, unimed_consulta, usuario)
- **Encontros**: Financial meeting/billing cycle management
- **Notas de Débito**: Debit note creation and management
- **Parcelamentos**: Installment plan management
- **Exportação**: Data export functionality
- **Auditoria**: Full audit log
- **Relatórios**: Multiple report views (Parcelamentos, Notas Débito, Sintético, Tipo Nota, Cobrança Eventos)
- **Usuários/Unimeds/Parâmetros**: Admin configuration pages

## Migration Notes (Lovable → Replit)
- Removed `lovable-tagger` devDependency and its usage in `vite.config.ts`
- Updated Vite server config: `host: "0.0.0.0"`, `port: 5000`, `allowedHosts: true` for Replit proxy
- Moved Google Fonts `@import` before Tailwind directives in `src/index.css`
- Supabase credentials stored as Replit secrets
