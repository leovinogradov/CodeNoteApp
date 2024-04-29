import Quill from "quill";
import Toolbar from "quill/modules/toolbar"
// import Parchment from "parchment";
// import { onMount, tick, createEventDispatcher, onDestroy } from "svelte";

import { readTextFile } from "@tauri-apps/plugin-fs";
import { BaseDirectory, join } from "@tauri-apps/api/path";

import { SaveManager, createNewNote } from "./save-manager";
import { isWhitespace } from "./utils";

import { SearchedStringBlot, SearchedStringBlot2 } from './search-highlight/SearchBlot'
import Searcher from "./search-highlight/Searcher";

// import CodeSyntax from "./syntax-highlight/code-syntax";
import Syntax from "./syntax-highlight/syntax";

import { languages } from "./constants";

const ColorStyle = Quill.import("attributors/style/color");
const BackgroundStyle = Quill.import("attributors/style/background");
// @ts-ignore
ColorStyle.whitelist = []; // remove pasted colors
// @ts-ignore
BackgroundStyle.whitelist = []; // remove pasted bg colors
// @ts-ignore
Quill.register(ColorStyle);
// @ts-ignore
Quill.register(BackgroundStyle);

// @ts-ignore
Quill.register("modules/Searcher", Searcher);
// @ts-ignore
Quill.register(SearchedStringBlot);
// @ts-ignore
Quill.register(SearchedStringBlot2);

Quill.register({ "modules/syntax": Syntax }, true)


export interface ExitResult {
	deleted: boolean,
	filename: string
}

	
export class Editor {
	// @ts-ignore
    saveManager: SaveManager;
	quill;
	searcher;
	editorEl;

	onModified: Function|null;
	private _clean: Function

    constructor(editorEl, onModified: Function|null) {
		this.editorEl = editorEl
	    this.quill = new Quill(editorEl, {
            modules: {
                syntax: {
					languages: languages
				},
                toolbar: '#toolbar',
				// keyboard: {
				// 	bindings: kbBindings
				// }
            },
            placeholder: "Type something...",
            theme: "snow", // or 'bubble'
            // ...options
        });
		this.searcher = new Searcher(this.quill, editorEl)
		
		// Note: used for external format remove functionality; might not be needed
		if (Toolbar.DEFAULTS.handlers) {
			this._clean = Toolbar.DEFAULTS.handlers.clean.bind(this)
		} else {
			this._clean = function() {}
			console.error('Could not bing quill clean function')
		}
		
		// if (initialFilename) {
		// 	this._setContentsFromFile(initialFilename)
		// 	this.saveManager = new SaveManager(this.quill, initialFilename)
		// } else {
		// 	this.openNew()
		// }

        this.quill.on("text-change", this._quillOnChange.bind(this))
		this.quill.on('selection-change', (range, _oldRange, _source) => {
			if (range) {
				console.log('selection change', range)
				this.searcher.cursorIndex = range.index
			}
		  });
		this.onModified = onModified
    }

	// private _getLanguages() {
	// 	try {
	// 		// @ts-ignore
	// 		let languages = window.hljs.listLanguages()
	// 		return languages.map(x => {
	// 			return { 'key': x, 'label': x}
	// 		})
	// 	} catch(err) {
	// 		console.error(err)
	// 	}
	// 	return []
	// }

	private _quillOnChange(delta, oldDelta, source) {
		// TODO
		// dispatchModified()
		// console.log(delta, oldDelta, source)
		if (this.saveManager) {
			this.saveManager.saveAfterDelay()
			if (this.onModified) {
				this.onModified(this.saveManager.filename, this.quill.getContents())
			}
		}
	}

	async openNew() {
		console.log('opening new')
		let exitResult = await this.exit();
		const note = await createNewNote();

		this.quill.setContents([], 'silent')
		this.saveManager = new SaveManager(this.quill, note.filename);
		this.searcher.lastCursorIndex = null
		console.log('opened new')
		return {
			exitResult,
			newNote: note,
		};
	}

