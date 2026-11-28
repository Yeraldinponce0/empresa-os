'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { StatusTone } from '@/features/oficina/queries';

type Zone = {
  departmentId?: string;
  agentId?: string | null;
  name: string;
  agentName: string | null;
  status: { label: string; tone: StatusTone };
  x: number;
  y: number;
};

type ResultItem = { value: string; sub: string; tone?: 'green' | 'violet' | 'text' };

const TONE_VAR: Record<string, string> = {
  green: 'var(--green)',
  amber: 'var(--amber)',
  dim: 'var(--dim)',
  muted: 'var(--muted)',
  violet: 'var(--violet)',
  text: 'var(--text)'
};

function pos(x: number, y: number) {
  return { left: `${x}%`, top: `${y}%` } as const;
}

export function OfficeStage({
  zones,
  orquestacion,
  resultados,
  results,
  readOnly = false
}: {
  zones: Zone[];
  orquestacion: { x: number; y: number };
  resultados: { x: number; y: number };
  results: ResultItem[];
  readOnly?: boolean;
}) {
  const [view, setView] = useState<'oficina' | '2d' | 'lista'>('oficina');
  const [time, setTime] = useState('');

  useEffect(() => {
    const tick = () =>
      setTime(new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }));
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className='stage-wrap'>
      {view === 'oficina' ? (
        <div className='stage'>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src='/office.png' alt='Oficina de Orkesta' />
          <div className='vig' />

          <div className='liveb'>
            <span className='dot pz' style={{ background: 'var(--green)' }} />
            En vivo{time ? ` · ${time}` : ''}
          </div>

          {/* Resultados de hoy (PLACEHOLDER, marcado) */}
          <div className='ov results' style={pos(resultados.x, resultados.y)}>
            <div className='t'>
              RESULTADOS DE HOY <span className='demo'>demo</span>
            </div>
            <div className='row'>
              {results.map((r, i) => (
                <div
                  className='k'
                  key={i}
                  style={{ color: r.tone ? TONE_VAR[r.tone] : 'var(--text)' }}
                >
                  {r.value}
                  <small>{r.sub}</small>
                </div>
              ))}
            </div>
          </div>

          {/* Orquestación central (el motor coordinando) */}
          <div className='ov zone' style={pos(orquestacion.x, orquestacion.y)}>
            <span className='dot pz' style={{ background: 'var(--violet)' }} />
            Orquestación <small>· coordinando</small>
          </div>

          {/* Zonas = departamentos reales con el estado de su agente.
              Clic → tareas del agente de esa zona. */}
          {zones.map((z) => {
            const dot = (
              <span
                className={
                  z.status.tone === 'green' || z.status.tone === 'amber' ? 'dot pz' : 'dot'
                }
                style={{ background: TONE_VAR[z.status.tone] ?? 'var(--muted)' }}
              />
            );
            const key = z.departmentId ?? z.name;
            if (z.agentId && !readOnly) {
              return (
                <Link
                  className='ov zone zone-link'
                  key={key}
                  href={`/tareas?agente=${z.agentId}`}
                  style={pos(z.x, z.y)}
                >
                  {dot}
                  {z.name} <small>· {z.status.label}</small>
                </Link>
              );
            }
            return (
              <div className='ov zone' key={key} style={pos(z.x, z.y)}>
                {dot}
                {z.name} <small>· {z.status.label}</small>
              </div>
            );
          })}
        </div>
      ) : (
        <div className='placeholder-view'>
          <div style={{ fontSize: 15, color: 'var(--muted)' }}>
            Vista «{view === '2d' ? 'Mapa 2D' : 'Lista'}»
          </div>
          <div>Próximamente — por ahora usa la vista Oficina.</div>
        </div>
      )}

      <div className='toggle'>
        <span className={view === 'oficina' ? 'on' : ''} onClick={() => setView('oficina')}>
          Oficina 3D
        </span>
        <span className={view === '2d' ? 'on' : ''} onClick={() => setView('2d')}>
          Mapa 2D
        </span>
        <span className={view === 'lista' ? 'on' : ''} onClick={() => setView('lista')}>
          Lista
        </span>
      </div>
    </div>
  );
}
