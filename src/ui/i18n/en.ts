// The plugin's own messages: `t('nav.notes')` from `useI18n()` (the SPA files them under `plugins.acme.notes`)
export default {
  nav: {
    notes: 'Notes',
    overview: 'Notes overview',
  },
  fields: {
    title: 'Title',
    body: 'Note',
    pinned: 'Pinned',
  },
  pages: {
    notes: {
      title: 'Notes',
      subtitle: 'Private to you, in {organization}',
      noOrganization: 'Pick an organization to keep notes in.',
      empty: 'No notes yet.',
      new: 'New note',
      pin: 'Pin',
      unpin: 'Unpin',
      confirmDelete: 'Delete "{title}"?',
      saved: 'Note saved',
      deleted: 'Note deleted',
    },
    overview: {
      title: 'Notes overview',
      subtitle: 'Everyone in {organization}',
      notes: 'Notes',
      pinned: 'Pinned',
    },
  },
  buttons: {
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
  },
};
