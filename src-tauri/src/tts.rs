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
//!
//! ## Two backends, one seam
//!
//! macOS speaks through `say`; Linux through `spd-say`, speech-dispatcher's
//! client — the OS's own speech layer rather than one particular synthesiser,
//! so a user who installs Piper or open-jtalk gets them through the same path.
//!
//! **Nothing here is behind `#[cfg]` except which binary is spawned.** Gating
//! the Linux implementation out on macOS would mean neither this machine nor
//! CI's Rust job ever compiled it, which is how untested code that looks like
//! support gets shipped. Parsing and locale mapping are ordinary functions,
//! compiled and tested on every platform.

use std::process::{Child, Command};
use std::sync::Mutex;

use serde::Serialize;

#[derive(Serialize, Clone, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Voice {
    /// Shown to the user in the picker.
    pub name: String,
    /// Normalised to the app's convention — `fr_FR`, `zh_CN` — whatever the
    /// backend called it. `voices.ts` holds one allowlist and never learns a
    /// second namespace.
    pub locale: String,
    /// What the backend needs back to select this voice. On macOS the name;
    /// on Linux the language tag speech-dispatcher actually accepts, which is
    /// bare `fr` — `fr_FR` is rejected outright.
    pub id: String,
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

#[derive(Clone, Copy, Debug, PartialEq)]
pub enum Backend {
    /// macOS `say`.
    Say,
    /// speech-dispatcher's `spd-say`.
    SpeechDispatcher,
}

impl Backend {
    fn binary(self) -> &'static str {
        match self {
            Backend::Say => "say",
            Backend::SpeechDispatcher => "spd-say",
        }
    }

    /// The platform's own backend first, then the other. Neither is gated out
    /// at compile time: a Linux box with `say` installed, or a Mac running
    /// speech-dispatcher, both work without a rebuild.
    fn order() -> [Backend; 2] {
        if cfg!(target_os = "macos") {
            [Backend::Say, Backend::SpeechDispatcher]
        } else {
            [Backend::SpeechDispatcher, Backend::Say]
        }
    }

    /// Whichever is installed. Detected by running its list command, so a
    /// binary that exists but cannot run counts as absent.
    fn detect() -> Option<Backend> {
        Backend::order().into_iter().find(|b| b.list_raw().is_ok())
    }

    fn list_args(self) -> &'static [&'static str] {
        match self {
            Backend::Say => &["-v", "?"],
            Backend::SpeechDispatcher => &["-L"],
        }
    }

    fn list_raw(self) -> Result<String, String> {
        let out = Command::new(self.binary())
            .args(self.list_args())
            .output()
            .map_err(|e| format!("could not run `{}`: {e}", self.binary()))?;
        if !out.status.success() {
            return Err(format!("`{}` exited non-zero", self.binary()));
        }
        Ok(String::from_utf8_lossy(&out.stdout).into_owned())
    }

    fn parse(self, raw: &str) -> Vec<Voice> {
        match self {
            Backend::Say => raw.lines().filter_map(parse_say_line).collect(),
            Backend::SpeechDispatcher => raw.lines().filter_map(parse_spd_line).collect(),
        }
    }

    /// Languages this backend will not serve, with the reason in the words the
    /// user should read. Kept next to `normalise_spd_language`, which does the
    /// excluding, so the two cannot drift apart.
    fn unsupported(self) -> Vec<Unsupported> {
        match self {
            Backend::Say => Vec::new(),
            Backend::SpeechDispatcher => vec![Unsupported {
                lang: "ja".to_string(),
                reason: "espeak-ng has no kanji dictionary: it announces the character class \
                         once per character rather than reading the number, so no voice is \
                         offered here. Installing more voices will not help — this needs a \
                         different engine, such as open-jtalk."
                    .to_string(),
            }],
        }
    }

    /// What to tell someone with no voices. Naming the package is the whole
    /// difference between a dead end and a next step.
    pub fn install_hint(self) -> &'static str {
        match self {
            Backend::Say => {
                "Add one in System Settings → Accessibility → Spoken Content → System Voice \
                 → Manage Voices."
            }
            Backend::SpeechDispatcher => {
                "Install a synthesiser speech-dispatcher can drive — `sudo apt install \
                 espeak-ng` covers most languages."
            }
        }
    }
}

