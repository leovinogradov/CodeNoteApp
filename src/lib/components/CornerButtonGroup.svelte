<script lang="ts">
  import { Settings } from 'lucide-svelte';
  import { theme } from '../../store';
  import Svg from './Svg.svelte';
  import type { MouseEventHandler } from 'svelte/elements';

  type Props = {
    onSettingsClick: MouseEventHandler<any>;
    onUndeleteClick: MouseEventHandler<any>;
    recentlyDeletedIsOpen: boolean,
    style?: string;
  };

  const { onSettingsClick, onUndeleteClick, recentlyDeletedIsOpen, style } : Props = $props();

</script>

<div class={[ 'icon-button-group', { 'dark': $theme == 'dark' } ]} style={style} >
  <button class="icon-button" onclick={onSettingsClick}>
     <Settings size=26 style="display: block" />
  </button>
  <button class="icon-button" onclick={onUndeleteClick} class:active={recentlyDeletedIsOpen}>
    <Svg src="/img/Undelete.svg" height="26px" width="26px"></Svg>
  </button>
</div>


<style lang="scss">
  .icon-button-group {
    display: flex;
    // box-shadow: 0 2px 8px rgba(0,0,0,0.18);
    box-shadow: var(--overlay-box-shadow);
    line-height: 1; // Just in case
    .icon-button {
      padding: 3px;
      margin: 0;

      // Light bg
      background: var(--background-color);
      &:hover {
        background: var(--background-secondary);
      }

      border: 1px solid var(--border-color);
      border-radius: 0;
      &:first-child {
        border-radius: 6px 0 0 6px;
      }
      &:last-child {
        border-radius: 0 6px 6px 0;
      }
      &:not(:last-child) {
        border-right: none;
      }
    }

    &.dark {
      // Dark bg
      .icon-button {
        background: var(--background-secondary);
      }
      .icon-button:hover {
        color: var(--button-highlight-color);
        background: var(--background-color); // Instead of selected color, go back to primary bg color
      }
    }
  }
</style>