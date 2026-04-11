import {
  Injectable, NotFoundException, BadRequestException, ConflictException,
} from '@nestjs/common';
import axios from 'axios';
import { getPool } from '../database/db.provider';
import { AuditService } from '../audit/audit.service';

const META_GRAPH_URL = 'https://graph.facebook.com/v19.0';
const META_APP_SECRET = process.env.META_APP_SECRET || '';
const APP_BASE_URL = process.env.APP_BASE_URL || 'https://app.trustnow.ai';

@Injectable()
export class WhatsAppService {
  constructor(private audit: AuditService) {}

  // ── Account management ────────────────────────────────────────────────────

  async findAll(tenantId: string) {
    const pool = getPool();
    const { rows } = await pool.query(
      `SELECT wa.wa_account_id, wa.phone_number, wa.display_name,
              wa.agent_id, a.name AS agent_name, wa.status, wa.respond_with_audio
       FROM whatsapp_accounts wa
       LEFT JOIN agents a ON a.agent_id = wa.agent_id
       WHERE wa.tenant_id = $1 AND wa.status != 'disconnected'
       ORDER BY wa.created_at`,
      [tenantId],
    );
    return { accounts: rows };
  }

  async connectAccount(tenantId: string, dto: {
    oauth_code: string;
    waba_id: string;
    phone_number_id: string;
  }, actorId: string) {
    const pool = getPool();
    // Exchange OAuth code for long-lived token
    const tokenResp = await axios.get(`${META_GRAPH_URL}/oauth/access_token`, {
      params: {
        client_id: process.env.META_APP_ID || '',
        client_secret: META_APP_SECRET,
        code: dto.oauth_code,
      },
    });
    const accessToken = tokenResp.data.access_token;
    if (!accessToken) throw new BadRequestException('Failed to exchange OAuth code');

    // Fetch phone number details
    const phoneResp = await axios.get(
      `${META_GRAPH_URL}/${dto.phone_number_id}`,
      { params: { fields: 'display_phone_number,verified_name', access_token: accessToken } },
    );
    const phone = phoneResp.data.display_phone_number || '';
    const displayName = phoneResp.data.verified_name || phone;

    // Insert account (store token as-is — in production use Vault)
    const { rows } = await pool.query(
      `INSERT INTO whatsapp_accounts
         (tenant_id, meta_waba_id, phone_number_id, phone_number, display_name,
          access_token_enc, status, respond_with_audio)
       VALUES ($1,$2,$3,$4,$5,$6,'active',false) RETURNING wa_account_id`,
      [tenantId, dto.waba_id, dto.phone_number_id, phone, displayName, accessToken],
    );
    const { wa_account_id } = rows[0];

    // Register TRUSTNOW webhook with Meta
    try {
      await axios.post(
        `${META_GRAPH_URL}/${dto.phone_number_id}/subscribed_apps`,
        {},
        { params: { access_token: accessToken } },
      );
    } catch { /* non-fatal — webhook can be registered manually */ }

    await this.audit.log({
      tenant_id: tenantId, actor_id: actorId,
      action: 'whatsapp.connect', resource_type: 'whatsapp_account', resource_id: wa_account_id,
      diff_json: { waba_id: dto.waba_id, phone_number_id: dto.phone_number_id },
    });
    return { wa_account_id, phone_number: phone, display_name: displayName };
  }

  async updateAccount(tenantId: string, accountId: string, dto: {
    agent_id?: string | null;
    respond_with_audio?: boolean;
    status?: 'active' | 'paused';
  }, actorId: string) {
    const pool = getPool();
    const sets: string[] = [];
    const params: any[] = [];
    let i = 1;
    if (dto.agent_id !== undefined)         { sets.push(`agent_id = $${i++}`);           params.push(dto.agent_id); }
    if (dto.respond_with_audio !== undefined){ sets.push(`respond_with_audio = $${i++}`); params.push(dto.respond_with_audio); }
    if (dto.status)                          { sets.push(`status = $${i++}`);             params.push(dto.status); }
    if (!sets.length) return { updated_at: new Date().toISOString() };
    sets.push(`updated_at = NOW()`);
    params.push(tenantId, accountId);
    const { rowCount } = await pool.query(
      `UPDATE whatsapp_accounts SET ${sets.join(', ')} WHERE tenant_id = $${i++} AND wa_account_id = $${i++}`,
      params,
    );
    if (!rowCount) throw new NotFoundException('WhatsApp account not found');
    await this.audit.log({
      tenant_id: tenantId, actor_id: actorId,
      action: 'whatsapp.update', resource_type: 'whatsapp_account', resource_id: accountId,
      diff_json: dto,
    });
    return { updated_at: new Date().toISOString() };
  }

