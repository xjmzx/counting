//! Speech for the listening drill.
//!
//! This runs in Rust rather than the webview deliberately. SUITE.md records
//! `nchat` shipping Web Audio that worked on macOS and was silent on Linux,
//! and WebKit2GTK cannot play media from any app URL scheme. Audio in the
//! webview is a bug that only appears on someone else's machine.
//!
//! No phonetic transcription is involved: a system voice carries its own
//! pronunciation model, so it says "soixante-treize" correctly from the
//! written string. That is why the listening drill needs no IPA.

use std::process::{Child, Command};
use std::sync::Mutex;

use serde::Serialize;

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Voice {
    pub name: String,
    /// BCP-47-ish, as the platform reports it: `fr_FR`, `zh_CN`.
    pub locale: String,
}

/// The utterance currently being spoken, so a new one can interrupt it.
#[derive(Default)]
pub struct Speaker(pub Mutex<Option<Child>>);

impl Speaker {
    fn silence(&self) {
        if let Ok(mut guard) = self.0.lock() {
            if let Some(child) = guard.as_mut() {
                let _ = child.kill();
                let _ = child.wait();
            }
            *guard = None;
        }
    }
}

/// Parse one line of `say -v '?'`.
///
/// The obvious split on whitespace is wrong: names are not one word. Real
/// entries include `Bad News             en_US    # ...` and
/// `Eddy (German (Germany)) de_DE    # ...`. The locale is the last token
/// before the comment, and everything before it is the name.
fn parse_voice_line(line: &str) -> Option<Voice> {
    let head = line.split('#').next()?.trim_end();
    let (name, locale) = head.rsplit_once(char::is_whitespace)?;
    let name = name.trim();
    let locale = locale.trim();
    if name.is_empty() || locale.is_empty() {
        return None;
    }
    Some(Voice { name: name.to_string(), locale: locale.to_string() })
}

#[tauri::command]
pub fn list_voices() -> Result<Vec<Voice>, String> {
    #[cfg(target_os = "macos")]
    {
        let out = Command::new("say")
            .args(["-v", "?"])
            .output()
            .map_err(|e| format!("could not run `say`: {e}"))?;
        if !out.status.success() {
            return Err("`say -v '?'` failed".into());
        }
        Ok(String::from_utf8_lossy(&out.stdout)
            .lines()
            .filter_map(parse_voice_line)
            .collect())
    }
    // Deliberately not implemented rather than guessed at. espeak-ng is the
    // intended backend, but nothing here has ever been run on Linux, and this
    // repo's own notes are about exactly that mistake. An honest error beats
    // untested code that looks like support.
    #[cfg(not(target_os = "macos"))]
    {
        Err("speech is only wired up on macOS so far (espeak-ng is the intended \
             backend elsewhere, but it is unimplemented and untested)"
            .into())
    }
}

/// Speak `text` with `voice`. Interrupts anything already speaking.
///
/// `rate` is words per minute; the macOS default is around 175. Slower is
/// genuinely useful here — a compound like *vierundsiebzig* goes past fast.
#[tauri::command]
pub fn speak(
    speaker: tauri::State<'_, Speaker>,
    voice: String,
    text: String,
    rate: Option<u32>,
) -> Result<(), String> {
    speaker.silence();

    #[cfg(target_os = "macos")]
    {
        let mut cmd = Command::new("say");
        cmd.arg("-v").arg(&voice);
        if let Some(r) = rate {
            cmd.arg("-r").arg(r.clamp(80, 300).to_string());
        }
        // Text goes as an argument, never through a shell, so a number word
        // can never be read as syntax.
        cmd.arg(&text);
        let child = cmd.spawn().map_err(|e| format!("could not run `say`: {e}"))?;
        if let Ok(mut guard) = speaker.0.lock() {
            *guard = Some(child);
        }
        Ok(())
    }
    #[cfg(not(target_os = "macos"))]
    {
        let _ = (voice, text, rate);
        Err("speech is only wired up on macOS so far".into())
    }
}

#[tauri::command]
pub fn stop_speaking(speaker: tauri::State<'_, Speaker>) {
    speaker.silence();
}

#[cfg(test)]
mod tests {
    use super::parse_voice_line;

    #[test]
    fn parses_a_plain_entry() {
        let v = parse_voice_line("Thomas              fr_FR    # Bonjour...").unwrap();
        assert_eq!(v.name, "Thomas");
        assert_eq!(v.locale, "fr_FR");
    }

    #[test]
    fn parses_names_containing_spaces_and_brackets() {
        let v = parse_voice_line("Eddy (German (Germany)) de_DE    # Hallo").unwrap();
        assert_eq!(v.name, "Eddy (German (Germany))");
        assert_eq!(v.locale, "de_DE");

        let v = parse_voice_line("Bad News            en_US    # example").unwrap();
        assert_eq!(v.name, "Bad News");
        assert_eq!(v.locale, "en_US");
    }

    #[test]
    fn parses_an_entry_with_no_comment() {
        let v = parse_voice_line("Anna                de_DE").unwrap();
        assert_eq!(v.name, "Anna");
        assert_eq!(v.locale, "de_DE");
    }

    #[test]
    fn rejects_junk() {
        assert!(parse_voice_line("").is_none());
        assert!(parse_voice_line("# just a comment").is_none());
        assert!(parse_voice_line("OneTokenOnly").is_none());
    }
}
