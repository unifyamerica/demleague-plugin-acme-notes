import {
  type PluginManifest,
  SDK_API_VERSION,
} from '@unifyamerica/demleague-plugin-sdk/manifest';

// ℹ️ Everything this plugin needs from the platform. The core team approves these permissions, ability grants
// and UI slots in the API's namespace registry; any change to this file shows up in the version-bump PR and
// is reviewed there. Imported by both the server code and the UI (`src/ui`), hence the NestJS-free
// `@unifyamerica/demleague-plugin-sdk/manifest`.
export const ACME_NOTES_MANIFEST: PluginManifest = {
  sdkApiVersion: SDK_API_VERSION,
  namespace: 'acme.notes',
  version: '0.1.0',
  displayName: 'Notes',
  description:
    'Private notes for each user in each of their organizations, with a welcome note when they join one',
  permissions: ['users:read', 'data:read', 'data:write'],
  endpoints: [
    {
      method: 'GET',
      path: '/health',
      summary: 'Plugin health check',
      auth: 'public',
    },
    {
      method: 'GET',
      path: '/notes',
      summary: "List the current user's notes in the organization",
    },
    { method: 'POST', path: '/notes', summary: 'Create a note' },
    { method: 'GET', path: '/notes/:id', summary: 'Get one of my notes' },
    { method: 'PATCH', path: '/notes/:id', summary: 'Update one of my notes' },
    { method: 'DELETE', path: '/notes/:id', summary: 'Delete one of my notes' },
    {
      method: 'GET',
      path: '/overview',
      summary: "The organization's note counts (org admins)",
    },
  ],
  collections: ['notes'],
  events: {
    emits: ['acme.notes.note-created'],
    subscribes: ['core.organization.member-added'],
  },
  // Welcome notes for the members who don't have one yet, whenever an org admin turns notes on
  lifecycle: { onEnabled: true },
  // Who may do what, per organization: members keep notes in their organizations (org admins are members
  // too, so they get the same). Only org admins see the overview of their organization's notes.
  abilities: {
    Note: { organization: { member: ['read', 'create', 'update', 'delete'] } },
    Overview: { organization: { org_admin: ['read'] } },
  },
  ui: { slots: ['main-menu', 'profile-menu'] },
  // What this plugin needs, at most what the registry approves (the SDK defaults where it sets no ceiling)
  limits: {
    requestsPerMinute: 120,
    requestsPerMinutePerUser: 60,
    dbOperationsPerMinute: 600,
    requestTimeoutMs: 5000,
    maxDocumentBytes: 16 * 1024,
    maxDocuments: 10_000,
    maxStorageBytes: 20 * 1024 * 1024,
  },
};
