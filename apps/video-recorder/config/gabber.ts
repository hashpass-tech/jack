/**
 * JACK Video Recorder — Gabber AI configuration
 *
 * The Gabber graph orchestrates the real-time AI pipeline:
 *   Publish → STT → LLM → TTS → LocalViseme → Output
 *
 * Voice: MatureMaleSerious (African American Man) via ElevenLabs
 * Webhook: testnet.jack.lukas.money/webhook-gabber
 */

export const GABBER_API_KEY =
  import.meta.env.VITE_GABBER_API_KEY || process.env.GABBER_API_KEY || "";

export const GABBER_API_URL =
  import.meta.env.VITE_GABBER_API_URL ||
  process.env.GABBER_API_URL ||
  "https://api.gabber.dev/v1";

export const GABBER_WEBHOOK_URL =
  import.meta.env.VITE_GABBER_WEBHOOK_URL ||
  process.env.GABBER_WEBHOOK_URL ||
  "https://testnet.jack.lukas.money/webhook-gabber";

export const GABBER_RUN_ID =
  import.meta.env.VITE_GABBER_RUN_ID ||
  process.env.GABBER_RUN_ID ||
  "jack-dashboard-walkthrough";

export const GABBER_VOICE_ID =
  import.meta.env.VITE_GABBER_VOICE_ID ||
  process.env.GABBER_VOICE_ID ||
  "MatureMaleSerious";

/**
 * System prompt for JACK — Dashboard Walkthrough Recording
 *
 * JACK acts as a DeFi assistant guiding the user through the
 * JACK Kernel dashboard: Create Intent → Executions → Agent & Costs.
 */
export const JACK_DASHBOARD_SYSTEM_PROMPT = `You are JACK — a confident, articulate African-American male AI assistant \
for the JACK Kernel, a DeFi cross-chain settlement layer.

Your voice is mature, serious, and authoritative — like a seasoned financial advisor \
who also happens to be deeply technical. You speak with calm conviction.

RIGHT NOW you are recording a walkthrough video of the JACK Kernel Dashboard. \
Guide the viewer through each section as if they're a new user:

1. **Create Intent Tab** — Explain how users create cross-chain settlement intents: \
   selecting source and destination chains, tokens, amounts, and execution parameters. \
   Emphasize how intents abstract away bridge complexity.

2. **Executions Tab** — Show how users monitor the lifecycle of their intents: \
   pending → executing → settled. Explain the agent-based execution model and \
   how the protocol guarantees atomic settlement.

3. **Agent & Costs Tab** — Walk through the cost dashboard showing agent fees, \
   gas costs, and budget tracking. Explain the transparency the protocol provides.

Keep responses concise (2-4 sentences per topic). Use nautical DeFi metaphors \
occasionally — "navigating the DeFi sea", "charting a course", "anchoring settlement". \
Be professional but approachable.`;

/**
 * Gabber graph definition for viseme-driven avatar
 * This graph wires: Mic → STT → LLM → TTS → Visemes → Speaker
 *
 * Voice: MatureMaleSerious — African American Man
 */
export const visemeAvatarGraph = {
  nodes: [
    {
      id: "publish_input",
      type: "publish",
      config: {},
    },
    {
      id: "stt_node",
      type: "stt",
      config: {
        provider: "deepgram",
        language: "en",
      },
    },
    {
      id: "llm_node",
      type: "llm",
      config: {
        provider: "openai",
        model: "gpt-4o",
        systemPrompt: JACK_DASHBOARD_SYSTEM_PROMPT,
      },
    },
    {
      id: "tts_node",
      type: "tts",
      config: {
        provider: "elevenlabs",
        voice: GABBER_VOICE_ID,
      },
    },
    {
      id: "localviseme_node",
      type: "localviseme",
      config: {},
    },
    {
      id: "output_node",
      type: "output",
      config: {},
    },
  ],
  edges: [
    { from: "publish_input", to: "stt_node" },
    { from: "stt_node", to: "llm_node" },
    { from: "llm_node", to: "tts_node" },
    { from: "tts_node", to: "localviseme_node" },
    { from: "tts_node", to: "output_node" },
  ],
};

/**
 * Token generator — call the Gabber API to get a user token
 * for real-time WebRTC session.
 */
export async function generateGabberToken(): Promise<string> {
  const res = await fetch(`${GABBER_API_URL}/users/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": GABBER_API_KEY,
    },
    body: JSON.stringify({ run_id: GABBER_RUN_ID }),
  });
  if (!res.ok) {
    throw new Error(`Gabber token error: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  return data.token;
}
