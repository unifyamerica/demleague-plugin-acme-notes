import {
  CurrentActor,
  PluginActor,
  RequireAbility,
} from '@unifyamerica/demleague-plugin-sdk';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CreateNoteDto } from './dto/create-note.dto';
import { ListNotesQueryDto } from './dto/list-notes-query.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { NotesService } from './notes.service';

// ℹ️ Mounted by the host at /plugins/acme/notes, so these routes are /plugins/acme/notes/notes[/:id]. Every
// route must be declared in the manifest's `endpoints`; the host refuses to start otherwise.
//
// The abilities are checked in the request's organization (`X-Tenant`), against the manifest's grants: only
// members and org admins of that organization get through, and the host keeps each organization's notes apart.
@Controller('notes')
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  @Get()
  @RequireAbility('read', 'Note')
  list(@CurrentActor() actor: PluginActor, @Query() query: ListNotesQueryDto) {
    return this.notesService.list(actor, {
      page: query.page,
      limit: query.limit,
      pinned: query.pinned === undefined ? undefined : query.pinned === 'true',
    });
  }

  @Post()
  @RequireAbility('create', 'Note')
  create(@CurrentActor() actor: PluginActor, @Body() dto: CreateNoteDto) {
    return this.notesService.create(actor.id, dto);
  }

  @Get(':id')
  @RequireAbility('read', 'Note')
  findOne(@CurrentActor() actor: PluginActor, @Param('id') id: string) {
    return this.notesService.findOwn(actor, id);
  }

  @Patch(':id')
  @RequireAbility('update', 'Note')
  update(
    @CurrentActor() actor: PluginActor,
    @Param('id') id: string,
    @Body() dto: UpdateNoteDto,
  ) {
    return this.notesService.update(actor, id, dto);
  }

  @Delete(':id')
  @RequireAbility('delete', 'Note')
  @HttpCode(204)
  async remove(
    @CurrentActor() actor: PluginActor,
    @Param('id') id: string,
  ): Promise<void> {
    await this.notesService.remove(actor, id);
  }
}

// `Overview` is granted to org admins only (per organization), so only the current organization's admins get in
@Controller('overview')
export class OverviewController {
  constructor(private readonly notesService: NotesService) {}

  @Get()
  @RequireAbility('read', 'Overview')
  overview() {
    return this.notesService.overview();
  }
}
