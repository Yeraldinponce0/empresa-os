import 'server-only';

import Anthropic from '@anthropic-ai/sdk';

/**
 * Cerebro del agente: arma el prompt (definición del agente + tarea + datos que
 * pegó el humano) y produce la propuesta.
 *
 * Dos modos (variable ANTHROPIC_BRAIN_MODE):
 *   · 'stub'  → respuesta SIMULADA de ejemplo, sin gastar API. Sirve para probar
 *               TODO el bucle (Ejecutar → propuesta → Aprobar/Rechazar → evento).
 *   · 'real'  → llama a Claude vía el SDK de Anthropic.
 *   · (sin definir) → AUTO: 'real' si hay ANTHROPIC_API_KEY; si no, 'stub'.
 *
 * Así, sin key, el bucle funciona gratis; al cargar crédito (o configurar un
 * login de Claude Code, abajo), pasa solo a 'real'. La clave/credencial vive
 * SOLO en el servidor, nunca en el cliente. Modelo: ANTHROPIC_MODEL (def. Opus 5.5).
 */

const DEFAULT_MODEL = 'claude-opus-5-5';

export type BrainMode = 'stub' | 'real';

export type BrainInput = {
  agentName: string;
  agentRole: string | null;
  agentDefinition: string | null;
  taskTitle: string;
  inputData: string;
};

export type BrainOutput = {
  proposal: string;
  model: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
};

export function brainMode(): BrainMode {
  const m = (process.env.ANTHROPIC_BRAIN_MODE || '').toLowerCase();
  if (m === 'stub') return 'stub';
  if (m === 'real') return 'real';
  return process.env.ANTHROPIC_API_KEY ? 'real' : 'stub';
}

function stubProposal(input: BrainInput): string {
  const snippet = input.inputData.trim();
  const shown = snippet.length > 160 ? `${snippet.slice(0, 160)}…` : snippet;
  return `⚠️ RESPUESTA SIMULADA (stub) — sin gasto de API.
Sirve para probar el bucle completo. Cuando cargues crédito (o conectes tu login de Claude), se reemplaza automáticamente por el análisis real del Trafficker.

1. RESUMEN
🟡 La semana viene alrededor del break-even. Con los datos pegados, el CPA de pixel está cerca del número mágico: vigilar, aún no escalar.

2. DIAGNÓSTICO
- Gasto concentrado sin que el CTR despegue → más fatiga de creativo que problema de segmentación.
- Las compras de pixel no están confirmadas como entregas (COD): el ROAS real puede ser menor.

3. RECOMENDACIÓN
- MANTENER el presupuesto esta semana (no subir >20%).
- Pausar solo el conjunto cuyo CPA supere ~1,5× el número mágico con gasto suficiente.
- Un solo cambio prioritario: renovar el creativo principal.

4. ÁNGULOS DE CREATIVO QUE FALTAN
- Antes/después real (prueba de resultado).
- Testimonio en video de clienta (prueba social).
- Enfoque "problema puntual" (estrías/textura) con promesa concreta.

5. SUPUESTOS / DATOS QUE FALTAN
- Asumí que las compras son de pixel, no entregas confirmadas.
- Para afinar: ventas COD confirmadas, desglose por conjunto y antigüedad de cada creativo.

(Datos recibidos: ${shown || '(vacío)'})`;
}

export async function runAgentBrain(input: BrainInput): Promise<BrainOutput> {
  // --- Modo stub: sin API, respuesta de ejemplo ---
  if (brainMode() === 'stub') {
    return {
      proposal: stubProposal(input),
      model: 'stub (simulado)',
      usage: { input_tokens: 0, output_tokens: 0 }
    };
  }

  // --- Modo real: llama a Claude ---
  const model = process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;
  // new Anthropic() resuelve credenciales del entorno:
  // ANTHROPIC_API_KEY → ANTHROPIC_AUTH_TOKEN → perfil de `ant auth login` (Claude Code).
  const client = new Anthropic();

  const system =
    input.agentDefinition?.trim() ||
    `Eres ${input.agentName}${input.agentRole ? ` (${input.agentRole})` : ''} de Yelizz. Analiza con rigor y responde en español.`;

  const userPrompt = [
    `# Tarea`,
    input.taskTitle,
    ``,
    `# Datos de entrada (pegados por el humano)`,
    input.inputData.trim() || '(sin datos)',
    ``,
    `Analiza estos datos siguiendo tu método y entrega tu propuesta en el formato de salida que se te indicó. Recuerda: es una PROPUESTA que el humano aprobará o rechazará; no asumas que se ejecuta sola.`
  ].join('\n');

  let response;
  try {
    response = await client.messages.create({
      model,
      max_tokens: 16000,
      thinking: { type: 'adaptive' },
      system,
      messages: [{ role: 'user', content: userPrompt }]
    });
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) {
      throw new Error(
        'No hay credenciales válidas de Anthropic. Configura ANTHROPIC_API_KEY, o deja ANTHROPIC_BRAIN_MODE=stub para probar sin API.'
      );
    }
    throw e;
  }

  if (response.stop_reason === 'refusal') {
    throw new Error('El modelo rechazó la solicitud por seguridad. Revisa los datos de entrada.');
  }

  const proposal = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim();

  if (!proposal) {
    throw new Error('El modelo no devolvió texto. Intenta de nuevo.');
  }

  return {
    proposal,
    model: response.model,
    usage: {
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens
    }
  };
}
