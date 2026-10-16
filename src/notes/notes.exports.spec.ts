import {
  PluginActor,
  PluginActorForbiddenError,
  PluginValidationError,
} from '@unifyamerica/demleague-plugin-sdk';
import {
  createPluginTestHarness,
  PluginTestHarness,
} from '@unifyamerica/demleague-plugin-sdk/testing';
import { AcmeNotesPlugin } from '../acme-notes.plugin';
import type { NoteSummary } from './notes.exports';
import { NotesService } from './notes.service';

const orgA = { id: 'org-a', name: 'A', slug: 'a', description: null };
const ada: PluginActor = {
  id: 'aaaaaaaaaaaaaaaaaaaaaaaa',
  memberships: [{ organizationId: 'org-a', roles: ['member'] }],
};
const bob: PluginActor = {
  id: 'bbbbbbbbbbbbbbbbbbbbbbbb',
  memberships: [{ organizationId: 'org-a', roles: ['member'] }],
};
// In the organization, but without a role that grants anything on notes
const guest: PluginActor = {
  id: 'cccccccccccccccccccccccc',
  memberships: [{ organizationId: 'org-a', roles: [] }],
};

describe('NotesExports (operations other modules call)', () => {
  let harness: PluginTestHarness;
  let notes: NotesService;

  beforeEach(async () => {
    harness = await createPluginTestHarness(AcmeNotesPlugin, {
      actor: ada,
      tenant: orgA,
    });
    notes = harness.module.get(NotesService);
  });

  afterEach(() => harness.close());

  it("notes.list returns the acting user's notes as plain summaries", async () => {
    await notes.create(ada.id, { title: 'Mine', pinned: true });
    await notes.create(bob.id, { title: "Bob's" });

    const result = await harness.invokeExport<NoteSummary[]>(
      'notes.list',
      { limit: 5 },
      { caller: 'acme.tasks' },
    );

    expect(result).toEqual([
      {
        id: expect.any(String),
        title: 'Mine',
        pinned: true,
        updatedAt: expect.any(String),
      },
    ]);
  });

  it('notes.list validates its input', async () => {
    await expect(
      harness.invokeExport('notes.list', { limit: 500 }, { caller: 'beta.x' }),
    ).rejects.toThrow(PluginValidationError);
  });

  it('notes.create creates a note for the acting user and emits note-created', async () => {
    const created = await harness.invokeExport<{ id: string }>(
      'notes.create',
      { title: 'From a task' },
      { caller: 'acme.tasks' },
    );

    const { items } = await notes.list(ada, {});
    expect(items).toEqual([
      expect.objectContaining({
        id: created.id,
        ownerId: ada.id,
        title: 'From a task',
      }),
    ]);
    expect(harness.events.emitted).toHaveLength(1);
    expect(harness.logger.messages).toContainEqual({
      level: 'info',
      message: `Note ${created.id} created by acme.tasks`,
    });
  });

  it('notes.create validates like the endpoint and is only exported to acme.tasks', async () => {
    await expect(
      harness.invokeExport(
        'notes.create',
        { title: '' },
        { caller: 'acme.tasks' },
      ),
    ).rejects.toThrow(PluginValidationError);
    await expect(
      harness.invokeExport(
        'notes.create',
        { title: 'x' },
        { caller: 'beta.x' },
      ),
    ).rejects.toThrow('not exported to beta.x');
  });

  it("needs the user to hold the export's ability", async () => {
    harness.context.setActor(guest);

    await expect(
      harness.invokeExport('notes.list', null, { caller: 'acme.tasks' }),
    ).rejects.toThrow(PluginActorForbiddenError);
  });
});
