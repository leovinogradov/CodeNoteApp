<script lang="ts">
	import { XIcon, ChevronRight, ChevronDown, ArrowUp, ArrowDown } from "lucide-svelte";
	// import { createEventDispatcher } from 'svelte';
	import { Editor } from "../service/editor";
	import { platform } from '@tauri-apps/plugin-os';
	// const dispatch = createEventDispatcher();

	let searchValue = "";
	let replaceWithValue = "";
	let isReplacing = false;
	let show = false;

	let currentIndex = 0;
	let numResults = 0;

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
		isReplacing = false;
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

	function replaceNext() {
		findNext()
		_editor.searcher.replace(searchValue, replaceWithValue)
	}

	function findNext() {
		_editor.searcher.goToNextIndex()
	}

	function findPrev() {
		_editor.searcher.goToPrevIndex()
	}

	function toggleReplace() {
	   isReplacing = !isReplacing
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
		else if (show && e.key === "Enter" && searchValue) {
			// Todo: only if search value is focused, find next
			findNext()
			// If replace value is focused, replaceNext()
		}
	}
</script>


<div class="find-and-replace" class:show={show} class:replacing={isReplacing}>
    <div class="replace-toggle-container">
        {#if isReplacing}
            <button on:click={toggleReplace}>
                <ChevronDown size="16" color="#444" />
            </button>
        {:else}
          <button on:click={toggleReplace}>
              <ChevronRight size="16" color="#444" />
          </button>
        {/if}
    </div>
    <div class="input-container">
		<div class="row1">
			<input bind:value={searchValue} bind:this={searchInputEl} on:input={onSearchInput} placeholder="Find" />

			<div class="results-text-container">
				{#if numResults}
			    	<span class="results">0 of 0</span>
				{:else}
					<span class="results">No results</span>
				{/if}
			</div>
			

			<div class="end-buttons">
				<button on:click={findPrev} disabled="{!searchValue}">
					<span>
						<ArrowUp size="16" color="{ searchValue ? '#444' : '#ccc' }" />
					</span>
				</button>
				<button on:click={findNext} disabled="{!searchValue}">
					<span>
						<ArrowDown size="16" color="{ searchValue ? '#444' : '#ccc' }" />
					</span>
				</button>
				<button on:click={close}>
					<span>
						<XIcon size="16" color="#444"  />
					</span>
				</button>
			</div>
		</div>

		{#if isReplacing}
			<div class="row2">
				<input bind:value={replaceWithValue} placeholder="Replace" />
			</div>
		{/if}
	</div>
	<div class="end-container">
		
	</div>
</div>

<svelte:window on:keydown={onKeyDown} />

<style lang="scss">
	.find-and-replace {
		position: fixed;
		z-index: 99;
		top: 60px;
		right: 15px;
		// width: 310px;
		background-color: white;
		border-radius: 4px;
		border: 1px solid rgba(0,0,0,0.1);
		display: none;
		height: 28px;
		&.replacing {
			height: 53px;
		}
		.replace-toggle-container {
			padding: 4px;
			button {
				padding: 2px 2px;
				border: 0;
				width: 20px;
				height: 100%;
			}
		}
		.input-container {
			padding: 2px;
			.results-text-container {
				width: 65px;
				display: inline-block;
				.results {
					font-size: 12px;
				}
			}
			

			input {
				border: 0;
				margin: 2px 0;
				// width: calc(100% - 3px);
				width: 160px;
			}

			.end-buttons {
				padding: 2px;
				line-height: 20px;
				display: inline-block;
				button {
					width: 20px;
					height: 20px;
					// padding: 2px; // 21 - 3 - 3 = 15px (size of svg)
					padding: 0;
					border: 0;
					position: relative;
					display: inline-block;
					span {
						position: absolute; /*Can also be `fixed`*/
						left: 0;
						right: 0;
						top: 0;
						bottom: 0;
						margin: auto;
						width: 16px;
						height: 16px;
						display: inline-block;
					}
				}
			}
		}
		
		// All buttons
		button {
			vertical-align: top;
		}
	}
	.find-and-replace.show {
		display: flex;
	}
</style>
