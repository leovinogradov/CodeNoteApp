import { writable } from 'svelte/store';

export const saveStatus = writable({
  filename: '',
  deleted: false,
  modifiedTime: 0,
})

export const stateBold = writable(false);

export const stateItalic = writable(false);

export const textType = writable("div");