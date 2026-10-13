import { describe, expect, it } from 'vitest';
import ui from './index';

describe('the UI definition', () => {
  it('is valid for the manifest (define() throws otherwise)', () => {
    expect(ui.namespace).toBe('acme.notes');
    expect(ui.routes.map((route) => route.name)).toEqual(['list', 'overview']);
  });

  it('keeps the overview behind a subject only org admins are granted', () => {
    const overview = ui.routes.find((route) => route.name === 'overview');

    expect(overview?.ability).toEqual({ action: 'read', subject: 'Overview' });
    expect(ui.manifest.abilities?.Overview).toEqual({
      organization: { org_admin: ['read'] },
    });
  });
});
