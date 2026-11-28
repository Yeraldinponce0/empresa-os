'use client';

import { useState } from 'react';

/**
 * Chat contextual (placeholder por ahora). "Pregúntale a tu empresa" conectará
 * con el motor de agentes más adelante; hoy solo confirma que recibió el mensaje.
 */
export function OfficeChat() {
  const [value, setValue] = useState('');
  const [note, setNote] = useState<string | null>(null);

  function send() {
    if (!value.trim()) return;
    setNote('Pronto podrás preguntarle a tu empresa. (aún no conectado)');
    setValue('');
  }

  return (
    <div>
      <div className='chatbox'>
        <input
          placeholder='Pregúntale a tu empresa…'
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
        />
        <button className='sendb' onClick={send} aria-label='Enviar'>
          <svg
            width='15'
            height='15'
            viewBox='0 0 24 24'
            fill='none'
            stroke='#fff'
            strokeWidth='2'
            strokeLinecap='round'
            strokeLinejoin='round'
          >
            <path d='M22 2L11 13M22 2l-7 20-4-9-9-4z' />
          </svg>
        </button>
      </div>
      {note && <div className='demo-note'>ℹ {note}</div>}
    </div>
  );
}
