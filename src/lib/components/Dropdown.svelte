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
  .dropdown button.dropdown-item {
    text-align: left;
    position: relative;
    width: 100%;
    margin: 0;
    border-radius: 0;
    padding: 0 10px;
    height: 100%;
    margin-bottom: 6px;

    // For some reason, line-height: 1 is taller than the font?? Adjusting for it here
    line-height: 0.9;
    h1 {line-height: calc(2rem - 4px);}

    p, h1, h2, h3 {
      padding: 4px 6px;
      margin: 0;
      border-radius: 4px;
      color: var(--text-color);
      transition-property: background-color, color;
      transition-duration: 0.1s;
      transition-timing-function: ease-in-out;
    }
  }
  .dropdown button.dropdown-item.selected {
    p, h1, h2, h3 {
      background-color: rgba(0,0,0,0.05);
    }
  }
  .dropdown button.dropdown-item:hover {
    p, h1, h2, h3 {
      background-color: var(--text-color);
      color: white !important;
    }
  }
  .dropdown {
    .dropdown-content {
      .ql-formats {
        margin-right: 0;
        margin-bottom: 6px;
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