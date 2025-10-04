<script lang="ts">
  import { invoke } from "@tauri-apps/api/core";
  import { theme } from '../../store';
  import { onDestroy, onMount } from 'svelte';

  const { action, close, style } = $props();

  let overlayEl;

  function onDocumentClick(e) {
    let el = e.target
    let maxIter = 3;
    let count = 0;
    while (el) {
      if (el == overlayEl) return;
      el = el.parentElement
      if (count++ > maxIter) break;
    }
    close()
  }

  function onThemeSelectChange(e) {
    const target = e.target as HTMLSelectElement;
    emitAction('themeChanged', target.value);
  }

  function openInFS() {
    invoke("show_item_in_filesystem")
  }

  function emitAction(name, value:any = null) {
    action(name, value)
  }

  onMount(() => {
    // Slightly jank, but needed for making this listener trigger only after the overlay has become visible
    setTimeout(() => {
      document.addEventListener("click", onDocumentClick);
    }, 0);
  })
  onDestroy(() => {
    document.removeEventListener("click", onDocumentClick);
  });
</script>

<!-- svelte-ignore a11y_missing_attribute -->
<div class="setting-overlay" bind:this={overlayEl} style={style}>
  <div class="settings-content">
    <div class="settings-actions">
      <div class="action">
        <span style="margin-right: 4px;">Theme</span>
        <select tabindex="0" value={$theme} onchange={onThemeSelectChange}>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
          <!-- detecting system theme does not work yet! It is always dark for some reason -->
          <!-- <option value="auto">System Default</option> -->
        </select>
      </div>
      <div class="action">
        <a onclick={openInFS} role="button" tabindex="0">
          Open notes in file system
        </a>
      </div>
      <div class="action">
        <a onclick={() => emitAction('toggleShowFilenames')} role="button" tabindex="0">
          Toggle filenames
        </a>
      </div>
    </div>
    <div>
      <p class="small">Version: 1.2.1</p>
      <p class="small">New releases and source code at: https://github.com/leovinogradov/CodeNoteApp</p>
    </div>
  </div>
</div>


<style lang="scss">
.setting-overlay {
  position: fixed;
  // Style can override these!
  bottom: 16px;
  left: 16px;
  z-index: 99;
}
.settings-content {
  padding: 8px;
  background-color: var(--background-color);
  border: 1px solid var(--splitter-color);
  width: 260px;
  border-radius: var(--border-radius);
  // z-index: 10;

  -webkit-box-shadow: var(--overlay-box-shadow);
	-moz-box-shadow: var(--overlay-box-shadow);
	box-shadow: var(--overlay-box-shadow);

  .settings-actions {
    padding-bottom: 6px;
    border-bottom: 1px solid rgba(0,0,0,0.1);
    .action {
      margin-bottom: 4px;
    }
  }

  a {
    cursor: pointer;
  }
  p.small {
    font-size: 0.8em;
    margin-top: 8px;
    margin-bottom: 0;
    word-wrap: break-word;
    line-height: 1.25;
  }
}

/* Show the menu */
.show {display:block;}
</style>
