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

use counting_lib::tts::{Backend, ClipPlayer};

/// The languages the app ships, in the app's own codes.
const LANGS: [(&str, &str); 10] = [
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
