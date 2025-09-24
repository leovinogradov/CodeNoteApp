<script lang="ts">
import Splitter from './lib/components/splitter/Splitter.svelte';
import CustomSplitterBar from './lib/components/CustomSplitterBar.svelte';
import FormatDropdown from './lib/components/FormatDropdown.svelte';
import Svg from './lib/components/Svg.svelte';
import Searchbar from './lib/components/Searchbar.svelte';
import SettingsOverlay from './lib/components/SettingsOverlay.svelte';
import FindAndReplace from './lib/components/FindAndReplace.svelte';

import { onMount } from 'svelte';
import { myflip } from './lib/service/my-flip/my-flip';
import { exists, mkdir, BaseDirectory } from "@tauri-apps/plugin-fs";
import { invoke } from "@tauri-apps/api/core";
import { event } from '@tauri-apps/api';

import { alternateFunctionKeyStore } from "./store";
import { isWhitespace, isInputFocused, readFile, getFirstTwoLinesFromContents } from './lib/service/utils';
import { Editor } from './lib/service/editor';
import { runInitialSizeFix } from './lib/util/initial-size-fix';
import { loadSettings, saveSettings, loadPlatformIntoStore } from './lib/util/app-settings';
import { Menu, MenuItem } from '@tauri-apps/api/menu';

import { LogicalPosition } from "@tauri-apps/api/window"

import { openStandaloneWindow } from './lib/util/window';

import type { AppSettings, Note, SearchNote } from './types';
import CornerButtonGroup from './lib/components/CornerButtonGroup.svelte';
import IconButton from './lib/components/IconButton.svelte';

let editor = $state<Editor>() as Editor;
let currentFilename: string = $state('')
// let currentPlatform: string = $state('')

let notes: Note[] = $state([])
let matchingNotes: SearchNote[] = $state([])
let deletedNotes: Note[] = $state([])

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

let settingsIsOpen = $state(false);
let recentlyDeletedIsOpen = $state(false);

// DOM elements
let editorElement = $state<HTMLElement>() as HTMLElement
let searchInNoteElement: FindAndReplace = $state<FindAndReplace>() as FindAndReplace
let notesListElement = $state<HTMLElement>() as HTMLElement
let mainElement = $state<HTMLElement>() as HTMLElement

// $: hasMatchingNotes = searchString && (lastSearchString || matchingNotes.length > 0);

let hasMatchingNotes = $derived(searchString && (lastSearchString || matchingNotes.length > 0));

let myContextMenu: Menu;
let contextNoteFilename = '';

// const hasMatchingNotes = $derived(
//   [searchString, lastSearchString, matchingNotes],
//   ([$searchString, $lastSearchString, $matchingNotes]) =>
//     !!$searchString && ($lastSearchString !== '' || $matchingNotes.length > 0)
// );

