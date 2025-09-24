<script lang="ts">
  import { onMount } from 'svelte'

  let containerEl;

  export let src;
  export let height: string|null = null;
  export let width: string|null = null;
  export let color: string|null = null;

  // $: svgStyle = {
  //   "color": color
  // };

  function setSvgHtml(html) {
    containerEl.innerHTML = html;
    // may need to do all three of 'rect, polyline, path' later
    containerEl.querySelectorAll('path').forEach(el => {
      // el.classList.clear();
      if (el.attributes && el.attributes.fill && el.attributes.fill.value == "none") {
        el.classList.add('nofill')
      }
    })

    let svgEl = containerEl.firstElementChild;
    if (height) {
      svgEl.style.height = height;
      containerEl.style.height = height;
    }
    if (width) {
      svgEl.style.width = width;
      containerEl.style.width = width;
    }
    // if (color) {
      
    // }
    // Color set from style on outer custom-svg
    svgEl.style.color = "inherit";
  }

  onMount(() => {
    fetch(src)
      .then(r => r.text())
      .then(data => {
        if (data) {
          const svgHtml = data.replace('<?xml version="1.0" encoding="utf-8"?>', '')
          if (containerEl) {
            setSvgHtml(svgHtml)
          }
          else {
            console.error('SVG: no containerEl???')
          }
        }
      })
      .catch(console.error.bind(console));
  })
</script>

<div class="custom-svg" bind:this={containerEl} style="{color}">
</div>

<style lang="scss">
:global .custom-svg svg {
  path:not(.nofill) {
    fill: currentColor !important; // override any custom colors from the svg html
  }
  path.nofill {
    stroke: currentColor !important; // override any custom colors from the svg html
  }
}
.custom-svg {
  display: flex;
}
</style>