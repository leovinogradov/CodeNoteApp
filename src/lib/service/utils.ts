import { readTextFile } from "@tauri-apps/plugin-fs";
import { BaseDirectory, join } from "@tauri-apps/api/path";

export async function readFile(filename) {
  const path = await join("notes", filename);
	const content = await readTextFile(path, { baseDir: BaseDirectory.AppData });
  return content;
}

export function isInputFocused() {
  // check if an input (any input) is focused
  return document.activeElement?.tagName === "INPUT"
}


export function isWhitespace(str) {
  // check if string only contains whitespace
  return /^\s*$/.test(str)
}

export function sleep(delayMs) {
  return new Promise((resolve) => {
    setTimeout(resolve, delayMs)
  })
}