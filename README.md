
# CodeNoteApp

A lightweight app inspired by Apple Notes made for jotting down notes about code
* __Never__ formats or autocorrects your text. E.g. changing ' to ‘ like many note apps do
* Advanced code blocks with optional syntax highlighting: hover over the top right corner of a code block to turn on syntax highlighting
* 100% locally stored notes
* Lightweight footprint thanks to Tauri and Svelte


![CodeNoteApp on Windows](./CodeNoteApp_on_Windows.png?raw=true "Windows Example")

#### Powered by Tauri, Svelte, and Quill Editor


### List of Keyboard Shortcuts

`Ctrl/Cmd + Plus (+)` : Zoom in / increase font size

`Ctrl/Cmd + Minus (-)` : Zoom out / decrease font size

`Ctrl/Cmd + F` : Find in note

`Ctrl/Cmd + Shift + F` : Find and Replace in note

`Ctrl/Cmd + Shift + C` : Format as inline code

`Ctrl/Cmd + Shift + Alt + C` : Format as code block

`Ctrl/Cmd + Z` : Undo

`Ctrl/Cmd + Y` : Redo

... and the rest of standard text editor shortcuts


### Local development

Install Rust, pnpm

`pnpm install`

`pnpm tauri dev`


### Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) + [Svelte](https://marketplace.visualstudio.com/items?itemName=svelte.svelte-vscode) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer).
