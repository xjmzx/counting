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

use std::path::PathBuf;
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
    pub fn detect() -> Option<Backend> {
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
            Backend::SpeechDispatcher => resolve_japanese(
                raw.lines().filter_map(parse_spd_line).collect(),
                self.japanese_module().as_deref(),
            ),
        }
    }

    /// The binary this backend drives, for a report or a tooltip.
    pub fn name(self) -> &'static str {
        self.binary()
    }

    /// Every voice this backend offers, already normalised and filtered.
    pub fn voices(self) -> Result<Vec<Voice>, String> {
        Ok(self.parse(&self.list_raw()?))
    }

    /// The output modules speech-dispatcher has, from `spd-say -O`.
    pub fn module_names(self) -> Vec<String> {
        self.modules()
    }

    fn modules(self) -> Vec<String> {
        if self != Backend::SpeechDispatcher {
            return Vec::new();
        }
        let Ok(out) = Command::new("spd-say").arg("-O").output() else {
            return Vec::new();
        };
        String::from_utf8_lossy(&out.stdout)
            .lines()
            .map(str::trim)
            .filter(|l| !l.is_empty() && !l.contains(char::is_whitespace))
            .map(str::to_string)
            .collect()
    }

    /// An open-jtalk output module that can actually speak, if there is one.
    ///
    /// This is what decides whether Japanese is offered on Linux. espeak-ng
    /// cannot read kanji; open-jtalk can, and `mecab` — the expensive half —
    /// is already present on a stock desktop. So the exclusion is a property
    /// of the *module*, not of the language, and installing open-jtalk should
    /// simply make Japanese work.
    ///
    /// **The name in `spd-say -O` proves nothing.** `sd_openjtalk` ships with
    /// speech-dispatcher itself, while the dictionary and the voice come from
    /// separate packages — so the module is listed on a stock box that has
    /// neither, registers happily, and synthesises silence. Trusting the name
    /// would offer Japanese, route it to a module with no data, and play
    /// nothing at all while the drill waited to grade an answer: the same
    /// silent-wrongness the exclusion exists to prevent, only quieter than
    /// before. So ask the module's own config what files it needs, and check
    /// they are there.
    pub fn japanese_module(self) -> Option<String> {
        let name = self
            .modules()
            .into_iter()
            .find(|m| m.to_ascii_lowercase().contains("jtalk"))?;
        module_data_is_installed(&name).then_some(name)
    }

    /// Languages this backend will not serve, with the reason in the words the
    /// user should read. It must agree with `resolve_japanese` — the panel's
    /// reason and the voice list are two statements of one fact — and a test
    /// asserts they do on whichever machine runs it.
    pub fn unsupported(self) -> Vec<Unsupported> {
        match self {
            Backend::Say => Vec::new(),
            // Japanese is excluded only while nothing here can read kanji.
            Backend::SpeechDispatcher if self.japanese_module().is_none() => {
                vec![Unsupported {
                    lang: "ja".to_string(),
                    reason: "espeak-ng has no kanji dictionary: it announces the character \
                             class once per character rather than reading the number, so no \
                             voice is offered. Installing `open-jtalk` and a voice — try \
                             `sudo apt install open-jtalk open-jtalk-mecab-naist-jdic \
                             hts-voice-nitech-jp-atr503-m001` — makes it work here."
                        .to_string(),
                }]
            }
            Backend::SpeechDispatcher => Vec::new(),
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

/// Plays a recorded clip. Separate from `Backend` because playing a file and
/// synthesising speech are different jobs with different binaries.
///
/// WAV, not a compressed format: `afplay`, `paplay` and `aplay` all decode it
/// with nothing installed, and a clip that needs a codec on the user's box is
/// a clip that silently does not play.
#[derive(Clone, Copy, Debug, PartialEq)]
pub enum ClipPlayer {
    Afplay,
    Paplay,
    Aplay,
}

impl ClipPlayer {
    /// For a report or a tooltip.
    pub fn name(self) -> &'static str {
        self.binary()
    }

    fn binary(self) -> &'static str {
        match self {
            ClipPlayer::Afplay => "afplay",
            ClipPlayer::Paplay => "paplay",
            ClipPlayer::Aplay => "aplay",
        }
    }

    pub fn detect() -> Option<ClipPlayer> {
        let order = if cfg!(target_os = "macos") {
            [ClipPlayer::Afplay, ClipPlayer::Paplay, ClipPlayer::Aplay]
        } else {
            [ClipPlayer::Paplay, ClipPlayer::Aplay, ClipPlayer::Afplay]
        };
        order.into_iter().find(|p| {
            // --help rather than --version: aplay has no --version.
            Command::new(p.binary()).arg("--help").output().is_ok()
        })
    }
}

