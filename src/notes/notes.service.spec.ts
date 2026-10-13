import {
  PluginActor,
  PluginPermissionDeniedError,
} from '@unifyamerica/demleague-plugin-sdk';
import {
  createPluginTestHarness,
  PluginTestHarness,
} from '@unifyamerica/demleague-plugin-sdk/testing';
import { NotFoundException } from '@nestjs/common';
import { AcmeNotesPlugin } from '../acme-notes.plugin';
import { NotesService } from './notes.service';

const ada: PluginActor = {
  id: 'aaaaaaaaaaaaaaaaaaaaaaaa',
  memberships: [],
};
const bob: PluginActor = {
  id: 'bbbbbbbbbbbbbbbbbbbbbbbb',
  memberships: [],
};

const orgA = { id: 'org-a', name: 'A', slug: 'a', description: null };
const orgB = { id: 'org-b', name: 'B', slug: 'b', description: null };

describe('NotesService', () => {
  let harness: PluginTestHarness;
  let service: NotesService;

  beforeEach(async () => {
    harness = await createPluginTestHarness(AcmeNotesPlugin, {
      actor: ada,
      tenant: orgA,
    });
    service = harness.module.get(NotesService);
  });

  afterEach(() => harness.close());

  it("should create a note with defaults in the request's organization and emit note-created", async () => {
    const note = await service.create(ada.id, { title: 'Groceries' });

    expect(note).toEqual(
      expect.objectContaining({
        ownerId: ada.id,
        title: 'Groceries',
        body: '',
        pinned: false,
        createdBy: ada.id,
        organizationId: 'org-a',
      }),
    );
    expect(harness.events.emitted).toEqual([
      expect.objectContaining({
        name: 'acme.notes.note-created',
        payload: { noteId: note.id, ownerId: ada.id },
      }),
    ]);
  });

  it("should only list the actor's notes, pinned first", async () => {
    await service.create(ada.id, { title: 'one' });
    await service.create(ada.id, { title: 'two', pinned: true });
    await service.create(bob.id, { title: 'not mine' });

    const page = await service.list(ada, {});

    expect(page.total).toBe(2);
    expect(page.items.map((note) => note.title)).toEqual(['two', 'one']);
    expect(
      (await service.list(ada, { pinned: false })).items.map(
        (note) => note.title,
      ),
    ).toEqual(['one']);
  });

  it('should paginate', async () => {
    for (const title of ['a', 'b', 'c']) {
      await service.create(ada.id, { title });
    }

    const page = await service.list(ada, { page: 2, limit: 2 });

    expect(page).toEqual(
      expect.objectContaining({ total: 3, skip: 2, limit: 2 }),
    );
    expect(page.items).toHaveLength(1);
  });

  it("should treat someone else's note as not found", async () => {
    const note = await service.create(bob.id, { title: 'secret' });

    await expect(service.findOwn(ada, note.id)).rejects.toThrow(
      NotFoundException,
    );
    await expect(
      service.update(ada, note.id, { title: 'mine now' }),
    ).rejects.toThrow(NotFoundException);
    await expect(service.remove(ada, note.id)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should update and delete own notes', async () => {
    const note = await service.create(ada.id, { title: 'draft' });

    expect(
      await service.update(ada, note.id, { title: 'final', pinned: true }),
    ).toEqual(expect.objectContaining({ title: 'final', pinned: true }));

    await service.remove(ada, note.id);
    await expect(service.findOwn(ada, note.id)).rejects.toThrow(
      NotFoundException,
    );
  });

  it("should keep each organization's notes apart", async () => {
    const inA = await service.create(ada.id, { title: 'in A' });
    harness.context.setTenant(orgB);
    await service.create(ada.id, { title: 'in B' });

    expect((await service.list(ada, {})).items.map((n) => n.title)).toEqual([
      'in B',
    ]);
    await expect(service.findOwn(ada, inA.id)).rejects.toThrow(
      NotFoundException,
    );
  });

  it("should count everyone's notes in the organization for the overview", async () => {
    await service.create(ada.id, { title: 'one', pinned: true });
    await service.create(bob.id, { title: 'two' });
    harness.context.setTenant(orgB);
    await service.create(bob.id, { title: 'elsewhere' });
    harness.context.setTenant(orgA);

    expect(await service.overview()).toEqual({ notes: 2, pinned: 1 });
  });

  it('should fail without data:write', async () => {
    const readOnly = await createPluginTestHarness(AcmeNotesPlugin, {
      actor: ada,
      permissions: ['users:read', 'data:read'],
    });

    await expect(
      readOnly.module.get(NotesService).create(ada.id, { title: 'x' }),
    ).rejects.toThrow(PluginPermissionDeniedError);
    await readOnly.close();
  });
});
