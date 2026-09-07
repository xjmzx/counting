// counting — a window around the drills, plus speech for the listening one.
//
// Reading and writing are pure functions of the composed number list and live
// entirely in the frontend, where the data already is. Speech is the one thing
// that has to be here: see the note at the top of tts.rs.

mod tts;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(tts::Speaker::default())
        .invoke_handler(tauri::generate_handler![
            tts::list_voices,
            tts::speak,
            tts::stop_speaking
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
