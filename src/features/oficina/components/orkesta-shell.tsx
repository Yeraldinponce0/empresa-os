'use client';

import { useState } from 'react';

import { OrkestaNav } from '@/features/oficina/components/orkesta-nav';

/**
 * Shell de Orkesta para las pantallas que NO son la Oficina: misma marca
 * (topbar + menú agrupado plegable) con el contenido de la página en el centro.
 * Reutiliza el tema `.office` (office.css).
 */
export function OrkestaShell({
  active,
  orgName = 'Yelizz',
  children
}: {
  active: string;
  orgName?: string;
  children: React.ReactNode;
}) {
  const [navOpen, setNavOpen] = useState(true);

  return (
    <div className={`office${navOpen ? '' : ' nav-collapsed'}`}>
      <div className='topbar'>
        <div className='brand'>
          <button
            className='iconbtn paneltoggle'
            onClick={() => setNavOpen((o) => !o)}
            aria-label='Mostrar u ocultar el menú'
            title='Menú'
          >
            <svg className='ic' viewBox='0 0 24 24'>
              <path d='M4 6h16M4 12h16M4 18h16' />
            </svg>
          </button>
          <svg width='22' height='22' viewBox='0 0 24 24'>
            <circle cx='12' cy='12' r='3' fill='#7C6FF5' />
            <circle cx='12' cy='4' r='2' fill='#7C6FF5' opacity='.7' />
            <circle cx='20' cy='16' r='2' fill='#7C6FF5' opacity='.7' />
            <circle cx='4' cy='16' r='2' fill='#7C6FF5' opacity='.7' />
          </svg>
          <span className='wm'>orkesta</span>
        </div>
        <div className='tr'>
          <span className='wspill'>Workspace: {orgName} ▾</span>
          <span className='avatar' style={{ background: '#2A2440', color: '#B9B2FA' }}>
            YM
          </span>
        </div>
      </div>

      <div className='main'>
        <OrkestaNav active={active} orgName={orgName} />
        <div className='center shell-center'>{children}</div>
      </div>
    </div>
  );
}
