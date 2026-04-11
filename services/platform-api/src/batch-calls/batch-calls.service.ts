import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { getPool } from '../database/db.provider';
import { AuditService } from '../audit/audit.service';
import { CreateBatchCallDto, TestCallDto } from './dto/batch-call.dto';

@Injectable()
export class BatchCallsService {
  constructor(private audit: AuditService) {}

  async findAll(tenantId: string) {
    const { rows } = await getPool().query(
      `SELECT * FROM batch_calls WHERE tenant_id = $1 ORDER BY created_at DESC`,
      [tenantId],
    );
    return { batch_calls: rows };
  }

  async findOne(tenantId: string, id: string) {
    const { rows } = await getPool().query(
      `SELECT bc.*, a.name AS agent_name, pn.phone_number
       FROM batch_calls bc
       LEFT JOIN agents a ON a.agent_id = bc.agent_id
       LEFT JOIN phone_numbers pn ON pn.phone_number_id = bc.phone_number_id
       WHERE bc.batch_call_id = $1 AND bc.tenant_id = $2`,
      [id, tenantId],
    );
    if (!rows.length) throw new NotFoundException('Batch call not found');
    const bc = rows[0];
    const total = bc.total_recipients || 0;
    const done = (bc.calls_completed || 0) + (bc.calls_failed || 0);
    return { ...bc, progress_pct: total > 0 ? Math.round((done / total) * 100) : 0 };
  }

  async create(tenantId: string, dto: CreateBatchCallDto, recipientsCsv: Buffer | null, actorId: string) {
    if (!dto.compliance_acknowledged) {
      throw new BadRequestException('compliance_acknowledged must be true');
    }
    const pool = getPool();
    // Validate agent + phone_number belong to tenant
    const { rows: agentRows } = await pool.query(
      'SELECT agent_id FROM agents WHERE agent_id = $1 AND tenant_id = $2',
      [dto.agent_id, tenantId],
    );
    if (!agentRows.length) throw new NotFoundException('Agent not found');
    const { rows: pnRows } = await pool.query(
      'SELECT phone_number_id FROM phone_numbers WHERE phone_number_id = $1 AND tenant_id = $2',
      [dto.phone_number_id, tenantId],
    );
    if (!pnRows.length) throw new NotFoundException('Phone number not found');

    let recipients: Array<{ phone_number: string; dynamic_variables: object; overrides: object }> = [];
    if (recipientsCsv) {
      recipients = this.parseCsv(recipientsCsv);
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`SET LOCAL app.current_tenant = '${tenantId}'`);

      const { rows } = await client.query(
        `INSERT INTO batch_calls
           (tenant_id, name, agent_id, phone_number_id, ringing_timeout_s,
            concurrency_limit, scheduled_at, timezone, compliance_acknowledged, created_by,
            total_recipients, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'pending') RETURNING *`,
        [
          tenantId, dto.name || 'Untitled Batch', dto.agent_id, dto.phone_number_id,
          dto.ringing_timeout_s || 60, dto.concurrency_limit || null,
          dto.scheduled_at || null, dto.timezone || null,
          true, actorId, recipients.length,
        ],
      );
      const batch = rows[0];

      if (recipients.length > 0) {
        const values = recipients.map((r, i) =>
          `($${i * 4 + 1}, $${i * 4 + 2}, $${i * 4 + 3}, $${i * 4 + 4})`,
        ).join(',');
        const params = recipients.flatMap(r => [
          batch.batch_call_id, tenantId, r.phone_number, JSON.stringify(r.dynamic_variables),
        ]);
        if (params.length > 0) {
          await client.query(
            `INSERT INTO batch_call_recipients (batch_call_id, tenant_id, phone_number, dynamic_variables) VALUES ${values}`,
            params,
          );
        }
      }

      await client.query('COMMIT');
      await this.audit.log({
        tenant_id: tenantId, actor_id: actorId,
        action: 'batch_call.create', resource_type: 'batch_call', resource_id: batch.batch_call_id,
        diff_json: { name: batch.name, total_recipients: recipients.length } as any,
      });
      return { batch_call_id: batch.batch_call_id, name: batch.name, status: 'pending', total_recipients: recipients.length };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async getRecipients(tenantId: string, id: string, page = 1, limit = 100) {
    const offset = (page - 1) * limit;
    const [countResult, rows] = await Promise.all([
      getPool().query('SELECT COUNT(*) FROM batch_call_recipients WHERE batch_call_id = $1', [id]),
      getPool().query(
        'SELECT * FROM batch_call_recipients WHERE batch_call_id = $1 ORDER BY created_at LIMIT $2 OFFSET $3',
        [id, limit, offset],
      ),
    ]);
    return { recipients: rows.rows, total: parseInt(countResult.rows[0].count), page, limit };
  }

  async cancel(tenantId: string, id: string) {
    const { rows } = await getPool().query(
      `UPDATE batch_calls SET status = 'cancelled' WHERE batch_call_id = $1 AND tenant_id = $2
       AND status IN ('pending', 'running') RETURNING *`,
      [id, tenantId],
    );
    if (!rows.length) throw new BadRequestException('Batch call cannot be cancelled (not in pending/running state)');
    const { rows: cancelledRecipients } = await getPool().query(
      `UPDATE batch_call_recipients SET status = 'cancelled'
       WHERE batch_call_id = $1 AND status = 'pending' RETURNING recipient_id`,
      [id],
    );
    return { cancelled: true, calls_cancelled: cancelledRecipients.length };
  }

  async testCall(tenantId: string, dto: TestCallDto) {
    return { test_call_id: `test_${Date.now()}`, status: 'initiated' };
  }

  private parseCsv(buf: Buffer): Array<{ phone_number: string; dynamic_variables: object; overrides: object }> {
    const text = buf.toString('utf-8');
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const phoneIdx = headers.indexOf('phone_number');
    if (phoneIdx === -1) throw new BadRequestException("CSV must contain 'phone_number' column");
    const specialCols = new Set(['language', 'first_message', 'system_prompt', 'voice_id', 'phone_number']);
    const results: Array<{ phone_number: string; dynamic_variables: object; overrides: object }> = [];
    const seen = new Set<string>();
    for (const line of lines.slice(1)) {
      const values = line.split(',').map(v => v.trim());
      const phone = values[phoneIdx];
      if (!phone || !/^\+[1-9]\d{6,14}$/.test(phone)) continue;
      if (seen.has(phone)) continue;
      seen.add(phone);
      const overrides: Record<string, string> = {};
      const dynamic: Record<string, string> = {};
      headers.forEach((h, i) => {
        if (h === 'phone_number') return;
        if (specialCols.has(h)) overrides[h] = values[i] || '';
        else dynamic[h] = values[i] || '';
      });
      results.push({ phone_number: phone, dynamic_variables: dynamic, overrides });
    }
    return results;
  }
}
