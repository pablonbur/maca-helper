use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::env;
use std::ffi::OsStr;
use std::fs;
use std::io;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

const CONFIG_FILE_NAME: &str = "depurador-config.json";
const TASK_NAME: &str = "MacaHelper-DepuradorComprobantes";
const SILENT_ARG: &str = "--run-depurador-comprobantes";

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct DepuradorConfig {
    #[serde(default)]
    pub folder: String,
    #[serde(default)]
    pub quarantine_folder: String,
    #[serde(default = "default_max_age_hours")]
    pub max_age_hours: u64,
    #[serde(default)]
    pub require_no_spaces: bool,
    #[serde(default)]
    pub ignored_paths: Vec<String>,
    #[serde(default)]
    pub schedule_enabled: bool,
    #[serde(default = "default_schedule_time")]
    pub schedule_time: String,
}

impl Default for DepuradorConfig {
    fn default() -> Self {
        let folder = default_downloads_folder();

        Self {
            quarantine_folder: default_quarantine_folder_for(&folder),
            folder,
            max_age_hours: default_max_age_hours(),
            require_no_spaces: false,
            ignored_paths: Vec::new(),
            schedule_enabled: false,
            schedule_time: default_schedule_time(),
        }
    }
}

impl DepuradorConfig {
    fn normalized(mut self) -> Self {
        if self.folder.trim().is_empty() {
            self.folder = default_downloads_folder();
        }

        if self.quarantine_folder.trim().is_empty() {
            self.quarantine_folder = default_quarantine_folder_for(&self.folder);
        }

        if !is_valid_schedule_time(&self.schedule_time) {
            self.schedule_time = default_schedule_time();
        }

        self.ignored_paths = clean_paths(self.ignored_paths);
        self
    }
}

#[derive(Clone, Debug, Serialize, PartialEq)]
pub struct DepuradorFile {
    pub name: String,
    pub path: String,
    pub size_kb: f64,
    pub created_at_ms: u64,
    pub modified_at_ms: u64,
    pub matched_pattern: String,
}

#[derive(Clone, Debug, Serialize, PartialEq, Eq)]
pub struct DepuradorFileError {
    pub path: String,
    pub message: String,
}

#[derive(Clone, Debug, Serialize, PartialEq)]
pub struct DepuradorResult {
    pub scanned: usize,
    pub detected: usize,
    pub moved: usize,
    pub files: Vec<DepuradorFile>,
    pub ignored_files: Vec<DepuradorFile>,
    pub errors: Vec<DepuradorFileError>,
}

#[derive(Clone, Debug, Serialize, PartialEq, Eq)]
pub struct DepuradorScheduleStatus {
    pub enabled: bool,
    pub registered: bool,
    pub task_name: String,
    pub schedule_time: String,
}

#[derive(Clone, Debug, Serialize, PartialEq, Eq)]
pub struct DepuradorPurgeResult {
    pub recycled: usize,
    pub errors: Vec<DepuradorFileError>,
}

#[tauri::command]
pub fn get_depurador_config() -> Result<DepuradorConfig, String> {
    load_config().map_err(error_message)
}

#[tauri::command]
pub fn save_depurador_config(config: DepuradorConfig) -> Result<DepuradorConfig, String> {
    let config = config.normalized();
    save_config(&config).map_err(error_message)?;
    Ok(config)
}

#[tauri::command]
pub fn preview_depurador_comprobantes(config: DepuradorConfig) -> Result<DepuradorResult, String> {
    let config = config.normalized();
    preview(&config).map_err(error_message)
}

#[tauri::command]
pub fn run_depurador_comprobantes(config: DepuradorConfig) -> Result<DepuradorResult, String> {
    let config = config.normalized();
    save_config(&config).map_err(error_message)?;
    run_quarantine(&config).map_err(error_message)
}

#[tauri::command]
pub fn open_depurador_quarantine_folder() -> Result<(), String> {
    let config = load_config().map_err(error_message)?;
    fs::create_dir_all(&config.quarantine_folder).map_err(error_message)?;
    open_folder(Path::new(&config.quarantine_folder)).map_err(error_message)
}

