import { OrkestaShell } from '@/features/oficina/components/orkesta-shell';
import { IntegrationsGrid } from '@/features/orkesta/components/integrations-grid';

export const dynamic = 'force-dynamic';

export default function IntegracionesPage() {
  return (
    <OrkestaShell active='integraciones'>
      <div className='integrations'>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 3 }}>Integraciones</h1>
        <p className='loop-muted'>
          Conecta las herramientas de tu negocio. Aún no funcionan: así se verá el camino de cómo
          cada empresa enlazará sus APIs (cifradas y solo del lado del servidor).
        </p>
        <IntegrationsGrid />
      </div>
    </OrkestaShell>
  );
}
