import { Controller, Post, Body, HttpCode, SetMetadata } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AuthService } from './auth.service';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('verify')
  @HttpCode(200)
  @SetMetadata('isPublic', true)
  @ApiOperation({ summary: 'Verify Keycloak JWT and get platform token' })
  async verifyKeycloakToken(@Body() body: { token: string }) {
    return this.authService.keycloakVerify(body.token);
  }
}
