<script lang="ts">
  import { getContext, hasContext, onMount } from "svelte";
  import { splitterContextKey } from "./splitter/constants";
  import type { SplitterContextStore } from "./splitter/types";

  // export let color: string = "rgba(0,0,0,0.1)";
  export let color: string = "var(--splitter-color)";
  // export let hoverColor: string = "rgba(0,0,0,0.25)";
  // export let dragColor: string = "rgba(0,0,0,0.25)";
  export let dragColor: string = "var(--splitter-color-dragging)";

  let splitterContext: SplitterContextStore = getContext<SplitterContextStore>(splitterContextKey);

  $: dragging = $splitterContext?.dragging;
  // $: horizontal = $splitterContext?.horizontal;


  $: splitterStyles = {
    "--splitter-color-internal": dragging ? dragColor : color,
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
  :global {
    .split > .secondary {
      width: calc(100% + 4px) !important; 
      margin-left: -4px !important;
    }
    .split > .primary {
      width: calc(100% + 4px) !important; 
      margin-right: -4px !important;
    }
  }
  .splitter {
    box-sizing: border-box;
    outline: none;
    overflow: hidden;
    height: 100%;
    width: 100%;
    padding: 52px 4px 0 4px; // 52px to account for header bar=
    user-select: none;
    -webkit-user-select: none;
    & > .inner {
      user-select: none;
      height: 100%;
      width: 100%;
      width: 1px;
      background: var(--splitter-color-internal);
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

  // .splitter:focus > .inner {
  //   // background: rgba(0,0,0,0.25); 
  //   background: var(--splitter-hover-color);
  // }
</style>