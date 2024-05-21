<script lang="ts">
  import Splitter from './lib/components/splitter/Splitter.svelte';
  import CustomSplitterBar from './lib/components/CustomSplitterBar.svelte';
  import FormatDropdown from './lib/components/FormatDropdown.svelte';
  import Svg from './lib/components/Svg.svelte';
  import Searchbar from './lib/components/Searchbar.svelte';
  import SettingsOverlay from './lib/components/SettingsOverlay.svelte';
  import SearchInNote from './lib/components/SearchInNote.svelte';
  import { Square, XIcon, MinusIcon, RemoveFormatting } from 'lucide-svelte'

  import { onMount } from 'svelte';
  import { myflip } from './lib/service/my-flip/my-flip';
  import { exists, mkdir, BaseDirectory } from "@tauri-apps/plugin-fs";
  import { invoke } from "@tauri-apps/api/core"

  import { alternateFunctionKeyStore } from "./store";
  import { isWhitespace, isInputFocused, readFile } from './lib/service/utils';
  import { searchNote, type SearchResult } from './lib/service/search.ts';
  import { Editor } from './lib/service/editor';
  import { createNewNote, SaveManager } from './lib/service/save-manager';
  import { runInitialSizeFix } from './initial-size-fix';
  import { loadSettings, saveSettings, loadPlatformIntoStore, type AppSettings } from './app-settings';


  interface NoteMeta {
    title: string,
    subtitle: string,
    modifiedTime: string,
    search_title_as_tokens?: any[],
    search_subtitle_as_tokens?: any[]
  }

  interface Note {
    filename: string,
    content: string,
    modified: number,
    note_meta: NoteMeta,
    el?: HTMLElement
  }


  const ONE_DAY = 24 * 60 * 60 * 1000;

  // let _loadedNotesData = null;
  let _notesLoaded = false;
  let _loadNotesCalled = false;

  let editor: Editor;
  let currentFilename: string;
  let currentPlatform: string = '';
  
  let notes: Note[] = []
  let matchingNotes: Note[] = []
  // let openNoteIndex: number = 0;
  let searchString: string = '';
  let lastSearchString: string = '';  // string for which results are shown
  let _searchTimeoutId;  // for timeout between searchString changed and actual search
  let formatvalue = -1;  // representation of current format selected
  let showFilenames = false;  // TODO: add setting to toggle this 
  let appSettings: AppSettings = null;
  let _alternateFunctionProperty: string = "ctrlKey";
	alternateFunctionKeyStore.subscribe(val => {
		_alternateFunctionProperty = val
	})

  // DOM elements
  let editorElement: HTMLElement;
  let searchInNoteElement: HTMLElement;
  let notesListElement: HTMLElement;
  let mainElement: HTMLElement;

  $: hasMatchingNotes = searchString && (lastSearchString || matchingNotes.length > 0);

  $: {
		if (mainElement && appSettings) {
      for (let c of Array.from(mainElement.classList)) {
        if (c.startsWith('zoom')) mainElement.classList.remove(c)
      }
      let newClassname = "zoom0"
      if (appSettings.zoom > 0) {
        newClassname = "zoom"+appSettings.zoom
      } else if (appSettings.zoom < 0) {
        newClassname = "zoomNeg"+Math.abs(appSettings.zoom)
      }
      mainElement.classList.add(newClassname)
    } 
	}

  async function initSettings() {
    appSettings = await loadSettings()
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
      notes = await loadNotes()
    } catch (err) {
      console.error('Main init: Failed to load notes:', err)
      notes = []
    }

    editor = new Editor(editorElement, onActiveNoteModified)

    if (notes.length > 0) {
      console.log('Main init: notes found. Opening first note')
      await onNoteClick(notes[0])
    
    } else {
      console.log('Main init: no notes found. Opening new note')
      await onNewNoteClick()
    }
    editor.searcher.clear()
  }

  async function loadNotes(): Promise<Note[]> {
    const data = await invoke("read_notes_dir")
    const loadedNotesData = data["data"]

    if (!loadedNotesData || !Array.isArray(loadedNotesData)) {
      console.log('Failed to load notes; result was:', data)
      return
    }
    console.log('Successfully loaded notes:', loadedNotesData)
    
    let notesFormatted = []
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
      // string to number comparison, hell yeah
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

  function _searchResultAsTokensV2(line: str, searchStrLowercase: str, searchStrInLine: bool = true) {
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

  async function onNoteClick(note: Note) {
    const exitResult = await editor.open(note.filename)
    currentFilename = editor.getFilename()
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

  async function onNewNoteClick() {
    const { exitResult, newNote } = await editor.openNew()
    currentFilename = editor.getFilename()

    console.log('Opened new note:', exitResult, newNote)

    if (exitResult && exitResult.deleted && exitResult.filename) {
      notes = notes.filter((note) => note.filename != exitResult.filename)
    }
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
    const filename = await editor.deleteNote()
    const index = notes.findIndex(x => x.filename == filename)  // should be first note, most of the time
    if (index > -1) {
      notes.splice(index, 1);
      notes = notes;
    }
    if (notes.length > 0) {
      // Other notes exist; open top one
      onNoteClick(notes[0])
    }
    else {
      // All notes have been deleted; open new one
      await onNewNoteClick()
    }
  }

  // let _noteModifiedTimeout = null
  function onActiveNoteModified(filename, delta, oldDelta, source) {
    /* Recompute meta when note is modified (but not necessarily saved) */
    _updateNoteTitle(filename)
    // Version with debounce: seems to not be needed because compute is super fast
    // if (_noteModifiedTimeout) clearTimeout(_noteModifiedTimeout)
    // _noteModifiedTimeout = setTimeout(_updateNoteTitle, 50)
  }

  function _updateNoteTitle(filename) {
    // const filename = editor.getFilename()
    // if (!filename) return
    const first2Lines: string[] = _getFirst2LinesFromContent(editor.quill.getContents())
    if (searchString) {
      // When something is searched
      const matchingNoteIdx = matchingNotes.findIndex((note) => note.filename == filename)
      if (matchingNoteIdx < 0 || !matchingNotes) return
      const newTitle = first2Lines[0]
      if (!newTitle) {
        matchingNotes[matchingNoteIdx].note_meta.title = 'Untitled'
        matchingNotes[matchingNoteIdx].note_meta.search_title_as_tokens = [{ highlight: false, text: 'Untitled'}]
      }
      else if (newTitle != matchingNotes[matchingNoteIdx].note_meta.title) {
        // If there's a change in title, update it
        matchingNotes[matchingNoteIdx].note_meta.title = first2Lines[0]
        let idxOfSearchStr = first2Lines[0].toLowerCase().indexOf(searchString.toLowerCase())
        matchingNotes[matchingNoteIdx].note_meta.search_title_as_tokens = _searchResultAsTokensV1(first2Lines[0], idxOfSearchStr, searchString.length)
      }
      // TODO: also update subtitle, like the title above
    }
    else {
      // Normal operation
      if (notes[0].filename != filename) {
        const idx = notes.findIndex((note) => note.filename == filename)
        const note = notes.splice(idx, 1)[0]
        notes.unshift(note)
      }
      notes[0].note_meta.title = first2Lines[0] || 'Untitled'
      notes[0].note_meta.subtitle = first2Lines[1]
      notes[0].modified = Date.now()
      notes[0].note_meta.modifiedTime = _getModifiedAtStr(notes[0].modified)
    }
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
    invoke("search_handler", { searchString: searchStringLocked }).then(data => {
      lastSearchString = searchStringLocked;
      // console.log("SEARCH RESULT for", searchStringLocked, data)
      if (data && data.data) {
        let matches = data.data;
        let matches_as_obj = {}
        for (let match of matches) {
          matches_as_obj[match.filename] = match
        }
        const newMatchingNotes = []
        const searchStrLowercase = searchStringLocked.toLowerCase()
        const activeFilename = editor.getFilename()
        let matchInActiveFile = false
        for (let note of notes) {
          let match = matches_as_obj[note.filename]
          if (match) {
            note.note_meta.search_title_as_tokens = _searchResultAsTokensV2(match.first_line, searchStrLowercase, match.first_line_matches)
            
            const second_line = isWhitespace(match.second_line) ? "" : "..."+match.second_line;
            note.note_meta.search_subtitle_as_tokens = _searchResultAsTokensV2(second_line, searchStrLowercase, match.second_line_matches)
            
            newMatchingNotes.push(note)

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
    const content = await readFile(filename)
    note.content = content
    note.note_meta = _getNoteMeta(note)
    notes = notes
    loadingFilenames.delete(filename)
  }

  function handleSettingsAction(e) {
    console.log(e)
    const name = e.detail?.name
    if (name == "toggleShowFilenames") {
      showFilenames = !showFilenames
    }
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
      if (!note.el) {
        console.error("could not find note summary el")
        break
      }
      if (note.content) {
        // reached notes that have content. No more needs to be done
        break
      }
      if (note.el.offsetTop - bottom < 200) {
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

  // onMount(() => {
  //   console.log('App onMount')
  // })

  // Calling this here instead of in onMount saves like 20ms?
  initNotes()
  initSettings()
  loadPlatformIntoStore()

  runInitialSizeFix()
</script>


<svelte:window on:beforeinput={onBeforeInput} on:resize={onWindowResize} on:keydown={onKeyDown} />

<main class="dark" bind:this={mainElement}>
  <Splitter initialPrimarySize='300px' minPrimarySize='180px' minSecondarySize='50%' splitterSize='9px'>
    <div slot="primary">
      <div class="header" style="padding: 6px 12px 8px 10px; margin: 2px 0 0 2px;">
        <Searchbar bind:value={searchString} on:input={onSearchInput} on:clear={clearSearch}></Searchbar>
      </div>
      <div class="notes-list" bind:this={notesListElement} on:scroll="{onNoteListScroll}">
        {#if hasMatchingNotes}
          <!-- list when searching -->
          {#each matchingNotes as note, i (note.filename) }
            <div animate:myflip 
                class="note-summary"
                bind:this={note.el}
                on:click={() => onNoteClick(note)}> 
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
                bind:this={note.el}
                class:selected={currentFilename == note.filename}
                on:click={() => onNoteClick(note)}> 
              <h4>{note.note_meta.title}</h4>
              <p><span class="modified-time">{note.note_meta.modifiedTime}</span><span class="subtitle">{note.note_meta.subtitle}</span></p>
              {#if showFilenames}
                <p class="filename">{note.filename}</p>
              {/if}
            </div>
          {/each}
        {/if}
      </div>
    </div>

    <svelte:fragment slot="splitter">
      <CustomSplitterBar />
    </svelte:fragment>

    <div slot="secondary">
      <div class="header" style="padding: 6px 10px 8px 12px; margin: 2px 2px 0 0;">
        <div style="margin-left: -6px;">
          <button on:click={onNewNoteClick} class="custom-icon-btn">
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
          <button on:click={onDeleteNoteClick} class="custom-icon-btn">
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
        <div id="text-editor" bind:this={editorElement} spellcheck="false" class:hidden={searchString && matchingNotes.length == 0}>
        </div>
      </div>
    <div>
  </Splitter>

  <!-- fixed elements -->
  <SettingsOverlay on:action={handleSettingsAction} />
  <SearchInNote bind:this={searchInNoteElement} editor={editor} />
</main>