<script lang="ts">
  import Greet from './lib/Greet.svelte'
  import CustomSplitterBar from './lib/components/CustomSplitterBar.svelte';
  import Dropdown from './lib/components/Dropdown.svelte';
  import Svg from './lib/components/Svg.svelte';
  import { Square, XIcon, MinusIcon, RemoveFormatting } from 'lucide-svelte'

  import { onMount } from 'svelte';
  import { exists, mkdir, BaseDirectory } from "@tauri-apps/plugin-fs";
  import { invoke } from "@tauri-apps/api/core"
  // import { appWindow } from '@tauri-apps/api/window';

  // @ts-ignore because no index.d.ts in dist?
  import { Split } from '@geoffcox/svelte-splitter';

  import { saveStatus } from './store';
  import { isWhitespace } from './lib/service/utils';
  // import { stateBold, stateItalic, textType } from './store';
  import { searchNote, type SearchResult } from './lib/service/search.ts';
  import { Editor } from './lib/service/editor';
  import { createNewNote, SaveManager } from './lib/service/save-manager';

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
    note_meta: NoteMeta
  }

  const ONE_DAY = 24 * 60 * 60 * 1000;

  // let _loadedNotesData = null;
  let _notesLoaded = false;
  let _loadNotesCalled = false;

  let editor: Editor;
  
  let notes: Note[] = []
  let matchingNotes: Note[] = []
  // let openNoteIndex: number = 0;
  let searchString: string = '';
  let searchResultsLoaded: boolean = false;
  let _searchTimeoutId;  // for timeout between searchString changed and actual search

  // DOM elements
  let editorElement;

  async function init() {
    try {
      const notesDirExists = await exists('notes', { baseDir: BaseDirectory.AppData });
      if (!notesDirExists) {
        await mkdir('notes', { baseDir: BaseDirectory.AppData, recursive: true });
      }
    } catch (err) {
      console.error(err)
    }

    notes = await loadNotes()

    editor = new Editor(editorElement, onActiveNoteModified)
    if (notes.length > 0) {
      const exitResult = await editor.open(notes[0].filename)
      editor.searcher.clear()
    } else {
      const { exitResult, newNote } = await editor.openNew()
      console.log('Opened new note on init:', exitResult, newNote)
      notes.push(newNote)
    }
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
      console.log('meta is', meta)
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
    const now = new Date()
    try {
      const d = new Date(modified)
      if ((now.getTime() - d.getTime()) < ONE_DAY) {
        // return d.toLocaleTimeString([], {hour: "numeric", minute: "2-digit" })
        // get am/pm
        const ampm = d.getHours() >= 12 ? 'pm' : 'am'
        const hours = d.getHours() % 12 || 12  // 0 is actually 12
        const minutes = d.getMinutes() < 10 ? '0' + d.getMinutes() : d.getMinutes()
        return hours + ':' + minutes + ampm;
      }
      return d.toDateString()
    } catch (err) {
      console.error(err)
    }
    return ''
  }

  function _getFirst2LinesFromContent(obj) {
    if (typeof obj == "string") {
      obj = JSON.parse(obj)
    }
    const lines = Editor.getLinesFromDeltas(obj, 2)
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
    } else {
      title = "Untitled"
    }
    return { title, subtitle, modifiedTime }
  }

  async function onNoteClick(note: Note) {
    console.log('onNoteClick', note)
    const exitResult = await editor.open(note.filename)
    console.log('exitResult:', exitResult)

    if (exitResult && exitResult.deleted && exitResult.filename) {
      notes = notes.filter((note) => note.filename != exitResult.filename)
    }

    editorElement.firstElementChild.focus()

    if (searchString) {
      editor.searcher.search(searchString)
    } else {
      editor.searcher.clear()
    }
  }

  async function onNewNoteClick() {
    const { exitResult, newNote } = await editor.openNew()

    console.log('Opened new note:', exitResult, newNote)

    if (exitResult && exitResult.deleted && exitResult.filename) {
      notes = notes.filter((note) => note.filename != exitResult.filename)
    }
    newNote.note_meta = _getNoteMeta(newNote)

    notes.unshift(newNote);  // push to front
    notes = notes;  // trigger change

    editorElement.firstElementChild.focus()
  }

  function onDeleteNoteClick() {

  }

  function onActiveNoteModified(filename, content) {
    // console.log('modified', filename)
    /* when note is modified (but not necessarily saved) */
    // const filename = e.detail.filename
    // const editorEl = e.detail.editorEl
    const first2Lines: string[] = _getFirst2LinesFromContent(content)
    if (searchString) {
      // When something is searched
      const matchingNoteIdx = matchingNotes.findIndex((note) => note.filename == filename)
      if (matchingNoteIdx < 0 || !matchingNotes) return
      if (first2Lines[0]) {
        if (first2Lines[0] == matchingNotes[matchingNoteIdx].note_meta.title) return;  // no change
        matchingNotes[matchingNoteIdx].note_meta.title = first2Lines[0]
        let idxOfSearchStr = first2Lines[0].toLowerCase().indexOf(searchString.toLowerCase())
        matchingNotes[matchingNoteIdx].note_meta.search_title_as_tokens = _searchResultAsTokensV1(first2Lines[0], idxOfSearchStr, searchString.length)
      } else {
        matchingNotes[matchingNoteIdx].note_meta.title = 'Untitled'
        matchingNotes[matchingNoteIdx].note_meta.search_title_as_tokens = [{ highlight: false, text: 'Untitled'}]
      }
      // Todo: update subtitle under certain conditions
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
    searchResultsLoaded = false; // todo: think of better approach. Probably if string for loaded search results is in current searchstring
    if (!searchString) {
      console.log('searchString empty, ignoring')
      return
    }
    const searchStringLocked = searchString
    invoke("search_handler", { searchString: searchStringLocked }).then(data => {
      searchResultsLoaded = true;
      console.log("SEARCH RESULT", data)
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
    matchingNotes = []
    editor.searcher.clear()
  }

  init()
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-missing-attribute -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<main class="dark">
  <Split initialPrimarySize='300px' minPrimarySize='180px' minSecondarySize='50%' splitterSize='9px' >
    <div slot="primary">
      <div class="header" data-tauri-drag-region style="padding: 6px 12px 8px 10px; margin: 2px 0 0 2px;">
        <input class="search" type="text" placeholder="Search" bind:value={searchString} on:input={onSearchInput} />
        <button hidden={!searchString} class="clear-search" on:click={clearSearch}>
          <XIcon size="14" strokeWidth="2" color="#444" />
        </button>
      </div>
      <div class="notes-list">
        {#if searchString && (matchingNotes || searchResultsLoaded)}
          <!-- list when searching -->
          {#each matchingNotes as note, i }
            <div class="note-summary" on:click={() => onNoteClick(note)}> 
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
                {#each note.note_meta.search_subtitle_as_tokens as token}
                  {#if token.highlight}
                    <span class="search-highlight">{token.text}</span>
                  {:else}
                    {token.text}
                  {/if}
                {/each}
              </p>
            </div>
          {/each}
        {:else}
          <!-- normal list -->
          {#each notes as note, i }
            <div class="note-summary" on:click={() => onNoteClick(note)}> 
              <h4>{note.note_meta.title}</h4>
              <p><span class="modified-time">{note.note_meta.modifiedTime}</span>{note.note_meta.subtitle}</p>
              <!-- <small style="font-size: 11px">{note.filename}</small> for debugging only -->
            </div>
          {/each}
        {/if}
      </div>
    </div>

    <svelte:fragment slot="splitter">
      <CustomSplitterBar />
    </svelte:fragment>

    <div slot="secondary">
      <div class="header" data-tauri-drag-region style="padding: 6px 10px 8px 12px; margin: 2px 2px 0 0;">
        <div style="margin-left: -6px;">
          <button on:click={onNewNoteClick} style="padding: 9px 5px"><Svg src="/img/Edit.svg" height="18px"></Svg></button>
        </div>

        <div class="center-items" data-tauri-drag-region>
          <div id="toolbar">
            <span class="ql-formats" style="margin-right: 0">
              <Dropdown>
                <div slot="button"><Svg src="/img/Font.svg" height="18px"></Svg></div>
                <div slot="content">
                  <span class="ql-formats" style="margin-right: 0">
                    <!-- formats with easy keyboard shortcut go here -->
                    <button class="ql-bold" />
                    <button class="ql-italic" />
                    <button class="ql-underline" />
                    <button class="ql-strike" />
                  </span>

                  {#each [['Title', 1], ['Heading', 2], ['Subheading', 3], ['Paragraph', 0]] as item, j }
                    <button class="dropdown-item" on:click={() => { editor.quill.format('header', item[1]) }}>
                      {item[0]}
                    </button>
                  {/each}
                  <!-- <button class="dropdown-item" on:click={editor.insertList('ol')}>Numbered List</button>
                  <button class="dropdown-item" on:click={editor.insertList('ul')}>Bulleted List</button> -->
                </div>
              </Dropdown> 
            </span>

            <span class="ql-formats">
              <button class="ql-code-block"></button>
              <button class="ql-list" value="ordered" />
              <button class="ql-list" value="bullet" />
              <button class="ql-clean"></button>
            </span>
          </div>
        </div>

        <!-- not part of quill toolbar: delete note -->
        <div>
          <button on:click={onDeleteNoteClick}><Svg src="/img/Trash.svg" height="20px"></Svg></button>
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
        <!-- TODO: add "and did at least one search" logic -->
        <!-- {#if searchString && matchingNotes.length == 0}
          <div>No Results Found</div>
        {/if} -->
      </div>
    <div>
  </Split>
</main>