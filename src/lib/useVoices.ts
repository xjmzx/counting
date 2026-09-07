import { useEffect, useState } from "react";
import type { Voice } from "../../voices.ts";
import { listVoices } from "./tauri";

/** Loads the system voice list once. Failure is a state, not an exception. */
export function useVoices() {
  const [voices, setVoices] = useState<Voice[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    listVoices().then(({ voices, error }) => {
      if (!live) return;
      setVoices(voices);
      setError(error);
      setLoading(false);
    });
    return () => {
      live = false;
    };
  }, []);

  return { voices, error, loading };
}
