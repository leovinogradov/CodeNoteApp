// Adapted from https://github.com/MuhammedAlkhudiry/quill-find-replace-module/blob/master/Searcher.js

class Searcher {
    occurrencesIndices = [];
    currentIndex = 0;
    SearchedStringLength = 0;
    SearchedString = "";

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
        this.searchedElementList = this.editorElement.getElementsByClassName('ql-searched-string')
    }
  
    search(searchString) {
        //  remove any previous search
        const t0 = performance.now();
        this.clear();
        this.SearchedString = searchString;
        if (this.SearchedString) {
            let totalText = this.quill.getText();
            let re = new RegExp(this.SearchedString, "gi");
            let match = re.test(totalText);
            if (match) {
                let indices = (this.occurrencesIndices = this.getIndicesOf(totalText, this.SearchedString));
                let length = (this.SearchedStringLength = this.SearchedString.length);

                indices.forEach(index =>
                    this.quill.formatText(index, length, "SearchedString", true)
                );

                this.updateSearchedElementList();
                if (this.searchedElementList.length != this.occurrencesIndices.length) {
                    console.error('searchedElementList not the same length as occurrencesIndices')
                }
            } else {
                this.occurrencesIndices = [];
                this.searchedElementList = []
                this.currentIndex = 0;
            }
        }
        const t1 = performance.now();
        console.log('SearchQuill', searchString, t1 - t0, 'milliseconds');
    }

    _goToIndex(newIndex) {
        if (!this.occurrencesIndices || this.occurrencesIndices.length == 0) {
            return;
        }
        if (newIndex >= this.occurrencesIndices.length) newIndex = 0
        else if (newIndex < 0) newIndex = this.occurrencesIndices.length - 1

        const prevTarget = this.searchedElementList[this.currentIndex]
        if (prevTarget) {
            prevTarget.classList.remove("search-highlight");
        }
        
        this.currentIndex = newIndex
        
        let targetElement = this.searchedElementList[this.currentIndex]
        console.log(targetElement)
        if (targetElement) {
            targetElement.scrollIntoView()
            targetElement.classList.add("search-highlight");
        }
    }

    goToPrevIndex() {
        this._goToIndex(this.currentIndex - 1)
    }

    goToNextIndex() {
        this._goToIndex(this.currentIndex + 1)
    }
  
    replace(oldString, newString) {
      if (!this.SearchedString) return;
  
      // if no occurrences, then search first.
      if (!this.occurrencesIndices) this.search();
      if (!this.occurrencesIndices) return;
  
      let indices = this.occurrencesIndices;
      let indexInText = indices[this.currentIndex];
      
  
      this.quill.deleteText(indexInText, oldString.length);
      this.quill.insertText(indexInText, newString);
    
      let oldInNewIdx = newString.indexOf(oldString)
      if (oldInNewIdx >= 0) {
        // Replace in occurence list
        indexInText += oldInNewIdx
        this.quill.formatText(indexInText, oldString.length, "SearchedString", false);
        this.occurrencesIndices[this.currentIndex] = indexInText
        this.updateSearchedElementList();
        this.currentIndex += 1
      } else {
        // Remove from occurence list
        this.occurrencesIndices.splice(this.currentIndex, 1)
        this.searchedElementList.splice(this.currentIndex, 1)
      }
      
      // update the occurrencesIndices.
      // this.search();
    }
  
    replaceAll(oldString, newString) {
      if (!this.SearchedString) return;
    //   let oldStringLen = oldString.length;
  
      // if no occurrences, then search first.
      if (!this.occurrencesIndices) this.search();
      if (!this.occurrencesIndices) return;
  
      if (this.occurrencesIndices) {
        const numToReplace = this.occurrencesIndices.length;
        for (let i=0; i<numToReplace; ++i) {
            this.replace(oldString, newString)
        }
        // while (this.occurrencesIndices) {
        //   this.quill.deleteText(this.occurrencesIndices[0], oldStringLen);
        //   this.quill.insertText(this.occurrencesIndices[0], newString);
  
        //   // update the occurrencesIndices.
        //   this.search();
        // }
      }
      this.clear();
    }
  
    // keyPressedHandler(e) {
    //     if (e.key === "Enter") {
    //         this.search();
    //     }
    // }    

    clear() {
        this.quill.formatText(0, this.quill.getText().length, 'SearchedString', false)
        this.searchedElementList = []
        this.occurrencesIndices = []
        this.currentIndex = 0
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