# Supabase · empresa-os

Conexión del proyecto a Supabase + esquema multi-tenant con RLS por `tenant_id`.

## 1. Conseguir la URL y la key

1. Entra a tu proyecto en **https://supabase.com/dashboard**.
2. Ve a **Project Settings** (⚙️, abajo a la izquierda) → **API**.
3. Copia estos dos valores:
   - **Project URL** → algo como `https://abcdxyz.supabase.co`
   - **Publishable / anon key** → la key pública (segura para el navegador).
   - *(Opcional)* **Secret / service_role key** → SOLO para servidor; **salta el RLS**, nunca la pongas en el navegador ni la subas a git.

## 2. Dónde pegarlas

En la raíz del proyecto, archivo **`.env.local`** (ya tiene un bloque `# Supabase`):

```env
NEXT_PUBLIC_SUPABASE_URL=https://TU-PROYECTO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=TU_PUBLISHABLE_O_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=TU_SERVICE_ROLE_KEY   # opcional, solo servidor
```

Tras editar `.env.local`, **reinicia** `npm run dev` (Next.js solo lee el env al arrancar).

## 3. Crear las tablas

Dos opciones:

**A) SQL Editor (rápido)**
Supabase → **SQL Editor** → **New query** → pega TODO el contenido de
[`migrations/0001_init_multitenant.sql`](migrations/0001_init_multitenant.sql) → **Run**.
Es idempotente: se puede correr varias veces sin romper nada.

**B) Supabase CLI**
```bash
npx supabase link --project-ref TU_PROJECT_REF
npx supabase db push
```

## 4. Esquema creado

8 tablas, cada una con `tenant_id` y RLS activado:

```
organizations → departments → agents → tasks → events → approvals → budgets → results
```

- Cada tabla referencia a su **padre por `(padre_id, tenant_id)`**, así un registro
  nunca puede apuntar a un padre de otro tenant.
- **`events` es append-only**: solo `SELECT` e `INSERT`. Un trigger bloquea
  `UPDATE`/`DELETE` incluso con `service_role`.
- `updated_at` se actualiza solo en el resto de tablas.

## 5. RLS: de dónde sale el `tenant_id` (IMPORTANTE)

`tenant_id` = **`org_id` de Clerk** (el id de la organización activa del usuario).
Clerk incluye `org_id` en el token automáticamente cuando el usuario tiene una
organización activa, así que **no hace falta crear plantillas de JWT ni claims
personalizados**. El RLS lo lee con `public.current_tenant_id()`.

Para que ese token lo acepte Supabase, hay que activar la integración (una sola
vez, en los dos dashboards):

**En Clerk** (requiere "reclamar" la instancia dev con `clerk auth login`, o usar
una app normal de Clerk):
1. Activa **Organizations** (Clerk Dashboard → *Organizations* → Enable).
   Sin organizaciones no hay `org_id` y el RLS no dejará ver nada.
2. Activa la **integración con Supabase** (Clerk Dashboard → *Integrations* →
   Supabase). Copia el **Clerk domain** (issuer) que te muestra.

**En Supabase**:
3. Dashboard → **Authentication → Third-Party Auth → Add provider → Clerk** y
   pega ese Clerk domain.

Mientras no haya `org_id` en el token, `current_tenant_id()` devuelve `NULL` y el
RLS no deja ver/insertar nada desde el navegador (comportamiento correcto y seguro).
Para pruebas de servidor puedes usar el cliente admin (`service_role`), que salta
el RLS.

**Crear tu organización en la BD:** una vez el usuario tenga org activa en Clerk,
llama a `ensureOrganization()` (`src/lib/supabase/provision.ts`) desde el servidor
para crear/actualizar su fila en `organizations`. A partir de ahí, todas las demás
tablas se insertan con ese mismo `tenant_id`.

## 6. Cómo usarlo en el código

- **Client Component:** `useSupabaseBrowser()` → `src/lib/supabase/client.ts`
- **Server / Route Handler / Server Action:** `createServerSupabaseClient()` → `src/lib/supabase/server.ts`
- **Admin (salta RLS, solo servidor):** `createAdminSupabaseClient()` → `src/lib/supabase/server.ts`
