import { invoke } from "@tauri-apps/api/core";
import { getVersion } from "@tauri-apps/api/app";
import type { Voice } from "../../voices.ts";

/**
 * Speech lives in Rust. See src-tauri/src/tts.rs for why it cannot live here.
 *
 * Every call can fail for an ordinary reason — no voices installed, a platform
 * where this is not wired up yet, or the browser-only `make web` where there is
 * no Tauri host at all. Callers get null or a message, never an exception.
 */

export const inTauri = (): boolean =>
  typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

export async function listVoices(): Promise<{ voices: Voice[]; error: string | null }> {
  if (!inTauri()) {
    return { voices: [], error: "Speech needs the app — `make web` has no audio host." };
  }
  try {
    return { voices: await invoke<Voice[]>("list_voices"), error: null };
  } catch (e) {
    return { voices: [], error: String(e) };
  }
}

export type Unsupported = { lang: string; reason: string };
export type SpeechInfo = {
  backend: string;
  installHint: string;
  /** Languages this backend will not serve, and why. Usually empty. */
  unsupported: Unsupported[];
};

/**
 * Which backend is running and what to tell someone with no usable voice.
 * The sentence belongs in Rust: "System Settings → Accessibility" is nonsense
 * on Ubuntu, where the answer is `apt install espeak-ng`.
 */
export async function speechInfo(): Promise<SpeechInfo | null> {
  if (!inTauri()) return null;
  try {
    return await invoke<SpeechInfo>("speech_info");
  } catch {
    return null;
  }
}

/** What made the sound: a recording, or the synthesiser. */
export type Spoken = { source: "clip" | "synth"; detail: string };

/**
 * Speak a number, preferring a recorded clip.
 *
 * `lang` and `n` let the backend look one up. Passing them is not optional in
 * practice — without them every number is synthesised, whatever is on disk.
 */
export async function speak(
  voice: string,
  text: string,
  rate?: number,
  lang?: string,
  n?: number,
): Promise<{ spoken: Spoken | null; error: string | null }> {
  if (!inTauri()) return { spoken: null, error: "Speech needs the app." };
  try {
    const spoken = await invoke<Spoken>("speak", { voice, text, rate, lang, n });
    return { spoken, error: null };
  } catch (e) {
    return { spoken: null, error: String(e) };
  }
}

export async function stopSpeaking(): Promise<void> {
  if (!inTauri()) return;
  try {
    await invoke("stop_speaking");
  } catch {
    // Nothing useful to do — it was already quiet, or the host went away.
  }
}

/**
 * The running app's version, read from the bundle rather than from
 * package.json, so the chip cannot drift from what was actually installed.
 * Null outside the app — `make web` has no host to ask.
 */
export async function appVersion(): Promise<string | null> {
  if (!inTauri()) return null;
  try {
    return await getVersion();
  } catch {
    return null;
  }
}
