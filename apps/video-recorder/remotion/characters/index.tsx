/**
 * ══════════════════════════════════════════════
 * ══ JACK Character — Version Switcher        ═
 * ══════════════════════════════════════════════
 *
 * Change ACTIVE_VERSION to switch which Jack avatar
 * is used in the video composition.
 *
 * Available versions:
 *   V1 — Original simple pirate (video v1.0.3 look)
 *         Round hat, both eyes, both earrings, modest beard
 *   V2 — Enhanced pirate (tricorn, eyepatch, long hair, bandana)
 */
import JackV1 from "./JackV1";
import JackV2 from "./JackV2";

export type { JackCharacterProps } from "./types";
export { BRAND, SKIN, SKIN_LIGHT, SKIN_SHADOW } from "./types";

// ════════════════════════════════════════
// 🎯 CHANGE THIS TO SWITCH JACK VERSION
// ════════════════════════════════════════
const ACTIVE_VERSION = "V1" as const;
// ════════════════════════════════════════

const VERSIONS = {
  V1: JackV1,
  V2: JackV2,
} as const;

/** The active PirateJackCam component */
export const PirateJackCam = VERSIONS[ACTIVE_VERSION];

/** All versions for previewing / debugging */
export { JackV1, JackV2 };

export default PirateJackCam;
