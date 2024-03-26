
import Quill from "quill";
import Toolbar from "quill/modules/toolbar"
// import Parchment from "parchment";
// import hljs from 'highlight.js';
// import { onMount, tick, createEventDispatcher, onDestroy } from "svelte";

import { readTextFile } from "@tauri-apps/plugin-fs";
import { BaseDirectory, join } from "@tauri-apps/api/path";

import { SaveManager, createNewNote } from "./save-manager";
import { isWhitespace, sleep } from "./utils";

import SearchedStringBlot from './quill-find-and-replace/SearchBlot'
import Searcher from "./quill-find-and-replace/Searcher";

Quill.register("modules/Searcher", Searcher);
Quill.register(SearchedStringBlot);


/*
const exampleToolbarOptions = [
    ['bold', 'italic', 'underline', 'strike'],        // toggled buttons
    ['blockquote', 'code-block'],

    [{ 'header': 1 }, { 'header': 2 }],               // custom button values
    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
    [{ 'script': 'sub'}, { 'script': 'super' }],      // superscript/subscript
    [{ 'indent': '-1'}, { 'indent': '+1' }],          // outdent/indent
    [{ 'direction': 'rtl' }],                         // text direction

    [{ 'size': ['small', false, 'large', 'huge'] }],  // custom dropdown
    [{ 'header': [1, 2, 3, 4, 5, 6, false] }],

    [{ 'color': [] }, { 'background': [] }],          // dropdown with defaults from theme
    [{ 'font': [] }],
    [{ 'align': [] }],

    ['clean']                                         // remove formatting button
];
*/

export interface ExitResult {
	deleted: boolean,
	filename: string
}

	
export class Editor {
	// @ts-ignore
    saveManager: SaveManager;
	quill;
	searcher;

	onModified: Function|null;
	private _clean: Function

    constructor(editorEl, initialFilename, onModified: Function|null = null) {
		const bindings = {
			customDebug: {
				key: 'D',
				ctrlKey: true,
				handler: function(range, context) {
					// @ts-ignore
					console.log('debug', this.quill.getContents())
				}
			}
		}

        this.quill = new Quill(editorEl, {
            modules: {
                // syntax: true,
                toolbar: '#toolbar',
				keyboard: {
					bindings: bindings
				}
            },
            placeholder: "Type something...",
            theme: "snow", // or 'bubble'
            // ...options
            // highlight: hljs
        });
		this.searcher = new Searcher(this.quill)
		this._clean = Toolbar.DEFAULTS.handlers.clean.bind(this)
		
		// if (initialFilename) {
		// 	this._setContentsFromFile(initialFilename)
		// 	this.saveManager = new SaveManager(this.quill, initialFilename)
		// } else {
		// 	this.openNew()
		// }

        this.quill.on("text-change", this._quillOnChange.bind(this))
		this.onModified = onModified
    }

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

		// if (this.onModified) {
		// 	this.onModified(this.saveManager.filename, this.quill.getContents())
		// }

		console.log('opened', filename)
		return exitResult;
	}

	async exit(): Promise<ExitResult> {
		let ret = {
			deleted: true,
			filename: '',
		};
		if (!this.saveManager || this.saveManager.isDeleted) {
			return ret
		}
		ret.filename = this.saveManager.filename
		const innerText = this.quill.getText()
		if (!innerText || isWhitespace(innerText)) {
			// delete
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


