import { Office } from '@/features/oficina/components/office';
import { getOfficeData } from '@/features/oficina/queries';

export const dynamic = 'force-dynamic';

export default async function OficinaPage() {
  const data = await getOfficeData();
  return <Office data={data} />;
}
