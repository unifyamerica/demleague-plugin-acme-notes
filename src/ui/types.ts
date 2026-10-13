// The API's responses, as JSON (see `src/notes`)

export interface Note {
  id: string;
  ownerId: string;
  title: string;
  body: string;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NoteInput {
  title: string;
  body?: string;
  pinned?: boolean;
}

export interface NotesPage {
  items: Note[];
  total: number;
  limit: number;
  skip: number;
}

export interface NotesOverview {
  notes: number;
  pinned: number;
}
