import Quill from "quill";
// import Toolbar from "quill/modules/toolbar"

import { SaveManager, createNewNote } from "./save-manager";
import { isWhitespace, readFile } from "./utils";

import Searcher from "./search-highlight/Searcher";
import Syntax from "./syntax-highlight/syntax";
import CustomLinkBlot from "./custom-link-format/custom-link";
import CustomSnowTheme from "./custom-theme/custom-theme";

import { languages } from "./constants";

// @ts-ignore
Quill.register('themes/custom-theme', CustomSnowTheme, true)

const ColorStyle: any = Quill.import("attributors/style/color");
const BackgroundStyle: any = Quill.import("attributors/style/background");
// @ts-ignore
ColorStyle.whitelist = []; // remove pasted colors
// @ts-ignore
BackgroundStyle.whitelist = []; // remove pasted bg colors

Quill.register({ "modules/Searcher": Searcher });
Quill.register({ 
	"modules/syntax": Syntax,
	"formats/link": CustomLinkBlot,
	"attributors/style/color": ColorStyle,
	"attributors/style/background": BackgroundStyle
}, true);


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
	private _timeOpened: number = 0;
	// private _clean: Function;

  constructor(editorEl, onModified: Function|null) {
		this.editorEl = editorEl
	  this.quill = new Quill(editorEl, {
			modules: {
				syntax: {
					languages: languages
				},
				history: {
					delay: 800,
					maxStack: 100,
					userOnly: false
				},
				toolbar: '#toolbar',
			},
			bounds: editorEl,
			placeholder: "Type something...",
			theme: "custom-theme" // "snow", // or 'bubble'
			// ...options
    });
		this.searcher = new Searcher(this.quill, editorEl)
		
		// Note: use this for for external format remove functionality if needed
		// if (Toolbar.DEFAULTS.handlers) {
		// 	this._clean = Toolbar.DEFAULTS.handlers.clean.bind(this)
		// } else {
		// 	this._clean = function() {}
		// 	console.error('Could not bind quill clean function')
		// }

    this.quill.on("text-change", this._quillOnChange.bind(this))
		this.onModified = onModified

		// Hack to easily register quill format buttons without replacing the html inside them
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
			}
		}
	}


	async openNew(saveOnExit=true) {
		console.log('opening new')
		if (this.saveManager && this.saveManager.filename && Date.now() - this._timeOpened < 50) {
			console.log('open new debounce')
			return {
				exitResult: null,
				newNote: null,
			};
		}
		this._timeOpened = Date.now()
		let exitResult = await this.exit(saveOnExit)
		const note = await createNewNote()
		this.quill.setContents([], 'silent')
		this.quill.history.clear()
		this.saveManager = new SaveManager(this.quill, note.filename)
		this.searcher.lastCursorIndex = null
		console.log('opened new')
		return {
			exitResult,
			newNote: note,
		};
	}


	async open(filename, saveOnExit=true) {
		console.log('opening', filename)
		if (this.saveManager && this.saveManager.filename == filename) {
			console.log('already opened recently; doing nothing')
			if (this.saveManager.isDeleted) {
				console.error('Active file was somehow deleted; reopening')
				this.saveManager = new SaveManager(this.quill, filename)
			}
			return null
		}
		this._timeOpened = Date.now();
		const exitResult = await this.exit(saveOnExit)
		await this._setContentsFromFile(filename)
		this.quill.history.clear()
		this.saveManager = new SaveManager(this.quill, filename)
		this.searcher.lastCursorIndex = null
		console.log('opened', filename)
		return exitResult
	}


	async exit(saveOnExit=true): Promise<ExitResult> {
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
			if (saveOnExit) {
				await this.saveManager.saveIfHasChanges();
			}
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


	private async _setContentsFromFile(filename) {
		const content = await readFile(filename);
		if (!content) {
			console.log('setting from empty content')
			this.quill.setContents([], 'silent')
		} else {
			console.log('setting from content')
			const delta = JSON.parse(content)
			this.quill.setContents(delta, 'silent')
		}
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
					// very tiny optimization: use Array.join instead of +=
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


	undo() {
		return this.quill.history.undo()
	}

	redo() {
		return this.quill.history.redo()
	}

	// External remove formatting func
	// removeFormatting() {
	// 	this._clean()
	// }
}