/// Where a clip for this number would live, if one exists.
///
/// `clips/<lang>/<n>.wav`, bundled as a Tauri resource. Absent is the normal
/// case and always will be: 101 numbers times ten languages is a thousand
/// recordings, so the fallback path is permanent, not temporary.
pub fn clip_path(app: &tauri::AppHandle, lang: &str, n: u32) -> Option<PathBuf> {
    use tauri::Manager;
    let rel = clip_relative_path(lang, n)?;
    let p = app
        .path()
        .resolve(rel, tauri::path::BaseDirectory::Resource)
        .ok()?;
    p.is_file().then_some(p)
}

/// Where a clip sits inside the resource directory, or `None` if the request
/// is not one this app makes.
///
/// Split out so it can be tested without an app handle: a language code
/// arrives from the frontend and must never escape the clips directory, and
/// "it looked fine" is not a check.
fn clip_relative_path(lang: &str, n: u32) -> Option<String> {
    if lang.is_empty() || n > 100 || !lang.chars().all(|c| c.is_ascii_lowercase()) {
        return None;
    }
    Some(format!("clips/{lang}/{n}.wav"))
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
    // Unmapped tags are dropped rather than guessed at. Japanese is mapped
    // here but the entry is replaced afterwards by `resolve_japanese`: with
    // only espeak-ng installed it has no kanji dictionary and announces the
    // character class once per character, so a ja voice would play "Chinese
    // letter" three times while the drill showed 七十三 and graded the answer.
    // Nothing on screen would look wrong. Removing it makes the existing
    // no-voice panel fire instead, which is the truth.
    let locale = normalise_spd_language(tag)?;
    Some(Voice {
        name: toks[..idx].join(" "),
        locale,
        id: tag.to_string(),
    })
}

/// Read one `Key "value"` setting out of a speech-dispatcher module config.
///
/// Pure so it can be tested without a machine that has open-jtalk installed,
/// which is the whole difficulty with this corner: the interesting case is the
/// box that does *not* have it.
fn conf_path_value(conf: &str, key: &str) -> Option<String> {
    conf.lines()
        .map(str::trim)
        .filter(|l| !l.starts_with('#'))
        .find_map(|l| {
            let rest = l.strip_prefix(key)?;
            let start = rest.find('"')? + 1;
            let end = rest[start..].find('"')? + start;
            Some(rest[start..end].to_string())
        })
}

/// Does this module have the data it needs, or is it a registered shell?
///
/// A user config wins over the system one, matching speech-dispatcher's own
/// precedence. If no config can be found the answer is "no": under-offering a
/// language is recoverable, and silence in a listening drill is not.
fn module_data_is_installed(module: &str) -> bool {
    let name = format!("{module}.conf");
    let mut candidates = Vec::new();
    if let Ok(home) = std::env::var("HOME") {
        candidates.push(format!("{home}/.config/speech-dispatcher/modules/{name}"));
    }
    candidates.push(format!("/etc/speech-dispatcher/modules/{name}"));

    let Some(conf) = candidates.iter().find_map(|p| std::fs::read_to_string(p).ok()) else {
        return false;
    };
    // Both are required: a voice with no dictionary cannot turn kanji into
    // readings, and a dictionary with no voice has nothing to say them with.
    ["OpenjtalkVoice", "OpenjtalkDictionaryDirectory"]
        .iter()
        .all(|k| {
            conf_path_value(&conf, k)
                .is_some_and(|v| std::path::Path::new(&v).exists())
        })
}

