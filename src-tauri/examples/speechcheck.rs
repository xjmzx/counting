//! What this machine can actually speak.
//!
//! A second binary in the same crate rather than a script, so it reports what
//! the app itself sees: the same `Backend::detect`, the same parser, the same
//! `normalise_spd_language`. A reimplementation could agree with the app while
//! both were wrong, which is the failure this repo keeps writing tests against.
//!
//! Runs on both platforms. On Linux it answers the question the design doc
//! leaves open — whether an open-jtalk install is visible to speech-dispatcher,
//! and therefore whether Japanese is offered.
//!
//!     make speechcheck
//!
//! Deliberately an example rather than a second [[bin]]: with two bin targets
//! the Tauri bundler shipped *this* as the app binary, and the .app launched
//! a diagnostic instead of the drill. Examples are never bundled.

use std::time::Instant;

use counting_lib::tts::{Backend, ClipPlayer};

/// The languages the app ships, in the app's own codes.
const LANGS: [(&str, &str); 11] = [
    ("en", "English"),
    ("zh", "Mandarin"),
    ("fr", "French"),
    ("it", "Italian"),
    ("pt", "Portuguese"),
    ("es", "Spanish"),
    ("de", "German"),
    ("hi", "Hindi"),
    ("ja", "Japanese"),
    ("th", "Thai"),
    ("vi", "Vietnamese"),
];

/// Mirrors `voices.ts`. Kept here rather than imported because that file is
/// TypeScript; `make data` asserts the app's copy, and this one only groups a
/// report.
fn acceptable(lang: &str) -> &'static [&'static str] {
    match lang {
        "en" => &["en_GB", "en_US", "en_IE", "en_AU"],
        "zh" => &["zh_CN", "zh_TW"],
        "fr" => &["fr_FR", "fr_CA"],
        "de" => &["de_DE", "de_AT", "de_CH"],
        "es" => &["es_ES", "es_MX", "es_AR", "es_US"],
        "pt" => &["pt_BR", "pt_PT"],
        "it" => &["it_IT", "it_CH"],
        "ja" => &["ja_JP"],
        "th" => &["th_TH"],
        "vi" => &["vi_VN"],
        "hi" => &["hi_IN"],
        _ => &[],
    }
}

/// Wrap without pulling in a dependency for one report.
fn wrap(s: &str, width: usize) -> Vec<String> {
    let mut out = vec![String::new()];
    for word in s.split_whitespace() {
        let line = out.last_mut().expect("always one line");
        if !line.is_empty() && line.len() + 1 + word.len() > width {
            out.push(word.to_string());
        } else {
            if !line.is_empty() {
                line.push(' ');
            }
            line.push_str(word);
        }
    }
    out
}

/// Speak one string and return how long it took, in seconds.
///
/// Wall time, not a rendered file. `spd-say -w` blocks until the utterance
/// finishes and speech-dispatcher will not write audio to disk, so there is
/// nothing to measure with `afinfo` the way `scriptcheck` does on macOS. Both
/// backends block, so both can be timed the same way — process startup is a
/// constant and this compares a spread, not an absolute.
fn time_utterance(backend: Backend, voice: &str, module: Option<&str>, text: &str) -> Option<f64> {
    let mut cmd = std::process::Command::new(backend.name());
    match backend.name() {
        "say" => {
            cmd.arg("-v").arg(voice).arg(text);
        }
        _ => {
            if let Some(m) = module {
                cmd.arg("-o").arg(m);
            }
            cmd.arg("-w").arg("-l").arg(voice).arg("--").arg(text);
        }
    }
    let start = Instant::now();
    let status = cmd.status().ok()?;
    status.success().then(|| start.elapsed().as_secs_f64())
}

