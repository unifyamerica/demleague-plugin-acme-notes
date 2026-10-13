import {
  createPluginTestHarness,
  PluginTestHarness,
} from '@unifyamerica/demleague-plugin-sdk/testing';
import { AcmeNotesPlugin } from '../acme-notes.plugin';

describe('MemberAddedListener', () => {
  let harness: PluginTestHarness;

  beforeEach(async () => {
    harness = await createPluginTestHarness(AcmeNotesPlugin, {
      users: [
        {
          id: 'u1',
          firstName: 'Ada',
          lastName: 'Lovelace',
          memberships: [{ organizationId: 'org-a', roles: ['member'] }],
        },
      ],
    });
  });

  afterEach(() => harness.close());

  it('should subscribe to core.organization.member-added', () => {
    expect(harness.events.subscribedEvents()).toEqual([
      'core.organization.member-added',
    ]);
  });

  it('should create a pinned welcome note in the organization the user joined', async () => {
    await harness.events.deliver('core.organization.member-added', {
      userId: 'u1',
      organizationId: 'org-a',
    });

    const notes = [...harness.data.store.get('notes')!.values()];
    expect(notes).toEqual([
      expect.objectContaining({
        ownerId: 'u1',
        title: 'Welcome, Ada!',
        pinned: true,
        createdBy: null,
        organizationId: 'org-a',
      }),
    ]);
  });

  it('should not reach users outside the organization the user joined', async () => {
    // Ada isn't a member of org-b, so the host doesn't let the handler find her there
    await harness.events.deliver('core.organization.member-added', {
      userId: 'u1',
      organizationId: 'org-b',
    });

    expect(harness.data.store.get('notes')?.size ?? 0).toBe(0);
  });

  it('should log and skip an unknown user', async () => {
    await harness.events.deliver('core.organization.member-added', {
      userId: 'missing',
      organizationId: 'org-a',
    });

    expect(harness.data.store.get('notes')?.size ?? 0).toBe(0);
    expect(harness.logger.messages).toEqual([
      expect.objectContaining({ level: 'warning' }),
    ]);
  });
});