$effect(() => {
  // Handle appSettings
  if (mainElement && appSettings) {
    // Remove existing zoom classes
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

async function initNotes() {
  try {
    // Check is notes dir exists and create it if needed
    // Todo: ~15ms optimization if this is done in Rust on app startup or in loadNotes func
    const notesDirExists = await exists('notes', { baseDir: BaseDirectory.AppData });
    if (!notesDirExists) {
      await mkdir('notes', { baseDir: BaseDirectory.AppData, recursive: true });
    }
  } catch (err) {
    console.error(err)
  }

  try {
    notes = await _loadNotes()
  } catch (err) {
    console.error('Main init: Failed to load notes:', err)
    notes = []
  }

  // Component should be mounted and editorElement should be available at this point
  // but check anyway just in case.
  // TODO: unlikely to be a problem but still mega jank!
  if (editorElement) {
    _initEditor()
  } else {
    setTimeout(_initEditor, 100)
  }

  initRecentlyDeleted()
}

async function initRecentlyDeleted() {
  try {
    const notesDirExists = await exists('recently-deleted', { baseDir: BaseDirectory.AppData });
    if (!notesDirExists) {
      await mkdir('recently-deleted', { baseDir: BaseDirectory.AppData, recursive: true });
    }
  } catch (err) {
    console.error(err)
  }
}

async function _initEditor() {
  editor = new Editor(editorElement, onModified)

  if (notes.length > 0) {
    console.log('Main init: notes found. Opening first note')
    await onNoteClick(notes[0])
  
  } else {
    console.log('Main init: no notes found. Opening new note')
    await onNewNoteClick()
  }
  editor.searcher.clear()
}

async function _loadNotes(loadDeletedNotes = false): Promise<Note[]> {
  const data: any = await invoke("read_notes_dir", { recentlyDeleted: loadDeletedNotes })
  const loadedNotesData = data["data"]

  if (!loadedNotesData || !Array.isArray(loadedNotesData)) {
    console.log('Failed to load notes; result was:', data)
    return []
  }
  // console.log('Successfully loaded notes:', loadedNotesData)
  console.log(`loaded ${loadedNotesData.length} notes`)
  
  let notesFormatted: Note[] = []
  for (let x of loadedNotesData) {
    let meta;
    try {
      meta = _getNoteMeta(x)
    } catch(e) {
      console.error(e)
      meta = {}
    }
    notesFormatted.push({
      filename: x.filename,
      modified: x.modified,
      content: x.content,
      note_meta: meta
    })
  }
  return notesFormatted
}

async function loadDeletedNotes() {
  deletedNotes = await _loadNotes(true);
}

const ONE_DAY = 24 * 60 * 60 * 1000; // milliseconds in a day

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

/** Function to make representation of string with the searchStr highlighted.
 * line: string to search in
 * searchStrLowercase: search string as lowercase
 * searchForStrInLine: shortcircuit to not search in line if we don't expect the line to contain it */
function _searchResultAsTokensV2(line: string, searchStrLowercase: string, searchForStrInLine: boolean = true) {
  let idx = searchForStrInLine ? line.toLowerCase().indexOf(searchStrLowercase) : -1;
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
    [title, subtitle] = getFirstTwoLinesFromContents(note.content)
    if (isWhitespace(title)) {
      title = "Untitled"
    }
  } 
  else {
    title = "Loading..."
  }
  return { title, subtitle, modifiedTime }
}

async function onNoteClick(note: Note, saveOnExit = true, isDeletedNote = false) {
  const exitResult = isDeletedNote ? 
    await editor.openDeletedFile(note.filename, saveOnExit) :
    await editor.open(note.filename, saveOnExit)
  if (!exitResult) return;

  currentFilename = editor.getFilename() // Update state

  console.log('onNoteClick(): exitResult:', exitResult)

  if (exitResult && exitResult.deleted && exitResult.filename) {
    notes = notes.filter((note) => note.filename != exitResult.filename)
  }

  // @ts-ignore
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
      // @ts-ignore
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
    // Emit noteDeleted event for StandaloneWindow listeners
    event.emit('mainWindowEvent', {
      type: 'noteDeleted',
      filename
    });
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

  function onModified(filename, delta, oldDelta, source) {
    // console.log(delta, oldDelta, source)

    /* Recompute meta when note is modified (but not necessarily saved) */
    const content = editor.getContent()
    noteWasModified(filename, content);

    // Emit event for StandaloneWindow listeners
    event.emit('mainWindowEvent', {
      type: 'noteModified',
      filename,
      editorContent: content
    });
  }

  function noteWasModified(filename, noteContent) {
    const first2Lines: string[] = getFirstTwoLinesFromContents(noteContent)
    if (hasMatchingNotes) {
      updateMatchingNoteMeta(filename, first2Lines)
    }
    updateNoteMeta(filename, first2Lines)
  }

  function updateMatchingNoteMeta(filename: string, first2Lines: string[]) {
    const matchingNoteIdx = matchingNotes.findIndex((note) => note.filename == filename)
    if (matchingNoteIdx < 0) return
    if (matchingNoteIdx > 0) {
      const note = matchingNotes.splice(matchingNoteIdx, 1)[0]
      matchingNotes.unshift(note)
    }

    const newTitle = first2Lines[0]
    if (!newTitle) {
      matchingNotes[0].note_meta.title = 'Untitled'
      matchingNotes[0].note_meta.search_title_as_tokens = [{ highlight: false, text: 'Untitled'}]
    }
    else if (newTitle != matchingNotes[0].note_meta.title) {
      // If there's a change in title, update it
      matchingNotes[0].note_meta.title = newTitle
      matchingNotes[0].note_meta.search_title_as_tokens = _searchResultAsTokensV2(newTitle, searchString.toLowerCase())
    }
    // TODO: also update subtitle, like the title above

    matchingNotes[0].modified = Date.now()
    matchingNotes[0].note_meta.modifiedTime = _getModifiedAtStr(notes[0].modified)
  }

  function updateNoteMeta(filename: string, first2Lines: string[]) {
    const idx = notes.findIndex((note) => note.filename == filename)
    if (idx < 0) return;
    if (idx > 0) {
      const note = notes.splice(idx, 1)[0]
      notes.unshift(note)
    }
    notes[0].note_meta.title = first2Lines[0] || 'Untitled'
    notes[0].note_meta.subtitle = first2Lines[1]
    notes[0].modified = Date.now()
    notes[0].note_meta.modifiedTime = _getModifiedAtStr(notes[0].modified)
  }

  function onSearchInput() {
    if (!searchString) {
      matchingNotes = []
      editor.searcher.clear()
      return
    }
    clearTimeout(_searchTimeoutId)
    _searchTimeoutId = setTimeout(_doSearch, 250)
  }

  function _doSearch() {
    console.log('running search', searchString)
    if (!searchString) {
      lastSearchString = ""
      return
    }
    const searchStringLocked = searchString
    invoke("search_handler", { searchString: searchStringLocked }).then((data: any) => {
      lastSearchString = searchStringLocked;
      // console.log("SEARCH RESULT for", searchStringLocked, data)
      if (data && data.data) {
        let matches = data.data;
        let matches_as_obj = {}
        for (let match of matches) {
          matches_as_obj[match.filename] = match
        }
        const newMatchingNotes: SearchNote[] = []
        const searchStrLowercase = searchStringLocked.toLowerCase()
        const activeFilename = editor.getFilename()
        let matchInActiveFile = false
        for (let note of notes) {
          let match = matches_as_obj[note.filename]
          if (match) {
            note.note_meta.search_title_as_tokens = _searchResultAsTokensV2(match.first_line, searchStrLowercase, match.first_line_matches)
            
            const second_line = isWhitespace(match.second_line) ? "" : "..."+match.second_line;
            note.note_meta.search_subtitle_as_tokens = _searchResultAsTokensV2(second_line, searchStrLowercase, match.second_line_matches)
            
            newMatchingNotes.push(note as SearchNote)

            if (note.filename == activeFilename) {
              matchInActiveFile = true
            }
          }
        }
        matchingNotes = newMatchingNotes
        console.log("Matching notes", matchingNotes)
        if (matchInActiveFile) {
          editor.searcher.search(searchStringLocked)
        } else {
          editor.searcher.clear()
        }
      }
    })
  }

  function clearSearch() {
    searchString = ""
    lastSearchString = ""
    matchingNotes = []
    editor.searcher.clear()
  }

  const loadingFilenames = new Set()
  async function loadNoteContent(note: Note) {
    const filename = note.filename
    if (loadingFilenames.has(filename)) { return }
    loadingFilenames.add(filename)
    const content = await readFile(filename, false)
    note.content = content
    note.note_meta = _getNoteMeta(note)
    notes = notes
    loadingFilenames.delete(filename)
  }

  function handleSettingsAction(name, value) {
    // const name = e.detail?.name
    // const value = e.detail?.value
    if (name == "toggleShowFilenames") {
      showFilenames = !showFilenames
    }
    else if (name == 'themeChanged' && value && typeof value == 'string') {
      appSettings.theme = value;
      appSettings = appSettings;
      saveSettings(appSettings)
    }
  }

  
  function openInNewWindow() {
    if (!contextNoteFilename) {
      console.error('No context note filename set')
      return;
    }
    // Open note in a new window
    // @ts-ignore
    openStandaloneWindow(contextNoteFilename, (e) => {
      // console.log('Event received in main window:', e)
      const payload = e.payload;
      if (payload.type == 'noteModified' && payload.filename) {
        noteWasModified(payload.filename, payload.editorContent);
        if (payload.filename == currentFilename) {
          editor.setContents(payload.editorContent);
        }
      }
    })
  }

  function onNoteListScroll() {
    /* Helper to load note titles as user scrolls towards then
       e.target is the notes-list div == notesListElement
       However notesListElement is used instead of e.target so that other functions can call this
       At the bottom, .scrollHeight ~= .offsetHeight + .scrollTop */
    // Search result notes have their own title and subtitle, so this func isn't needed in that case
    if (hasMatchingNotes) return;
    // Calculate postion bottom of visible portion of notes list
    const bottom = notesListElement.scrollTop + notesListElement.offsetHeight
    for (let i=notes.length-1; i >= 0; i--) {
      const note = notes[i]
      const noteSummaryEl = notesListElement.children[i] as HTMLElement
      if (!noteSummaryEl) {
        console.error("could not find note summary el")
        break
      }
      if (note.content) {
        // reached notes that have content. No more needs to be done
        break
      }
      if (noteSummaryEl.offsetTop - bottom < 200) {
        // note is close to visible bottom
        loadNoteContent(note)
      }
    }
  }

  function onWindowResize(e) {
    // Call on scroll method since resizing can show notes that are not yet visible
    onNoteListScroll()
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

  // Calling this here instead of in onMount saves like 20ms?
  initNotes()
  initSettings()
  loadPlatformIntoStore()

  runInitialSizeFix()

  onMount(async () => {
    myContextMenu = await Menu.new({
      items: [
        await MenuItem.new({ 
          id: 'open_in_new_window', 
          text: 'Open in New Window',
          action: () => {
            openInNewWindow();
          }
        }),
      ],
    });
  })

  function onContextMenu(event: MouseEvent, note: Note) {
    if (!myContextMenu || !note?.filename) return;
    contextNoteFilename = note.filename;
    myContextMenu.popup(new LogicalPosition({ x: event.clientX, y: event.clientY }));
    event.preventDefault(); // Prevents the browser context menu
  }


</script>

<svelte:window onresize={onWindowResize} onkeydown={onKeyDown} />
<!-- <svelte:window on:beforeinput={onBeforeInput} on:resize={onWindowResize} on:keydown={onKeyDown} /> -->

<main bind:this={mainElement}>
  <Splitter initialPrimarySize='300px' minPrimarySize='180px' minSecondarySize='50%' splitterSize='9px'>
    <div slot="primary">
      <div class="header" style="padding: 6px 12px 8px 10px; margin: 2px 0 0 2px;">
        <Searchbar bind:value={searchString} on:input={onSearchInput} on:clear={clearSearch} disabled={recentlyDeletedIsOpen}></Searchbar>
      </div>
      <div class="notes-list" hidden={recentlyDeletedIsOpen} bind:this={notesListElement} onscroll="{onNoteListScroll}">
        {#if hasMatchingNotes}
          <!-- list when searching -->
          {#each matchingNotes as note, i (note.filename) }
            <div animate:myflip 
                class="note-summary"
                onclick={() => onNoteClick(note)}
                oncontextmenu={(e) => onContextMenu(e, note)}> 
              <h4>
                {#each note.note_meta.search_title_as_tokens as token}
                  {#if token.highlight}
                    <span class="search-highlight">{token.text}</span>
                  {:else}
                    {token.text}
                  {/if}
                {/each}
              </h4>
              <p>
                <span class="modified-time">{note.note_meta.modifiedTime}</span>
                <span class="subtitle">
                  {#each note.note_meta.search_subtitle_as_tokens as token}
                    {#if token.highlight}
                      <span class="search-highlight">{token.text}</span>
                    {:else}
                      {token.text}
                    {/if}
                  {/each}
                </span>
              </p>
            </div>
          {/each}
          {#if matchingNotes.length == 0}
            <div class="note-summary">
              <p>No results found</p>
            </div>
          {/if}
        {:else}
          <!-- normal list -->
          {#each notes as note, i (note.filename) }
            <div animate:myflip
                class="note-summary"
                class:selected={currentFilename == note.filename}
                onclick={() => onNoteClick(note)}
                oncontextmenu={(e) => onContextMenu(e, note)}> 
              <h4>{note.note_meta.title}</h4>
              <p><span class="modified-time">{note.note_meta.modifiedTime}</span><span class="subtitle">{note.note_meta.subtitle}</span></p>
              {#if showFilenames}
                <p class="filename">{note.filename}</p>
              {/if}
            </div>
          {/each}
        {/if}
      </div>
      {#if recentlyDeletedIsOpen}
        <div class="bg-secondary" style="padding: 2px 12px;">
          <span>Deleted</span>
        </div>
        <div class="notes-list">
          <!-- deleted notes list -->
          {#each deletedNotes as note, i (note.filename) }
            <div animate:myflip
                class="note-summary"
                class:selected={currentFilename == note.filename}
                onclick={() => onNoteClick(note, true, true)}
                oncontextmenu={(e) => onContextMenu(e, note)}> 
              <h4>{note.note_meta.title}</h4>
              <p><span class="modified-time">{note.note_meta.modifiedTime}</span><span class="subtitle">{note.note_meta.subtitle}</span></p>
              {#if showFilenames}
                <p class="filename">{note.filename}</p>
              {/if}
            </div>
          {/each}
        </div>
      {/if}
    </div>

    <svelte:fragment slot="splitter">
      <CustomSplitterBar />
    </svelte:fragment>

    <div slot="secondary">
      <!-- <div class="header" style="padding: 6px 10px 8px 12px; margin: 2px 2px 0 0;"> -->
      <div class="header" style="padding: 8px 12px 8px 6px;">
        <div>
          <IconButton icon={Svg} src="/img/Edit.svg" height="18px" onclick={() => onNewNoteClick()}></IconButton>
        </div>

        <div class="center-items">
          <div id="toolbar">
            <span class="ql-formats">
              <FormatDropdown editor={editor}></FormatDropdown>
            </span>
            <span class="ql-formats">
              <button data-ql-format="ql-code-block" class="custom-icon-btn toolbar-button">
                <Svg src="/img/Code-block.svg" height="20px"></Svg>
              </button>
              <button class="ql-list toolbar-button" value="ordered" />
              <button class="ql-list toolbar-button" value="bullet" />
              <button class="ql-clean toolbar-button" />
            </span>
          </div>
        </div>

        <!-- not part of quill toolbar: delete note -->
        <div>
          <IconButton icon={Svg} src="/img/Trash.svg" height="18px" onclick={onDeleteNoteClick} disabled={isDeleting}></IconButton>
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
        <div id="text-editor" bind:this={editorElement} spellcheck="false" class:hidden={searchString && matchingNotes.length == 0}>
        </div>
      </div>
    <div>
  </Splitter>

  <!-- fixed elements -->
  <FindAndReplace bind:this={searchInNoteElement} editor={editor} />

  {#if settingsIsOpen}
    <SettingsOverlay style="bottom: 50px;" 
      action={handleSettingsAction} 
      close={() => {settingsIsOpen = false}}>
    </SettingsOverlay>
  {/if}

  <CornerButtonGroup style="position: fixed; bottom: 12px; left: 16px; z-index: 99;"
    onSettingsClick={() => {settingsIsOpen = !settingsIsOpen}} 
    onUndeleteClick={() => {
      recentlyDeletedIsOpen = !recentlyDeletedIsOpen;
      if (recentlyDeletedIsOpen) {
        // Opening deleted notes.
        loadDeletedNotes();
      } 
      else {
        // Closing deleted notes. Open regular notes back up
        if (notes?.length) {
          onNoteClick(notes[0], false, false)
        } 
        else {
          onNewNoteClick(false)
        }
      }
    }}
    recentlyDeletedIsOpen={recentlyDeletedIsOpen}
  ></CornerButtonGroup>
</main>