/// Parse one line of `say -v '?'`.
///
/// The obvious split on whitespace is wrong: names are not one word. Real
/// entries include `Bad News             en_US    # ...` and
/// `Eddy (German (Germany)) de_DE    # ...`. The locale is the last token
/// before the comment, and everything before it is the name.
fn parse_say_line(line: &str) -> Option<Voice> {
    let head = line.split('#').next()?.trim_end();
    let (name, locale) = head.rsplit_once(char::is_whitespace)?;
    let name = name.trim();
    let locale = locale.trim();
    if name.is_empty() || locale.is_empty() {
        return None;
    }
    // `say` already speaks the app's namespace, and selects by name.
    Some(Voice {
        name: name.to_string(),
        locale: locale.to_string(),
        id: name.to_string(),
    })
}

/// Does this token look like a language tag rather than part of a name?
fn looks_like_language(tok: &str) -> bool {
    let (head, tail) = match tok.split_once('-') {
        Some((h, t)) => (h, Some(t)),
        None => (tok, None),
    };
    let head_ok = (2..=3).contains(&head.len()) && head.chars().all(|c| c.is_ascii_lowercase());
    let tail_ok = tail.is_none_or(|t| !t.is_empty() && t.chars().all(|c| c.is_ascii_alphanumeric()));
    head_ok && tail_ok
}

/// Parse one line of `spd-say -L`, whose columns are NAME, LANGUAGE, VARIANT.
///
/// Same trap as `say`: the name can contain spaces. Rather than counting
/// columns, scan from the right for the last token that looks like a language
/// tag — `none` and `male1` do not, `en-GB` and `cmn` do — so a two-column
/// listing without a variant parses just as well.
fn parse_spd_line(line: &str) -> Option<Voice> {
    let toks: Vec<&str> = line.split_whitespace().collect();
    if toks.len() < 2 || toks[0].eq_ignore_ascii_case("NAME") {
        return None;
    }
    let idx = toks.iter().rposition(|t| looks_like_language(t))?;
    if idx == 0 {
        return None;
    }
    let tag = toks[idx];
    // Unmapped tags are dropped rather than guessed at. Japanese is the one
    // that matters: espeak-ng has no kanji dictionary and announces the
    // character class once per character, so a ja voice here would play
    // "Chinese letter" three times while the drill showed 七十三 and graded
    // the answer. Nothing on screen would look wrong. Dropping it makes the
    // existing no-voice panel fire instead, which is the truth.
    let locale = normalise_spd_language(tag)?;
    Some(Voice {
        name: toks[..idx].join(" "),
        locale,
        id: tag.to_string(),
    })
}

/// speech-dispatcher's language tag to the app's namespace.
///
/// Returning `None` excludes a language, and that is the only mechanism
/// needed for a per-language capability matrix: `voicesFor()` already returns
/// an empty list when nothing acceptable is installed, and the drill already
/// renders a panel saying so.
fn normalise_spd_language(tag: &str) -> Option<String> {
    let t = tag.to_ascii_lowercase();
    Some(
        match t.as_str() {
            // Mandarin. espeak-ng names it `cmn`, and Cantonese `yue` — two
            // distinct codes rather than macOS's two regions of one language,
            // which makes the trap `voices.ts` exists to catch easier to avoid.
            // `yue` is mapped rather than dropped so the allowlist rejects it
            // for the documented reason, instead of it vanishing silently.
            "cmn" | "zh" | "zh-cn" => "zh_CN",
            "zh-tw" => "zh_TW",
            "yue" => "zh_HK",
            "fr" | "fr-fr" => "fr_FR",
            // Belgian and Swiss French are the septante/nonante regions the
            // README lists as unimplemented. Mapped so the allowlist can
            // exclude them: such a voice would read the tables' `soixante-dix`
            // correctly, which makes the mismatch harder to notice, not easier.
            "fr-be" => "fr_BE",
            "fr-ch" => "fr_CH",
            "de" | "de-de" => "de_DE",
            "es" | "es-es" => "es_ES",
            "es-419" | "es-mx" => "es_MX",
            "pt" | "pt-pt" => "pt_PT",
            "pt-br" => "pt_BR",
            "it" | "it-it" => "it_IT",
            "th" | "th-th" => "th_TH",
            "vi" | "vi-vn" => "vi_VN",
            "vi-vn-x-central" | "vi-vn-x-south" => "vi_VN",
            "hi" | "hi-in" => "hi_IN",
            // "ja" is deliberately absent. See parse_spd_line.
            _ => return None,
        }
        .to_string(),
    )
}

