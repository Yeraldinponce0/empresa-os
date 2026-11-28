import { notFound } from 'next/navigation';

import { OrkestaShell } from '@/features/oficina/components/orkesta-shell';
import { ComingSoon } from '@/features/oficina/components/coming-soon';
import { ORKESTA_SECTIONS } from '@/features/oficina/config';

export const dynamic = 'force-dynamic';

export default async function SectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  const s = ORKESTA_SECTIONS[section];
  if (!s) notFound();

  return (
    <OrkestaShell active={section}>
      <ComingSoon title={s.title} desc={s.desc} />
    </OrkestaShell>
  );
}
