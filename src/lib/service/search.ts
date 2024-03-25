import { readTextFile, BaseDirectory } from "@tauri-apps/plugin-fs";
import { join } from '@tauri-apps/api/path';

interface SearchResult {
  lines: string[],
  indexies: number[]
}
export type { SearchResult }



export async function searchNote(filename, searchString): Promise<SearchResult | false> {
  console.log(window['currentSearchString'])
  if (window['currentSearchString'] != searchString) return false // temp way to cancel old promises
  const t0 = performance.now();
  const filepath = await join('notes', filename);
  const content = await readTextFile(filepath, { baseDir: BaseDirectory.AppData });
  const t1 = performance.now();
  console.log('SearchFile t1', searchString, t1 - t0, 'milliseconds');
  const deltas = JSON.parse(content).ops
  const lines = ['', '']
  const indexies = [-1, -1]
  let found = false
  let i = 0
  let currentLine = ""
  for (let d of deltas) {
    for (let char of d.insert) {
      // TODO: match for search text while iterating chars
      if (char == '\n') {
        if (currentLine) {
          let idxFound = currentLine.toLowerCase().indexOf(searchString)
          if (idxFound >= 0) {
            found = true
            lines[i] = currentLine
            indexies[i] = idxFound
            if (i == 0) i++
            else {
              const t2 = performance.now();
              console.log('SearchFile t2.1', searchString, t2 - t0, 'milliseconds', 'found =', found);
              return { lines, indexies }
            }
          } 
          else if (i == 0) {
            lines[i] = currentLine
            indexies[i] = -1
          }
          currentLine = ""
        }
      } else {
        currentLine += char
      }
    }
  }
  const t2 = performance.now();
  console.log('SearchFile t2.2', searchString, t2 - t0, 'milliseconds', 'found =', found);
  if (!found) return false
  return { lines, indexies }
}