#[tauri::command]
pub fn recycle_depurador_quarantine() -> Result<DepuradorPurgeResult, String> {
    let config = load_config().map_err(error_message)?;
    recycle_quarantine(Path::new(&config.quarantine_folder)).map_err(error_message)
}

#[tauri::command]
pub fn set_depurador_schedule(
    enabled: bool,
    schedule_time: String,
) -> Result<DepuradorScheduleStatus, String> {
    let schedule_time = normalize_schedule_time(&schedule_time).map_err(error_message)?;
    let mut config = load_config().map_err(error_message)?;
    config.schedule_enabled = enabled;
    config.schedule_time = schedule_time;
    save_config(&config).map_err(error_message)?;

    if enabled {
        register_schedule(&config.schedule_time).map_err(error_message)?;
    } else {
        unregister_schedule().map_err(error_message)?;
    }

    schedule_status().map_err(error_message)
}

#[tauri::command]
pub fn get_depurador_schedule_status() -> Result<DepuradorScheduleStatus, String> {
    schedule_status().map_err(error_message)
}

pub fn is_silent_depurador_arg(arg: &str) -> bool {
    arg == SILENT_ARG
}

pub fn run_silent_depurador() -> Result<DepuradorResult, String> {
    let config = load_config().map_err(error_message)?;
    run_quarantine(&config).map_err(error_message)
}

fn preview(config: &DepuradorConfig) -> io::Result<DepuradorResult> {
    collect_targets(config)
}

fn run_quarantine(config: &DepuradorConfig) -> io::Result<DepuradorResult> {
    let mut result = collect_targets(config)?;
    fs::create_dir_all(&config.quarantine_folder)?;

    for file in result.files.clone() {
        let source = PathBuf::from(&file.path);
        let destination = unique_destination(Path::new(&config.quarantine_folder), &file.name)
            .map_err(|err| {
                io::Error::new(
                    err.kind(),
                    format!("No se pudo preparar destino para {}: {}", file.name, err),
                )
            })?;

        match move_file(&source, &destination) {
            Ok(()) => result.moved += 1,
            Err(err) => result.errors.push(DepuradorFileError {
                path: file.path,
                message: err.to_string(),
            }),
        }
    }

    Ok(result)
}

fn recycle_quarantine(folder: &Path) -> io::Result<DepuradorPurgeResult> {
    if !folder.exists() {
        return Ok(DepuradorPurgeResult {
            recycled: 0,
            errors: Vec::new(),
        });
    }

    let mut files = Vec::new();
    let mut errors = Vec::new();

    for entry in fs::read_dir(folder)? {
        let entry = match entry {
            Ok(entry) => entry,
            Err(err) => {
                errors.push(DepuradorFileError {
                    path: path_to_string(folder),
                    message: err.to_string(),
                });
                continue;
            }
        };

        let path = entry.path();

        if path.is_file() {
            files.push(path);
        }
    }

    if files.is_empty() {
        return Ok(DepuradorPurgeResult {
            recycled: 0,
            errors,
        });
    }

    recycle_files(&files)?;

    Ok(DepuradorPurgeResult {
        recycled: files.len(),
        errors,
    })
}