/// Words per minute to speech-dispatcher's −100..100 scale.
///
/// `speak`'s `rate` is a words-per-minute contract because that is what
/// `say -r` takes. spd-say's `-r` is a relative scale where 0 is the voice's
/// default, which is around 175 wpm for espeak-ng — so that is the pivot.
fn spd_rate(wpm: u32) -> i32 {
    const DEFAULT_WPM: f64 = 175.0;
    let scaled = ((f64::from(wpm) - DEFAULT_WPM) / DEFAULT_WPM * 100.0).round();
    (scaled as i32).clamp(-100, 100)
}

#[tauri::command]
pub fn list_voices() -> Result<Vec<Voice>, String> {
    let Some(backend) = Backend::detect() else {
        return Err(no_backend_message());
    };
    Ok(backend.parse(&backend.list_raw()?))
}

/// A language this backend cannot serve, and why.
///
/// An excluded language and an empty machine are different situations, and
/// telling them apart is the panel's job. Without this the drill advised
/// `apt install espeak-ng` for Japanese on Linux — already installed, and the
/// very engine that cannot read kanji.
#[derive(Serialize, Clone, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Unsupported {
    /// The app's language code, as `voices.ts` uses it.
    pub lang: String,
    pub reason: String,
}

/// Which backend is in use, and what to say when it has no usable voice.
/// The frontend must not hardcode a macOS sentence — on Ubuntu it is nonsense.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SpeechInfo {
    pub backend: String,
    pub install_hint: String,
    /// Languages deliberately not offered here. Empty is the normal case.
    pub unsupported: Vec<Unsupported>,
}

#[tauri::command]
pub fn speech_info() -> SpeechInfo {
    match Backend::detect() {
        Some(b) => SpeechInfo {
            backend: b.binary().to_string(),
            install_hint: b.install_hint().to_string(),
            unsupported: b.unsupported(),
        },
        None => SpeechInfo {
            backend: "none".to_string(),
            install_hint: no_backend_message(),
            unsupported: Vec::new(),
        },
    }
}

