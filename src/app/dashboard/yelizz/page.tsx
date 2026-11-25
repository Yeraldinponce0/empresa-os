import PageContainer from '@/components/layout/page-container';
import { getYelizzOverview } from '@/features/yelizz/queries';
import { YelizzOverview } from '@/features/yelizz/components/yelizz-overview';

// El layout del dashboard ya exige login (auth.protect()). Esta página lee los
// datos reales de Yelizz desde Supabase (service_role, tenant fijo 'yelizz').
export const dynamic = 'force-dynamic';

export default async function YelizzDashboardPage() {
  const data = await getYelizzOverview();

  return (
    <PageContainer
      pageTitle='Yelizz'
      pageDescription='Organización, departamentos, agentes y tareas — datos reales desde Supabase.'
    >
      <YelizzOverview data={data} />
    </PageContainer>
  );
}
