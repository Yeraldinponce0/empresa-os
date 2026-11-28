import Link from 'next/link';

/** Placeholder con marca Orkesta para las secciones que aún no se construyen. */
export function ComingSoon({ title, desc }: { title: string; desc: string }) {
  return (
    <div className='coming'>
      <span className='coming-badge'>Próximamente</span>
      <h1>{title}</h1>
      <p>{desc}</p>
      <Link href='/oficina' className='coming-back'>
        ← Volver a la Oficina
      </Link>
    </div>
  );
}
