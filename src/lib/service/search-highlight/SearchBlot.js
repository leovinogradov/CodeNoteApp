import Quill from "quill";
const Inline = Quill.import('blots/inline');

// @ts-ignore
class SearchedStringBlot extends Inline {
}
SearchedStringBlot.blotName = 'SearchedString';
SearchedStringBlot.className = 'ql-searched-string';
SearchedStringBlot.tagName = 'div';


// @ts-ignore
class SearchedStringBlot2 extends Inline {
}
SearchedStringBlot2.blotName = 'SearchedString2';
SearchedStringBlot2.className = 'ql-searched-string';
SearchedStringBlot2.tagName = 'div';

export { SearchedStringBlot, SearchedStringBlot2 };