fn no_backend_message() -> String {
    if cfg!(target_os = "macos") {
        "No speech backend found: `say` should ship with macOS.".to_string()
    } else {
        "No speech backend found. Install speech-dispatcher and a synthesiser — \
         `sudo apt install speech-dispatcher espeak-ng`."
            .to_string()
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

    let Some(backend) = Backend::detect() else {
        return Err(no_backend_message());
    };

    let mut cmd = Command::new(backend.binary());
    match backend {
        Backend::Say => {
            cmd.arg("-v").arg(&voice);
            if let Some(r) = rate {
                cmd.arg("-r").arg(r.clamp(80, 300).to_string());
            }
        }
        Backend::SpeechDispatcher => {
            // `voice` carries the id, which for this backend is the language
            // tag spd-say accepts — bare `fr`, not `fr_FR`, which it rejects.
            cmd.arg("-l").arg(&voice);
            if let Some(r) = rate {
                cmd.arg("-r").arg(spd_rate(r).to_string());
            }
            // Everything after this is the text, however it starts.
            cmd.arg("--");
        }
    }
    // Text goes as an argument, never through a shell, so a number word can
    // never be read as syntax.
    cmd.arg(&text);

    let child = cmd
        .spawn()
        .map_err(|e| format!("could not run `{}`: {e}", backend.binary()))?;
    if let Ok(mut guard) = speaker.0.lock() {
        *guard = Some(child);
    }
    Ok(())
}

#[tauri::command]
pub fn stop_speaking(speaker: tauri::State<'_, Speaker>) {
    speaker.silence();
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_a_plain_say_entry() {
        let v = parse_say_line("Thomas              fr_FR    # Bonjour...").unwrap();
        assert_eq!(v.name, "Thomas");
        assert_eq!(v.locale, "fr_FR");
        assert_eq!(v.id, "Thomas", "say selects a voice by name");
    }

    #[test]
    fn parses_say_names_containing_spaces_and_brackets() {
        let v = parse_say_line("Eddy (German (Germany)) de_DE    # Hallo").unwrap();
        assert_eq!(v.name, "Eddy (German (Germany))");
        assert_eq!(v.locale, "de_DE");

        let v = parse_say_line("Bad News            en_US    # example").unwrap();
        assert_eq!(v.name, "Bad News");
    }

    #[test]
    fn parses_a_say_entry_with_no_comment() {
        let v = parse_say_line("Anna                de_DE").unwrap();
        assert_eq!(v.name, "Anna");
        assert_eq!(v.locale, "de_DE");
    }

    #[test]
    fn rejects_say_junk() {
        assert!(parse_say_line("").is_none());
        assert!(parse_say_line("# just a comment").is_none());
        assert!(parse_say_line("OneTokenOnly").is_none());
    }

    #[test]
    fn skips_the_spd_header() {
        assert!(parse_spd_line("NAME  LANGUAGE  VARIANT").is_none());
    }

    #[test]
    fn parses_spd_three_column_rows() {
        let v = parse_spd_line("French                        fr        none").unwrap();
        assert_eq!(v.name, "French");
        assert_eq!(v.locale, "fr_FR", "normalised into the app's namespace");
        assert_eq!(v.id, "fr", "but selected with the tag spd-say accepts");
    }

    #[test]
    fn parses_spd_names_containing_spaces() {
        let v = parse_spd_line("Portuguese (Brazil)   pt-BR   none").unwrap();
        assert_eq!(v.name, "Portuguese (Brazil)");
        assert_eq!(v.locale, "pt_BR");
        assert_eq!(v.id, "pt-BR");
    }

    #[test]
    fn parses_spd_rows_with_no_variant_column() {
        let v = parse_spd_line("Thai   th").unwrap();
        assert_eq!(v.name, "Thai");
        assert_eq!(v.locale, "th_TH");
    }

    #[test]
    fn a_variant_is_not_mistaken_for_a_language() {
        // `male1` and `none` must not win the rightmost-tag scan.
        let v = parse_spd_line("Hindi   hi   male1").unwrap();
        assert_eq!(v.locale, "hi_IN");
        assert_eq!(v.id, "hi");
    }

    #[test]
    fn japanese_is_excluded_on_this_backend() {
        // espeak-ng has no kanji dictionary: every character renders in the
        // same 1.04s and it says "Chinese letter". Offering it would be the
        // Cantonese trap wearing a different hat.
        assert!(parse_spd_line("Japanese   ja   none").is_none());
        assert!(normalise_spd_language("ja").is_none());
    }

    #[test]
    fn every_excluded_language_is_actually_excluded() {
        // The reason shown to the user and the mapping that drops the language
        // are two statements of one fact; if they part company the panel lies.
        for u in Backend::SpeechDispatcher.unsupported() {
            assert!(
                normalise_spd_language(&u.lang).is_none(),
                "{} is listed as unsupported but still maps",
                u.lang
            );
            assert!(!u.reason.trim().is_empty(), "{} has no reason", u.lang);
        }
        assert!(
            Backend::Say.unsupported().is_empty(),
            "macOS serves all ten; an entry here needs a reason too"
        );
    }

    #[test]
    fn mandarin_and_cantonese_stay_distinct() {
        assert_eq!(normalise_spd_language("cmn").unwrap(), "zh_CN");
        // Mapped, not dropped, so voices.ts rejects it for the stated reason.
        assert_eq!(normalise_spd_language("yue").unwrap(), "zh_HK");
    }

    #[test]
    fn metropolitan_french_is_bare_fr() {
        assert_eq!(normalise_spd_language("fr").unwrap(), "fr_FR");
        // The septante/nonante regions map, so the allowlist can exclude them.
        assert_eq!(normalise_spd_language("fr-BE").unwrap(), "fr_BE");
    }

    #[test]
    fn unknown_tags_are_dropped_not_guessed() {
        assert!(normalise_spd_language("sw").is_none());
        assert!(normalise_spd_language("").is_none());
    }

    #[test]
    fn wpm_maps_onto_the_relative_scale() {
        assert_eq!(spd_rate(175), 0, "the default pivots to zero");
        assert!(spd_rate(110) < 0, "slower is negative");
        assert!(spd_rate(250) > 0, "faster is positive");
        assert_eq!(spd_rate(10_000), 100, "clamped");
        assert_eq!(spd_rate(0), -100, "clamped");
    }

    #[test]
    fn language_tags_are_told_from_variants() {
        assert!(looks_like_language("fr"));
        assert!(looks_like_language("cmn"));
        assert!(looks_like_language("pt-BR"));
        assert!(looks_like_language("es-419"));
        assert!(!looks_like_language("none"));
        assert!(!looks_like_language("male1"));
        assert!(!looks_like_language("French"));
    }
}
