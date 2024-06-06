// import { merge } from 'lodash-es';
import Emitter from 'quill/core/emitter.js';
import BaseTheme, { BaseTooltip } from 'quill/themes/base.js';
import LinkBlot from 'quill/formats/link.js';
import { Range, type Bounds } from 'quill/core/selection.js';
import icons from 'quill/ui/icons.js';
import Quill from 'quill/core/quill.js';
import type { Context } from 'quill/modules/keyboard.js';
import type Toolbar from 'quill/modules/toolbar.js';
import type { ToolbarConfig } from 'quill/modules/toolbar.js';
import type { ThemeOptions } from 'quill/core/theme.js';

import SnowTheme from 'quill/themes/snow';

const TOOLBAR_CONFIG: ToolbarConfig = [
  [{ header: ['1', '2', '3', false] }],
  ['bold', 'italic', 'underline', 'link'],
  [{ list: 'ordered' }, { list: 'bullet' }],
  ['clean'],
];

class CustomSnowTooltip extends BaseTooltip {
  static TEMPLATE = [
    '<a class="ql-preview" rel="noopener noreferrer" target="_blank" href="about:blank"></a>',
    '<input type="text" data-formula="e=mc^2" data-link="https://quilljs.com" data-video="Embed URL">',
    '<a class="ql-action"></a>',
    '<a class="ql-remove"></a>',
  ].join('');

  preview = this.root.querySelector('a.ql-preview');

  listen() {
    super.listen();
    // @ts-expect-error Fix me later
    this.root
      .querySelector('a.ql-action')
      .addEventListener('click', (event) => {
        if (this.root.classList.contains('ql-editing')) {
          this.save();
        } else {
          // @ts-expect-error Fix me later
          this.edit('link', this.preview.textContent);
        }
        event.preventDefault();
      });
    // @ts-expect-error Fix me later
    this.root
      .querySelector('a.ql-remove')
      .addEventListener('click', (event) => {
        if (this.linkRange != null) {
          const range = this.linkRange;
          this.restoreFocus();
          this.quill.formatText(range, 'link', false, Emitter.sources.USER);
          delete this.linkRange;
        }
        event.preventDefault();
        this.hide();
      });
    this.quill.on(
      Emitter.events.SELECTION_CHANGE,
      (range, oldRange, source) => {
        if (range == null) return;
        if (range.length === 0 && source === Emitter.sources.USER) {
          const [link, offset] = this.quill.scroll.descendant(
            LinkBlot,
            range.index,
          );
          if (link != null) {
            this.linkRange = new Range(range.index - offset, link.length());
            const preview = LinkBlot.formats(link.domNode);
            // @ts-expect-error Fix me later
            this.preview.textContent = preview;
            // @ts-expect-error Fix me later
            this.preview.setAttribute('href', preview);
            this.show();
            const bounds = this.quill.getBounds(this.linkRange);
            if (bounds != null) {
              this.position(bounds);
            }
            return;
          }
        } else {
          delete this.linkRange;
        }
        this.hide();
      },
    );
  }

  position(reference: Bounds) {
    // root.scrollTop should be 0 if scrollContainer !== root
    const top = reference.bottom + this.quill.root.scrollTop;
    const left = reference.left + reference.width / 2 - this.root.offsetWidth / 2;

    this.root.style.left = `${left}px`;
    this.root.style.top = `${top}px`;
    this.root.classList.remove('ql-flip');
    const containerBoundsRect = this.boundsContainer.getBoundingClientRect();
    // Shrink bounds to include padding
    const containerBounds = {
        left: containerBoundsRect.left + 15,
        right: containerBoundsRect.right - 15,
        bottom: containerBoundsRect.bottom - 12
    }
    const rootBounds = this.root.getBoundingClientRect();
    let shift = 0;
    if (rootBounds.right > containerBounds.right) {
      shift = containerBounds.right - rootBounds.right;
      this.root.style.left = `${left + shift}px`;
    }
    if (rootBounds.left < containerBounds.left) {
      shift = containerBounds.left - rootBounds.left;
      this.root.style.left = `${left + shift}px`;
    }
    if (rootBounds.bottom > containerBounds.bottom) {
      const height = rootBounds.bottom - rootBounds.top;
      const verticalShift = reference.bottom - reference.top + height;
      this.root.style.top = `${top - verticalShift}px`;
      this.root.classList.add('ql-flip');
    }
    return shift;
  }

  show() {
    super.show();
    this.root.removeAttribute('data-mode');
  }
}

class CustomSnowTheme extends BaseTheme {
  constructor(quill: Quill, options: ThemeOptions) {
    if (
      options.modules.toolbar != null &&
      options.modules.toolbar.container == null
    ) {
      options.modules.toolbar.container = TOOLBAR_CONFIG;
    }
    super(quill, options);
    this.quill.container.classList.add('ql-snow');
  }

  extendToolbar(toolbar: Toolbar) {
    if (toolbar.container != null) {
      toolbar.container.classList.add('ql-snow');
      this.buildButtons(toolbar.container.querySelectorAll('button'), icons);
      this.buildPickers(toolbar.container.querySelectorAll('select'), icons);
      // @ts-expect-error
      this.tooltip = new CustomSnowTooltip(this.quill, this.options.bounds);
      // Don't need this if statement: it is guaranteed to be true
      // if (toolbar.container.querySelector('.ql-link')) {
      this.quill.keyboard.addBinding(
        { key: 'k', shortKey: true },
        (_range: Range, context: Context) => {
          toolbar.handlers.link.call(toolbar, !context.format.link);
        },
      );
      // Inline Code -- Ctrl+Shift+C
      this.quill.keyboard.addBinding(
        { key: 'C', shortKey: true, shiftKey: true },
        (_range: Range, context: Context) => {
          this.quill.format('code', !context.format.code)
        },
      );
      // Code Block -- Ctrl+Shift+Alt+C
      this.quill.keyboard.addBinding(
        { key: 'C', shortKey: true, shiftKey: true, altKey: true },
        (_range: Range, context: Context) => {
          this.quill.format('code-block', !context.format['code-block'])
        },
      );
    }
  }
}

// Adds a handler for link
CustomSnowTheme.DEFAULTS = SnowTheme.DEFAULTS;

export default CustomSnowTheme;