fn collect_targets(config: &DepuradorConfig) -> io::Result<DepuradorResult> {
    let folder = Path::new(&config.folder);

    if !folder.exists() {
        return Err(io::Error::new(
            io::ErrorKind::NotFound,
            format!("La carpeta no existe: {}", config.folder),
        ));
    }

    let mut files = Vec::new();
    let mut ignored_files = Vec::new();
    let mut errors = Vec::new();
    let mut scanned = 0usize;
    let ignored_paths = ignored_path_set(&config.ignored_paths);

    for entry in fs::read_dir(folder)? {
        let entry = match entry {
            Ok(entry) => entry,
            Err(err) => {
                errors.push(DepuradorFileError {
                    path: config.folder.clone(),
                    message: err.to_string(),
                });
                continue;
            }
        };

        let path = entry.path();

        if !path.is_file() {
            continue;
        }

        scanned += 1;

        if !is_pdf(&path) {
            continue;
        }

        let name = entry.file_name().to_string_lossy().to_string();
        if config.require_no_spaces && name.chars().any(char::is_whitespace) {
            continue;
        }

        let metadata = match entry.metadata() {
            Ok(metadata) => metadata,
            Err(err) => {
                errors.push(DepuradorFileError {
                    path: path_to_string(&path),
                    message: err.to_string(),
                });
                continue;
            }
        };

        let created_at = metadata
            .created()
            .unwrap_or_else(|_| metadata.modified().unwrap_or_else(|_| SystemTime::now()));

        if !is_within_max_age(created_at, config.max_age_hours) {
            continue;
        }

        let modified_at = metadata.modified().unwrap_or_else(|_| created_at);

        let file = DepuradorFile {
            name,
            path: path_to_string(&path),
            size_kb: ((metadata.len() as f64 / 1024.0) * 10.0).round() / 10.0,
            created_at_ms: system_time_ms(created_at),
            modified_at_ms: system_time_ms(modified_at),
            matched_pattern: "PDF".to_string(),
        };

        if ignored_paths.contains(&normalize_path_key(&file.path)) {
            ignored_files.push(file);
        } else {
            files.push(file);
        }
    }

    files.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    ignored_files.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));

    Ok(DepuradorResult {
        scanned,
        detected: files.len(),
        moved: 0,
        files,
        ignored_files,
        errors,
    })
}

fn load_config() -> io::Result<DepuradorConfig> {
    let path = config_path();

    if !path.exists() {
        let config = DepuradorConfig::default();
        save_config(&config)?;
        return Ok(config);
    }

    let raw = fs::read_to_string(path)?;
    let config = serde_json::from_str::<DepuradorConfig>(&raw).unwrap_or_default();
    Ok(config.normalized())
}

fn save_config(config: &DepuradorConfig) -> io::Result<()> {
    let path = config_path();

    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }

    let raw = serde_json::to_string_pretty(config)
        .map_err(|err| io::Error::new(io::ErrorKind::InvalidData, err))?;
    fs::write(path, raw)
}

fn config_path() -> PathBuf {
    app_config_dir().join(CONFIG_FILE_NAME)
}

fn app_config_dir() -> PathBuf {
    if let Some(app_data) = env::var_os("APPDATA") {
        return PathBuf::from(app_data).join("Maca Helper");
    }

    if let Some(local_app_data) = env::var_os("LOCALAPPDATA") {
        return PathBuf::from(local_app_data).join("Maca Helper");
    }

    env::current_dir()
        .unwrap_or_else(|_| PathBuf::from("."))
        .join(".maca-helper")
}

fn default_downloads_folder() -> String {
    if let Some(profile) = env::var_os("USERPROFILE") {
        return path_to_string(&PathBuf::from(profile).join("Downloads"));
    }

    path_to_string(
        &env::current_dir()
            .unwrap_or_else(|_| PathBuf::from("."))
            .join("Downloads"),
    )
}

fn default_quarantine_folder_for(folder: &str) -> String {
    path_to_string(&Path::new(folder).join("_MacaHelper_Depurador"))
}

fn default_max_age_hours() -> u64 {
    168
}

fn default_schedule_time() -> String {
    "21:00".to_string()
}

fn clean_paths(paths: Vec<String>) -> Vec<String> {
    let mut seen = HashSet::new();
    let mut clean = Vec::new();

    for path in paths {
        let path = path.trim().to_string();

        if path.is_empty() {
            continue;
        }

        if seen.insert(normalize_path_key(&path)) {
            clean.push(path);
        }
    }

    clean
}

fn ignored_path_set(paths: &[String]) -> HashSet<String> {
    paths.iter().map(|path| normalize_path_key(path)).collect()
}

fn normalize_path_key(path: &str) -> String {
    if cfg!(windows) {
        path.to_lowercase()
    } else {
        path.to_string()
    }
}

fn is_pdf(path: &Path) -> bool {
    path.extension()
        .and_then(OsStr::to_str)
        .map(|extension| extension.eq_ignore_ascii_case("pdf"))
        .unwrap_or(false)
}

fn is_within_max_age(file_time: SystemTime, max_age_hours: u64) -> bool {
    max_age_hours == 0
        || file_time.elapsed().unwrap_or(Duration::ZERO)
            <= Duration::from_secs(max_age_hours.saturating_mul(3600))
}

