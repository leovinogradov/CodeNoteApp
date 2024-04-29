// Adapted from https://github.com/MuhammedAlkhudiry/quill-find-replace-module/blob/master/Searcher.js (and heavily modified)

class Searcher {
    occurrencesIndices = [];
    searchedElementList = [];
    currentIndex = 0;
    SearchedStringLength = 0;
    SearchedString = "";
    lastCursorIndex = null;
    cursorIndex = null;
    firstTime = false;

    constructor(quill, editorElement) {
        this.quill = quill;
        this.editorElement = editorElement;

        // this.container = document.getElementById("search-container");
        //   document
        //     .getElementById("search")
        //     .addEventListener("click", this.search.bind(this));
        //   document
        //     .getElementById("search-input")
        //     .addEventListener("keyup", this.keyPressedHandler.bind(this));
        //   document
        //     .getElementById("replace")
        //     .addEventListener("click", this.replace.bind(this));
        //   document
        //     .getElementById("replace-all")
        //     .addEventListener("click", this.replaceAll.bind(this));
    }

    updateSearchedElementList() {
        this.searchedElementList = Array.from(this.editorElement.getElementsByClassName('ql-searched-string'))
    }

    search(searchString) {
        const t0 = performance.now();
        this.clear();   // remove previous highlights
        this.SearchedString = searchString;
        let match = false;

        if (this.SearchedString) {
            let totalText = this.quill.getText();
            let re = new RegExp(this.SearchedString, "gi");
            match = re.test(totalText);
            if (match) {
                let indices = (this.occurrencesIndices = this.getIndicesOf(totalText, this.SearchedString));
                let length = (this.SearchedStringLength = this.SearchedString.length);
                
                // Apply SearchedString highlight blots to text
                // Alternating blots is needed so that matches that are next to eachother are not combined into one blot
                let flipflop = false
                indices.forEach(index => {
                    flipflop = !flipflop
                    let formatName = flipflop ? "SearchedString" : "SearchedString2"
                    this.quill.formatText(index, length, formatName, true)
                });

                this.firstTime = true

                this.updateSearchedElementList();
                if (this.searchedElementList.length != this.occurrencesIndices.length) {
                    console.error(`searchedElementList (${this.searchedElementList.length}) not the same length as occurrencesIndices (${this.occurrencesIndices.length})`)
                }
            }
        }
        if (!match) {
            this.occurrencesIndices = []
            this.searchedElementList = []
            this.currentIndex = 0;
        }
        console.log('index', this.currentIndex)
        const t1 = performance.now();
        console.log('SearchQuill', searchString, t1 - t0, 'milliseconds');
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
        
        const prevTarget = this.searchedElementList[this.currentIndex]
        if (this.firstTime) {
            this.firstTime = false;
            if (!navigatingFromCursorPosition) {
                // If first time navigating, don't change index
                if (prevTarget) {
                    prevTarget.classList.add("search-highlight");
                    prevTarget.scrollIntoView()
                }
                return;
            }
        }

        this.currentIndex = newIndex

        if (prevTarget) {
            prevTarget.classList.remove("search-highlight");
        }
        let targetElement = this.searchedElementList[this.currentIndex]
        if (targetElement) {
            targetElement.classList.add("search-highlight");
            targetElement.scrollIntoView()
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

    replace(oldString, newString) {
        if (!this.SearchedString) return;

        // if no occurrences, then search first.
        if (!this.occurrencesIndices) this.search();
        if (!this.occurrencesIndices) return;

        this.goToNextIndex()
        if (oldString == newString) return;
        
        const indexInText = this.occurrencesIndices[this.currentIndex];

        this.quill.deleteText(indexInText, oldString.length);
        this.quill.insertText(indexInText, newString);
        // Fixes highlight not getting removed for some reason
        this.quill.formatText(indexInText, newString.length, 'SearchedString', false)
        this.quill.formatText(indexInText, newString.length, 'SearchedString2', false)

        // update all indexes afterwards with length difference
        let lengthDiff = newString.length - oldString.length
        for (let i=this.currentIndex+1; i<this.occurrencesIndices.length; ++i) {
            this.occurrencesIndices[i] += lengthDiff
        }

        let oldInNewIdx = newString.indexOf(oldString)
        if (oldInNewIdx >= 0) {
            // Replace in occurence list
            let newIndex = indexInText + oldInNewIdx
            // TODO: test if this can mess up elements list for two searchstrings next to eachother
            this.quill.formatText(newIndex, oldString.length, "SearchedString", true);
            this.occurrencesIndices[this.currentIndex] = newIndex
            this.updateSearchedElementList();
        } else {
            // Remove from occurence list
            this.occurrencesIndices.splice(this.currentIndex, 1)
            if (this.searchedElementList) {
                this.searchedElementList.splice(this.currentIndex, 1)
            }
            // Wrap to beginning if needed
            if (this.currentIndex >= this.occurrencesIndices.length) {
                this.currentIndex = 0;
            }
            this.firstTime = true;
            
        }

        // Set cursor after replaced text
        this.quill.setSelection(indexInText + newString.length)

        return this.occurrencesIndices.length
    }

    replaceAll(oldString, newString) {
        if (!this.SearchedString) return;

        // if no occurrences, then search first.
        if (!this.occurrencesIndices) this.search();
        if (!this.occurrencesIndices) return;

        if (this.occurrencesIndices) {
            const numToReplace = this.occurrencesIndices.length;
            for (let i = 0; i < numToReplace; ++i) {
                this.replace(oldString, newString)
            }
        }
        
        return this.search(oldString)
    }

    // keyPressedHandler(e) {
    //     if (e.key === "Enter") {
    //         this.search();
    //     }
    // }    

    clear() {
        this.quill.formatText(0, this.quill.getText().length, 'SearchedString', false)
        this.quill.formatText(0, this.quill.getText().length, 'SearchedString2', false)
        // if (!soft) {
        //     this.searchedElementList = []
        //     this.occurrencesIndices = []
        //     this.currentIndex = 0
        // }
    }

    getIndicesOf(str, searchStr) {
        let searchStrLen = searchStr.length;
        let startIndex = 0,
            index,
            indices = [];
        while ((index = str.toLowerCase().indexOf(searchStr.toLowerCase(), startIndex)) > -1) {
            indices.push(index);
            startIndex = index + searchStrLen;
        }
        return indices;
    };

    // function for utility
    //   String.prototype.getIndicesOf = function(searchStr) {
    //     let searchStrLen = searchStr.length;
    //     let startIndex = 0,
    //       index,
    //       indices = [];
    //     while ((index = this.toLowerCase().indexOf(searchStr.toLowerCase(), startIndex)) > -1) {
    //       indices.push(index);
    //       startIndex = index + searchStrLen;
    //     }
    //     return indices;
    //   };
}

export default Searcher;