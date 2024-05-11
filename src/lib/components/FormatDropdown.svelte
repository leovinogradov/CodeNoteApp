<script lang="ts">
  import Svg from './Svg.svelte'

  export let editor

	let menuOpen = false
  let buttonEl
  let formatvalue = -1
  
  function onButtonClick() {
    menuOpen = !menuOpen;
    if (menuOpen) {
      // Update formatvalue
      const format = editor.quill.getFormat()
      if (format['header']) {
        formatvalue = format['header']
      } else if (format['code-block']) {
        formatvalue = -1
      } else {
        formatvalue = 0
      }
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

  function onLinkFormatClick() {
    // Adjust postion of tooltip, because it can sometimes be out of bounds
    setTimeout(() => {
      const containerEl = editor.quill.container;
      const tooltips = containerEl.getElementsByClassName('ql-tooltip')
      if (tooltips.length == 0) return;

      const tooltip: HTMLElement = tooltips[0] as HTMLElement;
      if (tooltip.style && tooltip.style.left) {
        let val = parseFloat(tooltip.style.left)
        if (val < 15) {
          tooltip.style.left = '15px';
          console.log('moved tooltip left')
        } else if ((val + tooltip.scrollWidth + 25) > containerEl.scrollWidth) {
          tooltip.style.left = `${containerEl.scrollWidth - tooltip.scrollWidth - 25}px`;
          console.log('moved tooltip right')
        }
      }
    }, 0)
  }
</script>

<svelte:window on:click={onDocumentClick} />


<span class="dropdown">
  <button on:click={onButtonClick} class="dropdown-button custom-icon-btn" bind:this={buttonEl}>
    <Svg src="/img/Font.svg" height="18px"></Svg>
  </button>

  <div hidden={!menuOpen} class="dropdown-content" on:click={ () => menuOpen = !menuOpen }>	
    <div class="ql-formats format-row-1">
      <!-- formats with easy keyboard shortcut go here -->
      <button class="ql-bold" />
      <button class="ql-italic" />
      <button class="ql-underline" />
      <button class="ql-strike" />
    </div>

    <div class="ql-formats format-row-2">
      <div class="inner">
        <button class="ql-code" />
        <button class="ql-link" on:click={onLinkFormatClick} />
      </div>
    </div>

    <button class="dropdown-item" class:selected="{formatvalue==1}" on:click={() => { editor.quill.format('header', 1) }}>
      <h1>Title</h1>
    </button>
    <button class="dropdown-item" class:selected="{formatvalue==2}" on:click={() => { editor.quill.format('header', 2) }}>
      <h2>Heading</h2>
    </button>
    <button class="dropdown-item" class:selected="{formatvalue==3}" on:click={() => { editor.quill.format('header', 3) }}>
      <h3>Subheading</h3>
    </button>
    <button class="dropdown-item" class:selected="{formatvalue==0}" on:click={() => { editor.quill.format('header', 0) }}>
      <p>Paragraph</p>
    </button>
  </div>
</span>
	
	
<style lang="scss">
.dropdown .dropdown-button {
  height: 24px;
  width: 30px;
  vertical-align: middle;
}
.dropdown-content {
  button.dropdown-item {
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

    &.selected {
      p, h1, h2, h3 {
        background-color: rgba(0,0,0,0.05);
      }
    }

    &:hover {
      p, h1, h2, h3 {
        background-color: var(--text-color);
        color: white !important;
      }
    }
  }

  .ql-formats {
    margin-right: 0;
    padding: 0 10px 4px 10px;

    &.format-row-2 {
      width: 100%;
      .inner {
        width: 50%;
        display: flex;
      }
      margin-bottom: 6px;
      border-bottom: 1px solid rgba(0, 0, 0, 0.07);
    }

    button {
      margin: 0 auto;
    }
  }
}

.dropdown {
  position: relative;
  display: inline-block;
}
	
.dropdown-content {
  position: absolute;
  padding: 8px;
  background-color: rgba(255, 255, 255, 1);
  min-width: 150px;
  border: 1px solid #ddd;
  border-radius: 3px;
  z-index: 99;
  top: 32px;
  
  // Holy shit I can center a div?
  left: 50%;
  transform: translateX(-50%);
}
</style>