fn system_time_ms(time: SystemTime) -> u64 {
    time.duration_since(UNIX_EPOCH)
        .unwrap_or(Duration::ZERO)
        .as_millis()
        .min(u128::from(u64::MAX)) as u64
}

fn unique_destination(folder: &Path, file_name: &str) -> io::Result<PathBuf> {
    let candidate = folder.join(file_name);

    if !candidate.exists() {
        return Ok(candidate);
    }

    let source = Path::new(file_name);
    let stem = source
        .file_stem()
        .and_then(OsStr::to_str)
        .unwrap_or("comprobante");
    let extension = source.extension().and_then(OsStr::to_str).unwrap_or("pdf");
    let stamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or(Duration::ZERO)
        .as_secs();

    for index in 1..1000 {
        let name = format!("{stem}_{stamp}_{index}.{extension}");
        let candidate = folder.join(name);

        if !candidate.exists() {
            return Ok(candidate);
        }
    }

    Err(io::Error::new(
        io::ErrorKind::AlreadyExists,
        "No se pudo crear un nombre unico en cuarentena",
    ))
}

fn move_file(source: &Path, destination: &Path) -> io::Result<()> {
    match fs::rename(source, destination) {
        Ok(()) => Ok(()),
        Err(rename_err) => fs::copy(source, destination)
            .and_then(|_| fs::remove_file(source))
            .map_err(|copy_err| {
                io::Error::new(
                    copy_err.kind(),
                    format!("{}; fallback copy/remove: {}", rename_err, copy_err),
                )
            }),
    }
}

fn normalize_schedule_time(value: &str) -> io::Result<String> {
    let value = value.trim();

    if is_valid_schedule_time(value) {
        Ok(value.to_string())
    } else {
        Err(io::Error::new(
            io::ErrorKind::InvalidInput,
            "La hora de depuración debe tener formato HH:MM",
        ))
    }
}

fn is_valid_schedule_time(value: &str) -> bool {
    let Some((hour, minute)) = value.split_once(':') else {
        return false;
    };

    if hour.len() != 2 || minute.len() != 2 {
        return false;
    }

    let Ok(hour) = hour.parse::<u8>() else {
        return false;
    };
    let Ok(minute) = minute.parse::<u8>() else {
        return false;
    };

    hour < 24 && minute < 60
}

fn schedule_status() -> io::Result<DepuradorScheduleStatus> {
    let config = load_config()?;

    Ok(DepuradorScheduleStatus {
        enabled: config.schedule_enabled,
        registered: is_schedule_registered(),
        task_name: TASK_NAME.to_string(),
        schedule_time: config.schedule_time,
    })
}

#[cfg(windows)]
fn register_schedule(schedule_time: &str) -> io::Result<()> {
    let exe = env::current_exe()?;
    let task_run = format!("\"{}\" {}", path_to_string(&exe), SILENT_ARG);
    let output = Command::new("schtasks.exe")
        .args([
            "/Create",
            "/TN",
            TASK_NAME,
            "/SC",
            "DAILY",
            "/ST",
            schedule_time,
            "/TR",
            &task_run,
            "/F",
        ])
        .output()?;

    if output.status.success() {
        Ok(())
    } else {
        Err(command_error(
            "No se pudo registrar la tarea diaria",
            output,
        ))
    }
}

#[cfg(not(windows))]
fn register_schedule(_schedule_time: &str) -> io::Result<()> {
    Err(io::Error::new(
        io::ErrorKind::Unsupported,
        "La programacion diaria solo esta disponible en Windows",
    ))
}

#[cfg(windows)]
fn unregister_schedule() -> io::Result<()> {
    if !is_schedule_registered() {
        return Ok(());
    }

    let output = Command::new("schtasks.exe")
        .args(["/Delete", "/TN", TASK_NAME, "/F"])
        .output()?;

    if output.status.success() {
        Ok(())
    } else {
        Err(command_error("No se pudo quitar la tarea diaria", output))
    }
}

#[cfg(not(windows))]
fn unregister_schedule() -> io::Result<()> {
    Ok(())
}

