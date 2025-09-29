import { join } from '@tauri-apps/api/path';
import { writeTextFile, remove, rename, copyFile, BaseDirectory } from "@tauri-apps/plugin-fs";
import { saveStatus } from '../../store';
import type { Note } from '../../types';

/**
  Desired functionality:
  1. save to file every x ms of typing. On input:
    a. start loop if not already started
    b. save after x ms
    c. retrigger loop until no more input

  2. Future functionality:
    a. have event loop that tells editor if all changes are saved
    b. increase / decrease time between saves based on how fast saves occur
*/
export class FileManager {
  quill: any;
  minTimeBetweenSavesMs: number;
  filename: string;
  isDeleted: boolean;
  isInRecentlyDeleted: boolean;

  private hasUnsavedInput;
  private delayTimeoutId;

  private filepath;
  

  constructor(quill, filename, isDeletedFile=false) {
    this.quill = quill;
    this.minTimeBetweenSavesMs = 1000;

    this.hasUnsavedInput = false;
    this.delayTimeoutId = null;

    this.filename = filename;
    this.filepath = null;

    this.isDeleted = false;
    this.isInRecentlyDeleted = isDeletedFile; // File that is in recently deleted
  }


  async _save() {
    try {
      if (this.isDeleted) {
        console.error(`_save(): ${this.filename} is deleted`)
        return
      }
      this.hasUnsavedInput = false;
      if (this.isInRecentlyDeleted) {
        return;
      }

      if (!this.filepath) {
        this.filepath = await join('notes', this.filename);
      }
      // const content = [...this.editorEl.childNodes].map(node => node.outerHTML).join('\n');
      let content = this.quill.getContents()
      content = JSON.stringify(content)
      await writeTextFile(this.filepath, content, { baseDir: BaseDirectory.AppData });
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

  private triggerSaveTimeout() {
    if (!this.delayTimeoutId) {
      this.delayTimeoutId = setTimeout(async () => {
        this.delayTimeoutId = null;
        // loop until no unsaved input
        if (this.hasUnsavedInput) {
          await this._save();
          this.triggerSaveTimeout();
        }
      }, this.minTimeBetweenSavesMs);
    }
  }

  saveNow() {
    if (this.isDeleted) {
      console.warn(`saveNow(): ${this.filename} is deleted`)
      return
    }
    if (this.delayTimeoutId) {
      clearTimeout(this.delayTimeoutId)
      this.delayTimeoutId = null
    }
    this._save()
  }

  saveIfHasChanges() {
    if (this.hasUnsavedInput) {
      this.saveNow()
    }
  }

  saveAfterDelay() {
    if (this.isInRecentlyDeleted) {
      return;
    }
    if (this.isDeleted) {
      console.warn(`saveAfterDelay(): ${this.filename} is deleted`)
      return
    }
    this.hasUnsavedInput = true;
    if (!this.delayTimeoutId) {
      this.triggerSaveTimeout() 
    }
  }

  // If soft, moves file to recently deleted folder.
  // Note: moves the recently 
  async delete(hard: boolean) {
    if (this.isDeleted) {
      console.warn(`delete(): ${this.filename} is already deleted`)
      return
    }
    if (hard || this.isInRecentlyDeleted) {
      console.log('Permanently deleting', this.filename);
    } else {
      console.log('Soft deleting', this.filename);
    }

    // Marking this as deleted so that we don't try to save to it mid-delete
    this.isDeleted = true;

    this.hasUnsavedInput = false;
    if (this.delayTimeoutId) {
      clearTimeout(this.delayTimeoutId)
      this.delayTimeoutId = null
    }

    if (this.isInRecentlyDeleted) {
      await this.recentlyDeletedFileDelete()
    } else {
      await this.normalFileDelete(hard);
    }
  }

  private async normalFileDelete(hard: boolean) {
    if (!this.filepath) {
      this.filepath = await join('notes', this.filename);
    }
    try {
      if (!hard) {
        // Move file to recently-deleted folder under AppData
        const targetPath = await join('recently-deleted', this.filename);
        try {
          // Renaming instead of copying might be more correct, but it's useful
          // That the created date is updated using copy.
          // Interestingly, the modified date is not updated, which is useful for the 
          // notes list.
          await copyFile(this.filepath, targetPath, {
            fromPathBaseDir: BaseDirectory.AppData,
            toPathBaseDir: BaseDirectory.AppData
          });
        } catch(err) {
          console.error("Failed to copy file to recently deleted folder", err);
        }
      }
      // Remove original file
      await remove(this.filepath, { baseDir: BaseDirectory.AppData });
    } catch(err) {
      console.log('failed to move note to recently-deleted:', err)
    }
  }

  private async recentlyDeletedFileDelete() {
    try {
      const targetPath = await join('recently-deleted', this.filename);
      await remove(targetPath, { baseDir: BaseDirectory.AppData });
    } catch(err) {
      console.log('failed to move note to recently-deleted:', err)
    }
  }

  async restoreFile(): Promise<boolean> {
    if (!this.isInRecentlyDeleted) {
      console.error('Cannot restore file: not marked as isInRecentlyDeleted');
      return false;
    }
    const currentPath = await join('recently-deleted', this.filename);
    const targetPath = await join('notes', this.filename);
    try {
      await rename(currentPath, targetPath, {
        oldPathBaseDir: BaseDirectory.AppData,
        newPathBaseDir: BaseDirectory.AppData
      })
    } catch(err) {
      console.log("failed to restore file")
      return false;
    }
    return true;
  }
}

/** Util to create an empty file as part of making a new note */
export async function createNewNote(): Promise<Note> {
  const now = Date.now();
  const filename = `${now}.json`
  const path = await join('notes', filename);
  await writeTextFile(path, '', { baseDir: BaseDirectory.AppData });
  return {
    filename: filename,
    modified: now,
    content: '',
    note_meta: {}
  }
}