import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { getPool } from '../database/db.provider';

@Injectable()
export class AuthService {
  constructor(private jwtService: JwtService) {}

  // Verify Keycloak-issued JWT (RS256) or internal HS256
  async verifyToken(token: string): Promise<any> {
    try {
      return this.jwtService.verify(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  // Exchange Keycloak token for platform session with tenant context
  async keycloakVerify(token: string): Promise<{
    access_token: string;
    tenant_id: string;
    user_id: string;
    role: string;
  }> {
    const payload = await this.verifyToken(token);
    const tenantId = payload.tenant_id || payload['trustnow/tenant_id'];
    if (!tenantId) throw new UnauthorizedException('No tenant claim in token');

    // Inject tenant context into new signed token
    const newPayload = {
      sub: payload.sub,
      email: payload.email,
      tenant_id: tenantId,
      role: payload.role || 'agent_operator',
    };
    return {
      access_token: this.jwtService.sign(newPayload),
      tenant_id: tenantId,
      user_id: payload.sub,
      role: newPayload.role,
    };
  }

  // Helper: get a pool client with tenant RLS set
  async getClientWithTenant(tenantId: string) {
    const pool = getPool();
    const client = await pool.connect();
    await client.query(`SET LOCAL app.current_tenant = '${tenantId}'`);
    return client;
  }
}