  async disconnectAccount(tenantId: string, accountId: string, actorId: string) {
    const pool = getPool();
    const { rows } = await pool.query(
      `SELECT phone_number_id, access_token_enc FROM whatsapp_accounts
       WHERE tenant_id = $1 AND wa_account_id = $2`,
      [tenantId, accountId],
    );
    if (!rows.length) throw new NotFoundException('WhatsApp account not found');
    const { phone_number_id, access_token_enc } = rows[0];

    // Deregister webhook from Meta
    try {
      await axios.delete(
        `${META_GRAPH_URL}/${phone_number_id}/subscribed_apps`,
        { params: { access_token: access_token_enc } },
      );
    } catch { /* non-fatal */ }

    await pool.query(
      `UPDATE whatsapp_accounts SET status = 'disconnected', updated_at = NOW()
       WHERE tenant_id = $1 AND wa_account_id = $2`,
      [tenantId, accountId],
    );
    await this.audit.log({
      tenant_id: tenantId, actor_id: actorId,
      action: 'whatsapp.disconnect', resource_type: 'whatsapp_account', resource_id: accountId,
      diff_json: {},
    });
    return { disconnected: true };
  }

  // ── Outbound ──────────────────────────────────────────────────────────────

  async sendOutboundMessage(tenantId: string, accountId: string, dto: {
    recipient_wa_id: string;
    template_name: string;
    template_parameters?: string[];
    agent_id?: string;
  }) {
    const pool = getPool();
    const { rows } = await pool.query(
      `SELECT phone_number_id, access_token_enc FROM whatsapp_accounts
       WHERE tenant_id = $1 AND wa_account_id = $2 AND status = 'active'`,
      [tenantId, accountId],
    );
    if (!rows.length) throw new NotFoundException('Account not found or not active');
    const { phone_number_id, access_token_enc } = rows[0];

    const resp = await axios.post(
      `${META_GRAPH_URL}/${phone_number_id}/messages`,
      {
        messaging_product: 'whatsapp',
        to: dto.recipient_wa_id,
        type: 'template',
        template: {
          name: dto.template_name,
          language: { code: 'en_US' },
          components: dto.template_parameters?.length ? [{
            type: 'body',
            parameters: dto.template_parameters.map(v => ({ type: 'text', text: v })),
          }] : [],
        },
      },
      { headers: { Authorization: `Bearer ${access_token_enc}` } },
    );
    const message_id = resp.data?.messages?.[0]?.id || null;
    return { message_id, status: 'sent' };
  }

  async initiateOutboundCall(tenantId: string, accountId: string, dto: {
    recipient_wa_id: string;
    permission_template_name: string;
    agent_id?: string;
  }) {
    // Send call permission request template
    await this.sendOutboundMessage(tenantId, accountId, {
      recipient_wa_id: dto.recipient_wa_id,
      template_name: dto.permission_template_name,
      agent_id: dto.agent_id,
    });
    return { permission_request_sent: true };
  }

  // ── Inbound webhook handler ───────────────────────────────────────────────

  async handleWebhook(body: any) {
    // Meta webhook verification is handled in controller
    // Route events
    const entries = body?.entry || [];
    for (const entry of entries) {
      for (const change of entry.changes || []) {
        const value = change.value || {};
        // Handle messages
        for (const msg of value.messages || []) {
          await this.routeInboundMessage(value.metadata?.phone_number_id, msg);
        }
        // Handle status updates (delivered/read)
        for (const status of value.statuses || []) {
          await this.handleStatusUpdate(status);
        }
      }
    }
    return { status: 'ok' };
  }

  private async routeInboundMessage(phoneNumberId: string, msg: any) {
    if (!phoneNumberId) return;
    const pool = getPool();
    const { rows } = await pool.query(
      `SELECT wa.*, a.agent_id FROM whatsapp_accounts wa
       LEFT JOIN agents a ON a.agent_id = wa.agent_id
       WHERE wa.phone_number_id = $1 AND wa.status = 'active'`,
      [phoneNumberId],
    );
    if (!rows.length) return;
    // In production: route to AI pipeline via HTTP or Redis pub/sub
    // For now: log receipt
  }

  private async handleStatusUpdate(status: any) {
    // Update message/call status in DB if tracked
  }
}
