'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { createAgent, updateAgent, type AgentInput } from '@/features/orkesta/crud-actions';
import { AUTONOMY_LEVELS, TOOL_OPTIONS, PERMISSION_OPTIONS } from '@/features/orkesta/crud-config';
import type { AgentFull } from '@/features/orkesta/crud-queries';

export function AgentForm({
  agent,
  departments
}: {
  agent?: AgentFull;
  departments: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(agent?.name ?? '');
  const [role, setRole] = useState(agent?.role ?? '');
  const [departmentId, setDepartmentId] = useState(agent?.departmentId ?? departments[0]?.id ?? '');
  const [definition, setDefinition] = useState(agent?.definition ?? '');
  const [autonomy, setAutonomy] = useState(agent?.autonomy ?? 1);
  const [budget, setBudget] = useState(agent?.budget != null ? String(agent.budget) : '');
  const [status, setStatus] = useState(agent?.status ?? 'active');
  const [tools, setTools] = useState<string[]>(agent?.tools ?? []);
  const [permissions, setPermissions] = useState<string[]>(agent?.permissions ?? []);

  const toggle = (arr: string[], set: (v: string[]) => void, key: string) =>
    set(arr.includes(key) ? arr.filter((k) => k !== key) : [...arr, key]);

  function save() {
    setError(null);
    const input: AgentInput = {
      name,
      role,
      departmentId,
      definition,
      autonomy,
      budget: budget.trim() ? Number(budget.replace(/[^\d.-]/g, '')) : null,
      tools,
      permissions,
      status
    };
    start(async () => {
      const res = agent ? await updateAgent(agent.id, input) : await createAgent(input);
      if (!res.ok) setError(res.error ?? 'No se pudo guardar.');
      else {
        router.push(`/agentes/${res.id}`);
        router.refresh();
      }
    });
  }

  return (
    <div className='form'>
      {/* Identidad */}
      <div className='pcard'>
        <div className='ph'>
          <h3>Identidad</h3>
        </div>
        <div className='fgrid'>
          <label className='field'>
            <span>Nombre</span>
            <input
              className='finput'
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder='Trafficker'
            />
          </label>
          <label className='field'>
            <span>Rol</span>
            <input
              className='finput'
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder='Meta Ads'
            />
          </label>
          <label className='field'>
            <span>Departamento</span>
            <select
              className='finput'
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
            >
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>
          <label className='field'>
            <span>Estado</span>
            <select className='finput' value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value='active'>Activo</option>
              <option value='paused'>En pausa</option>
            </select>
          </label>
        </div>
      </div>

      {/* Cerebro */}
      <div className='pcard'>
        <div className='ph'>
          <h3>Cerebro (instrucciones)</h3>
        </div>
        <p className='loop-muted'>
          El system prompt del agente: su rol, método y formato de salida.
        </p>
        <textarea
          className='tarea-input'
          rows={10}
          value={definition}
          onChange={(e) => setDefinition(e.target.value)}
          placeholder='Eres el Trafficker de Yelizz…'
        />
      </div>

      {/* Autonomía y presupuesto */}
      <div className='pcard'>
        <div className='ph'>
          <h3>Autonomía y presupuesto</h3>
        </div>
        <label className='field'>
          <span>Nivel de autonomía</span>
          <select
            className='finput'
            value={autonomy}
            onChange={(e) => setAutonomy(Number(e.target.value))}
          >
            {AUTONOMY_LEVELS.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </select>
        </label>
        <p className='loop-muted' style={{ marginTop: 6 }}>
          {AUTONOMY_LEVELS.find((a) => a.value === autonomy)?.desc}
        </p>
        <label className='field' style={{ marginTop: 12 }}>
          <span>Presupuesto (COP, tope de gasto)</span>
          <input
            className='finput'
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            placeholder='Ej. 500000'
            inputMode='numeric'
          />
        </label>
      </div>

      {/* Herramientas */}
      <div className='pcard'>
        <div className='ph'>
          <h3>Herramientas</h3>
        </div>
        <div className='checks'>
          {TOOL_OPTIONS.map((t) => (
            <label key={t.key} className={`check${tools.includes(t.key) ? ' on' : ''}`}>
              <input
                type='checkbox'
                checked={tools.includes(t.key)}
                onChange={() => toggle(tools, setTools, t.key)}
              />
              {t.label}
            </label>
          ))}
        </div>
      </div>

      {/* Permisos */}
      <div className='pcard'>
        <div className='ph'>
          <h3>Permisos</h3>
        </div>
        <p className='loop-muted'>
          Se guardan ahora; el enforcement real llega con el motor de políticas.
        </p>
        <div className='checks'>
          {PERMISSION_OPTIONS.map((p) => (
            <label key={p.key} className={`check${permissions.includes(p.key) ? ' on' : ''}`}>
              <input
                type='checkbox'
                checked={permissions.includes(p.key)}
                onChange={() => toggle(permissions, setPermissions, p.key)}
              />
              {p.label}
            </label>
          ))}
        </div>
      </div>

      {error && <p className='loop-err'>⚠ {error}</p>}
      <div className='loop-actions'>
        <button className='btn ok' onClick={save} disabled={pending}>
          {pending ? 'Guardando…' : agent ? 'Guardar cambios' : 'Crear agente'}
        </button>
      </div>
    </div>
  );
}
