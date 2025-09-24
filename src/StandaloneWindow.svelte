<script lang="ts">
import FormatDropdown from './lib/components/FormatDropdown.svelte';
import Svg from './lib/components/Svg.svelte';
import FindAndReplace from './lib/components/FindAndReplace.svelte';

import { onMount } from 'svelte';
import { event } from '@tauri-apps/api';
// import { getCurrent } from "@tauri-apps/api/window";

import { alternateFunctionKeyStore } from "./store";
import { isInputFocused, debouncify } from './lib/service/utils';
import { Editor } from './lib/service/editor';
import { loadSettings, saveSettings } from './lib/util/app-settings';

// import { WebviewWindow, getCurrentWindow } from '@tauri-apps/api/window';
import { Window } from "@tauri-apps/api/window"

// Add import for interfaces
import type { AppSettings } from './types';


let editor = $state<Editor>() as Editor;

let appSettings = $state<AppSettings>() as AppSettings;
let _alternateFunctionProperty: string = "ctrlKey";
alternateFunctionKeyStore.subscribe(val => {
  _alternateFunctionProperty = val
})

// DOM elements
let editorElement = $state<HTMLElement>()
let mainElement = $state<HTMLElement>()
let searchInNoteElement: any = $state()  // SvelteComponent which you cannot import for some reason?


$effect(() => {
  // Handle appSettings
  if (mainElement && appSettings) {
    // Remove existing classes
    // let classList = mainElement.classList;
    // while (classList.length > 0) {
    //   classList.remove(classList.item(0));
    // }
    for (let c of Array.from(mainElement.classList)) {
      if (c.startsWith('zoom')) mainElement.classList.remove(c)
    }
    // Handle zoom level
    let newClassname = "zoom0"
    if (appSettings.zoom > 0) {
      newClassname = "zoom"+appSettings.zoom
    } else if (appSettings.zoom < 0) {
      newClassname = "zoomNeg"+Math.abs(appSettings.zoom)
    }
    mainElement.classList.add(newClassname)

    // Handle theme
    if (appSettings.theme) {
      // One of 'light', 'dark', 'auto'
      document.documentElement.dataset['theme'] = appSettings.theme
    }
  } 
});

async function initSettings() {
  appSettings = await loadSettings()
  // Theme change detection doesn't work yet:
  // const unlisten = await getCurrent().onThemeChanged(({ payload: theme }) => {
  //   console.log('New theme: ' + theme);
  // });
}

const ONE_DAY = 24 * 60 * 60 * 1000;

function _getModifiedAtStr(modified: number) {
  try {
    const now = new Date()
    const d = new Date(modified)
    if ((now.getTime() - d.getTime()) < ONE_DAY) {
      // less than a day ago
      // get am/pm
      const ampm = d.getHours() >= 12 ? 'pm' : 'am'
      const hours = d.getHours() % 12 || 12  // 0 is actually 12am
      const minutes = d.getMinutes() < 10 ? '0' + d.getMinutes() : d.getMinutes()
      return hours + ':' + minutes + ampm;
      // return d.toLocaleTimeString([], {hour: "numeric", minute: "2-digit" })
    }

    // default, more than one day ago
    let datestring = d.toDateString()
    const year: string = datestring.slice(datestring.length-4)
    // string to number comparison, hell yeah JavaScript
    // @ts-ignore
    if (year == now.getFullYear()) {
      // shortened date string, 'Sun Apr 21'
      return datestring.slice(0, datestring.length-5)
    }
    // full date string, 'Sun Apr 21 2024'
    return datestring
  } catch (err) {
    console.error(err)
  }
  return ''
}


async function onNewNoteClick(saveOnExit=true) {
}

async function onDeleteNoteClick() {
  // TODO: this should delete the current node, close the window, and update the state in the main window
  // const filename = editor.saveManager?.filename
  // if (!filename || isDeleting) return
  // const index = notes.findIndex(x => x.filename == filename)  // should be first note, most of the time
  // if (index < 0) {
  //   console.error(`${filename} not in notes list?`)
  //   return
  // }
  // isDeleting = true
  // try {
  //   await editor.deleteNote()
  // } catch(err) {
  //   console.error(err)
  //   isDeleting = false
  //   return
  // }
  // isDeleting = false
  // notes.splice(index, 1)
  // notes = notes
  // if (notes.length > 0) {
  //   // Other notes exist; open top one
  //   await onNoteClick(notes[0], false)
  // }
  // else {
  //   // All notes have been deleted; open new one
  //   await onNewNoteClick(false)
  // }
}

