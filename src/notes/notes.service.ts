import {
  DataProxy,
  EventBusProxy,
  PluginActor,
  PluginPage,
  PluginRecord,
  PluginUser,
} from '@unifyamerica/demleague-plugin-sdk';
import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { Note, NOTE_CREATED_EVENT } from './note.interface';

@Injectable()
export class NotesService {
  constructor(
    private readonly data: DataProxy,
    private readonly events: EventBusProxy,
  ) {}

  private get notes() {
    return this.data.collection<Note>('notes');
  }

  async list(
    actor: PluginActor,
    {
      page = 1,
      limit = 25,
      pinned,
    }: { page?: number; limit?: number; pinned?: boolean },
  ): Promise<PluginPage<PluginRecord<Note>>> {
    return this.notes.find({
      filter: {
        ownerId: actor.id,
        ...(pinned === undefined ? {} : { pinned }),
      },
      sort: { pinned: -1, updatedAt: -1 },
      limit,
      skip: (page - 1) * limit,
    });
  }

  // The host stores the note in the current organization: the request's, or in an event handler (or lifecycle
  // hook) the event's
  async create(
    ownerId: string,
    dto: CreateNoteDto,
    { welcome = false }: { welcome?: boolean } = {},
  ): Promise<PluginRecord<Note>> {
    const note = await this.notes.insert({
      ownerId,
      title: dto.title,
      body: dto.body ?? '',
      pinned: dto.pinned ?? false,
      ...(welcome ? { welcome: true } : {}),
    });
    this.events.emit(NOTE_CREATED_EVENT, { noteId: note.id, ownerId });
    return note;
  }

  /**
   * Gives these users (members of the current organization) their welcome note, unless they have it. Safe to
   * run again: the member-added listener and the `onEnabled` catch-up can both reach the same user. Returns how
   * many it created. At most 100 users per call.
   */
  async ensureWelcomeNotes(users: PluginUser[]): Promise<number> {
    if (users.length === 0) {
      return 0;
    }
    const { items } = await this.notes.find({
      filter: { ownerId: { $in: users.map((user) => user.id) }, welcome: true },
      limit: 100,
    });
    const welcomed = new Set(items.map((note) => note.ownerId));
    const missing = users.filter((user) => !welcomed.has(user.id));
    for (const user of missing) {
      await this.create(
        user.id,
        {
          title: `Welcome, ${user.firstName}!`,
          body: 'This is your private notes space.',
          pinned: true,
        },
        { welcome: true },
      );
    }
    return missing.length;
  }

  // Everyone's notes in the request's organization, counted (the host scopes the data to it)
  async overview(): Promise<{ notes: number; pinned: number }> {
    const [notes, pinned] = await Promise.all([
      this.notes.count(),
      this.notes.count({ pinned: true }),
    ]);
    return { notes, pinned };
  }

  // Someone else's note is reported as not found, so ids can't be probed
  async findOwn(actor: PluginActor, id: string): Promise<PluginRecord<Note>> {
    const note = await this.notes.findById(id);
    if (!note || note.ownerId !== actor.id) {
      throw new NotFoundException('Note not found');
    }
    return note;
  }

  async update(
    actor: PluginActor,
    id: string,
    dto: UpdateNoteDto,
  ): Promise<PluginRecord<Note>> {
    await this.findOwn(actor, id);
    const updated = await this.notes.update(id, dto);
    if (!updated) {
      throw new NotFoundException('Note not found');
    }
    return updated;
  }

  async remove(actor: PluginActor, id: string): Promise<void> {
    await this.findOwn(actor, id);
    await this.notes.remove(id);
  }
}
