class Searcher {
    occurrencesIndices = [];
    searchedElementList = [];
    searchHighlightElementList = [];
    currentIndex = 0;
    SearchedString = "";
    lastCursorIndex = null;
    cursorIndex = null;
    firstTime = false;
    
    quill;
    editorElement;
    resizeObserver;
    onSearchCB;
    _timeout;

    constructor(quill, editorElement) {
        this.quill = quill;
        this.editorElement = editorElement;

        this.resizeObserver = new ResizeObserver((entries) => {
            if (this.SearchedString) {
                // Update highlight position
                this.search(this.SearchedString, true);
            }
        });

        this.resizeObserver.observe(this.editorElement)

        this.quill.on('text-change', (delta, oldDelta, source) => {
            if (source == 'user' && this.SearchedString) {
                if (this._timeout) {
                    clearTimeout(this._timeout)
                }
                this._timeout = setTimeout(() => {
                    this.search(this.SearchedString)
                }, 50)
            } 
        });
        this.quill.on('selection-change', (range, _oldRange, source) => {
			if (range && source == 'user') {
				this.cursorIndex = range.index
			}
		});
    }

    search(searchString, useExistingIndices=false) {
        /* useExistingIndices: if true, just reapply highlight without searching text */
        const lastNumResults = this.occurrencesIndices.length;
        this.SearchedString = searchString;
        this.clearHighlight();
        let match = false;

        if (useExistingIndices) {
            match = this.occurrencesIndices.length != 0
        }
        else if (this.SearchedString) {
            // const p1 = performance.now()
            const totalText = this.quill.getText();
            const re = new RegExp(this.SearchedString, "gi");
            match = re.test(totalText);
            if (match) {
                this.occurrencesIndices = this.getIndicesOf(totalText, this.SearchedString);
            }
            // const p2 = performance.now()
            // console.log('search performance:', p2-p1)
            // Note: search performance is surprisingly fast, under 0.5ms for sizable text
        }

        if (match) {
            const length = this.SearchedString.length;
            const editorBounds = this.editorElement.getBoundingClientRect()

            for (let idx of this.occurrencesIndices) {
                const bounds = this.quill.selection.getBounds(idx, length);
                
                const newDiv = document.createElement('div')

                newDiv.className = "search-highlight" // does the highlight
                newDiv.style.position = "absolute"

                newDiv.style.top = (bounds.top-editorBounds.top)+"px"
                newDiv.style.left = (bounds.left-editorBounds.left)+"px"

                newDiv.style.width = bounds.width+"px"
                newDiv.style.height = bounds.height+"px"

                this.searchHighlightElementList.push(newDiv)
                this.editorElement.appendChild(newDiv)
            }

            this.firstTime = true
            
            if (this.currentIndex >= this.occurrencesIndices.length) {
                this.currentIndex = this.occurrencesIndices.length - 1;
            }
            else if (this.occurrencesIndices.length != lastNumResults && lastNumResults == 0) {
                this.currentIndex = 0;
            }
        }
        else {
            // No match
            this.occurrencesIndices = []
            this.currentIndex = 0;
            if (this.searchHighlightElementList.length) {
                console.error('highlight not cleared at this point?', this.searchHighlightElementList)
                this.clearHighlight()
            }
        }

        if (this.onSearchCB) {
            this.onSearchCB(this.occurrencesIndices.length, this.currentIndex)
        }
        return this.occurrencesIndices.length;
    }

    _getNextIndexFromCursor(cursorIndex, indices) {
        for (let i = 0; i < indices.length; ++i) {
            if (indices[i] >= cursorIndex) {
                return i
            }
        }
        return 0
    }

    _getPrevIndexFromCursor(cursorIndex, indices) {
        for (let i = indices.length - 1; i >= 0; --i) {
            if (indices[i] <= cursorIndex) {
                return i
            }
        }
        return indices.length - 1
    }

    _goToIndex(newIndex, navigatingFromCursorPosition = false) {
        if (!this.occurrencesIndices || this.occurrencesIndices.length == 0) {
            return;
        }
        if (newIndex >= this.occurrencesIndices.length) newIndex = 0
        else if (newIndex < 0) newIndex = this.occurrencesIndices.length - 1
        
        const prevTarget = this.searchHighlightElementList[this.currentIndex]
        if (this.firstTime) {
            this.firstTime = false;
            if (!navigatingFromCursorPosition) {
                // If first time navigating, don't change index
                if (prevTarget) {
                    prevTarget.classList.add("focus-highlight");
                    prevTarget.scrollIntoView({ block: "center" })
                }
                return;
            }
        }

        this.currentIndex = newIndex

        if (prevTarget) {
            prevTarget.classList.remove("focus-highlight");
        }
        let targetElement = this.searchHighlightElementList[this.currentIndex]
        if (targetElement) {
            targetElement.classList.add("focus-highlight");
            targetElement.scrollIntoView({ block: "center" })
        }
    }

