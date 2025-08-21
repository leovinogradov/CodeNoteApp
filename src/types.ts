export interface NoteMeta {
  title: string,
  subtitle: string,
  modifiedTime: string,
  search_title_as_tokens?: any[],
  search_subtitle_as_tokens?: any[]
}

export interface SearchNoteMeta extends NoteMeta {
  search_title_as_tokens: any[],
  search_subtitle_as_tokens: any[]
}

export interface Note {
  filename: string,
  content: string,
  modified: number,
  note_meta: NoteMeta,
  el?: HTMLElement
}

export interface SearchNote extends Note {
  note_meta: SearchNoteMeta
}