/// Replace the listed Japanese voices with the one that will actually speak.
///
/// `spd-say -L` enumerates the *listing* engine's voices, which is espeak-ng —
/// so Japanese arrives as 101 entries named `Japanese`, `Japanese+Adam`,
/// `Japanese+Alicia` and so on. Not one of them is what speaks: `speak` sends
/// `-o <module> -l ja` and never passes a variant, so every one of those names
/// resolves to the single open-jtalk voice. Offering them is offering a choice
/// that does not exist, under the names of an engine that is not being used —
/// and picking `Japanese+Alicia` gets you a male HMM voice.
///
/// So the espeak entries are dropped either way, and one honest entry is put
/// back when a module can serve the language. Ubuntu packages exactly one
/// open-jtalk voice, so one entry is not a simplification: it is the count.
///
/// Pure, and takes the module rather than a flag, so both branches are
/// testable on a machine whichever way it happens to be configured.
fn resolve_japanese(voices: Vec<Voice>, module: Option<&str>) -> Vec<Voice> {
    let mut out: Vec<Voice> = voices.into_iter().filter(|v| v.locale != "ja_JP").collect();
    if let Some(m) = module {
        out.push(Voice {
            name: japanese_voice_name(m),
            locale: "ja_JP".to_string(),
            // The tag, as every speech-dispatcher id is. `speak` pairs it with
            // `-o` on the strength of the language, not of this name.
            id: "ja".to_string(),
        });
    }
    out
}

/// What to call the voice in the picker: the engine, since that is the only
/// thing distinguishing it from the espeak entries it replaces.
fn japanese_voice_name(module: &str) -> String {
    if module.to_ascii_lowercase().contains("jtalk") {
        "Open JTalk".to_string()
    } else {
        module.to_string()
    }
}

/// speech-dispatcher's language tag to the app's namespace.
///
/// A pure mapping, and deliberately ignorant of what is installed. Returning
/// `None` means "this app does not use that tag"; whether a mapped language is
/// actually offered is `resolve_japanese`'s question, asked where the engine is
/// known. Deciding both here is what made the diagnostic contradict itself.
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
            // Mapped rather than dropped. Whether Japanese is *offered* is a
            // question about the installed engine, which this function cannot
            // see — it is decided in `Backend::parse` via `resolve_japanese`.
            "ja" | "ja-jp" => "ja_JP",
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

/// What actually made the sound.
///
/// The frontend needs this so a synthesised reading does not silently pass for
/// a recorded one — and so a missing clip reads as ordinary rather than as a
/// fault, which it will be for years: a thousand recordings is the full set.
#[derive(Serialize, Clone, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Spoken {
    /// `clip` or `synth`.
    pub source: String,
    /// The binary that played it, for the tooltip.
    pub detail: String,
}

