import { invoke } from "@tauri-apps/api/core";
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

export async function speak(voice: string, text: string, rate?: number): Promise<string | null> {
  if (!inTauri()) return "Speech needs the app.";
  try {
    await invoke("speak", { voice, text, rate });
    return null;
  } catch (e) {
    return String(e);
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