/// Does this voice read the script, or fall back to a fixed announcement?
///
/// A voice with no dictionary for a script cannot vary: espeak-ng renders
/// every kanji in the same 1.04s and says "Chinese letter". Real readings
/// differ in length. So a flat spread across distinct words proves a fallback,
/// while a varied spread proves only that something script-aware is happening.
///
/// The words come from the app's own tables, passed in, so this file holds no
/// second copy of them.
fn probe(backend: Backend, lang: &str, words: &[String]) {
    let module = if lang == "ja" { backend.japanese_module() } else { None };
    let voice = match backend.name() {
        // macOS selects by voice name; pick the language's best.
        "say" => match backend.voices() {
            Ok(vs) => vs
                .into_iter()
                .find(|v| v.locale.starts_with(&format!("{lang}_")) && !v.name.contains('('))
                .map(|v| v.name),
            Err(_) => None,
        },
        // speech-dispatcher selects by language tag.
        _ => Some(lang.to_string()),
    };
    let Some(voice) = voice else {
        println!("\nNo voice for {lang}; nothing to probe.");
        return;
    };

    println!("\nDoes the {lang} voice read its script? ({voice}{})",
        module.as_deref().map(|m| format!(", module {m}")).unwrap_or_default());
    // Best of two. Wall time carries process startup and scheduler noise that a
    // rendered file does not — on macOS the constant is around a second, well
    // over the audio itself — and taking the minimum removes most of it. Two
    // runs rather than more because each is a real utterance in real time.
    let mut times = Vec::new();
    for w in words {
        let a = time_utterance(backend, &voice, module.as_deref(), w);
        let b = time_utterance(backend, &voice, module.as_deref(), w);
        match (a, b) {
            (Some(x), Some(y)) => {
                let t = x.min(y);
                println!("    {w:<8} {t:.2}s");
                times.push(t);
            }
            (Some(t), None) | (None, Some(t)) => {
                println!("    {w:<8} {t:.2}s (one run failed)");
                times.push(t);
            }
            (None, None) => println!("    {w:<8} failed to speak"),
        }
    }
    if times.len() < 3 {
        println!("  Too few utterances to judge.");
        return;
    }
    let max = times.iter().cloned().fold(f64::MIN, f64::max);
    let min = times.iter().cloned().fold(f64::MAX, f64::min);
    let spread = max - min;
    println!("  spread {spread:.2}s  (times include ~1s of constant process overhead)");

    // The numbers matter more than the verdict, so both are printed and this
    // never fails anything — the same one-way rule soundcheck and scriptcheck
    // follow. The failure being detected is stark: espeak-ng renders every
    // kanji in exactly 1.04s, so a real fallback spreads by hundredths.
    if spread < 0.10 {
        println!();
        println!("  FLAT. Every word takes the same time, which a real reading cannot do.");
        println!("  That is the signature of a fallback: no dictionary for this script, so");
        println!("  the voice announces the character class once per character. espeak-ng");
        println!("  does exactly this with kanji, at 1.04s flat, saying \"Chinese letter\".");
        println!("  Do not offer this language through this engine.");
    } else {
        println!();
        println!("  Varies, so something script-aware is happening — the words are being");
        println!("  read rather than announced. That is not proof the reading is *correct*;");
        println!("  it only rules out the fallback. Listen before trusting it.");
    }
}

fn main() {
    let Some(backend) = Backend::detect() else {
        println!("No speech backend found.");
        println!("  macOS ships `say`; on Linux install speech-dispatcher.");
        std::process::exit(1);
    };
    println!("Backend: {}", backend.name());

    let modules = backend.module_names();
    if !modules.is_empty() {
        println!("Modules: {}", modules.join(", "));
    }

    if backend.name() == "spd-say" {
        match backend.japanese_module() {
            Some(m) => println!("Japanese engine: {m} — kanji can be read, so Japanese is offered"),
            None => println!(
                "Japanese engine: none. espeak-ng cannot read kanji, so Japanese is not offered.\n  \
                 Try: sudo apt install open-jtalk open-jtalk-mecab-naist-jdic \
                 hts-voice-nitech-jp-atr503-m001"
            ),
        }
    }

    let voices = match backend.voices() {
        Ok(v) => v,
        Err(e) => {
            println!("Could not list voices: {e}");
            std::process::exit(1);
        }
    };
    println!("\n{} voices visible to the app\n", voices.len());

    let unsupported = backend.unsupported();
    let mut missing = 0;
    for (code, name) in LANGS {
        let ok = acceptable(code);
        let n = voices.iter().filter(|v| ok.contains(&v.locale.as_str())).count();
        let note = unsupported.iter().find(|u| u.lang == code);
        let state = match (n, note) {
            (_, Some(_)) => "excluded".to_string(),
            (0, None) => {
                missing += 1;
                "none".to_string()
            }
            (n, None) => n.to_string(),
        };
        println!("  {name:<12} {state:>8}");
        if let Some(u) = note {
            for line in wrap(&u.reason, 60) {
                println!("               {line}");
            }
        }
    }

    // `--probe <lang> <word>...` — the words come from the caller so the app's
    // tables stay the only copy. `make speechprobe` supplies them.
    let args: Vec<String> = std::env::args().skip(1).collect();
    if let Some(pos) = args.iter().position(|a| a == "--probe") {
        let rest = &args[pos + 1..];
        if rest.len() < 2 {
            println!("\nusage: --probe <lang> <word>...   (try: make speechprobe)");
        } else {
            probe(backend, &rest[0], &rest[1..]);
        }
    }

    match ClipPlayer::detect() {
        Some(p) => println!("\nClip playback: {} — a recorded clip is preferred when one exists", p.name()),
        None => println!("\nClip playback: none found; clips cannot be played on this machine"),
    }

    if missing > 0 {
        println!(
            "\n{missing} language(s) have no voice. That is a missing install rather than a\n\
             fault, and the drill says so rather than failing."
        );
    }
}
