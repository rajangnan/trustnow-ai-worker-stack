import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { getPool } from '../database/db.provider';
import { AuditService } from '../audit/audit.service';
import { CreateBranchDto, UpdateBranchDto, UpdateBranchTrafficDto } from './dto/branch.dto';

@Injectable()
export class BranchesService {
  constructor(private audit: AuditService) {}

  async findAll(tenantId: string, agentId: string) {
    await this.verifyAgent(tenantId, agentId);
    const { rows } = await getPool().query(
      `SELECT ab.*, u.name AS created_by_name,
              (SELECT MAX(version_number) FROM branch_versions bv WHERE bv.branch_id = ab.branch_id) AS latest_version_number
       FROM agent_branches ab
       LEFT JOIN users u ON u.user_id = ab.created_by
       WHERE ab.agent_id = $1 AND ab.tenant_id = $2
       ORDER BY ab.created_at DESC`,
      [agentId, tenantId],
    );
    return { branches: rows };
  }

  async create(tenantId: string, agentId: string, dto: CreateBranchDto, actorId: string) {
    const pool = getPool();
    await this.verifyAgent(tenantId, agentId);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`SET LOCAL app.current_tenant = '${tenantId}'`);

      const { rows } = await client.query(
        `INSERT INTO agent_branches
           (agent_id, tenant_id, name, description, traffic_split, status, created_by)
         VALUES ($1, $2, $3, $4, 0, 'draft', $5) RETURNING *`,
        [agentId, tenantId, dto.name, dto.description || null, actorId],
      );
      await client.query('COMMIT');
      await this.audit.log({
        tenant_id: tenantId, actor_id: actorId,
        action: 'branch.create', resource_type: 'agent_branch', resource_id: rows[0].branch_id,
        diff_json: dto as any,
      });
      return rows[0];
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async updateMetadata(tenantId: string, agentId: string, branchId: string, dto: UpdateBranchDto, actorId: string) {
    await this.verifyAgent(tenantId, agentId);
    const { rows } = await getPool().query(
      `UPDATE agent_branches SET name = COALESCE($1, name), description = COALESCE($2, description), updated_at = NOW()
       WHERE branch_id = $3 AND agent_id = $4 RETURNING *`,
      [dto.name || null, dto.description || null, branchId, agentId],
    );
    if (!rows.length) throw new NotFoundException('Branch not found');
    return { updated_at: rows[0].updated_at };
  }

  async updateTraffic(tenantId: string, agentId: string, branchId: string, dto: UpdateBranchTrafficDto, actorId: string) {
    await this.verifyAgent(tenantId, agentId);
    // Check sum of live branches won't exceed 100%
    if (dto.status === 'live' || dto.traffic_split > 0) {
      const { rows: currentBranches } = await getPool().query(
        `SELECT SUM(traffic_split) AS total FROM agent_branches
         WHERE agent_id = $1 AND status = 'live' AND branch_id != $2`,
        [agentId, branchId],
      );
      const currentTotal = parseFloat(currentBranches[0]?.total || '0');
      if (currentTotal + dto.traffic_split > 100) {
        throw new BadRequestException(`Traffic split would exceed 100% (current live total: ${currentTotal}%)`);
      }
    }
    const { rows } = await getPool().query(
      `UPDATE agent_branches SET traffic_split = $1, status = COALESCE($2, status), updated_at = NOW()
       WHERE branch_id = $3 AND agent_id = $4 RETURNING *`,
      [dto.traffic_split, dto.status || null, branchId, agentId],
    );
    if (!rows.length) throw new NotFoundException('Branch not found');
    return { traffic_split: rows[0].traffic_split, status: rows[0].status };
  }

  async protect(tenantId: string, agentId: string, branchId: string, actorId: string) {
    await this.verifyAgent(tenantId, agentId);
    await getPool().query(
      'UPDATE agent_branches SET is_protected = true WHERE branch_id = $1 AND agent_id = $2',
      [branchId, agentId],
    );
    return { is_protected: true };
  }

  async unlock(tenantId: string, agentId: string, branchId: string, actorId: string) {
    await this.verifyAgent(tenantId, agentId);
    await getPool().query(
      'UPDATE agent_branches SET is_protected = false WHERE branch_id = $1 AND agent_id = $2',
      [branchId, agentId],
    );
    await this.audit.log({
      tenant_id: tenantId, actor_id: actorId,
      action: 'branch_unlocked', resource_type: 'agent_branch', resource_id: branchId,
    });
    return { is_protected: false };
  }

  async getVersions(tenantId: string, agentId: string, branchId: string) {
    await this.verifyAgent(tenantId, agentId);
    const { rows } = await getPool().query(
      `SELECT bv.*, u.name AS published_by_name
       FROM branch_versions bv
       LEFT JOIN users u ON u.user_id = bv.published_by
       WHERE bv.branch_id = $1 AND bv.tenant_id = $2
       ORDER BY bv.version_number DESC`,
      [branchId, tenantId],
    );
    return { versions: rows };
  }

  async restoreVersion(tenantId: string, agentId: string, branchId: string, versionId: string, actorId: string) {
    await this.verifyAgent(tenantId, agentId);
    const { rows: vRows } = await getPool().query(
      'SELECT * FROM branch_versions WHERE version_id = $1 AND branch_id = $2',
      [versionId, branchId],
    );
    if (!vRows.length) throw new NotFoundException('Version not found');

    const maxVer = await getPool().query(
      'SELECT COALESCE(MAX(version_number), 0) + 1 AS v FROM branch_versions WHERE branch_id = $1',
      [branchId],
    );
    const newVersion = maxVer.rows[0].v;
    await getPool().query(
      `INSERT INTO branch_versions (branch_id, tenant_id, version_number, snapshot, published_by, notes)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [branchId, tenantId, newVersion, vRows[0].snapshot, actorId, `Restored from v${vRows[0].version_number}`],
    );
    return { restored: true, new_version_number: newVersion };
  }

  async archive(tenantId: string, agentId: string, branchId: string, actorId: string) {
    await this.verifyAgent(tenantId, agentId);
    const { rows } = await getPool().query(
      'SELECT is_protected, status FROM agent_branches WHERE branch_id = $1 AND agent_id = $2',
      [branchId, agentId],
    );
    if (!rows.length) throw new NotFoundException('Branch not found');
    if (rows[0].is_protected) throw new BadRequestException('Cannot archive a protected branch — unlock first');
    // Check this isn't the last live branch
    const { rows: liveBranches } = await getPool().query(
      `SELECT COUNT(*) AS cnt FROM agent_branches WHERE agent_id = $1 AND status = 'live'`,
      [agentId],
    );
    if (rows[0].status === 'live' && parseInt(liveBranches[0].cnt) <= 1) {
      throw new BadRequestException('Cannot archive the last live branch');
    }
    await getPool().query(
      `UPDATE agent_branches SET status = 'archived', updated_at = NOW() WHERE branch_id = $1`,
      [branchId],
    );
    return { archived: true };
  }

  private async verifyAgent(tenantId: string, agentId: string) {
    const { rows } = await getPool().query(
      'SELECT agent_id FROM agents WHERE agent_id = $1 AND tenant_id = $2',
      [agentId, tenantId],
    );
    if (!rows.length) throw new NotFoundException('Agent not found');
  }
}
