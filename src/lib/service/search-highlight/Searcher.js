// Adapted from https://github.com/MuhammedAlkhudiry/quill-find-replace-module/blob/master/Searcher.js

class Searcher {
    occurrencesIndices = [];
    currentIndex = 0;
    SearchedStringLength = 0;
    SearchedString = "";

    constructor(quill) {
        this.quill = quill;

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
            } else {
                this.occurrencesIndices = null;
                this.currentIndex = 0;
            }
        }
        const t1 = performance.now();
        console.log('SearchQuill', searchString, t1 - t0, 'milliseconds');
    }
  
    replace(oldString, newString) {
      if (!this.SearchedString) return;
  
      // if no occurrences, then search first.
      if (!this.occurrencesIndices) this.search();
      if (!this.occurrencesIndices) return;
  
      let indices = this.occurrencesIndices;
  
      this.quill.deleteText(indices[this.currentIndex], oldString.length);
      this.quill.insertText(indices[this.currentIndex], newString);
      this.quill.formatText(
        indices[this.currentIndex],
        newString.length,
        "SearchedString",
        false
      );
      // update the occurrencesIndices.
      this.search();
    }
  
    replaceAll(oldString, newString) {
      if (!this.SearchedString) return;
      let oldStringLen = oldString.length;
  
      // if no occurrences, then search first.
      if (!this.occurrencesIndices) this.search();
      if (!this.occurrencesIndices) return;
  
      if (this.occurrencesIndices) {
        while (this.occurrencesIndices) {
          this.quill.deleteText(this.occurrencesIndices[0], oldStringLen);
          this.quill.insertText(this.occurrencesIndices[0], newString);
  
          // update the occurrencesIndices.
          this.search();
        }
      }
      this.clear();
    }
  
    keyPressedHandler(e) {
        if (e.key === "Enter") {
            this.search();
        }
    }    

    clear() {
        this.quill.formatText(0, this.quill.getText().length, 'SearchedString', false);
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