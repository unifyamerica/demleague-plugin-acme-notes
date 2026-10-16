import { Injectable } from '@nestjs/common';
import {
  ExportedOperation,
  PluginActorForbiddenError,
  PluginCallInfo,
  PluginContext,
  PluginLogger,
  PluginValidationError,
} from '@unifyamerica/demleague-plugin-sdk';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateNoteDto } from './dto/create-note.dto';
import { NotesService } from './notes.service';

// What other modules get back: plain JSON (dates as ISO strings), and only what they need
export interface NoteSummary {
  id: string;
  title: string;
  pinned: boolean;
  updatedAt: string;
}

export interface ListNotesInput {
  // 1 to 50, 10 by default
  limit?: number;
  pinned?: boolean;
}

/**
 * The operations other modules may call (`exports` in the manifest). The host has already checked the caller is
 * allowed and the acting user has the export's ability; each call works on the acting user's own notes in the
 * current organization, like the endpoints do.
 *
 * ℹ️ Input is plain JSON from another module, not a validated request body: no ValidationPipe runs, so
 * validate it here and throw SDK errors (they reach the caller as they are; anything else becomes a
 * PluginCallFailedError).
 */
@Injectable()
export class NotesExports {
  constructor(
    private readonly notes: NotesService,
    private readonly context: PluginContext,
    private readonly logger: PluginLogger,
  ) {}

  private actor() {
    const actor = this.context.actor();
    // The host never runs an exported operation without one
    if (!actor) {
      throw new PluginActorForbiddenError('No acting user');
    }
    return actor;
  }

  @ExportedOperation('notes.list')
  async list(input: ListNotesInput | null): Promise<NoteSummary[]> {
    const limit = input?.limit ?? 10;
    if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
      throw new PluginValidationError('limit must be an integer from 1 to 50');
    }
    if (input?.pinned !== undefined && typeof input.pinned !== 'boolean') {
      throw new PluginValidationError('pinned must be true or false');
    }
    const { items } = await this.notes.list(this.actor(), {
      limit,
      pinned: input?.pinned,
    });
    return items.map((note) => ({
      id: note.id,
      title: note.title,
      pinned: note.pinned,
      updatedAt: note.updatedAt.toISOString(),
    }));
  }

  @ExportedOperation('notes.create')
  async create(
    input: unknown,
    call: PluginCallInfo,
  ): Promise<{ id: string; title: string }> {
    const dto = plainToInstance(CreateNoteDto, input ?? {});
    const errors = await validate(dto, { whitelist: true });
    if (errors.length > 0) {
      throw new PluginValidationError(
        errors
          .flatMap((error) => Object.values(error.constraints ?? {}))
          .join(', '),
      );
    }
    const note = await this.notes.create(this.actor().id, dto);
    this.logger.info(`Note ${note.id} created by ${call.caller}`);
    return { id: note.id, title: note.title };
  }
}
