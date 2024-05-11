import Quill from "quill";
import Toolbar from "quill/modules/toolbar"

import { SaveManager, createNewNote } from "./save-manager";
import { isWhitespace, readFile } from "./utils";

import Searcher from "./search-highlight/Searcher";

import Syntax from "./syntax-highlight/syntax";

import { languages } from "./constants";

const ColorStyle = Quill.import("attributors/style/color");
const BackgroundStyle = Quill.import("attributors/style/background");
ColorStyle.whitelist = []; // remove pasted colors
BackgroundStyle.whitelist = []; // remove pasted bg colors
Quill.register(ColorStyle);
Quill.register(BackgroundStyle);

Quill.register("modules/Searcher", Searcher);

Quill.register({ "modules/syntax": Syntax }, true);


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
				this.searcher.cursorIndex = range.index
			}
		});
		this.onModified = onModified

		// Hack to register easily quill format buttons without replacing the html inside them
		setTimeout(() => {
			const toolbar = this.quill.getModule('toolbar')
			const toolbarEl = document.getElementById('toolbar') as HTMLElement
			toolbarEl.querySelectorAll('button').forEach(input => {
				// Take any element that has data-ql-format, apply that value as a class and attach to toolbar
				// For some reason this registers the element without replacing the html inside of it
				if (input['dataset'] && input['dataset']['qlFormat']) {
					input.classList.add(input['dataset']['qlFormat'])
					toolbar.attach(input)
				}
			});
		}, 0)
    }


	attachToToolbar(elements: HTMLElement[]) {
		const toolbar = this.quill.getModule('toolbar');
		for (let el of elements) {
			toolbar.attach(el)
		}
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
		// console.log(delta, source)
		// console.log(delta, oldDelta, source)
		// TODO: maybe do change only if source == user or source == api and last index has inserts
		if (this.saveManager) {
			this.saveManager.saveAfterDelay()
			if (this.onModified) {
				this.onModified(this.saveManager.filename, delta, oldDelta, source)
				// this.quill.getContents()
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
		const content = await readFile(filename);
		
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


	static getLinesFromDeltas(obj, lineLimit=2, charLimit=100) {
		/* get first {lineLimit} not empty lines */
		if (!obj.ops) return []
		const deltas = obj.ops
		const lines: string[] = []
		let currentLine = ""
		let count = 0
		for (let d of deltas) {
			for (let char of d.insert) {
				count += 1;
				if (char == '\n') {
					// found new line
					count = 0
					if (currentLine) {
						lines.push(currentLine)
						if (lines.length >= lineLimit) {
							return lines
						}
						currentLine = ""
					}
				} 
				else if (count < charLimit){
					currentLine += char
				}
				else if (count == charLimit) {
					// reached charLimit
					lines.push(currentLine + "...")
					if (lines.length >= lineLimit) {
						return lines
					}
					currentLine = ""
				} 
			}
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


