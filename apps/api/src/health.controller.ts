import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('system')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Check API availability' })
  @ApiOkResponse({
    schema: { example: { status: 'ok', service: 'evomind-api', timestamp: '2026-09-23T13:00:00.000Z' } },
  })
  getHealth() {
    return { status: 'ok', service: 'evomind-api', timestamp: new Date().toISOString() };
  }
}
