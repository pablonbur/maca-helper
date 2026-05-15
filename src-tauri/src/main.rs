#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    if std::env::args().any(|arg| maca_helper_lib::is_silent_depurador_arg(&arg)) {
        if let Err(error) = maca_helper_lib::run_silent_depurador() {
            eprintln!("No se pudo ejecutar el depurador: {error}");
            std::process::exit(1);
        }

        return;
    }

    maca_helper_lib::run()
}
