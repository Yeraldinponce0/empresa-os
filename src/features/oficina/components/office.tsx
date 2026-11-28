'use client';

import { useState } from 'react';
import Link from 'next/link';

import { OfficeStage } from '@/features/oficina/components/office-stage';
import { ApprovalActions } from '@/features/oficina/components/approval-actions';
import { OfficeChat } from '@/features/oficina/components/office-chat';
import { OrkestaNav } from '@/features/oficina/components/orkesta-nav';
import { ORQUESTACION_POS, RESULTADOS_POS } from '@/features/oficina/config';
import type { OfficeData, StatusTone } from '@/features/oficina/queries';

const TONE_VAR: Record<StatusTone, string> = {
  green: 'var(--green)',
  amber: 'var(--amber)',
  dim: 'var(--dim)',
  muted: 'var(--muted)',
  violet: 'var(--violet)'
};

function initials(name: string) {
  return name.slice(0, 2).toUpperCase();
}

export function Office({ data }: { data: OfficeData }) {
  const [navOpen, setNavOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);

  const activeCount = data.agents.filter((a) => a.status.label !== 'En pausa').length;
  const pausedCount = data.agents.filter((a) => a.status.label === 'En pausa').length;

  const results = data.kpis.slice(0, 3).map((k) => ({
    value: k.value,
    sub: k.label === 'CPA vs. mágico' ? 'CPA · mág. $45k' : k.label.replace(' (COD)', ' COD'),
    tone: k.tone
  }));

  return (
    <div
      className={`office${navOpen ? '' : ' nav-collapsed'}${rightOpen ? '' : ' right-collapsed'}`}
    >
      {/* ---------- Topbar ---------- */}
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
            <line x1='12' y1='12' x2='12' y2='4' stroke='#7C6FF5' strokeWidth='1' opacity='.5' />
            <line x1='12' y1='12' x2='20' y2='16' stroke='#7C6FF5' strokeWidth='1' opacity='.5' />
            <line x1='12' y1='12' x2='4' y2='16' stroke='#7C6FF5' strokeWidth='1' opacity='.5' />
          </svg>
          <span className='wm'>orkesta</span>
        </div>
        <div className='tr'>
          <span className='wspill'>Workspace: {data.organizationName} ▾</span>
          <span className='iconbtn'>
            <svg className='ic' viewBox='0 0 24 24'>
              <circle cx='11' cy='11' r='7' />
              <path d='M21 21l-4-4' />
            </svg>
          </span>
          <span className='iconbtn'>
            <svg className='ic' viewBox='0 0 24 24'>
              <path d='M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0' />
            </svg>
          </span>
          <button
            className='iconbtn paneltoggle'
            onClick={() => setRightOpen((o) => !o)}
            aria-label='Mostrar u ocultar el panel derecho'
            title='Panel'
          >
            <svg className='ic' viewBox='0 0 24 24'>
              <rect x='3' y='4' width='18' height='16' rx='2' />
              <path d='M15 4v16' />
            </svg>
          </button>
          <span className='avatar' style={{ background: '#2A2440', color: '#B9B2FA' }}>
            YM
          </span>
        </div>
      </div>

      {/* ---------- Objetivo ---------- */}
      <div className='obj'>
        <div className='goal'>
          <svg
            className='ic'
            style={{ width: 16, height: 16, color: '#B9B2FA' }}
            viewBox='0 0 24 24'
          >
            <circle cx='12' cy='12' r='9' />
            <circle cx='12' cy='12' r='5' />
            <circle cx='12' cy='12' r='1.3' fill='#B9B2FA' stroke='none' />
          </svg>
          <b>Objetivo del trimestre</b>
          <span>· Crecimiento de ventas</span>
        </div>
        <div className='bar'>
          <i style={{ width: `${data.objectivePct}%` }} />
        </div>
        <div className='pct'>{data.objectivePct}%</div>
        <div className='chips'>
          <span className='chip'>
            <span className='dot pz' style={{ background: 'var(--green)' }} />
            {activeCount} agente{activeCount === 1 ? '' : 's'} activo{activeCount === 1 ? '' : 's'}
          </span>
          <span className='chip'>
            <span className='dot' style={{ background: 'var(--dim)' }} />
            {pausedCount} en pausa
          </span>
        </div>
      </div>

      {/* ---------- Barra de KPIs (arriba) ---------- */}
      <div className='kbar'>
        {data.kpis.map((k) => (
          <div className='kstat' key={k.label}>
            <span className='kl'>{k.label}</span>
            <span className='kv' style={{ color: k.tone === 'green' ? 'var(--green)' : undefined }}>
              {k.value}
              {k.delta && <small className={k.deltaUp ? 'up' : 'down'}>{k.delta}</small>}
            </span>
          </div>
        ))}
        {data.kpisArePlaceholder && (
          <span className='kdemo'>⚠ placeholder · pronto Shopify/Meta</span>
        )}
      </div>

      {/* ---------- Cuerpo ---------- */}
      <div className='main'>
        {/* Nav agrupada (compartida con las demás pantallas) */}
        <OrkestaNav active='oficina' orgName={data.organizationName} />

        {/* Centro */}
        <div className='center'>
          <div className='center-head'>
            <h1>Oficina de {data.organizationName}</h1>
            <div className='sub'>Tu empresa en vivo · cada agente trabajando en tiempo real</div>
          </div>
          <OfficeStage
            zones={data.zones}
            orquestacion={ORQUESTACION_POS}
            resultados={RESULTADOS_POS}
            results={results}
          />
        </div>

        {/* Panel derecho */}
        <aside className='right'>
          {/* Aprobaciones (reales) */}
          <div className='pcard'>
            <div className='ph'>
              <h3>
                Aprobaciones{' '}
                {data.pendingApprovals.length > 0 && (
                  <span style={{ color: 'var(--amber)' }}>({data.pendingApprovals.length})</span>
                )}
              </h3>
            </div>
            {data.pendingApprovals.length === 0 ? (
              <div className='empty'>Nada pendiente de aprobar. 🎉</div>
            ) : (
              data.pendingApprovals.map((a) => (
                <div className='appr' key={a.approvalId}>
                  <Link href={`/tareas/${a.taskId}`} className='txt appr-link'>
                    <b>{a.agentName}</b> · {a.summary}
                  </Link>
                  <ApprovalActions approvalId={a.approvalId} taskId={a.taskId} />
                </div>
              ))
            )}
          </div>

          {/* Agentes (reales) */}
          <div className='pcard'>
            <div className='ph'>
              <h3>Agentes</h3>
            </div>
            {data.agents.map((ag) => (
              <Link className='ag ag-link' key={ag.id} href={`/tareas?agente=${ag.id}`}>
                <span
                  className='avatar'
                  style={{ width: 28, height: 28, background: '#2A2440', color: '#B9B2FA' }}
                >
                  {initials(ag.name)}
                </span>
                <div>
                  <div className='nm'>{ag.name}</div>
                  <div className='rl'>{ag.role ?? '—'}</div>
                </div>
                <span className='stt' style={{ color: TONE_VAR[ag.status.tone] }}>
                  <span
                    className={
                      ag.status.tone === 'green' || ag.status.tone === 'amber' ? 'dot pz' : 'dot'
                    }
                    style={{ background: TONE_VAR[ag.status.tone] }}
                  />
                  {ag.status.label}
                </span>
              </Link>
            ))}
          </div>

          {/* Pulso en vivo (eventos reales) */}
          <div className='pcard'>
            <div className='ph'>
              <h3>
                Pulso en vivo <span className='dot pz' style={{ background: 'var(--green)' }} />
              </h3>
            </div>
            {data.recentEvents.length === 0 ? (
              <div className='empty'>Sin actividad todavía.</div>
            ) : (
              data.recentEvents.map((ev) => (
                <div className='pulse-row' key={ev.id}>
                  <span className='who' style={{ color: TONE_VAR[ev.whoTone] }}>
                    {ev.who}
                  </span>
                  <span>{ev.text}</span>
                </div>
              ))
            )}
          </div>

          {/* Chat contextual (placeholder) */}
          <OfficeChat />
        </aside>
      </div>
    </div>
  );
}
