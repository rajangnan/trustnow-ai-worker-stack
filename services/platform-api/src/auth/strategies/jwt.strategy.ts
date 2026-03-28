import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { getPool } from '../../database/db.provider';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      // Keycloak RS256 public key or HS256 secret
      secretOrKey: config.get('JWT_SECRET') || 'trustnow-dev-secret',
    });
  }

  async validate(payload: any) {
    // payload.sub = Keycloak user subject, payload.tenant_id = custom claim
    const pool = getPool();
    const tenantId = payload.tenant_id || payload['trustnow/tenant_id'];
    if (!tenantId) throw new UnauthorizedException('Missing tenant claim');

    // Set RLS context for this request
    await pool.query(`SET LOCAL app.current_tenant = '${tenantId}'`);

    return {
      user_id: payload.sub,
      tenant_id: tenantId,
      email: payload.email,
      role: payload.role || payload['trustnow/role'] || 'agent_operator',
    };
  }
}
