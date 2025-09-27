<script lang="ts">
	import { XIcon } from "lucide-svelte";
	import IconButton from "./IconButton.svelte";
	import type { FormEventHandler } from "svelte/elements";

	type Props = {
    value: string;
    clear: () => void;
		oninput?: FormEventHandler<any>,
		disabled?: boolean
  };

	let { value = $bindable(''), clear, oninput, disabled }: Props = $props();
</script>

<div class="searchbar">
	<input bind:value={value} oninput={oninput} placeholder="Search" type="text" spellcheck="false" disabled={disabled} name="search" />
	<IconButton mini icon={XIcon} iconProps={{ size: 14, strokeWidth: 2 }} 
		class="clear-search"hidden={!value} disabled={disabled} 
		onclick={() => clear()}>
	</IconButton>
</div>

<style lang="scss">
	.searchbar {
		width: 100%;
		height: 32px;
		padding: 0 10px 0 12px;
		background-color: var(--background-secondary);
		border: 1px solid var(--background-color);
		border-radius: 20px;
		line-height: 32px;
		input {
			width: calc(100% - 27px);
			padding-right: 0;
			color: var(--text-color);
      background-color: var(--background-secondary);
			&:disabled {
				opacity: 0.5; // temp until we can get a proper color 
			}
		}
		// Use global to drill down into component
		:global(button.clear-search) {
			min-width: 20px;
			width: 20px;
			padding: 0;
			margin: 0;
			border: none;
			vertical-align: middle;
		}
	}
</style>