<script lang="ts">
import Main from "./Main.svelte";
import StandaloneWindow from "./StandaloneWindow.svelte";
// import { WebviewWindow, getCurrentWindow } from '@tauri-apps/api/window';
import { Window } from "@tauri-apps/api/window"

const isMainWindow = $state(Window.getCurrent().label == "main") 

</script>

{#if isMainWindow}
  <Main></Main>
{:else}
  <StandaloneWindow></StandaloneWindow>
{/if}