#[cfg(windows)]
fn is_schedule_registered() -> bool {
    Command::new("schtasks.exe")
        .args(["/Query", "/TN", TASK_NAME])
        .output()
        .map(|output| output.status.success())
        .unwrap_or(false)
}

#[cfg(not(windows))]
fn is_schedule_registered() -> bool {
    false
}

#[cfg(windows)]
fn open_folder(path: &Path) -> io::Result<()> {
    Command::new("explorer.exe").arg(path).spawn().map(|_| ())
}

#[cfg(not(windows))]
fn open_folder(_path: &Path) -> io::Result<()> {
    Err(io::Error::new(
        io::ErrorKind::Unsupported,
        "Abrir carpetas desde la app solo esta disponible en Windows",
    ))
}

#[cfg(windows)]
fn recycle_files(paths: &[PathBuf]) -> io::Result<()> {
    use std::os::windows::ffi::OsStrExt;
    use std::ptr::null_mut;
    use windows_sys::Win32::UI::Shell::{
        SHFileOperationW, FOF_ALLOWUNDO, FOF_NOCONFIRMATION, FOF_NOERRORUI, FOF_SILENT, FO_DELETE,
        SHFILEOPSTRUCTW,
    };

    let mut from = Vec::<u16>::new();

    for path in paths {
        from.extend(path.as_os_str().encode_wide());
        from.push(0);
    }

    from.push(0);

    let mut operation = SHFILEOPSTRUCTW {
        hwnd: null_mut(),
        wFunc: FO_DELETE,
        pFrom: from.as_ptr(),
        pTo: std::ptr::null(),
        fFlags: (FOF_ALLOWUNDO | FOF_NOCONFIRMATION | FOF_NOERRORUI | FOF_SILENT) as u16,
        fAnyOperationsAborted: 0,
        hNameMappings: null_mut(),
        lpszProgressTitle: std::ptr::null(),
    };

    let code = unsafe { SHFileOperationW(&mut operation) };

    if code == 0 && operation.fAnyOperationsAborted == 0 {
        Ok(())
    } else {
        Err(io::Error::new(
            io::ErrorKind::Other,
            format!("Windows no pudo enviar la cuarentena a la papelera (codigo {code})"),
        ))
    }
}

#[cfg(not(windows))]
fn recycle_files(_paths: &[PathBuf]) -> io::Result<()> {
    Err(io::Error::new(
        io::ErrorKind::Unsupported,
        "Enviar a papelera solo esta disponible en Windows",
    ))
}

fn command_error(prefix: &str, output: std::process::Output) -> io::Error {
    let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
    let detail = if !stderr.is_empty() { stderr } else { stdout };

    io::Error::new(
        io::ErrorKind::Other,
        if detail.is_empty() {
            prefix.to_string()
        } else {
            format!("{prefix}: {detail}")
        },
    )
}

fn path_to_string(path: &Path) -> String {
    path.to_string_lossy().to_string()
}