    goToPrevIndex() {
        if (this.cursorIndex !== this.lastCursorIndex) {
            this.lastCursorIndex = this.cursorIndex
            const newIndex = this._getPrevIndexFromCursor(this.lastCursorIndex, this.occurrencesIndices)
            return this._goToIndex(newIndex, true)
        }
        this._goToIndex(this.currentIndex - 1)
    }

    goToNextIndex() {
        if (this.cursorIndex !== this.lastCursorIndex) {
            this.lastCursorIndex = this.cursorIndex
            const newIndex = this._getNextIndexFromCursor(this.lastCursorIndex, this.occurrencesIndices)
            return this._goToIndex(newIndex, true)
        }
        this._goToIndex(this.currentIndex + 1)
    }

    replace(oldString, newString, isReplacingAll=false) {
        if (!this.SearchedString) return;

        // if no occurrences, then search first.
        if (!this.occurrencesIndices) this.search();
        if (!this.occurrencesIndices) return;
        
        // this.firstTime = true;
        if (this.cursorIndex !== this.lastCursorIndex || oldString === newString) {
            this.goToNextIndex()
            if (oldString === newString) return; // short circuit if no replace is necessary
        }
        
        const indexInText = this.occurrencesIndices[this.currentIndex];
        const oldInNewIdx = newString.indexOf(oldString)

        if (!isReplacingAll) {
            this.quill.history.cutoff();
            this.quill.blur();
        }
        this.quill.deleteText(indexInText, oldString.length);
        this.quill.insertText(indexInText, newString);

        // update all indexes afterwards with length difference
        let lengthDiff = newString.length - oldString.length
        for (let i=this.currentIndex+1; i<this.occurrencesIndices.length; ++i) {
            this.occurrencesIndices[i] += lengthDiff
        }
        
        if (oldInNewIdx >= 0) {
            // Replace in occurence list
            let newIndex = indexInText + oldInNewIdx
            this.occurrencesIndices[this.currentIndex] = newIndex
            if (!isReplacingAll) {
                this.search(this.SearchedString, true);
            }
            this.currentIndex += 1;
        } else {
            // Remove from occurence list
            try {
                this.occurrencesIndices.splice(this.currentIndex, 1)
                const splicedEls = this.searchHighlightElementList.splice(this.currentIndex, 1)
                for (let el of splicedEls) {
                    el.remove()
                }
            } catch(err) {
                console.error(err)
            }
        }

        // Wrap to beginning if needed
        if (this.currentIndex >= this.occurrencesIndices.length) {
            this.currentIndex = 0;
        }
        this.firstTime = true;

        // Set cursor after replaced text
        // this.quill.setSelection(indexInText + newString.length)
        this.goToNextIndex()

        return this.occurrencesIndices.length
    }

    replaceAll(oldString, newString) {
        if (!this.SearchedString) return;
        // console.log('1', this.quill.history.stack.undo)
        this.quill.history.cutoff();
        this.quill.blur();
        // if no occurrences, then search first. first
        if (!this.occurrencesIndices) this.search();
        if (!this.occurrencesIndices) return;

        if (this.occurrencesIndices) {
            const numToReplace = this.occurrencesIndices.length;
            for (let i = 0; i < numToReplace; ++i) {
                this.replace(oldString, newString, true)
            }
        }
        // console.log('2', this.quill.history.stack.undo)
        // this.quill.history.cutoff();
        // TODO: make global Ctrl+Z handler         
        // focus so that Ctrl+Z works afterwards
        this.quill.focus(); 
        return this.search(oldString)
    }

    clearHighlight() {
        while (this.searchHighlightElementList.length) {
            const el = this.searchHighlightElementList.pop()
            el.remove()
        }
    } 

    clear() {
        this.clearHighlight();
        this.SearchedString = '';
    }

    getIndicesOf(str, searchStr) {
        let searchStrLen = searchStr.length;
        let startIndex = 0,
            index,
            indices = [];
        const hay = str.toLowerCase();
        const needle = searchStr.toLowerCase()
        while ((index = hay.indexOf(needle, startIndex)) > -1) {
            indices.push(index);
            // If you want a limit:
            // if (indices.length >= 2) return indices
            startIndex = index + searchStrLen;
        }
        return indices;
    };
}

export default Searcher;