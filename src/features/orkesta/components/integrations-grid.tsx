'use client';

import { useState } from 'react';
import type { ReactElement } from 'react';

type Integration = {
  key: string;
  name: string;
  desc: string;
  color: string;
  icon: ReactElement;
};

const INTEGRATIONS: Integration[] = [
  {
    key: 'meta',
    name: 'Meta Ads',
    desc: 'Campañas, conjuntos, insights y métricas de tus anuncios de Facebook e Instagram.',
    color: '#4A7CF0',
    icon: (
      <>
        <circle cx='9' cy='12' r='4.5' />
        <circle cx='15' cy='12' r='4.5' />
      </>
    )
  },
  {
    key: 'shopify',
    name: 'Shopify',
    desc: 'Pedidos, productos y ventas reales de tu tienda (incluida la contraentrega).',
    color: '#5FE0B0',
    icon: (
      <>
        <path d='M6 8h12l-1 12H7L6 8z' />
        <path d='M9 8a3 3 0 016 0' />
      </>
    )
  },
  {
    key: 'n8n',
    name: 'n8n',
    desc: 'Automatizaciones y flujos que conectan tus herramientas entre sí.',
    color: '#F0776B',
    icon: (
      <>
        <circle cx='5' cy='12' r='2' />
        <circle cx='19' cy='6' r='2' />
        <circle cx='19' cy='18' r='2' />
        <path d='M7 12h4M11 12l6-5M11 12l6 5' />
      </>
    )
  },
  {
    key: 'gmail',
    name: 'Gmail',
    desc: 'Correos salientes: briefings, alertas y seguimiento con tus clientas.',
    color: '#E6B45C',
    icon: (
      <>
        <rect x='3' y='5' width='18' height='14' rx='2' />
        <path d='M3 7l9 6 9-6' />
      </>
    )
  }
];

export function IntegrationsGrid() {
  const [open, setOpen] = useState<string | null>(null);

  return (
    <div className='intgrid'>
      {INTEGRATIONS.map((it) => (
        <div className='intcard' key={it.key}>
          <div className='intcard-top'>
            <span
              className='inticon'
              style={{
                background: `color-mix(in srgb, ${it.color} 18%, transparent)`,
                color: it.color
              }}
            >
              <svg className='ic' viewBox='0 0 24 24' style={{ width: 20, height: 20 }}>
                {it.icon}
              </svg>
            </span>
            <span className='intstatus'>
              <span className='dot' style={{ background: 'var(--dim)' }} />
              No conectado
            </span>
          </div>
          <div className='intname'>{it.name}</div>
          <div className='intdesc'>{it.desc}</div>
          <button className='btn intbtn' onClick={() => setOpen(open === it.key ? null : it.key)}>
            Conectar
          </button>
          {open === it.key && (
            <div className='demo-note'>
              ℹ Próximamente — se conectará por OAuth y se guardará cifrada, solo del lado del
              servidor.
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
