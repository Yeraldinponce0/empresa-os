import { Office } from '@/features/oficina/components/office';
import { getOfficeData } from '@/features/oficina/queries';

import '@/features/oficina/office.css';

// Ruta PÚBLICA (sin login) y de SOLO LECTURA de la Oficina de Orkesta.
// Datos reales del tenant fijo 'yelizz' (cliente admin, server-only). No expone
// ningún botón que ejecute, apruebe o edite.
export const dynamic = 'force-dynamic';

export default async function OficinaDemoPage() {
  const data = await getOfficeData();

  return (
    <>
      <Office data={data} readOnly />
      <div
        style={{
          position: 'fixed',
          bottom: 14,
          right: 14,
          zIndex: 50,
          background: 'rgba(16,19,24,.92)',
          border: '1px solid #2B303A',
          color: '#B9B2FA',
          fontSize: 11,
          fontFamily: "'Inter', system-ui, sans-serif",
          padding: '6px 14px',
          borderRadius: 20,
          pointerEvents: 'none',
          backdropFilter: 'blur(6px)'
        }}
      >
        Demo público · solo lectura
      </div>
    </>
  );
}
