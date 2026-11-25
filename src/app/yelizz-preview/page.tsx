import { getYelizzOverview } from '@/features/yelizz/queries';
import { YelizzOverview } from '@/features/yelizz/components/yelizz-overview';

/**
 * Ruta PÚBLICA de solo lectura (sin login) para mostrar Yelizz.
 *
 * Lee con service_role EN EL SERVIDOR (la key nunca llega al navegador) y solo
 * expone la organización Yelizz: su estructura, agentes y tareas — sin datos
 * sensibles. Es la ruta pensada para enseñar sin pedir login.
 *
 * Nota: cualquiera con el enlace puede ver esta estructura de Yelizz. Es
 * intencional (vista de demostración). La pantalla completa y privada vive en
 * /dashboard/yelizz, detrás del login.
 */
export const dynamic = 'force-dynamic';

export default async function YelizzPreviewPage() {
  const data = await getYelizzOverview();

  return (
    <main className='mx-auto max-w-5xl space-y-4 p-6'>
      <div className='text-muted-foreground rounded-md border p-3 text-sm'>
        Vista pública de Yelizz (solo lectura). La pantalla completa está en{' '}
        <code>/dashboard/yelizz</code> y requiere login.
      </div>
      <YelizzOverview data={data} />
    </main>
  );
}
