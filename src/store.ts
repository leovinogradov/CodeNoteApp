import { writable, derived, type Writable } from 'svelte/store';
import type { AppSettings } from './types';

export const saveStatus = writable({
  filename: '',
  deleted: false,
  modifiedTime: 0,
})

export const settingsStore: Writable<AppSettings> = writable();

export const theme = derived(settingsStore, v => v?.theme);

// result of @tauri-apps/plugin-os platform() 
export const platformNameStore = writable("");

// ctrlKey or metaKey depending on platform
export const alternateFunctionKeyStore = writable("ctrlKey"); 