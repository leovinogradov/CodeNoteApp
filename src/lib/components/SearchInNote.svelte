<script lang="ts">
	import { XIcon, ChevronRight, ChevronDown, ArrowUp, ArrowDown, Replace, ReplaceAll } from "lucide-svelte";
	import { Editor } from "../service/editor";
	import { platform } from '@tauri-apps/plugin-os';

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

	// DOM elements
	let searchInputEl;
	let replaceInputEl;

	export function isInitialized() {
		return !!_editor;
	}

	export function close() {
		show = false;
		isReplacing = false;
		numResults = 0;
		_editor.searcher.clear();
	}

	export function init(editor: Editor) {
		console.log('SearchInNote init')
		_editor = editor
		editor.searcher.onSearchCB = onSearchCB
	}

	let _timer;
	function debounce(func, timeout=50){
		clearTimeout(_timer);
		_timer = setTimeout(func, timeout);
	}

	function onSearchInput() {
		debounce(doSearch, 50)
	}

	function onSearchCB(newNumResults, newCurrentIndex) {
		numResults = newNumResults
		currentIndex = newCurrentIndex + 1
	}

	function doSearch() {
		if (searchValue) {
			_editor.searcher.search(searchValue)
			// numResults = _editor.searcher.search(searchValue)
			// currentIndex = _editor.searcher.currentIndex + 1
		} else {
			_editor.searcher.clear()
			// numResults = 0
			// currentIndex = 0
		}
	}

	function openFind() {
		show = true;
		// setTimeout so that focus triggers after element is visible
		setTimeout(() => {
			searchInputEl.focus()
			if (searchValue) {
				doSearch()
			}
		}, 0)
	}

	function openFindReplace() {
		isReplacing = true;
		openFind();
	}

	function replaceNext() {
		numResults = _editor.searcher.replace(searchValue, replaceWithValue)
		currentIndex = _editor.searcher.currentIndex + 1
	}

	function replaceAll() {
		numResults = _editor.searcher.replaceAll(searchValue, replaceWithValue)
		currentIndex = _editor.searcher.currentIndex + 1
	}

	function findNext() {
		_editor.searcher.goToNextIndex()
		currentIndex = _editor.searcher.currentIndex + 1
	}

	function findPrev() {
		_editor.searcher.goToPrevIndex()
		currentIndex = _editor.searcher.currentIndex + 1
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

	function _findInputsFocused() {
		return document.activeElement == searchInputEl || document.activeElement == replaceInputEl
	}

	function _isEditorFocused() {
		return _editor.quill.hasFocus()
	}

	function onKeyDown(e) {
		if (e[_alternateFunctionProperty]) {
			if ((e.key === 'f' || e.key === 'F')) {
				e.preventDefault()
				if (e.shiftKey) {
					// ctrl/CMD + shift + f
					openFindReplace()
				} else {
					// ctrl/CMD + f
					openFind()
				}
			}
			else if ((e.key === 'z' || e.key === 'Z') && !_findInputsFocused()) {
				_editor.undo()
				e.preventDefault()
			}
			else if ((e.key === 'y' || e.key === 'Y') && !_findInputsFocused()) {
				_editor.redo()
				e.preventDefault()
			}
		}
		else if (show) {
			if (e.key === "Enter" && searchValue && numResults) {
				if (document.activeElement === searchInputEl) {
					findNext()
				} else if (document.activeElement === searchInputEl) {
					replaceNext()
				}
			}
			else if (e.key === "Tab" && isReplacing) {
				// Override default tabbing behavior to switch between search and replace fields
				if (document.activeElement === searchInputEl) {
					e.preventDefault()
					replaceInputEl.focus()
				} else if (document.activeElement === replaceInputEl) {
					e.preventDefault()
					searchInputEl.focus()
				}
			}
		}
	}

	// Special handler mainly for Mac
	function onBeforeInput(e) {
		if (e.inputType == "historyUndo" && !_findInputsFocused() && !_isEditorFocused()) {
			e.preventDefault()
			e.stopPropagation()
			_editor.undo()
		}
	}
</script>


<div class="find-and-replace" class:show={show} class:replacing={isReplacing}>
    <div class="replace-toggle-container">
        {#if isReplacing}
            <button on:click={toggleReplace}>
                <span><ChevronDown size="16" color="#444" /></span>
            </button>
        {:else}
			<button on:click={toggleReplace}>
				<span><ChevronRight size="16" color="#444" /></span>
			</button>
        {/if}
    </div>
    <div class="input-container">
		<div class="row1">
			<input bind:value={searchValue} bind:this={searchInputEl} on:input={onSearchInput} placeholder="Find" tabindex="0" />

			<div class="results-text-container">
				{#if numResults}
			    	<span class="results">{currentIndex} of {numResults}</span>
				{:else}
					<span class="results">No results</span>
					<!-- <span class="results">0 of 0</span> -->
				{/if}
			</div>
			

			<div class="action-buttons">
				<button on:click={findPrev} disabled="{!searchValue}" tabindex="-1">
					<span><ArrowUp size="16" color="{ searchValue ? '#444' : '#ccc' }" /></span>
				</button>
				<button on:click={findNext} disabled="{!searchValue}" tabindex="-1">
					<span><ArrowDown size="16" color="{ searchValue ? '#444' : '#ccc' }" /></span>
				</button>
				<button on:click={close} tabindex="-1">			
					<span><XIcon size="16" color="#444" /></span>
				</button>
			</div>
		</div>

		{#if isReplacing}
			<div class="row2">
				<input bind:value={replaceWithValue} bind:this={replaceInputEl} placeholder="Replace" tabindex="0" />
				
				<div class="action-buttons">
					<button on:click={replaceNext} disabled="{!replaceWithValue || numResults == 0}">
						<span><Replace size="16" color="{ (!replaceWithValue || numResults == 0) ? '#ccc' : '#444' }" /></span>
					</button>
					<button on:click={replaceAll} disabled="{!replaceWithValue || numResults == 0}">
						<span><ReplaceAll size="16" color="{ (!replaceWithValue || numResults == 0) ? '#ccc' : '#444' }" /></span>
					</button>
				</div>
			</div>
		{/if}
	</div>
	<div class="end-container">
		
	</div>
</div>

<svelte:window on:keydown={onKeyDown} on:beforeinput={onBeforeInput} />

<style lang="scss">
	.find-and-replace {
		position: fixed;
		z-index: 99;
		top: 60px;
		right: 23px;
		// width: 310px;
		line-height: 1;
		background-color: white;
		border-radius: 4px;
		border: 1px solid rgba(0,0,0,0.1);
		display: none;
		// height: 28px;
		// &.replacing {
		//     height: 53px;
		// }
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
				width: 64px;
				display: inline-block;
				padding: 2px;
				line-height: 1;
				.results {
					font-size: 13px;
				}
			}
			

			input {
				border: 0;
				margin: 2px 0;
				// width: calc(100% - 3px);
				width: 150px;
			}
		}

		.action-buttons {
			padding: 2px;
			line-height: 20px;
			display: inline-block;
			button {
				width: 20px;
				height: 20px;
				padding: 0;
				border: 0;
			}
		}

		// .row2 .action-buttons {
		// 	button {
		// 		border: 1px solid rgba(0,0,0,0.1);
		// 	}
		// }
		
		// All buttons
		button {
			vertical-align: top;
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
		button:not(:disabled):hover {
			background-color: #f4f4f4;
		}
	}
	.find-and-replace.show {
		display: flex;
	}
</style>
