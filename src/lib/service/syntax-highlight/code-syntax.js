/** Adapted from https://github.com/michael-vascue/test-quill-highlight/blob/master/src/components/codeSyntax.js 
 * 
 * Custom code block made to support both auto highlighting and language select
*/

import { ClassAttributor, Scope } from 'parchment';
import Quill from 'quill';
import Delta from 'quill-delta';
import { CodeToken, CodeBlock } from 'quill/modules/syntax';
import { escapeText } from 'quill/blots/text'
import { traverse } from 'quill/modules/clipboard';

const Syntax =  Quill.import('modules/syntax');

const TokenAttributor = new ClassAttributor('code-token', 'hljs', {
  scope: Scope.INLINE,
});


// Override default code block to set default language as 'auto'
class SyntaxCodeBlock extends CodeBlock {
  static create(value) {
    const domNode = super.create(value);
    if (typeof value === 'string') {
      domNode.setAttribute('data-language', value);
    } else { 
      // new:
      domNode.setAttribute('data-language', 'auto');
    }
    return domNode;
  }

  static formats(domNode) {
    return domNode.getAttribute('data-language') || 'auto';
  }
}


class CodeSyntax extends Syntax {
  static register() {
    super.register()
    Quill.register(SyntaxCodeBlock, true);
  }

  // override initListener to avoid creating selection box
  // initListener() {}
  
  // overrider highlightBlot to highlight the text automatically
  highlightBlot(text, language = 'auto') {
    // if (language && language != 'auto') {
    //    return super.highlightBlot(text, language)
    // }
    if (!language) language = 'auto'

    if (language === 'plain') {
      return escapeText(text).split('\n').reduce((delta, line, i) => {
        if (i !== 0) {
          delta.insert('\n', {
            [CodeBlock.blotName]: language
          });
        }
        return delta.insert(line);
      }, new Delta());
    }

    const container = this.quill.root.ownerDocument.createElement('div');
    container.classList.add(CodeBlock.className);

    // Todo: use more efficient "highlight" function here
    if (language == 'auto') {
      const result = this.options.hljs.highlightAuto(text)
      console.log('test auto', result)
      container.innerHTML = result.value;
    }
    else {
      const result = this.options.hljs.highlight(text, { language: language })
      console.log('test not auto', language, result)
      container.innerHTML = result.value;
    }

    return traverse(
      this.quill.scroll,
      container,
      [
        (node, delta) => {
          // TODO: this traverse is innaccurate sometimes. Wait for Quill to fix it?
          const value = TokenAttributor.value(node);
          if (value) {
            return delta.compose(
              new Delta().retain(delta.length(), {
                [CodeToken.blotName]: value,
              }),
            );
          }
          return delta;
        },
      ],
      [
        (node, delta) => {
          return node.data.split('\n').reduce((memo, nodeText, i) => {
            if (i !== 0) memo.insert('\n', { [CodeBlock.blotName]: language });
            return memo.insert(nodeText);
          }, delta);
        },
      ],
      new WeakMap(),
    );
  }
}


export default CodeSyntax;