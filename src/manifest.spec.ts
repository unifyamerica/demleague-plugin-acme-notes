import { validateManifest } from '@unifyamerica/demleague-plugin-sdk';
import { readFileSync } from 'fs';
import { join } from 'path';
import { ACME_NOTES_MANIFEST } from './manifest';

describe('ACME_NOTES_MANIFEST', () => {
  it('should be valid', () => {
    expect(validateManifest(ACME_NOTES_MANIFEST)).toEqual([]);
  });

  it('should match the package version', () => {
    const packageJson = JSON.parse(
      readFileSync(join(__dirname, '../package.json'), 'utf8'),
    ) as { version: string };
    expect(ACME_NOTES_MANIFEST.version).toBe(packageJson.version);
  });
});