// function onModified(filename, delta, oldDelta, source) {
//   // Emit notification to main window that node was modified
//   event.emit('event', {
//     type: 'noteModified',
//     filename,
//     editorContent: editor.getContent()
//   });
// }

/** Special onModified handler: 
 * Emit notification to main window that node was modified
 * Can be debounced since we don't need main window to update instantly */
const onModified = debouncify((filename, delta, oldDelta, source) => {
  event.emit('event', {
    type: 'noteModified',
    filename,
    editorContent: editor.getContent()
  })
}, 100);


function onWindowResize(e) {
  // Call on scroll method since resizing can show notes that are not yet visible
  // onNoteListScroll()
}

function onBeforeInput(e) {
  /* Global handler for Ctrl+Z
      This makes sure Ctrl+Z fires even when editor is not in focus (useful for undoing a recent find+replace) */
  if (e.inputType == "historyUndo" && !isInputFocused() && !editor.quill.hasFocus()) {
    e.preventDefault()
    e.stopPropagation()
    editor.undo()
  }
}

function zoomIn() {
  if (appSettings && appSettings.zoom < 2) {
    appSettings.zoom += 1
    console.log('zoomIn', appSettings.zoom)
    appSettings = appSettings
    saveSettings(appSettings)
  }
}

function zoomOut() {
  if (appSettings && appSettings.zoom > -2) {
    appSettings.zoom -= 1
    console.log('zoomOut', appSettings.zoom)
    appSettings = appSettings
    saveSettings(appSettings)
  }
}

function onKeyDown(e) {
  if (e[_alternateFunctionProperty]) {
    if (e.key == "=") {  // '+' key 
      zoomIn()
      e.preventDefault()
    } 
    else if (e.key == "-") {  // '-' key
      zoomOut()
      e.preventDefault()
    }
  }
}

onMount(() => {
  console.log('App onMount')
  init()

  // Listen for events from Main window
  event.listen('mainWindowEvent', (e) => {
    const payload: any = e.payload;
    if (!payload || typeof payload !== 'object') return;
    // Only handle events from Main window (not self)
    // You may want to check window label if needed
    if (payload.type === 'noteModified' && payload.filename === editor.getFilename()) {
      // If the note in this window was modified in Main, update contents
      editor.setContents(payload.editorContent);
    } else if (payload.type === 'noteDeleted' && payload.filename === editor.getFilename()) {
      // If the note in this window was deleted in Main, close this window
      Window.getCurrent().destroy();
    }
    // Add more event types as needed
  });
})

// Calling this here instead of in onMount saves like 20ms?

async function init() {
  const w = Window.getCurrent();
  if (w.label == "main") {
    console.error('Should not be using StandaloneWindow component in main window!')
  } else {
    initSettings()
    editor = new Editor(editorElement, onModified)
    // Get filename from query params
    const urlParams = new URLSearchParams(window.location.search)
    const currentFilename = urlParams.get('filename');
    console.log('StandaloneWindow init, filename:', currentFilename)
    if (!currentFilename) {
      console.error('No filename provided in query params!')
      return
    }
    await editor.open(currentFilename, true)
  }
}
  
</script>


<!-- <svelte:window on:beforeinput={onBeforeInput} on:resize={onWindowResize} on:keydown={onKeyDown} /> -->

<main bind:this={mainElement}>

  <div class="header" style="padding: 6px 10px 8px 12px; margin: 2px 2px 0 0;">
    <!-- new note button would be here -->

    <div class="center-items">
      <div id="toolbar">
        <span class="ql-formats">
          <FormatDropdown editor={editor}></FormatDropdown>
        </span>
        <span class="ql-formats">
          <button data-ql-format="ql-code-block" class="custom-icon-btn toolbar-button">
            <Svg src="/img/Code-block.svg" height="20px"></Svg>
          </button>
          <button class="ql-list toolbar-button" value="ordered" aria-label="ordered list"></button>
          <button class="ql-list toolbar-button" value="bullet" aria-label="bullet list"></button>
          <button class="ql-clean toolbar-button" aria-label="clear format"></button>
        </span>
      </div>
    </div>

    <!-- delete note would be here -->
  </div>

  <div class="text-editor-outer">
    <div id="text-editor" bind:this={editorElement} spellcheck="false">
    </div>
  </div>

  <!-- fixed elements -->
  <FindAndReplace bind:this={searchInNoteElement} editor={editor} />
</main>