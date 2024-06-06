import { writable } from 'svelte/store';

export const saveStatus = writable({
  filename: '',
  deleted: false,
  modifiedTime: 0,
})

export const settingsStore = writable()

// result of @tauri-apps/plugin-os platform() 
export const platformNameStore = writable("");

// ctrlKey or metaKey depending on platform
export const alternateFunctionKeyStore = writable("ctrlKey"); 