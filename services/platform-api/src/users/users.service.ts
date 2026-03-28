import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { getPool } from '../database/db.provider';
import { AuditService } from '../audit/audit.service';
import { CreateUserDto, UpdateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  constructor(private audit: AuditService) {}

  async findAll(tenantId: string) {
    const pool = getPool();
    const { rows } = await pool.query(
      `SELECT u.*, r.name AS role_name
       FROM users u
       LEFT JOIN roles r ON r.role_id = u.role_id
       WHERE u.tenant_id = $1 ORDER BY u.created_at DESC`,
      [tenantId],
    );
    return rows;
  }

  async findOne(tenantId: string, userId: string) {
    const pool = getPool();
    const { rows } = await pool.query(
      `SELECT u.*, r.name AS role_name
       FROM users u
       LEFT JOIN roles r ON r.role_id = u.role_id
       WHERE u.tenant_id = $1 AND u.user_id = $2`,
      [tenantId, userId],
    );
    if (!rows.length) throw new NotFoundException('User not found');
    return rows[0];
  }

  async create(tenantId: string, dto: CreateUserDto, actorId: string) {
    const pool = getPool();
    try {
      const { rows } = await pool.query(
        `INSERT INTO users (tenant_id, email, name, role_id)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [tenantId, dto.email, dto.name, dto.role_id || null],
      );
      await this.audit.log({
        tenant_id: tenantId,
        actor_id: actorId,
        action: 'user.create',
        resource_type: 'user',
        resource_id: rows[0].user_id,
        diff_json: { email: dto.email, name: dto.name },
      });
      return rows[0];
    } catch (err: any) {
      if (err.code === '23505') throw new ConflictException('Email already exists');
      throw err;
    }
  }

  async update(tenantId: string, userId: string, dto: UpdateUserDto, actorId: string) {
    const pool = getPool();
    const fields: string[] = [];
    const values: any[] = [];
    let i = 1;
    if (dto.name !== undefined) { fields.push(`name = $${i++}`); values.push(dto.name); }
    if (dto.role_id !== undefined) { fields.push(`role_id = $${i++}`); values.push(dto.role_id); }
    if (dto.status !== undefined) { fields.push(`status = $${i++}`); values.push(dto.status); }
    if (!fields.length) return this.findOne(tenantId, userId);
    values.push(tenantId, userId);
    const { rows } = await pool.query(
      `UPDATE users SET ${fields.join(', ')} WHERE tenant_id = $${i} AND user_id = $${i + 1} RETURNING *`,
      values,
    );
    if (!rows.length) throw new NotFoundException('User not found');
    await this.audit.log({
      tenant_id: tenantId,
      actor_id: actorId,
      action: 'user.update',
      resource_type: 'user',
      resource_id: userId,
      diff_json: dto as any,
    });
    return rows[0];
  }
}