	private async _setContentsFromFile(filename) {
		const path = await join("notes", filename);
		let content = await readTextFile(path, { baseDir: BaseDirectory.AppData });
		// console.log('setting from content:', content)
		
		if (!content) {
			console.log('setting from empty content')
			this.quill.setContents('', 'silent')
		} else {
			console.log('setting from content')
			const delta = JSON.parse(content)
			this.quill.setContents(delta, 'silent')
		}
	}

	async open(filename) {
		console.log('opening', filename)
		// if (this.saveManager.filename == filename) {
		// 	console.log('already opened; doing nothing')
		// 	return null
		// }
		const exitResult = await this.exit();

		await this._setContentsFromFile(filename)
		this.saveManager = new SaveManager(this.quill, filename)
		this.searcher.lastCursorIndex = null

		// if (this.onModified) {
		// 	this.onModified(this.saveManager.filename, this.quill.getContents())
		// }

		console.log('opened', filename)
		return exitResult;
	}

	async exit(): Promise<ExitResult> {
		let ret = {
			deleted: false,
			filename: '',
		};
		if (!this.saveManager || this.saveManager.isDeleted) {
			return ret
		}
		ret.filename = this.saveManager.filename
		const innerText = this.quill.getText()
		if (!innerText || isWhitespace(innerText)) {
			// delete
			console.log('deleting on exit due to no content');
			await this.saveManager.delete();
			ret.deleted = true
			
		} else {
            // save and exit
			await this.saveManager.saveIfHasChanges();
			ret.deleted = false
		}
		return ret;
	}

	getFilename() {
		if (!this.saveManager) return null;
		return this.saveManager.filename;
	}

	deleteNote() {
		if (!this.saveManager) return;
		const filename = this.saveManager.filename;
		this.saveManager.delete();
		return filename;
	}

	setContentFromHtml(html) {
		const delta = this.quill.clipboard.convert(html)
		this.quill.setContents(delta, 'silent')
	}


	static getLinesFromDeltas(obj, limit=2) {
		/* get first {limit} not empty lines */
		if (!obj.ops) return []
		const deltas = obj.ops
		const lines: string[] = []
		let currentLine = ""
		for (let d of deltas) {
			for (let char of d.insert) {
				if (char == '\n') {
					if (currentLine) {
						lines.push(currentLine)
						currentLine = ""
						if (lines.length >= limit) {
							return lines
						}
					}
				} else {
					currentLine += char
				}
			}
			// if (d.insert != '\n') {
			// 	currentLine += d.insert
			// }
			// if (d.insert == '\n' || d.insert.endsWith('\n')) {
			// 	if (currentLine) {
			// 		lines.push(currentLine)
			// 		currentLine = ""
			// 		if (lines.length >= limit) break
			// 	}
			// }
		}
		return lines
	}

	removeFormatting() {
		this._clean()

		// Slightly modified quill/modules/toolbar.js clean function
		// let range = this.quill.getSelection();
		// if (range == null) return;
		// if (range.length == 0) {
		// 	let formats = this.quill.getFormat();
		// 	Object.keys(formats).forEach((name) => {
		// 		// Clean functionality in existing apps only clean inline formats
		// 		// if (Parchment.query(name, Parchment.Scope.INLINE) != null) {
		// 		this.quill.format(name, false);
		// 		// }
		// 	});
		// } else {
		// 	this.quill.removeFormat(range, 'user');
		// }
		
		
		/*   Definition of quill.format:
		let range = this.getSelection(true);
		let change = new Delta();
		if (range == null) {
			return change;
		} else if (Parchment.query(name, Parchment.Scope.BLOCK)) {
			change = this.editor.formatLine(range.index, range.length, { [name]: value });
		} else if (range.length === 0) {
			this.selection.format(name, value);
			return change;
		} else {
			change = this.editor.formatText(range.index, range.length, { [name]: value });
		}
		this.setSelection(range, Emitter.sources.SILENT);
		return change;
		*/
	}
}


