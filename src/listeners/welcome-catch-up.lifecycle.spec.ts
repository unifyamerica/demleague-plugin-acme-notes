import {
  createPluginTestHarness,
  PluginTestHarness,
} from '@unifyamerica/demleague-plugin-sdk/testing';
import { AcmeNotesPlugin } from '../acme-notes.plugin';

describe('WelcomeCatchUp', () => {
  let harness: PluginTestHarness;

  const member = (id: string, firstName: string, organizationId: string) => ({
    id,
    firstName,
    lastName: 'L',
    memberships: [{ organizationId, roles: ['member'] }],
  });
  const welcomeNotes = () =>
    [...(harness.data.store.get('notes')?.values() ?? [])].filter(
      (note) => note.welcome,
    );

  beforeEach(async () => {
    harness = await createPluginTestHarness(AcmeNotesPlugin, {
      users: [
        member('u1', 'Ada', 'org-a'),
        member('u2', 'Bob', 'org-a'),
        member('u3', 'Cy', 'org-b'),
      ],
    });
  });

  afterEach(() => harness.close());

  it('should register onEnabled', () => {
    expect(harness.lifecycle.registeredHooks()).toEqual(['onEnabled']);
  });

  it("should give the organization's members without one a welcome note, once", async () => {
    // Ada got hers when she joined, while notes was on
    await harness.events.deliver('core.organization.member-added', {
      userId: 'u1',
      organizationId: 'org-a',
    });

    await harness.lifecycle.enable('org-a', {
      firstTime: false,
      lastDisabledAt: '2026-10-01T00:00:00.000Z',
    });
    // A retry (or turning it on again) creates nothing new
    await harness.lifecycle.enable('org-a', { attempt: 2 });

    expect(
      welcomeNotes().map(({ ownerId, organizationId, title }) => ({
        ownerId,
        organizationId,
        title,
      })),
    ).toEqual([
      { ownerId: 'u1', organizationId: 'org-a', title: 'Welcome, Ada!' },
      { ownerId: 'u2', organizationId: 'org-a', title: 'Welcome, Bob!' },
    ]);
    expect(harness.logger.messages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          level: 'info',
          message: expect.stringContaining('1 welcome notes caught up'),
        }),
      ]),
    );
  });

  it('should only reach the organization it was turned on in', async () => {
    await harness.lifecycle.enable('org-b');

    expect(welcomeNotes().map((note) => note.ownerId)).toEqual(['u3']);
  });
});
