import { Injectable } from '@nestjs/common';
import { getPool } from '../database/db.provider';

@Injectable()
export class LlmProvidersService {
  async findAllProviders() {
    const pool = getPool();
    const { rows } = await pool.query(
      'SELECT * FROM llm_providers ORDER BY name ASC',
    );
    return rows;
  }

  async findAllModels(filters?: { provider_id?: string; status?: string }) {
    const pool = getPool();
    let query = `
      SELECT m.*, p.name AS provider_name, p.type AS provider_type
      FROM llm_models m
      JOIN llm_providers p ON p.provider_id = m.provider_id
      WHERE 1=1`;
    const params: any[] = [];
    let i = 1;
    if (filters?.provider_id) { query += ` AND m.provider_id = $${i++}`; params.push(filters.provider_id); }
    if (filters?.status) { query += ` AND m.status = $${i++}`; params.push(filters.status); }
    else { query += ` AND m.status = 'active'`; }
    query += ` ORDER BY p.name ASC, m.display_name ASC`;
    const { rows } = await pool.query(query, params);
    return rows;
  }
}
