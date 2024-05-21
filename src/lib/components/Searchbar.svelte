<script lang="ts">
	import { XIcon } from "lucide-svelte";
	import { createEventDispatcher } from 'svelte';
	const dispatch = createEventDispatcher();
	export let value = ''
	// export let placeholder = 'Search'
</script>

<div class="searchbar">
	<input bind:value on:input placeholder="Search" />
	<button hidden={!value} class="clear-search" on:click={() => dispatch('clear')}>
		<XIcon size="14" strokeWidth="2" color="#444"  />
	</button>
</div>

<style lang="scss">
	.searchbar {
		border: 1px solid lightgray;
		padding: 0 10px 0 12px;
		border-radius: 20px;
		width: 100%;
		height: 32px;
		line-height: 32px;
		input {
			width: calc(100% - 27px);
			padding-right: 0;
			// padding-bottom: 2px;
		}
		button.clear-search {
			height: 20px;
			min-width: 20px;
			width: 20px;
			padding: 0;
			margin: 0;
			border: none;
			vertical-align: middle;
		}
	}
</style>