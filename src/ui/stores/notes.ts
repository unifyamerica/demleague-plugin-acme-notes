import { ref } from 'vue';
import { notesUi, useApi } from '../plugin';
import type { Note, NoteInput, NotesPage } from '../types';

const PAGE_SIZE = 100;

// The user's notes in the current organization (the API scopes them to it). Store id: `acme.notes/notes`.
export const useNotesStore = notesUi.defineStore('notes', () => {
  const api = useApi();
  const notes = ref<Note[]>([]);
  const total = ref(0);
  const loading = ref(false);

  async function load() {
    loading.value = true;
    try {
      const page = await api.get<NotesPage>('/notes', {
        params: { limit: PAGE_SIZE },
      });
      notes.value = page.items;
      total.value = page.total;
    } finally {
      loading.value = false;
    }
  }

  async function create(input: NoteInput) {
    await api.post<Note>('/notes', input);
    // Reloaded rather than inserted, so the order stays the API's (pinned first)
    await load();
  }

  async function update(id: string, changes: Partial<NoteInput>) {
    await api.patch<Note>(`/notes/${id}`, changes);
    await load();
  }

  async function remove(id: string) {
    await api.delete(`/notes/${id}`);
    notes.value = notes.value.filter((note) => note.id !== id);
    total.value--;
  }

  // Organization switches re-create the pages, which load again: never show another organization's notes
  function reset() {
    notes.value = [];
    total.value = 0;
  }

  return { notes, total, loading, load, create, update, remove, reset };
});
