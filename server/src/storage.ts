import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

const root =
  process.env.DATA_DIR ||
  (process.env.NODE_TEST_CONTEXT
    ? mkdtempSync(join(tmpdir(), "ludo-test-"))
    : ".data");
export const dataPath = (...parts: string[]) => join(root, ...parts);
export function readJson<T>(file: string, fallback: T): T {
  try {
    return JSON.parse(readFileSync(file, "utf8")) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT")
      console.error(`Ungültige Datendatei: ${file}`);
    return fallback;
  }
}
// Small local snapshots: synchronous atomic replacement serializes writes and never leaves half a JSON file.
export function writeJson(file: string, value: unknown): void {
  mkdirSync(dirname(file), { recursive: true, mode: 0o700 });
  writeFileSync(`${file}.tmp`, JSON.stringify(value), { mode: 0o600 });
  renameSync(`${file}.tmp`, file);
}
