<script lang="ts">
	let menuOpen = false;
  let buttonEl;

  function onButtonClick() {
    menuOpen = !menuOpen;
    // if (menuOpen) {
    //   setTimeout(() => {
    //     document.addEventListener('click', onDocumentClick, { once: true });
    //   }, 0);
    // }
  }

  function onDocumentClick(e) {
    let el = e.target
    let maxIter = 4;
    let count = 0;
    while (el) {
      if (el == buttonEl) return;
      el = el.parentElement
      if (count++ > maxIter) break;
    }
    menuOpen = false;
  }
</script>

<svelte:window on:click={onDocumentClick} />

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<section class="dropdown">
  <button on:click={onButtonClick} class="dropdown-button" bind:this={buttonEl}>
    <slot name="button"></slot>
  </button>
  <div class:show={menuOpen} class="dropdown-content" on:click={ () => menuOpen = !menuOpen }>	
    <slot name="content"></slot>
  </div>
</section>
	
	
<style lang="scss">
:global {
  .dropdown .dropdown-button {
    height: 28px;
    width: 30px !important;
  }
  .dropdown .dropdown-item {
    text-align: left;
  }
  .dropdown button.dropdown-item {
    width: 100%;
    margin: 0;
    border-radius: 0;
    padding: 6px 8px;
    height: 28px;
    line-height: 1;
  }
  .dropdown {
    .dropdown-content {
      .ql-formats {
        margin-bottom: 8px;
        padding-bottom: 4px;
        border-bottom: 1px solid rgba(0, 0, 0, 0.07);
      }
      .ql-formats button {
        margin: 0;
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
  padding: 12px 16px;
  // background-color: #f6f6f6;
  background-color: rgba(255, 255, 255, 1);
  min-width: 150px;
  border: 1px solid #ddd;
  z-index: 1;
  top: 28px;
  left: calc(-50% - 38px);
}

/* Show the dropdown menu */	
.show {display:block;}	
</style>