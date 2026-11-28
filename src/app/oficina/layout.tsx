import { auth } from '@clerk/nextjs/server';

import '@/features/oficina/office.css';

// La Oficina es pantalla completa y con su propia marca (Orkesta); no usa el
// shell de /dashboard. Se protege igual con auth.protect().
export default async function OficinaLayout({ children }: { children: React.ReactNode }) {
  await auth.protect();
  return children;
}
