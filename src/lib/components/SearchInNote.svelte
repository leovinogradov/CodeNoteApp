<script lang="ts">
	import { XIcon } from "lucide-svelte";
	// import { createEventDispatcher } from 'svelte';
	import { Editor } from "../service/editor";
	import { platform } from '@tauri-apps/plugin-os';
	// const dispatch = createEventDispatcher();

	let searchValue = "";
	let newValue = "";
	let isReplacing = false;
	let show = false;

	let _editor: Editor|any = null;
	// property of KeyboardEvent for detecting ctrl + f on Windows and CMD + f on mac
	// use e.ctrlKey for Windows and e.metaKey for Mac
	let _alternateFunctionProperty: string = "ctrlKey";

	let searchInputEl;

	export function isInitialized() {
		return !!_editor;
	}

	export function close() {
		show = false;
	}

	export function init(editor: Editor) {
		console.log('SearchInNote init')
		_editor = editor
			
		// Clear these bindings, let them get handled by global event handler
		/* editor.quill.keyboard.addBinding({  // ctrl + f
			key: 'f',
			ctrlKey: true,
			handler: function() {}
		});

		editor.quill.keyboard.addBinding({  // ctrl + shift + f
			key: 'f',
			ctrlKey: true,
			shiftKey: true,
			handler: function() {}
		}); */
	}

	let _timer;
	function debounce(func, timeout=50){
		clearTimeout(_timer);
		_timer = setTimeout(func, timeout);
	}

	function onSearchInput() {
		debounce(doSearch, 50)
	}

	function doSearch() {
		if (searchValue) {
			_editor.searcher.search(searchValue)
		} else {
			_editor.searcher.clear()
		}
		
	}

	function clearSearch() {
		searchValue = ""
		doSearch()
	}

	function openSearch() {
		show = true;
		// setTimeout so that focus triggers after element is visible
		setTimeout(() => {
			searchInputEl.focus()
			if (searchValue) {
				doSearch()
			}
		}, 0)
	}

	function find() {
		// TODO: search for selected
		// searchValue = "test"
		openSearch()
	}

	function findReplace() {
		show = !show;
	}

	function findNext() {
		_editor.searcher.search(searchValue)
	}

	function findPrev() {
		
	}

	// tauri api call to get platform
	platform().then(platformName => {
      if (platformName && typeof platformName == 'string') {
        console.log('current platform is', platformName);
		if (platformName == 'macos') {
			_alternateFunctionProperty = "metaKey"
		} else {
			_alternateFunctionProperty = "ctrlKey"
		}
      }
    })

	function onKeyDown(e) {
		if (e.key === 'f' && e[_alternateFunctionProperty]) {
			e.preventDefault()
			if (e.shiftKey) {
				// ctrl/CMD + shift + f
				findReplace()
			} else {
				// ctrl/CMD + f
				find()
			}
		}
	}
</script> 
	

<div class="find-and-replace" class:show={show}>
	<input bind:value={searchValue} bind:this={searchInputEl} on:input={onSearchInput} placeholder="Search" />
	<button hidden={!searchValue} class="clear-search" on:click={clearSearch}>
		<XIcon size="14" strokeWidth="2" color="#444"  />
	</button>

	<button hidden={!searchValue} class="clear-search" on:click={findNext}>
		>
	</button>
</div>

<svelte:window on:keydown={onKeyDown} />

<style lang="scss">
	.find-and-replace {
		position: fixed;
		z-index: 99;
		top: 60px;
		right: 30px;
		width: 300px;
		background-color: red;
		display: none;
	}
	.find-and-replace.show {
		display: block;
	}
</style>