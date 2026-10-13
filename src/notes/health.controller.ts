import { Controller, Get } from '@nestjs/common';
import { ACME_NOTES_MANIFEST } from '../manifest';

@Controller()
export class HealthController {
  // Declared `auth: 'public'` in the manifest, so no token is needed
  @Get('health')
  health() {
    return { status: 'ok', version: ACME_NOTES_MANIFEST.version };
  }
}
