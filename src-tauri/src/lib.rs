mod depurador;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            depurador::get_depurador_config,
            depurador::save_depurador_config,
            depurador::preview_depurador_comprobantes,
            depurador::run_depurador_comprobantes,
            depurador::open_depurador_quarantine_folder,
            depurador::recycle_depurador_quarantine,
            depurador::set_depurador_schedule,
            depurador::get_depurador_schedule_status
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

pub fn is_silent_depurador_arg(arg: &str) -> bool {
    depurador::is_silent_depurador_arg(arg)
}

pub fn run_silent_depurador() -> Result<(), String> {
    depurador::run_silent_depurador().map(|_| ())
}
