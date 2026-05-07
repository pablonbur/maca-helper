import seedJson from "../../seed/snippets.example.json";
import type { AppData } from "../domain/types";

export const INITIAL_APP_DATA = seedJson as AppData;

export function cloneInitialData(): AppData {
  return JSON.parse(JSON.stringify(INITIAL_APP_DATA)) as AppData;
}