/// Speak `text` with `voice`, preferring a recorded clip when one exists.
///
/// `lang` and `n` say which number this is, so a recording can be looked up.
/// Both absent means "just synthesise it".
///
/// `rate` is words per minute; the macOS default is around 175. Slower is
/// genuinely useful here — a compound like *vierundsiebzig* goes past fast.
#[tauri::command]
pub fn speak(
    app: tauri::AppHandle,
    speaker: tauri::State<'_, Speaker>,
    voice: String,
    text: String,
    rate: Option<u32>,
    lang: Option<String>,
    n: Option<u32>,
) -> Result<Spoken, String> {
    speaker.silence();

    // A human saying the number beats any synthesiser, so a clip wins whenever
    // one exists. Rate is ignored here: a recording has the speed it has, and
    // pitching it would be worse than leaving it alone.
    if let (Some(lang), Some(n)) = (lang.as_deref(), n) {
        if let (Some(path), Some(player)) = (clip_path(&app, lang, n), ClipPlayer::detect()) {
            let child = Command::new(player.binary())
                .arg(&path)
                .spawn()
                .map_err(|e| format!("could not run `{}`: {e}", player.binary()))?;
            if let Ok(mut guard) = speaker.0.lock() {
                *guard = Some(child);
            }
            return Ok(Spoken {
                source: "clip".to_string(),
                detail: player.binary().to_string(),
            });
        }
    }

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
            // Japanese only works through an open-jtalk module; the default
            // one cannot read kanji. Naming it explicitly is what makes the
            // language usable once the module is installed.
            if voice == "ja" {
                if let Some(m) = backend.japanese_module() {
                    cmd.arg("-o").arg(m);
                }
            }
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
    Ok(Spoken {
        source: "synth".to_string(),
        detail: backend.binary().to_string(),
    })
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
    fn japanese_is_mapped_but_gated_on_the_engine() {
        // `ja` maps like any other tag. Whether it survives is a question
        // about the installed engine, and is answered by resolve_japanese.
        assert_eq!(normalise_spd_language("ja").as_deref(), Some("ja_JP"));
        assert!(parse_spd_line("Japanese   ja   none").is_some());

        let ja = parse_spd_line("Japanese   ja   none").unwrap();
        let fr = parse_spd_line("French   fr   none").unwrap();

        // With only espeak-ng, Japanese must not reach the picker: it has no
        // kanji dictionary and announces the character class once per
        // character. Offering it is the Cantonese trap in a new costume.
        let without = resolve_japanese(vec![ja.clone(), fr.clone()], None);
        assert_eq!(without.len(), 1);
        assert_eq!(without[0].locale, "fr_FR");

        // With open-jtalk it must reach the picker — otherwise installing the
        // engine changes nothing and the offer is a claim the app cannot keep.
        // Exactly one entry, and not the espeak name it replaces: the listed
        // variants all resolve to the same voice, so offering them is offering
        // a choice that does not exist.
        let with = resolve_japanese(vec![ja, fr], Some("openjtalk"));
        let ja_out: Vec<_> = with.iter().filter(|v| v.locale == "ja_JP").collect();
        assert_eq!(ja_out.len(), 1, "one voice, because there is one voice");
        assert_eq!(ja_out[0].name, "Open JTalk");
        assert_eq!(ja_out[0].id, "ja", "speak pairs this with -o");
        assert!(with.iter().any(|v| v.locale == "fr_FR"), "only Japanese is rewritten");
    }

    #[test]
    fn a_module_config_is_read_for_the_files_it_needs() {
        let conf = "# a comment\n\
                    OpenjtalkDictionaryDirectory \"/var/lib/mecab/dic/x\"\n\
                    OpenjtalkVoice \"/usr/share/hts-voice/y.htsvoice\"\n";
        assert_eq!(
            conf_path_value(conf, "OpenjtalkVoice").as_deref(),
            Some("/usr/share/hts-voice/y.htsvoice")
        );
        assert_eq!(
            conf_path_value(conf, "OpenjtalkDictionaryDirectory").as_deref(),
            Some("/var/lib/mecab/dic/x")
        );
        assert!(conf_path_value(conf, "NotPresent").is_none());
        // A commented-out setting is not a setting.
        assert!(conf_path_value("# OpenjtalkVoice \"/nope\"", "OpenjtalkVoice").is_none());
    }

    #[test]
    fn the_unsupported_list_matches_what_is_actually_dropped() {
        // The panel's reason and the voice list are two statements of one
        // fact, and if they part company the app contradicts itself — which
        // it did: the diagnostic once said "Japanese is offered" directly
        // above "Japanese  none".
        //
        // This asserted the old mechanism, that an excluded language was one
        // `normalise_spd_language` refused to map. Exclusion moved to
        // `resolve_japanese`, where the installed engine is known, and this test
        // went on asserting the mechanism instead of the property — passing
        // while the two halves disagreed, then failing once they were made to
        // agree. It now checks the property, on whichever machine runs it.
        let backend = Backend::SpeechDispatcher;
        let sample = vec![
            Voice { name: "J".into(), locale: "ja_JP".into(), id: "ja".into() },
            Voice { name: "F".into(), locale: "fr_FR".into(), id: "fr".into() },
        ];

        let kept = resolve_japanese(sample, backend.japanese_module().as_deref());
        let ja_offered = kept.iter().any(|v| v.locale == "ja_JP");
        let ja_called_unsupported = backend.unsupported().iter().any(|u| u.lang == "ja");
        assert_eq!(
            ja_offered, !ja_called_unsupported,
            "a language the panel calls unsupported must not be in the voice list"
        );
        assert!(kept.iter().any(|v| v.locale == "fr_FR"), "only Japanese is gated");

        for u in backend.unsupported() {
            assert!(!u.reason.trim().is_empty(), "{} has no reason", u.lang);
        }
        assert!(
            Backend::Say.unsupported().is_empty(),
            "macOS serves all ten; an entry here would need a reason too"
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
    fn clip_paths_are_built_only_for_requests_this_app_makes() {
        assert_eq!(clip_relative_path("ja", 73).unwrap(), "clips/ja/73.wav");
        assert_eq!(clip_relative_path("ja", 0).unwrap(), "clips/ja/0.wav");
        assert_eq!(clip_relative_path("ja", 100).unwrap(), "clips/ja/100.wav");
    }

    #[test]
    fn a_language_code_cannot_escape_the_clips_directory() {
        // The code comes from the frontend; nothing downstream re-checks it.
        assert!(clip_relative_path("../../etc", 1).is_none());
        assert!(clip_relative_path("ja/..", 1).is_none());
        assert!(clip_relative_path("JA", 1).is_none(), "uppercase is not a code here");
        assert!(clip_relative_path("", 1).is_none());
        assert!(clip_relative_path("ja", 101).is_none(), "outside the range");
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
