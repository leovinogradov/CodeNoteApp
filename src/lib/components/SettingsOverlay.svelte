<script lang="ts">
  import { Settings } from 'lucide-svelte';
  import { invoke } from "@tauri-apps/api/core";
  import { settingsStore } from '../../store';
  import { createEventDispatcher } from 'svelte';
	const dispatch = createEventDispatcher();


  let theme;
  settingsStore.subscribe((val: any) => {
		if (val && val.theme) {
      theme = val.theme;
    }
	})

	let menuOpen = false;
  let overlayEl;

  function onButtonClick() {
    menuOpen = !menuOpen;
  }

  function onDocumentClick(e) {
    if (menuOpen) {
      let el = e.target
      let maxIter = 3;
      let count = 0;
      while (el) {
        if (el == overlayEl) return;
        el = el.parentElement
        if (count++ > maxIter) break;
      }
      menuOpen = false;
    }
  }

  function openInFS() {
    invoke("show_item_in_filesystem")
  }

  function emitAction(name, value:any = null) {
    dispatch('action', { name, value })
  }
</script>

<svelte:window on:click={onDocumentClick} />

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<!-- svelte-ignore a11y-missing-attribute -->
<div class="setting-overlay" bind:this={overlayEl}>
  <button on:click={onButtonClick} class="settings-button">
    <Settings size=26 color="{theme == 'dark' ? '#fff' : '#333'}" />
  </button>
  <div class:show={menuOpen} class="settings-content">
    <div class="settings-actions">
      <div class="action">
        <span style="margin-right: 4px;">Theme</span>
        <select tabindex="0" bind:value={theme} on:change="{(e) => emitAction('themeChanged', theme)}">
          <option value="light">Light</option>
          <option value="dark">Dark</option>
          <!-- detecting system theme does not work yet! It is always dark for some reason -->
          <!-- <option value="auto">System Default</option> -->
        </select>
      </div>
      <div class="action">
        <a on:click={openInFS} role="button" tabindex="0">
          Open notes in file system
        </a>
      </div>
      <div class="action">
        <a on:click={() => emitAction('toggleShowFilenames')} role="button" tabindex="0">
          Toggle filenames
        </a>
      </div>
    </div>
    <div>
      <p class="small">Version: 1.1.0</p>
      <p class="small">New releases and source code at: https://github.com/leovinogradov/CodeNoteApp</p>
    </div>
  </div>
</div>


<style lang="scss">
.setting-overlay {
  position: fixed;
  bottom: 16px;
  left: 16px;
  width: 26px;
  height: 26px;
  z-index: 99;
}
.settings-button {
  padding: 0;
  border: 0;
  width: 26px;
  height: 26px;
  border-radius: 13px;
  background-color: rgba(255, 255, 255, 0.5);
}
.settings-content {
  display: none;
  position: absolute;
  padding: 8px;
  // background-color: #f6f6f6;
  // background-color: rgba(255, 255, 255, 1);
  background-color: var(--background-color);
  border: 1px solid var(--splitter-color);
  width: 260px;
  border-radius: 3px;
  z-index: 10;
  bottom: 36px;
  left: 0;

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
