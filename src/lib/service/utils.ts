import { readTextFile } from "@tauri-apps/plugin-fs";
import { BaseDirectory, join } from "@tauri-apps/api/path";
import { Editor } from "./editor";

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

/** Get first two lines of editor contents.
 *  Util for note title and subtitle */
export function getFirstTwoLinesFromContents(obj) {
  if (typeof obj == "string") {
    obj = JSON.parse(obj)
  }
  const lines = Editor.getLinesFromDeltas(obj, 2, 60)
  while (lines.length < 2) lines.push("")
  return lines
}


export function debouncify<T extends (...args: any[]) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      fn(...args);
    }, delay);
  };
}