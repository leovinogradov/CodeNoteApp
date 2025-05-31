<script lang="ts">
import Splitter from './lib/components/splitter/Splitter.svelte';
import CustomSplitterBar from './lib/components/CustomSplitterBar.svelte';
import FormatDropdown from './lib/components/FormatDropdown.svelte';
import Svg from './lib/components/Svg.svelte';
import Searchbar from './lib/components/Searchbar.svelte';
import SettingsOverlay from './lib/components/SettingsOverlay.svelte';
import FindAndReplace from './lib/components/FindAndReplace.svelte';
import { Square, XIcon, MinusIcon, RemoveFormatting } from 'lucide-svelte'

import { onMount } from 'svelte';
import { myflip } from './lib/service/my-flip/my-flip';
import { exists, mkdir, BaseDirectory } from "@tauri-apps/plugin-fs";
import { invoke } from "@tauri-apps/api/core";
import { event } from '@tauri-apps/api';
// import { getCurrent } from "@tauri-apps/api/window";

import { alternateFunctionKeyStore } from "./store";
import { isWhitespace, isInputFocused, readFile } from './lib/service/utils';
import { searchNote, type SearchResult } from './lib/service/search';
import { Editor } from './lib/service/editor';
import { createNewNote, SaveManager } from './lib/service/save-manager';
import { runInitialSizeFix } from './lib/util/initial-size-fix';
import { loadSettings, saveSettings, loadPlatformIntoStore, type AppSettings } from './lib/util/app-settings';

// import { WebviewWindow, getCurrentWindow } from '@tauri-apps/api/window';
import { Window } from "@tauri-apps/api/window"


const ONE_DAY = 24 * 60 * 60 * 1000;

let isMainWindow = $state(true);

// let _loadedNotesData = null;
let _notesLoaded = false;
let _loadNotesCalled = false;

let editor = $state<Editor>() as Editor;
let currentFilename: string = $state('')
let currentPlatform: string = $state('')

// let openNoteIndex: number = 0;
let searchString: string = $state('')
let lastSearchString: string = $state('') // string for which results are shown
let _searchTimeoutId;  // for timeout between searchString changed and actual search
// let formatvalue = -1;  // representation of current format selected
let showFilenames = $state(false)  // TODO: add setting to toggle this 
let appSettings = $state<AppSettings>() as AppSettings;
let isDeleting = $state(false)
let _alternateFunctionProperty: string = "ctrlKey";
alternateFunctionKeyStore.subscribe(val => {
  _alternateFunctionProperty = val
})

// DOM elements
let editorElement = $state<HTMLElement>()
let notesListElement = $state<HTMLElement>()
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

function _getFirst2LinesFromContent(obj) {
  if (typeof obj == "string") {
    obj = JSON.parse(obj)
  }
  const lines = Editor.getLinesFromDeltas(obj, 2, 60)
  while (lines.length < 2) lines.push("")
  return lines
}

function _searchResultAsTokensV1(str, idx, strLength) {
  if (idx == -1) {
    return [{ highlight: false, text: str }]
  }
  return [
    { highlight: false, text: str.substring(0, idx) },
    { highlight: true, text: str.substring(idx, idx + strLength) },
    { highlight: false, text: str.substring(idx + strLength) },
  ]
}

function _searchResultAsTokensV2(line: string, searchStrLowercase: string, searchStrInLine: boolean = true) {
  if (!searchStrInLine) {
    return [{ highlight: false, text: line }] 
  }
  let idx = line.toLowerCase().indexOf(searchStrLowercase)
  if (idx == -1) {
    return [{ highlight: false, text: line }]
  }
  return [
    { highlight: false, text: line.substring(0, idx) },
    { highlight: true, text: line.substring(idx, idx + searchStrLowercase.length) },
    { highlight: false, text: line.substring(idx + searchStrLowercase.length) },
  ]
}

function _getNoteMeta(note) {
  let title = ''
  let subtitle = ''
  let modifiedTime = _getModifiedAtStr(note.modified)
  if (note.content) {
    [title, subtitle] = _getFirst2LinesFromContent(note.content)
    if (isWhitespace(title)) {
      title = "Untitled"
    }
  } 
  else {
    title = "Loading..."
  }
  return { title, subtitle, modifiedTime }
}

