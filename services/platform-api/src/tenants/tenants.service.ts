import { Injectable, NotFoundException } from '@nestjs/common';
import { getPool } from '../database/db.provider';
import { AuditService } from '../audit/audit.service';
import { CreateTenantDto } from './dto/create-tenant.dto';

@Injectable()
export class TenantsService {
  constructor(private audit: AuditService) {}

  async findAll() {
    const pool = getPool();
    const { rows } = await pool.query(
      'SELECT * FROM tenants ORDER BY created_at DESC',
    );
    return rows;
  }

  async findOne(tenantId: string) {
    const pool = getPool();
    const { rows } = await pool.query(
      'SELECT * FROM tenants WHERE tenant_id = $1',
      [tenantId],
    );
    if (!rows.length) throw new NotFoundException('Tenant not found');
    return rows[0];
  }

  async create(dto: CreateTenantDto, actorId: string) {
    const pool = getPool();
    const { rows } = await pool.query(
      `INSERT INTO tenants (name, plan_tier, default_partition)
       VALUES ($1, $2, $3) RETURNING *`,
      [dto.name, dto.plan_tier || 'starter', dto.default_partition || 'cloud'],
    );
    const tenant = rows[0];
    await this.audit.log({
      tenant_id: tenant.tenant_id,
      actor_id: actorId,
      action: 'tenant.create',
      resource_type: 'tenant',
      resource_id: tenant.tenant_id,
      diff_json: dto as any,
    });
    return tenant;
  }

  async update(tenantId: string, updates: Partial<CreateTenantDto>, actorId: string) {
    const pool = getPool();
    const fields: string[] = [];
    const values: any[] = [];
    let i = 1;
    if (updates.name !== undefined) { fields.push(`name = $${i++}`); values.push(updates.name); }
    if (updates.plan_tier !== undefined) { fields.push(`plan_tier = $${i++}`); values.push(updates.plan_tier); }
    if (updates.default_partition !== undefined) { fields.push(`default_partition = $${i++}`); values.push(updates.default_partition); }
    if (!fields.length) return this.findOne(tenantId);
    values.push(tenantId);
    const { rows } = await pool.query(
      `UPDATE tenants SET ${fields.join(', ')} WHERE tenant_id = $${i} RETURNING *`,
      values,
    );
    if (!rows.length) throw new NotFoundException('Tenant not found');
    await this.audit.log({
      tenant_id: tenantId,
      actor_id: actorId,
      action: 'tenant.update',
      resource_type: 'tenant',
      resource_id: tenantId,
      diff_json: updates as any,
    });
    return rows[0];
  }
}
