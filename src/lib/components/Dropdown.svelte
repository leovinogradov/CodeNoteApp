<script lang="ts">
  import { createEventDispatcher } from 'svelte';
	const dispatch = createEventDispatcher();

	let menuOpen = false;
  let buttonEl;

  function onButtonClick() {
    menuOpen = !menuOpen;
    if (menuOpen) {
      dispatch('menuOpened')
    }
  }

  function onDocumentClick(e) {
    if (menuOpen) {
      let el = e.target;
      let maxIter = 4;
      let count = 0;
      while (el) {
        if (el == buttonEl) return;
        el = el.parentElement;
        if (count++ > maxIter) break;
      }
      menuOpen = false;
    }
  }
</script>

<svelte:window on:click={onDocumentClick} />

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div class="dropdown">
  <button on:click={onButtonClick} class="dropdown-button" bind:this={buttonEl}>
    <slot name="button"></slot>
  </button>
  <div class:show={menuOpen} class="dropdown-content" on:click={ () => menuOpen = !menuOpen }>	
    <slot name="content"></slot>
  </div>
</div>
	
	
<style lang="scss">
:global {
  .dropdown .dropdown-button {
    height: 28px;
    width: 30px !important;
  }
  .dropdown .dropdown-item {
    text-align: left;
    position: relative;
    p, h1, h2, h3 {
      margin: 0;
      color: inherit !important;
    }
    .selected-bar {
      position: absolute;
      top: calc(1.2em - 3px);
      left: 4px;
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background-color: var(--text-color);
    }
  }
  .dropdown button.dropdown-item {
    width: 100%;
    margin: 0;
    border-radius: 0;
    padding: 0 16px;
    height: 2.4em;
    line-height: 2.4em;
    // line-height: 1;
  }
  .dropdown {
    .dropdown-content {
      .ql-formats {
        margin-right: 0;
        margin-bottom: 8px;
        padding: 0 8px 4px 8px;
        border-bottom: 1px solid rgba(0, 0, 0, 0.07);
      }
      .ql-formats button {
        margin-top: 0;
        margin-bottom: 0;
        min-width: 16px;
      }
    }
  }
}

.dropdown {
  position: relative;
  display: inline-block;
}
	
.dropdown-content {
  display: none;
  position: absolute;
  padding: 8px;
  // background-color: #f6f6f6;
  background-color: rgba(255, 255, 255, 1);
  min-width: 150px;
  // width: 200px;
  border: 1px solid #ddd;
  border-radius: 3px;
  z-index: 10;
  top: 32px;
  // left: -56px; // -75 (150/2) of content + 19 (38/2) button
  // left: calc(-50% - 38px);
  // left: calc(-50% + 19px);
  left: 19px;
  transform: translateX(-50%);
}

/* Show the dropdown menu */	
.show {display:block;}	
</style>