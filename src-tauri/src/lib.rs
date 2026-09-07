// counting — a window around the drills. There are no commands yet, and that
// is not an oversight: reading and writing are pure functions of the composed
// number list, so they belong in the frontend where the data already is.
//
// The first real command will be speech synthesis for the listening drill,
// and it has to live here rather than in the webview. SUITE.md records the
// reason: nchat shipped Web Audio tones that worked on macOS and were silent
// on Linux, and WebKit2GTK cannot play media from any app URL scheme. Audio
// in the webview is a bug that only shows up on someone else's machine.

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
