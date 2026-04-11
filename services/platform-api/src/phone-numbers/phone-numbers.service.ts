import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { getPool } from '../database/db.provider';
import { AuditService } from '../audit/audit.service';
import { CreatePhoneNumberDto, AssignAgentDto } from './dto/phone-number.dto';
import axios from 'axios';

@Injectable()
export class PhoneNumbersService {
  constructor(private audit: AuditService) {}

  async findAll(tenantId: string) {
    const { rows } = await getPool().query(
      `SELECT pn.*, a.name AS agent_name
       FROM phone_numbers pn
       LEFT JOIN agents a ON a.agent_id = pn.agent_id
       WHERE pn.tenant_id = $1 AND pn.status != 'archived'
       ORDER BY pn.created_at DESC`,
      [tenantId],
    );
    return { phone_numbers: rows };
  }

  async create(tenantId: string, dto: CreatePhoneNumberDto, actorId: string) {
    const pool = getPool();
    // Check unique within tenant
    const { rows: existing } = await pool.query(
      'SELECT phone_number_id FROM phone_numbers WHERE tenant_id = $1 AND phone_number = $2',
      [tenantId, dto.phone_number],
    );
    if (existing.length) throw new BadRequestException('Phone number already registered for this tenant');

    const { rows } = await pool.query(
      `INSERT INTO phone_numbers
         (tenant_id, label, phone_number, sip_transport, media_encryption,
          outbound_address, outbound_transport, outbound_encryption,
          custom_sip_headers, sip_username, agent_id, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'active') RETURNING *`,
      [
        tenantId, dto.label, dto.phone_number,
        dto.sip_transport || 'tls', dto.media_encryption || 'required',
        dto.outbound_address || null, dto.outbound_transport || null, dto.outbound_encryption || null,
        JSON.stringify(dto.custom_sip_headers || []), dto.sip_username || null,
        dto.agent_id || null,
      ],
    );
    await this.eslReloadDialplan();
    await this.audit.log({
      tenant_id: tenantId, actor_id: actorId,
      action: 'phone_number.create', resource_type: 'phone_number', resource_id: rows[0].phone_number_id,
      diff_json: { phone_number: dto.phone_number, label: dto.label } as any,
    });
    return rows[0];
  }

  async update(tenantId: string, id: string, dto: Partial<CreatePhoneNumberDto>, actorId: string) {
    const pool = getPool();
    const { rows: existing } = await pool.query(
      'SELECT * FROM phone_numbers WHERE phone_number_id = $1 AND tenant_id = $2',
      [id, tenantId],
    );
    if (!existing.length) throw new NotFoundException('Phone number not found');

    const fields: string[] = [];
    const vals: any[] = [];
    let i = 1;
    const map: Record<string, any> = {
      label: dto.label, sip_transport: dto.sip_transport, media_encryption: dto.media_encryption,
      outbound_address: dto.outbound_address, outbound_transport: dto.outbound_transport,
      outbound_encryption: dto.outbound_encryption, agent_id: dto.agent_id,
    };
    for (const [col, val] of Object.entries(map)) {
      if (val !== undefined) { fields.push(`${col} = $${i++}`); vals.push(val); }
    }
    if (!fields.length) return existing[0];
    vals.push(id);
    const { rows } = await pool.query(
      `UPDATE phone_numbers SET ${fields.join(', ')}, updated_at = NOW() WHERE phone_number_id = $${i} RETURNING *`,
      vals,
    );
    if (dto.agent_id !== undefined) await this.eslReloadDialplan();
    await this.audit.log({
      tenant_id: tenantId, actor_id: actorId,
      action: 'phone_number.update', resource_type: 'phone_number', resource_id: id,
      diff_json: dto as any,
    });
    return rows[0];
  }

  async assignAgent(tenantId: string, id: string, dto: AssignAgentDto, actorId: string) {
    const pool = getPool();
    const { rows } = await pool.query(
      'UPDATE phone_numbers SET agent_id = $1, updated_at = NOW() WHERE phone_number_id = $2 AND tenant_id = $3 RETURNING *',
      [dto.agent_id, id, tenantId],
    );
    if (!rows.length) throw new NotFoundException('Phone number not found');
    if (dto.agent_id) {
      // Auto-set audio format to ulaw_8000 for SIP (§6.2H)
      await pool.query(
        `UPDATE agent_configs SET user_input_audio_format = 'ulaw_8000' WHERE agent_id = $1`,
        [dto.agent_id],
      );
    }
    await this.eslReloadDialplan();
    return { agent_id: rows[0].agent_id, updated_at: rows[0].updated_at };
  }

  async archive(tenantId: string, id: string, actorId: string) {
    const { rows } = await getPool().query(
      `UPDATE phone_numbers SET status = 'archived', updated_at = NOW()
       WHERE phone_number_id = $1 AND tenant_id = $2 RETURNING *`,
      [id, tenantId],
    );
    if (!rows.length) throw new NotFoundException('Phone number not found');
    await this.eslReloadDialplan();
    return { archived: true };
  }

  getSipEndpoint() {
    return {
      sip_endpoint: {
        standard: 'sip:sip.rtc.trustnow.ai:5060;transport=tcp',
        tls: 'sip:sip.rtc.trustnow.ai:5061;transport=tls',
        static_ip: {
          us: 'sip-static.rtc.trustnow.ai',
          eu: 'sip-static.rtc.eu.trustnow.ai',
          in: 'sip-static.rtc.in.trustnow.ai',
        },
      },
      supported_codecs: ['G711/8kHz (PCMU)', 'G722/16kHz'],
      transport_protocols: ['TCP', 'TLS'],
      udp_supported: false,
      rtp_port_range: '10000-60000',
      tls_minimum: 'TLS 1.2',
    };
  }

  private async eslReloadDialplan() {
    try {
      const eslUrl = process.env.ESL_URL || 'http://127.0.0.1:8021';
      await axios.post(`${eslUrl}/api/reloadxml`, {}, { timeout: 5000 });
    } catch (_) {
      // ESL may not be running in dev — non-fatal
    }
  }

  async upsertFreeSwitchGateway(tenantId: string, phoneNumberId: string) {
    const { rows } = await getPool().query(
      'SELECT * FROM phone_numbers WHERE phone_number_id = $1 AND tenant_id = $2',
      [phoneNumberId, tenantId],
    );
    if (!rows.length) throw new NotFoundException('Phone number not found');
    const pn = rows[0];
    if (!pn.outbound_address) return { skipped: true, reason: 'no outbound_address configured' };

    const gatewayXml = `<gateway name="trustnow_trunk_${phoneNumberId}">
  <param name="username" value="${pn.sip_username || 'trustnow'}"/>
  <param name="realm" value="${pn.outbound_address}"/>
  <param name="proxy" value="${pn.outbound_address}"/>
  <param name="register" value="true"/>
  <param name="caller-id-in-from" value="true"/>
</gateway>`;

    const fs = await import('fs/promises');
    const path = await import('path');
    const gwDir = '/opt/trustnowailabs/trustnow-ai-worker-stack/config/freeswitch/sip_profiles/external';
    await fs.mkdir(gwDir, { recursive: true });
    await fs.writeFile(path.join(gwDir, `${phoneNumberId}.xml`), gatewayXml);
    await this.eslReloadDialplan();
    return { upserted: true, gateway: `trustnow_trunk_${phoneNumberId}` };
  }
}
