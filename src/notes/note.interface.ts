export interface Note {
  ownerId: string;
  title: string;
  body: string;
  pinned: boolean;
  // The welcome note a user gets in each organization they join (one per user and organization)
  welcome?: boolean;
}

export const NOTE_CREATED_EVENT = 'acme.notes.note-created';
