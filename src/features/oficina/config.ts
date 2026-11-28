/**
 * Posiciones (en %) de las etiquetas sobre la oficina (office.png).
 *
 * CÓMO NUDGEAR (fácil): cada etiqueta es { x, y } en PORCENTAJE de la imagen.
 *   x = 0 (izquierda) … 100 (derecha)
 *   y = 0 (arriba)    … 100 (abajo)
 * El punto (x, y) es el CENTRO de la etiqueta. Sube/baja de a 2-3 puntos para
 * afinar. No importa el tamaño de la oficina: el % siempre cae en la misma zona.
 *
 * Las claves son los NOMBRES REALES de los departamentos (tabla departments).
 */
export const ZONE_POSITIONS: Record<string, { x: number; y: number }> = {
  'Tráfico/Meta Ads': { x: 39, y: 68 }, // cluster de escritorios abajo-centro
  Contenido: { x: 20, y: 24 }, // sala de vidrio arriba-izquierda
  'Ventas/Operaciones': { x: 80, y: 46 } // lounge a la derecha
};

/** Posición por defecto si aparece un departamento sin coordenada. */
export const DEFAULT_ZONE_POS = { x: 50, y: 85 };

/** Anclas fijas (no vienen de BD): orquestación central y tarjeta de resultados. */
export const ORQUESTACION_POS = { x: 50, y: 41 }; // portal violeta central
export const RESULTADOS_POS = { x: 50, y: 11 };

/**
 * Secciones del producto (navegación agrupada). Las que aún no tienen pantalla
 * real se muestran como "Próximamente". Cuando una se construya de verdad, se
 * crea su ruta propia (p.ej. /tareas) que reemplaza al placeholder.
 */
export type OrkestaSection = {
  title: string;
  desc: string;
  group: string;
};

export const ORKESTA_SECTIONS: Record<string, OrkestaSection> = {
  tareas: {
    title: 'Tareas',
    desc: 'Tablero de todas las tareas por agente y estado. Aquí vivirá el bucle: datos → Ejecutar → propuesta → Aprobar/Rechazar → resultado.',
    group: 'Operación'
  },
  aprobaciones: {
    title: 'Aprobaciones',
    desc: 'Bandeja con todo lo que espera tu visto bueno antes de ejecutarse.',
    group: 'Operación'
  },
  departamentos: {
    title: 'Departamentos',
    desc: 'Lista y detalle de departamentos: sus agentes, su objetivo y su presupuesto.',
    group: 'Estructura'
  },
  agentes: {
    title: 'Agentes',
    desc: 'Ficha del agente: cerebro/instrucciones, herramientas, nivel de autonomía, presupuesto, permisos e historial.',
    group: 'Estructura'
  },
  reportes: {
    title: 'Reportes',
    desc: 'KPIs, resultados en el tiempo, costo por agente/tarea y ROI.',
    group: 'Inteligencia'
  },
  memoria: {
    title: 'Memoria',
    desc: 'El conocimiento compartido de la empresa: marca, SOPs, decisiones y catálogos que usan los agentes.',
    group: 'Inteligencia'
  },
  integraciones: {
    title: 'Integraciones',
    desc: 'Conecta Meta Ads, Shopify, n8n, Gmail… Se guardan cifradas y solo del lado del servidor.',
    group: 'Administración'
  },
  equipo: {
    title: 'Equipo',
    desc: 'Usuarios del workspace y sus roles (dueño, administrador, miembro).',
    group: 'Administración'
  },
  facturacion: {
    title: 'Facturación',
    desc: 'Plan, consumo (tokens + herramientas) y límites.',
    group: 'Administración'
  },
  configuracion: {
    title: 'Configuración',
    desc: 'Workspace, marca, reglas/políticas de autonomía y seguridad.',
    group: 'Administración'
  }
};
