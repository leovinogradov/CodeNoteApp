<script lang="ts">
  import type { Note, SearchNote } from "../../types";
  import { myflip } from "../service/my-flip/my-flip";

  type Props = {
    notes: Note[]|SearchNote[],
    isSearchingNotes: boolean,
    currentFilename: string,
    showingFilenames: boolean,
    onNoteClick: (note: Note, options?: any) => void,
    onContextMenu: (e: any, note: Note) => void,
    loadNoteContent: (note: Note) => void
  }
  
  const { 
    notes, isSearchingNotes, currentFilename, showingFilenames, 
    onNoteClick, onContextMenu, loadNoteContent
  }: Props = $props();

  let notesListElement = $state<HTMLElement>() as HTMLElement;

  function onNoteListScroll() {
    /* Helper to load note titles as user scrolls towards then
       e.target is the notes-list div == notesListElement
       However notesListElement is used instead of e.target so that other functions can call this
       At the bottom, .scrollHeight ~= .offsetHeight + .scrollTop */
    // Search result notes have their own title and subtitle, so this func isn't needed in that case
    if (isSearchingNotes) return;
    // Calculate postion bottom of visible portion of notes list
    const bottom = notesListElement.scrollTop + notesListElement.offsetHeight;
    for (let i = notes.length - 1; i >= 0; i--) {
      const note = notes[i];
      const noteSummaryEl = notesListElement.children[i] as HTMLElement;
      if (!noteSummaryEl) {
        console.error("could not find note summary el");
        break;
      }
      if (note.content) {
        // reached notes that have content. No more needs to be done
        break;
      }
      if (noteSummaryEl.offsetTop - bottom < 200) {
        // note is close to visible bottom
        loadNoteContent(note);
      }
    }
  }
</script>

<div
  class="notes-list"
  bind:this={notesListElement}
  onscroll={onNoteListScroll}
>
  {#if isSearchingNotes}
    <!-- list when searching -->
    {#each (notes as SearchNote[]) as note, i (note.filename)}
      <div
        animate:myflip
        class="note-summary"
        onclick={() => onNoteClick(note)}
        oncontextmenu={(e) => onContextMenu(e, note)}
      >
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
    {#if notes.length == 0}
      <div class="note-summary">
        <p>No results found</p>
      </div>
    {/if}
  {:else}
    <!-- normal list -->
    {#each notes as note, i (note.filename)}
      <div
        animate:myflip
        class="note-summary"
        class:selected={currentFilename == note.filename}
        onclick={() => onNoteClick(note)}
        oncontextmenu={(e) => onContextMenu(e, note)}
      >
        <h4>{note.note_meta.title}</h4>
        <p>
          <span class="modified-time">{note.note_meta.modifiedTime}</span
          ><span class="subtitle">{note.note_meta.subtitle}</span>
        </p>
        {#if showingFilenames}
          <p class="filename">{note.filename}</p>
        {/if}
      </div>
    {/each}
  {/if}
</div>

<style lang="scss">
.notes-list {
  position: relative;
  overflow-y: scroll;
  // Code to remove scrollbar:
  -ms-overflow-style: none;  /* Internet Explorer 10+ */
  scrollbar-width: none;  /* Firefox */
  &::-webkit-scrollbar { 
    display: none;  /* Safari and Chrome */
  }
}
.note-summary {
  // cursor: pointer; // doesn't work properly? wtf?
  text-align: left;
  padding: 8px 12px;
  margin-right: 4px;
  border-bottom: 1px solid var(--border-color);
  position: relative;
  // background-color: #fff;
  background-color: var(--background-color);
  
  &:last-child {
    margin-bottom: 54px; // To make room for fixed buttons
  }
  
  &.selected {
    z-index: 10 !important;  // for flip animation
  }

  h4, h5, p {
    margin: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  h4, h5 {
    white-space: nowrap;
  }
  p {
    font-size: 0.9em;
  }
  .modified-time {
    margin-right: 5px;
  }
  .subtitle {
    color: #888;
  }
  .search-highlight {
    color: var(--note-search-color);
  }
  .filename {
    margin-top: 2px;
    font-size: 0.73334em;
    line-height: 1;
  }
}
</style>