fn error_message(error: impl std::fmt::Display) -> String {
    error.to_string()
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs::File;
    use std::io::Write;

    #[test]
    fn preview_detects_all_pdfs_in_folder() {
        let workspace = TestWorkspace::new("all-pdfs");
        workspace.write("comprobante_transferencia.pdf");
        workspace.write("foto.png");
        workspace.write("manual_transferencia.pdf");
        workspace.write("otro.pdf");

        let result = preview(&workspace.config()).unwrap();

        assert_eq!(result.scanned, 4);
        assert_eq!(result.detected, 3);
        assert_eq!(result.moved, 0);
    }

    #[test]
    fn zero_max_age_matches_all_pdfs() {
        let workspace = TestWorkspace::new("zero-max-age");
        workspace.write("random-bank-name.pdf");
        workspace.write("random-bank-name.txt");
        let mut config = workspace.config();
        config.max_age_hours = 0;

        let result = preview(&config).unwrap();

        assert_eq!(result.detected, 1);
        assert_eq!(result.files[0].matched_pattern, "PDF");
    }

    #[test]
    fn preview_does_not_scan_subfolders() {
        let workspace = TestWorkspace::new("subfolders");
        fs::create_dir_all(workspace.root.join("nested")).unwrap();
        workspace.write_at("nested/comprobante_transferencia.pdf");

        let result = preview(&workspace.config()).unwrap();

        assert_eq!(result.scanned, 0);
        assert_eq!(result.detected, 0);
    }

    #[test]
    fn no_spaces_filter_skips_pdf_names_with_spaces() {
        let workspace = TestWorkspace::new("no-spaces");
        workspace.write("random-bank-name.pdf");
        workspace.write("comprobante con espacios.pdf");
        let mut config = workspace.config();
        config.require_no_spaces = true;

        let result = preview(&config).unwrap();

        assert_eq!(result.detected, 1);
        assert_eq!(result.files[0].name, "random-bank-name.pdf");
    }

    #[test]
    fn ignored_paths_are_not_moved() {
        let workspace = TestWorkspace::new("ignored");
        workspace.write("mantener.pdf");
        workspace.write("mover.pdf");
        let mut config = workspace.config();
        config.ignored_paths = vec![path_to_string(&workspace.root.join("mantener.pdf"))];

        let preview = preview(&config).unwrap();
        assert_eq!(preview.detected, 1);
        assert_eq!(preview.files[0].name, "mover.pdf");
        assert_eq!(preview.ignored_files.len(), 1);
        assert_eq!(preview.ignored_files[0].name, "mantener.pdf");

        let result = run_quarantine(&config).unwrap();
        assert_eq!(result.moved, 1);
        assert!(workspace.root.join("mantener.pdf").exists());
        assert!(workspace.quarantine.join("mover.pdf").exists());
    }

    #[test]
    fn run_moves_matches_to_quarantine() {
        let workspace = TestWorkspace::new("run-move");
        workspace.write("comprobante_transferencia.pdf");
        workspace.write("otro.pdf");
        let config = workspace.config();

        let result = run_quarantine(&config).unwrap();

        assert_eq!(result.detected, 2);
        assert_eq!(result.moved, 2);
        assert!(!workspace
            .root
            .join("comprobante_transferencia.pdf")
            .exists());
        assert!(workspace
            .quarantine
            .join("comprobante_transferencia.pdf")
            .exists());
        assert!(workspace.quarantine.join("otro.pdf").exists());
    }

    #[test]
    fn run_does_not_overwrite_duplicate_names() {
        let workspace = TestWorkspace::new("duplicate");
        workspace.write("comprobante_transferencia.pdf");
        fs::create_dir_all(&workspace.quarantine).unwrap();
        workspace.write_at("_MacaHelper_Depurador/comprobante_transferencia.pdf");
        let config = workspace.config();

        let result = run_quarantine(&config).unwrap();
        let moved_files = fs::read_dir(&workspace.quarantine)
            .unwrap()
            .filter_map(Result::ok)
            .filter(|entry| entry.path().is_file())
            .count();

        assert_eq!(result.moved, 1);
        assert_eq!(moved_files, 2);
    }

    struct TestWorkspace {
        root: PathBuf,
        quarantine: PathBuf,
    }

    impl TestWorkspace {
        fn new(name: &str) -> Self {
            let stamp = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_nanos();
            let root = env::temp_dir().join(format!("maca-depurador-{name}-{stamp}"));
            let quarantine = root.join("_MacaHelper_Depurador");
            fs::create_dir_all(&root).unwrap();

            Self { root, quarantine }
        }

        fn write(&self, relative: &str) {
            self.write_at(relative);
        }

        fn write_at(&self, relative: &str) {
            let path = self.root.join(relative);

            if let Some(parent) = path.parent() {
                fs::create_dir_all(parent).unwrap();
            }

            let mut file = File::create(path).unwrap();
            file.write_all(b"test").unwrap();
        }

        fn config(&self) -> DepuradorConfig {
            DepuradorConfig {
                folder: path_to_string(&self.root),
                quarantine_folder: path_to_string(&self.quarantine),
                max_age_hours: 0,
                require_no_spaces: false,
                ignored_paths: Vec::new(),
                schedule_enabled: false,
                schedule_time: default_schedule_time(),
            }
            .normalized()
        }
    }

    impl Drop for TestWorkspace {
        fn drop(&mut self) {
            let _ = fs::remove_dir_all(&self.root);
        }
    }
}
