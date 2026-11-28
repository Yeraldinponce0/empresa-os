/**
 * Opciones configurables de la ficha del agente (cliente-safe).
 * Autonomía / herramientas / permisos: hoy SOLO se guardan; el enforcement
 * real llega con el motor de políticas (fase de seguridad).
 */

export const AUTONOMY_LEVELS = [
  { value: 0, label: '0 · Solo observa', desc: 'No propone ni actúa; solo mira.' },
  { value: 1, label: '1 · Solo propone', desc: 'Propone y el humano aprueba todo (modo actual).' },
  { value: 2, label: '2 · Propone y prepara', desc: 'Deja borradores listos para un clic.' },
  {
    value: 3,
    label: '3 · Actúa con aprobación por lote',
    desc: 'Agrupa acciones para una sola aprobación.'
  },
  {
    value: 4,
    label: '4 · Autónomo con límites',
    desc: 'Actúa solo dentro de su presupuesto y reglas.'
  }
] as const;

export function autonomyLabel(value: number) {
  return AUTONOMY_LEVELS.find((a) => a.value === value)?.label ?? `${value}`;
}

export const TOOL_OPTIONS = [
  { key: 'meta', label: 'Meta Ads' },
  { key: 'shopify', label: 'Shopify' },
  { key: 'n8n', label: 'n8n' },
  { key: 'gmail', label: 'Gmail' }
] as const;

export const PERMISSION_OPTIONS = [
  { key: 'pause_campaigns', label: 'Pausar campañas' },
  { key: 'scale_budget', label: 'Escalar presupuesto' },
  { key: 'publish_content', label: 'Publicar contenido' },
  { key: 'send_messages', label: 'Enviar mensajes' },
  { key: 'approval_required_spend', label: 'Requiere aprobación para gastar' }
] as const;

export function labelsFor(
  keys: string[] | null | undefined,
  options: ReadonlyArray<{ key: string; label: string }>
): string[] {
  if (!keys) return [];
  return keys.map((k) => options.find((o) => o.key === k)?.label ?? k);
}
