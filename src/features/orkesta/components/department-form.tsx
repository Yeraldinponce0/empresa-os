'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import {
  createDepartment,
  updateDepartment,
  type DepartmentInput
} from '@/features/orkesta/crud-actions';
import type { DepartmentDetail } from '@/features/orkesta/crud-queries';

export function DepartmentForm({ department }: { department?: DepartmentDetail }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(department?.name ?? '');
  const [objective, setObjective] = useState(department?.objective ?? '');
  const [budget, setBudget] = useState(department?.budget != null ? String(department.budget) : '');

  function save() {
    setError(null);
    const input: DepartmentInput = {
      name,
      objective,
      budget: budget.trim() ? Number(budget.replace(/[^\d.-]/g, '')) : null
    };
    start(async () => {
      const res = department
        ? await updateDepartment(department.id, input)
        : await createDepartment(input);
      if (!res.ok) setError(res.error ?? 'No se pudo guardar.');
      else {
        router.push(`/departamentos/${res.id}`);
        router.refresh();
      }
    });
  }

  return (
    <div className='form'>
      <div className='pcard'>
        <div className='ph'>
          <h3>{department ? 'Editar departamento' : 'Nuevo departamento'}</h3>
        </div>
        <label className='field'>
          <span>Nombre</span>
          <input
            className='finput'
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder='Tráfico/Meta Ads'
          />
        </label>
        <label className='field' style={{ marginTop: 12 }}>
          <span>Objetivo</span>
          <textarea
            className='tarea-input'
            rows={3}
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
            placeholder='Ej. Bajar el CPA por debajo del número mágico y escalar lo rentable.'
          />
        </label>
        <label className='field' style={{ marginTop: 12 }}>
          <span>Presupuesto (COP)</span>
          <input
            className='finput'
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            placeholder='Ej. 2000000'
            inputMode='numeric'
          />
        </label>
        {error && <p className='loop-err'>⚠ {error}</p>}
        <div className='loop-actions'>
          <button className='btn ok' onClick={save} disabled={pending}>
            {pending ? 'Guardando…' : department ? 'Guardar cambios' : 'Crear departamento'}
          </button>
        </div>
      </div>
    </div>
  );
}
