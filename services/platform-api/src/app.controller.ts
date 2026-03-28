import { Controller, Get, SetMetadata } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('health')
@Controller()
export class AppController {
  @Get('health')
  @SetMetadata('isPublic', true)
  @ApiOperation({ summary: 'Health check' })
  health() {
    return {
      status: 'ok',
      service: 'trustnow-platform-api',
      port: process.env.PORT || 3001,
      version: '1.0.0',
    };
  }
}
