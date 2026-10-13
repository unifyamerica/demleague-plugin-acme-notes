import {
  installTestPluginHost,
  uninstallTestPluginHost,
  type TestPluginHost,
} from '@unifyamerica/demleague-plugin-sdk/vue/testing';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import PrimeVue from 'primevue/config';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Note, NotesPage as NotesPageResponse } from '../types';
import NotesPage from './NotesPage.vue';

const organization = {
  id: 'o1',
  name: 'Acme',
  slug: 'acme',
  description: null,
};

const note = (overrides: Partial<Note> = {}): Note => ({
  id: 'n1',
  ownerId: 'u1',
  title: 'Groceries',
  body: 'Milk',
  pinned: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

const page = (items: Note[]): NotesPageResponse => ({
  items,
  total: items.length,
  limit: 100,
  skip: 0,
});

describe('NotesPage', () => {
  let host: TestPluginHost;
  const pinia = () => {
    const instance = createPinia();
    setActivePinia(instance);
    return instance;
  };

  const render = () =>
    mount(NotesPage, { global: { plugins: [pinia(), PrimeVue] } });

  afterEach(() => uninstallTestPluginHost());

  describe('in an organization', () => {
    beforeEach(() => {
      host = installTestPluginHost({
        organization,
        abilities: ['read Note', 'create Note', 'delete Note'],
        responses: {
          'GET /notes': page([note()]),
          'DELETE /notes/n1': null,
        },
      });
    });

    it("lists the user's notes in the current organization", async () => {
      const wrapper = render();
      await flushPromises();

      expect(wrapper.text()).toContain('Groceries');
      expect(wrapper.text()).toContain('Milk');
      expect(host.requests[0]).toMatchObject({
        method: 'GET',
        path: '/notes',
        params: { limit: 100 },
      });
    });

    it('only offers what the user may do', async () => {
      const wrapper = render();
      await flushPromises();

      expect(wrapper.find('[aria-label="buttons.delete"]').exists()).toBe(true);
      // No `update Note`: no pin button
      expect(wrapper.find('[aria-label="pages.notes.pin"]').exists()).toBe(
        false,
      );
      expect(wrapper.text()).toContain('pages.notes.new');
    });

    it('deletes a note once confirmed', async () => {
      const wrapper = render();
      await flushPromises();

      await wrapper.find('[aria-label="buttons.delete"]').trigger('click');
      await flushPromises();

      expect(host.requests.map((r) => `${r.method} ${r.path}`)).toContain(
        'DELETE /notes/n1',
      );
      expect(wrapper.text()).not.toContain('Groceries');
      expect(host.toasts).toEqual([
        { severity: 'success', detail: 'pages.notes.deleted' },
      ]);
    });
  });

  it('asks for an organization instead of loading without one', async () => {
    host = installTestPluginHost({ organization: null });
    const wrapper = render();
    await flushPromises();

    expect(wrapper.text()).toContain('pages.notes.noOrganization');
    expect(host.requests).toEqual([]);
  });

  it('shows API errors as toasts', async () => {
    host = installTestPluginHost({ organization, responses: {} });
    render();
    await flushPromises();

    expect(host.toasts).toEqual([
      { severity: 'error', detail: 'No test response for GET /notes' },
    ]);
  });
});
