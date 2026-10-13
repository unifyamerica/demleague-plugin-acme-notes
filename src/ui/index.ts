import en from './i18n/en';
import { notesUi } from './plugin';

/**
 * The plugin's SPA UI, bundled by the DemLeagueOS SPA (`frontend/src/plugins.config.ts`). Pages live under
 * `/apps/acme/notes` and work in the user's current organization; each needs an ability from the manifest, which
 * also hides the menu entries to it.
 */
export default notesUi.define({
  routes: [
    {
      path: '',
      name: 'list',
      component: () => import('./pages/NotesPage.vue'),
      ability: { action: 'read', subject: 'Note' },
      titleKey: 'pages.notes.title',
    },
    {
      path: 'overview',
      name: 'overview',
      component: () => import('./pages/OverviewPage.vue'),
      // Granted to org admins only in the manifest
      ability: { action: 'read', subject: 'Overview' },
      titleKey: 'pages.overview.title',
    },
  ],
  mainMenu: [{ labelKey: 'nav.notes', icon: 'pi pi-book', to: 'list' }],
  profileMenu: [
    { labelKey: 'nav.overview', icon: 'pi pi-chart-bar', to: 'overview' },
  ],
  i18n: { en },
});