async function onNoteClick(note: Note, saveOnExit=true) {
  const exitResult = await editor.open(note.filename, saveOnExit)
  if (!exitResult) return;

  currentFilename = editor.getFilename() // Update state

  console.log('onNoteClick(): exitResult:', exitResult)

  if (exitResult && exitResult.deleted && exitResult.filename) {
    notes = notes.filter((note) => note.filename != exitResult.filename)
  }

  editorElement.firstElementChild.focus()

  // Close in-note search if it was open, but still search in note if in search mode
  searchInNoteElement.close()
  if (searchString) {
    editor.searcher.search(searchString)
  } else {
    editor.searcher.clear()
  }
}

  async function onNewNoteClick(saveOnExit=true) {
    const { exitResult, newNote } = await editor.openNew(saveOnExit)
    console.log('Opened new note:', exitResult, newNote)
    
    if (exitResult && exitResult.deleted && exitResult.filename) {
      notes = notes.filter((note) => note.filename != exitResult.filename)
    }

    if (!newNote) return;

    currentFilename = editor.getFilename() // Update state
    
    newNote.note_meta = _getNoteMeta(newNote)

    notes.unshift(newNote);  // push to front
    notes = notes;  // trigger change

    // Clear all searching
    searchInNoteElement.close()
    searchString = ""
    editor.searcher.clear()

    try {
      editorElement.firstElementChild.focus()
      editor.quill.format('header', 1)
    } catch(err) {
      console.error('onNewNoteClick(): failed to set first line to title', err)
    }
  }

  async function onDeleteNoteClick() {
    const filename = editor.saveManager?.filename
    if (!filename || isDeleting) return
    const index = notes.findIndex(x => x.filename == filename)  // should be first note, most of the time
    if (index < 0) {
      console.error(`${filename} not in notes list?`)
      return
    }
    isDeleting = true
    try {
      await editor.deleteNote()
    } catch(err) {
      console.error(err)
      isDeleting = false
      return
    }
    isDeleting = false
    notes.splice(index, 1)
    notes = notes
    if (notes.length > 0) {
      // Other notes exist; open top one
      await onNoteClick(notes[0], false)
    }
    else {
      // All notes have been deleted; open new one
      await onNewNoteClick(false)
    }
  }

// let _noteModifiedTimeout = null
function onActiveNoteModified(filename, delta, oldDelta, source) {
  // console.log(delta, oldDelta, source)
}


function handleSettingsAction(e) {
  const name = e.detail?.name
  const value = e.detail?.value
  if (name == "toggleShowFilenames") {
    showFilenames = !showFilenames
  }
  else if (name == 'themeChanged' && value && typeof value == 'string') {
    appSettings.theme = value;
    appSettings = appSettings;
    saveSettings(appSettings)
  }
}


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
})

// Calling this here instead of in onMount saves like 20ms?

function init() {
  const w = Window.getCurrent();
  if (w.label == "main") {
    console.error('Should not be using StandaloneWindow component in main window!')
  } else {
    initSettings()
    editor = new Editor(editorElement, onActiveNoteModified)
  }
}
  
</script>


<!-- <svelte:window on:beforeinput={onBeforeInput} on:resize={onWindowResize} on:keydown={onKeyDown} /> -->

<main bind:this={mainElement}>

  <div class="header" style="padding: 6px 10px 8px 12px; margin: 2px 2px 0 0;">
    <div style="margin-left: -6px;">
      <button onclick={() => onNewNoteClick()} class="custom-icon-btn">
        <Svg src="/img/Edit.svg" height="18px"></Svg>
      </button>
    </div>

    <div class="center-items">
      <div id="toolbar">
        <span class="ql-formats" style="height: 24px;">
          <FormatDropdown editor={editor}></FormatDropdown>
        </span>
        <span class="ql-formats">
          <button data-ql-format="ql-code-block" class="custom-icon-btn toolbar-button">
            <Svg src="/img/Code-block.svg" height="20px"></Svg>
          </button>
          <button class="ql-list toolbar-button" value="ordered" />
          <button class="ql-list toolbar-button" value="bullet" />
          <button class="ql-clean toolbar-button"></button>
        </span>
      </div>
    </div>

    <!-- not part of quill toolbar: delete note -->
    <div>
      <button onclick={onDeleteNoteClick} class="custom-icon-btn" disabled={isDeleting}>
        <Svg src="/img/Trash.svg" height="20px"></Svg>
      </button>
    </div>

    <!-- <div class="window-buttons-placeholder">
    </div> -->

    <!-- <div class="window-buttons">
      <div class="titlebar-button" id="titlebar-minimize" on:click={() => appWindow.minimize()}>
        <MinusIcon size="15" strokeWidth="1.5" />
      </div>
      <div class="titlebar-button" id="titlebar-maximize" on:click={() => appWindow.toggleMaximize()}>
        <Square size="11" strokeWidth="2" />
      </div>
      <div class="titlebar-button" id="titlebar-close" on:click={() => appWindow.close()}>
        <XIcon size="16" strokeWidth="1.5" />
      </div>
    </div>  -->
    
    <!-- <button on:click={toMarkdown}>
      Markdown
    </button> -->
  </div>

  <div class="text-editor-outer">
    <div id="text-editor" bind:this={editorElement} spellcheck="false">
    </div>
  </div>

  <!-- fixed elements -->
  <FindAndReplace bind:this={searchInNoteElement} editor={editor} />
</main>