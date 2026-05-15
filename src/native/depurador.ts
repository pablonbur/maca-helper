import { invoke, isTauri } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";

export interface DepuradorConfig {
  folder: string;
  quarantine_folder: string;
  max_age_hours: number;
  require_no_spaces: boolean;
  ignored_paths: string[];
  schedule_enabled: boolean;
  schedule_time: string;
}

export interface DepuradorFile {
  name: string;
  path: string;
  size_kb: number;
  created_at_ms: number;
  modified_at_ms: number;
  matched_pattern: string;
}

export interface DepuradorFileError {
  path: string;
  message: string;
}

export interface DepuradorResult {
  scanned: number;
  detected: number;
  moved: number;
  files: DepuradorFile[];
  ignored_files: DepuradorFile[];
  errors: DepuradorFileError[];
}

export interface DepuradorScheduleStatus {
  enabled: boolean;
  registered: boolean;
  task_name: string;
  schedule_time: string;
}

export interface DepuradorPurgeResult {
  recycled: number;
  errors: DepuradorFileError[];
}

export function isDepuradorAvailable(): boolean {
  return isTauri();
}

export async function getDepuradorConfig(): Promise<DepuradorConfig> {
  return invokeDepurador("get_depurador_config");
}

export async function saveDepuradorConfig(config: DepuradorConfig): Promise<DepuradorConfig> {
  return invokeDepurador("save_depurador_config", { config });
}

export async function previewDepuradorComprobantes(config: DepuradorConfig): Promise<DepuradorResult> {
  return invokeDepurador("preview_depurador_comprobantes", { config });
}

export async function runDepuradorComprobantes(config: DepuradorConfig): Promise<DepuradorResult> {
  return invokeDepurador("run_depurador_comprobantes", { config });
}

export async function openDepuradorQuarantineFolder(): Promise<void> {
  return invokeDepurador("open_depurador_quarantine_folder");
}

export async function recycleDepuradorQuarantine(): Promise<DepuradorPurgeResult> {
  return invokeDepurador("recycle_depurador_quarantine");
}

export async function setDepuradorSchedule(
  enabled: boolean,
  schedule_time: string,
): Promise<DepuradorScheduleStatus> {
  return invokeDepurador("set_depurador_schedule", { enabled, scheduleTime: schedule_time });
}

export async function getDepuradorScheduleStatus(): Promise<DepuradorScheduleStatus> {
  return invokeDepurador("get_depurador_schedule_status");
}

export async function selectDepuradorFolder(defaultPath?: string): Promise<string | null> {
  if (!isTauri()) {
    throw new Error("El selector de carpeta esta disponible en la app de escritorio.");
  }

  const selected = await open({
    defaultPath,
    directory: true,
    multiple: false,
    title: "Elegir carpeta para depurar PDFs",
  });

  return typeof selected === "string" ? selected : null;
}

async function invokeDepurador<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  if (!isTauri()) {
    throw new Error("El depurador esta disponible en la app de escritorio.");
  }

  return invoke<T>(command, args);
}
