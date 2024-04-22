<script lang="ts">
  import { getContext, hasContext, onMount } from "svelte";
  // @ts-ignore
  import { splitterContextKey } from "@geoffcox/svelte-splitter";
  import type { SplitterContextStore } from "@geoffcox/svelte-splitter";
  // splitterContextKey == { name: 'SplitterContext' };


  export let color: string = "rgba(0,0,0,0.1)";
  // export let hoverColor: string = "rgba(0,0,0,0.25)";
  export let dragColor: string = "rgba(0,0,0,0.25)";

  // console.log(`has context: ${hasContext(splitterContextKey)}`);
  let splitterContext: SplitterContextStore = getContext<SplitterContextStore>(splitterContextKey);

  $: dragging = $splitterContext?.dragging;
  // $: horizontal = $splitterContext?.horizontal;

  // $: console.log(`$splitterContext ${$splitterContext}`);
  // $: console.log(`dragging ${dragging}`);

  $: splitterStyles = {
    "--splitter-color": dragging ? dragColor : color,
    // "--splitter-hover-color": dragging ? dragColor : hoverColor,
  };

  $: splitterStyle = Object.entries(splitterStyles)
    .map(([key, value]) => `${key}:${value}`)
    .join(";");
</script>

<div class="splitter vertical" style={splitterStyle}>
  <div class="inner"></div>
</div>

<style lang="scss">
  .splitter {
    box-sizing: border-box;
    outline: none;
    overflow: hidden;
    height: 100%;
    width: 100%;
    padding: 52px 4px 0 4px; // 52px to account for header bar
    user-select: none;
    & > .inner {
      height: 100%;
      width: 100%;
      width: 1px;
      background: var(--splitter-color);
      transition: background-color 250ms;
    }
  }

  .splitter.vertical {
    cursor: col-resize;
  }

  // .splitter.horizontal {
  //   cursor: row-resize;
  // }

  // .splitter:hover > .inner {
  //   // background: rgba(0,0,0,0.25); //var(--splitter-hover-color);
  //   background: var(--splitter-hover-color);
  // }

  .splitter:focus > .inner {
    // background: rgba(0,0,0,0.25); 
    background: var(--splitter-hover-color);
  }
</style>