import Link from 'next/link';
import type { ReactElement } from 'react';

/**
 * Menú lateral agrupado de Orkesta (compartido por la Oficina y las demás
 * pantallas). `active` resalta la sección actual (clave = segmento de la ruta).
 */

const ICONS: Record<string, ReactElement> = {
  oficina: <path d='M4 20V5a1 1 0 011-1h7v16M12 9h7a1 1 0 011 1v10M7 8h1M7 12h1M16 13h1M16 17h1' />,
  tareas: (
    <>
      <rect x='4' y='4' width='16' height='16' rx='2' />
      <path d='M8 12l3 3 5-6' />
    </>
  ),
  aprobaciones: (
    <>
      <circle cx='12' cy='12' r='9' />
      <path d='M8 12l3 3 5-6' />
    </>
  ),
  departamentos: <path d='M12 3l9 5-9 5-9-5 9-5zM3 14l9 5 9-5' />,
  agentes: (
    <>
      <circle cx='12' cy='8' r='4' />
      <path d='M4 21c0-4 4-6 8-6s8 2 8 6' />
    </>
  ),
  reportes: <path d='M4 20V4M4 20h16M8 16v-4M12 16V8M16 16v-7' />,
  memoria: (
    <>
      <ellipse cx='12' cy='6' rx='7' ry='3' />
      <path d='M5 6v12c0 1.7 3.1 3 7 3s7-1.3 7-3V6' />
    </>
  ),
  integraciones: (
    <>
      <path d='M10 13a5 5 0 007 0l2-2a5 5 0 00-7-7l-1 1' />
      <path d='M14 11a5 5 0 00-7 0l-2 2a5 5 0 007 7l1-1' />
    </>
  ),
  equipo: (
    <>
      <circle cx='9' cy='8' r='3' />
      <path d='M15 11a3 3 0 100-6M3 20c0-3 3-5 6-5s6 2 6 5M15 15c3 0 6 2 6 5' />
    </>
  ),
  facturacion: (
    <>
      <rect x='3' y='5' width='18' height='14' rx='2' />
      <path d='M3 10h18' />
    </>
  ),
  configuracion: (
    <>
      <circle cx='12' cy='12' r='3' />
      <path d='M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1' />
    </>
  )
};

type NavItem = { key: string; href: string; label: string };
type NavGroup = { label: string; items: NavItem[] };

const GROUPS: NavGroup[] = [
  {
    label: 'Operación',
    items: [
      { key: 'oficina', href: '/oficina', label: 'Oficina' },
      { key: 'tareas', href: '/tareas', label: 'Tareas' },
      { key: 'aprobaciones', href: '/aprobaciones', label: 'Aprobaciones' }
    ]
  },
  {
    label: 'Estructura',
    items: [
      { key: 'departamentos', href: '/departamentos', label: 'Departamentos' },
      { key: 'agentes', href: '/agentes', label: 'Agentes' }
    ]
  },
  {
    label: 'Inteligencia',
    items: [
      { key: 'reportes', href: '/reportes', label: 'Reportes' },
      { key: 'memoria', href: '/memoria', label: 'Memoria' }
    ]
  },
  {
    label: 'Administración',
    items: [
      { key: 'integraciones', href: '/integraciones', label: 'Integraciones' },
      { key: 'equipo', href: '/equipo', label: 'Equipo' },
      { key: 'facturacion', href: '/facturacion', label: 'Facturación' },
      { key: 'configuracion', href: '/configuracion', label: 'Configuración' }
    ]
  }
];

export function OrkestaNav({ active, orgName = 'Yelizz' }: { active: string; orgName?: string }) {
  return (
    <nav className='nav'>
      <div className='logo'>
        <svg width='20' height='20' viewBox='0 0 24 24'>
          <circle cx='12' cy='12' r='3' fill='#7C6FF5' />
          <circle cx='12' cy='4' r='2' fill='#7C6FF5' opacity='.7' />
          <circle cx='20' cy='16' r='2' fill='#7C6FF5' opacity='.7' />
          <circle cx='4' cy='16' r='2' fill='#7C6FF5' opacity='.7' />
        </svg>
        orkesta
      </div>

      <div className='navscroll'>
        {GROUPS.map((g) => (
          <div key={g.label}>
            <div className='navgroup'>{g.label}</div>
            {g.items.map((it) => (
              <Link key={it.key} href={it.href} className={active === it.key ? 'active' : ''}>
                <svg className='ic' viewBox='0 0 24 24'>
                  {ICONS[it.key]}
                </svg>
                {it.label}
              </Link>
            ))}
          </div>
        ))}
      </div>

      <div className='me'>
        <span className='avatar' style={{ background: '#1E2A3A', color: '#6FA8E0' }}>
          YM
        </span>
        <div>
          <div style={{ fontSize: 12.5, fontWeight: 500 }}>Yeraldin M.</div>
          <small>CEO · {orgName}</small>
          <span className='on'>
            <span className='dot' style={{ background: 'var(--green)' }} />
            En línea
          </span>
        </div>
      </div>
    </nav>
  );
}
