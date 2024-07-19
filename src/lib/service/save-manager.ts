import { join } from '@tauri-apps/api/path';
import { writeTextFile, remove, BaseDirectory } from "@tauri-apps/plugin-fs";
import { saveStatus } from '../../store';


/*
  Desired functionality:
  1. save to file every x ms of typing. On input:
    a. start loop if not already started
    b. save after x ms
    c. retrigger loop until no more input

  2. Future functionality:
    a. have event loop that tells editor if all changes are saved
    b. increase / decrease time between saves based on how fast saves occur
*/


export class SaveManager {
  quill: any;
  minTimeBetweenSavesMs: number;

  private _hasUnsavedInput;
  private _delayTimeoutId;

  filename: string;
  private _filepath;

  isDeleted: boolean;

  constructor(quill, filename) {
    this.quill = quill;
    this.minTimeBetweenSavesMs = 1000;

    this._hasUnsavedInput = false;
    this._delayTimeoutId = null;

    this.filename = filename;
    this._filepath = null;

    this.isDeleted = false;
  }


  async _save() {
    try {
      if (this.isDeleted) {
        console.error(`_save(): ${this.filename} is deleted`)
        return
      }
      this._hasUnsavedInput = false;

      if (!this._filepath) {
        this._filepath = await join('notes', this.filename);
      }
      // const content = [...this.editorEl.childNodes].map(node => node.outerHTML).join('\n');
      let content = this.quill.getContents()
      content = JSON.stringify(content)
      await writeTextFile(this._filepath, content, { baseDir: BaseDirectory.AppData });
      console.log('saved', this.filename)
      saveStatus.set({
        filename: this.filename,
        deleted: false,
        modifiedTime: Date.now(),
      })
    } catch(err) {
      console.error('save error:', err, this.filename)
    }
  }

  _triggerSaveTimeout() {
    if (!this._delayTimeoutId) {
      this._delayTimeoutId = setTimeout(async () => {
        this._delayTimeoutId = null;
        // loop until no unsaved input
        if (this._hasUnsavedInput) {
          await this._save();
          this._triggerSaveTimeout();
        }
      }, this.minTimeBetweenSavesMs);
    }
  }

  saveNow() {
    if (this.isDeleted) {
      console.warn(`saveNow(): ${this.filename} is deleted`)
      return
    }
    if (this._delayTimeoutId) {
      clearTimeout(this._delayTimeoutId)
      this._delayTimeoutId = null
    }
    this._save()
  }

  saveIfHasChanges() {
    if (this._hasUnsavedInput) {
      this.saveNow()
    }
  }

  saveAfterDelay() {
    if (this.isDeleted) {
      console.warn(`saveAfterDelay(): ${this.filename} is deleted`)
      return
    }
    this._hasUnsavedInput = true;
    if (!this._delayTimeoutId) {
      this._triggerSaveTimeout() 
    }
  }

  async delete() {
    if (this.isDeleted) {
      console.warn(`delete(): ${this.filename} is already deleted`)
      return
    }
    this.isDeleted = true;

    this._hasUnsavedInput = false;
    if (this._delayTimeoutId) {
      clearTimeout(this._delayTimeoutId)
      this._delayTimeoutId = null
    }
    if (!this._filepath) {
      this._filepath = await join('notes', this.filename);
    }
    try {
      await remove(this._filepath, { baseDir: BaseDirectory.AppConfig });
    } catch(err) {
      console.log('failed to delete note:', err)
    }
  }
}


export async function createNewNote() {
  const now = Date.now();
  const filename = `${now}.json`
  const path = await join('notes', filename);
  await writeTextFile(path, '', { baseDir: BaseDirectory.AppData });
  // try {
  //   await writeTextFile(path, '', { dir: BaseDirectory.AppData });
  // } catch(err) {
  //   console.error('createNew error:', err)
  //   return null
  // }
  
  return {
    first_lines: '',
    filename: filename,
    modified: now,
    note_meta: {}
  }
}