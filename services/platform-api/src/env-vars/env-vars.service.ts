import {
  Injectable, NotFoundException, ConflictException, BadRequestException,
} from '@nestjs/common';
import { getPool } from '../database/db.provider';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class EnvVarsService {
  constructor(private audit: AuditService) {}

  async findAll(tenantId: string) {
    const pool = getPool();
    const { rows } = await pool.query(
      `SELECT ev.var_id, ev.name, ev.var_type, ev.updated_at,
              COUNT(evv.environment)::int AS environments_configured
       FROM environment_variables ev
       LEFT JOIN environment_variable_values evv ON evv.var_id = ev.var_id
       WHERE ev.tenant_id = $1
       GROUP BY ev.var_id, ev.name, ev.var_type, ev.updated_at
       ORDER BY ev.name`,
      [tenantId],
    );
    return { variables: rows };
  }

  async findOne(tenantId: string, varId: string) {
    const pool = getPool();
    const { rows: varRows } = await pool.query(
      `SELECT var_id, name, var_type FROM environment_variables WHERE tenant_id = $1 AND var_id = $2`,
      [tenantId, varId],
    );
    if (!varRows.length) throw new NotFoundException('Environment variable not found');
    const { rows: valueRows } = await pool.query(
      `SELECT environment, value FROM environment_variable_values WHERE var_id = $1 ORDER BY environment`,
      [varId],
    );
    return { ...varRows[0], values: valueRows };
  }

  async create(tenantId: string, dto: {
    name: string;
    var_type?: 'string' | 'number' | 'boolean';
    values: Array<{ environment: string; value: string }>;
  }, actorId: string) {
    const pool = getPool();
    if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(dto.name)) {
      throw new BadRequestException('Variable name must match /^[a-zA-Z][a-zA-Z0-9_]*/');
    }
    if (!dto.values?.length) throw new BadRequestException('At least one value required');
    // Check uniqueness
    const { rows: existing } = await pool.query(
      `SELECT var_id FROM environment_variables WHERE tenant_id = $1 AND name = $2`,
      [tenantId, dto.name],
    );
    if (existing.length) throw new ConflictException(`Variable '${dto.name}' already exists`);

    const { rows } = await pool.query(
      `INSERT INTO environment_variables (tenant_id, name, var_type, created_by)
       VALUES ($1,$2,$3,$4) RETURNING var_id, name, var_type`,
      [tenantId, dto.name, dto.var_type || 'string', actorId],
    );
    const { var_id } = rows[0];
    for (const v of dto.values) {
      await pool.query(
        `INSERT INTO environment_variable_values (var_id, environment, value)
         VALUES ($1,$2,$3)`,
        [var_id, v.environment, v.value],
      );
    }
    await this.audit.log({
      tenant_id: tenantId, actor_id: actorId,
      action: 'env_var.create', resource_type: 'environment_variable', resource_id: var_id,
      diff_json: { name: dto.name, var_type: dto.var_type },
    });
    return { ...rows[0], values: dto.values };
  }

  async update(tenantId: string, varId: string, dto: {
    name?: string;
    var_type?: string;
    values?: Array<{ environment: string; value: string }>;
  }, actorId: string) {
    const pool = getPool();
    await this.findOne(tenantId, varId);
    if (dto.name || dto.var_type) {
      const sets: string[] = [];
      const params: any[] = [];
      let i = 1;
      if (dto.name)     { sets.push(`name = $${i++}`);     params.push(dto.name); }
      if (dto.var_type) { sets.push(`var_type = $${i++}`); params.push(dto.var_type); }
      sets.push(`updated_at = NOW()`);
      params.push(tenantId, varId);
      await pool.query(
        `UPDATE environment_variables SET ${sets.join(', ')} WHERE tenant_id = $${i++} AND var_id = $${i++}`,
        params,
      );
    }
    if (dto.values?.length) {
      for (const v of dto.values) {
        await pool.query(
          `INSERT INTO environment_variable_values (var_id, environment, value)
           VALUES ($1,$2,$3)
           ON CONFLICT (var_id, environment) DO UPDATE SET value = EXCLUDED.value`,
          [varId, v.environment, v.value],
        );
      }
    }
    await this.audit.log({
      tenant_id: tenantId, actor_id: actorId,
      action: 'env_var.update', resource_type: 'environment_variable', resource_id: varId, diff_json: dto,
    });
    return { updated_at: new Date().toISOString() };
  }

  async delete(tenantId: string, varId: string, actorId: string) {
    const pool = getPool();
    await this.findOne(tenantId, varId);
    // CASCADE in DB deletes environment_variable_values
    await pool.query(`DELETE FROM environment_variables WHERE tenant_id = $1 AND var_id = $2`, [tenantId, varId]);
    await this.audit.log({
      tenant_id: tenantId, actor_id: actorId,
      action: 'env_var.delete', resource_type: 'environment_variable', resource_id: varId, diff_json: {},
    });
    return { deleted: true };
  }

  // ── Resolution service (called by AI pipeline / tool execution) ───────────

  async resolveEnvVars(text: string, tenantId: string, environment: string): Promise<string> {
    const pool = getPool();
    const tokens = text.match(/\{\{env\.([A-Za-z][A-Za-z0-9_]*)\}\}/g) ?? [];
    for (const token of tokens) {
      const varName = token.replace('{{env.', '').replace('}}', '');
      const { rows: varRows } = await pool.query(
        `SELECT var_id FROM environment_variables WHERE tenant_id = $1 AND name = $2`,
        [tenantId, varName],
      );
      if (!varRows.length) throw new Error(`Environment variable '${varName}' not found`);
      const varId = varRows[0].var_id;
      // Try requested environment first
      const { rows: valRows } = await pool.query(
        `SELECT value FROM environment_variable_values WHERE var_id = $1 AND environment = $2`,
        [varId, environment],
      );
      let value: string | null = valRows[0]?.value ?? null;
      // Fall back to production
      if (value === null && environment !== 'production') {
        const { rows: prodRows } = await pool.query(
          `SELECT value FROM environment_variable_values WHERE var_id = $1 AND environment = 'production'`,
          [varId],
        );
        value = prodRows[0]?.value ?? null;
      }
      if (value === null) {
        throw new Error(`Variable '${varName}' has no value for '${environment}' and no production fallback`);
      }
      text = text.split(token).join(value);
    }
    return text;
  }
}
