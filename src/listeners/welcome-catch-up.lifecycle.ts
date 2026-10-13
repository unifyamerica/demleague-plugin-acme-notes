import {
  ModuleLifecycleProxy,
  PluginLogger,
  UsersProxy,
} from '@unifyamerica/demleague-plugin-sdk';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { NotesService } from '../notes/notes.service';

/**
 * When an org admin turns notes on: gives every member who doesn't have one their welcome note. The first time,
 * that's everyone already there; when notes is turned back on, it's those who joined while it was off (the
 * member-added events aren't delivered then). The host runs this in that organization, so only its members
 * are found and the notes are stored there. Safe to run again (the host retries it after a failure).
 */
@Injectable()
export class WelcomeCatchUp implements OnModuleInit {
  constructor(
    private readonly lifecycle: ModuleLifecycleProxy,
    private readonly users: UsersProxy,
    private readonly notesService: NotesService,
    private readonly logger: PluginLogger,
  ) {}

  onModuleInit(): void {
    this.lifecycle.onEnabled(async (event) => {
      let created = 0;
      for (let skip = 0; ;) {
        const page = await this.users.findMembers({ limit: 100, skip });
        created += await this.notesService.ensureWelcomeNotes(page.items);
        skip += page.items.length;
        if (page.items.length === 0 || skip >= page.total) {
          break;
        }
      }
      this.logger.info(
        event.firstTime
          ? `Turned on in ${event.organizationId}: ${created} welcome notes`
          : `Turned back on in ${event.organizationId} (off since ${event.lastDisabledAt}): ${created} welcome notes caught up`,
      );
    });
  }
}
