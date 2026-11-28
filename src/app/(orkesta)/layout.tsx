import { auth } from '@clerk/nextjs/server';

import '@/features/oficina/office.css';

// Shell de secciones de Orkesta (Tareas, Agentes, etc.). Protegido con Clerk.
export default async function OrkestaSectionLayout({ children }: { children: React.ReactNode }) {
  await auth.protect();
  return children;
}
