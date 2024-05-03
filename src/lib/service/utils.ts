import { readTextFile } from "@tauri-apps/plugin-fs";
import { BaseDirectory, join } from "@tauri-apps/api/path";

export async function readFile(filename) {
  const path = await join("notes", filename);
	const content = await readTextFile(path, { baseDir: BaseDirectory.AppData });
  return content;
}

export function isPrintableChar(e) {
  // Seems to work
  // TODO: research precomposed characters
  return e.key.length == 1 && !e.ctrlKey && !e.metaKey;

  // let keycode = e.keyCode;

  // let valid = 
  //     (keycode > 47 && keycode < 58)   || // number keys
  //     keycode == 32 || keycode == 13   || // spacebar & return key(s) (if you want to allow carriage returns)
  //     (keycode > 64 && keycode < 91)   || // letter keys
  //     (keycode > 95 && keycode < 112)  || // numpad keys
  //     (keycode > 185 && keycode < 193) || // ;=,-./` (in order)
  //     (keycode > 218 && keycode < 223);   // [\]' (in order)

  // return valid;
}

export function indexOfNode(node) {
  let i = 0;
  while (node = node.previousSibling) {
    // if (node.nodeType != 3 || !/^\s*$/.test(node.data))
    i++;
  }
  return i;
}

export function hasCharactersSelected() {
  // @ts-ignore
  return !document.getSelection().isCollapsed;
}

export function isNewLine(node) {
  return node.localName == "br" || (node.nodeType == 3 && node.nodeValue == '\n')
}

export function calculateAdditionalLineOffset(searchEl) {
  if (searchEl.localName == 'li') {
    return 0;
  }
  const parentEl = _getLineEl(searchEl)
  if (!parentEl) {
    return 0
  }
  if (parentEl.localName == 'pre') {
    return _calculateAdditionalLineOffsetInPre(parentEl, searchEl)
  }
  let offset = 0
  for (let child of parentEl.childNodes) {
    if (child == searchEl || child.contains(searchEl)) break
    if (child.nodeType == 3) { // #text node
      offset += child.length
    } else {
      offset += child.innerText.length
    }
  }
  return offset
}

function _getLineEl(searchEl) {
  const invalidTags = ['b', 'strong', 'bold']
  let el = searchEl
  while (el.parentElement) {
    el = el.parentElement;
    if (el.nodeType == 1 && !invalidTags.includes(el.localName)) {
      return el
    }
  }
}

function _calculateAdditionalLineOffsetInPre(el, searchEl) {
  let offset = 0
  for (let child of el.childNodes) {
    if (isNewLine(child)) {
      // Return 1 if the newline el is the one we are looking for
      //   1 corresponds to the first br in div or something?
      // TODO: not sure what to return here, 0 seems okay for now
      if (child == searchEl) return 0
      // Start of line: reset offset
      offset = 0
      continue
    }
    // Add text to offset until element found
    if (child == searchEl) break
    if (child.nodeType == 3) { // #text node
      offset += child.length
    } else {
      offset += child.innerText.length
    }
  }
  return offset
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