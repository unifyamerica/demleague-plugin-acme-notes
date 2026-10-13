import { PluginModule } from '@unifyamerica/demleague-plugin-sdk';
import { MemberAddedListener } from './listeners/member-added.listener';
import { WelcomeCatchUp } from './listeners/welcome-catch-up.lifecycle';
import { ACME_NOTES_MANIFEST } from './manifest';
import { HealthController } from './notes/health.controller';
import { NotesController, OverviewController } from './notes/notes.controller';
import { NotesService } from './notes/notes.service';

@PluginModule({
  manifest: ACME_NOTES_MANIFEST,
  controllers: [NotesController, OverviewController, HealthController],
  providers: [NotesService, MemberAddedListener, WelcomeCatchUp],
})
export class AcmeNotesPlugin {}
