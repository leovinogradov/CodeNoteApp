<script lang="ts">
  import { onMount } from 'svelte'

  let containerEl;

  export let src;
  export let height: string|null = null;
  export let width: string|null = null;

  function setSvgHtml(html) {
    containerEl.innerHTML = html;
    // console.log('test1')
    // console.log(containerEl.innerHTML)
    // console.log(containerEl.firstElementChild)
    containerEl.querySelectorAll('rect, polyline, path').forEach(el => {
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
  // const svgDecoded = decodeURIComponent(src).replace('data:image/svg+xml,', '');=
</script>

<div class="custom-svg" bind:this={containerEl}>
</div>

<style lang="scss">
:global {

}
</style>