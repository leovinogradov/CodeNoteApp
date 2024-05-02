// Adapted from https://github.com/MuhammedAlkhudiry/quill-find-replace-module/blob/master/Searcher.js (and heavily modified)

import Delta from 'quill-delta';

class Searcher {
    occurrencesIndices = [];
    searchedElementList = [];
    currentIndex = 0;
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
        this.SearchedString = searchString;
        // this.clearHighlight();
        let match = false;

        if (this.SearchedString) {
            let totalText = this.quill.getText();
            this.quill.getContents();

            let re = new RegExp(this.SearchedString, "gi");
            match = re.test(totalText);
            if (match) {
                // Temp hack to stop clashing between syntax highlight and search highlight
                window['lastSearchHighlight'] = Date.now()
                
                const indices = this.getIndicesOf(totalText, this.SearchedString);
                // indices = indices.slice(0, 50)
                this.occurrencesIndices = indices;
                const length = this.SearchedString.length;


                // Apply SearchedString highlight blots to text
                // Alternating blots is needed so that matches that are next to eachother are not combined into one blot
                const delta = new Delta()
                let flipflop = false
                let lastIndex = 0
                for (let idx of indices) {
                    flipflop = !flipflop
                    if (idx > 0) {
                        delta.retain(idx - lastIndex, { "SearchedString": false, "SearchedString2": false })
                    }
                    if (flipflop) {
                        // this.quill.formatText(idx, length, "SearchedString", true)
                        delta.retain(length, { "SearchedString": true })
                    } else {
                        // this.quill.formatText(idx, length, "SearchedString2", true)
                        delta.retain(length, { "SearchedString2": true })
                    }
                    lastIndex = idx + length
                }

                console.log(indices, delta)
                this.quill.updateContents(delta)
                
                // Apply SearchedString highlight blots to text
                // Alternating blots is needed so that matches that are next to eachother are not combined into one blot
                // let flipflop = false
                // console.log('GOT INDEXES', indices.length)
                // indices.forEach(index => {
                //     flipflop = !flipflop
                //     let formatName = flipflop ? "SearchedString" : "SearchedString2"
                //     this.quill.formatText(index, length, formatName, true)
                // });

                /*
                // Assuming editor currently contains [{ insert: 'Hello World!' }]
                quill.updateContents(new Delta()
                .retain(6)                  // Keep 'Hello '
                .delete(5)                  // 'World' is deleted
                .insert('Quill')
                .retain(1, { bold: true })  // Apply bold to exclamation mark
                );
                // Editor should now be [
                //  { insert: 'Hello Quill' },
                //  { insert: '!', attributes: { bold: true} }
                // ]
                */

                this.firstTime = true
                
                setTimeout(() => {
                    this.updateSearchedElementList();
                    if (this.searchedElementList.length != this.occurrencesIndices.length) {
                        console.error(`searchedElementList (${this.searchedElementList.length}) not the same length as occurrencesIndices (${this.occurrencesIndices.length})`)
                    }
                }, 0)
            }
        }
        if (!match) {
            this.occurrencesIndices = []
            this.searchedElementList = []
            this.currentIndex = 0;
            window['lastSearchHighlight'] = 0
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
        
        this.firstTime = true;
        this.goToNextIndex()
        if (oldString == newString) return;
        
        const indexInText = this.occurrencesIndices[this.currentIndex];
        const oldInNewIdx = newString.indexOf(oldString)

        let lastFormat;
        if (oldInNewIdx >= 0) {
            const formats = this.quill.getFormat(indexInText)
            lastFormat = formats['SearchedString2'] ? 'SearchedString2' : 'SearchedString'
        }

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
        
        if (oldInNewIdx >= 0) {
            // Replace in occurence list
            let newIndex = indexInText + oldInNewIdx
            // TODO: test if this can mess up elements list for two searchstrings next to eachother
            this.quill.formatText(newIndex, oldString.length, lastFormat, true);
            this.occurrencesIndices[this.currentIndex] = newIndex
            this.updateSearchedElementList();
            this.currentIndex += 1;
        } else {
            // Remove from occurence list
            this.occurrencesIndices.splice(this.currentIndex, 1)
            if (this.searchedElementList) {
                this.searchedElementList.splice(this.currentIndex, 1)
            }
        }

        // Wrap to beginning if needed
        if (this.currentIndex >= this.occurrencesIndices.length) {
            this.currentIndex = 0;
        }
        this.firstTime = true;

        // Set cursor after replaced text
        this.quill.setSelection(indexInText + newString.length)

        return this.occurrencesIndices.length
    }

    replaceAll(oldString, newString) {
        if (!this.SearchedString) return;

        // if no occurrences, then search first. first
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

    clearHighlight() {
        const textLength = this.quill.getText().length;
        this.quill.formatText(0, textLength, { 'SearchedString': false, 'SearchedString2': false })

        // this.quill.formatText(0, textLength, 'SearchedString', false)
        // this.quill.formatText(0, textLength, 'SearchedString2', false)
        /* // Weird bullshit fix 
        const ops = this.quill.getContents().ops
        for (let op of ops) {
            if (op.attributes) {
                if (op.attributes['SearchedString']) {
                    op.attributes['SearchedString'] = false
                }
                if (op.attributes['SearchedString2']) {
                    op.attributes['SearchedString2'] = false
                }
            }
        }
        this.quill.setContents(ops) */
    } 

    clear() {
        this.clearHighlight();
        this.SearchedString = '';
        // window['lastSearchHighlight'] = 0
    }

    getIndicesOf(str, searchStr) {
        let searchStrLen = searchStr.length;
        let startIndex = 0,
            index,
            indices = [];
        const hay = str.toLowerCase();
        const needle = searchStr.toLowerCase()
        while ((index = hay.indexOf(needle, startIndex)) > -1) {
            console.log('wut', index, hay[index])
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