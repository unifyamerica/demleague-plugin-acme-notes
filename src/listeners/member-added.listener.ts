import {
  CoreEvents,
  EventBusProxy,
  PluginLogger,
  UsersProxy,
} from '@unifyamerica/demleague-plugin-sdk';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { NotesService } from '../notes/notes.service';

// Gives users a welcome note in each organization they join. Event handlers run without an acting user, in
// the event's organization: only the plugin's own permissions apply here, and the host keeps the note (and the
// user lookup) in the organization the user joined.
@Injectable()
export class MemberAddedListener implements OnModuleInit {
  constructor(
    private readonly events: EventBusProxy,
    private readonly users: UsersProxy,
    private readonly notesService: NotesService,
    private readonly logger: PluginLogger,
  ) {}

  onModuleInit(): void {
    this.events.on(CoreEvents.ORGANIZATION_MEMBER_ADDED, async (event) => {
      const { userId } = event.payload;
      const user = await this.users.findById(userId);
      if (!user) {
        this.logger.warning(`User ${userId} not found for the welcome note`);
        return;
      }

      await this.notesService.ensureWelcomeNotes([user]);
    });
  }
}
