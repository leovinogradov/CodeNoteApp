<script lang="ts">
  import { onMount } from 'svelte'
  let containerEl;
  export let src;
  export let height = '18px';
  export let width = null;

  function setSvgHtml(html) {
    containerEl.innerHTML = html;

    let svgEl = containerEl.firstElementChild;
    svgEl.style.height = height;
    if (width) {
      svgEl.style.width = width;
    }
  }

  onMount(() => {
    fetch(src)
      .then(r => r.text())
      .then(data => {
        if (data) {
          let svgHtml = data.replace('<?xml version="1.0" encoding="utf-8"?>', '')
          if (containerEl) {
            setSvgHtml(svgHtml)
          }
          else {
            console.error('no containerEl???')
            // setTimeout(() => {
            //   setSvgHtml(svgHtml)
            // }, 0)
          }
        }
      })
      .catch(console.error.bind(console));
  })
  // const svgDecoded = decodeURIComponent(src).replace('data:image/svg+xml,', '');=
</script>

<div class="custom-svg" bind:this={containerEl}>
</div>

<!-- height={height} width={width} -->