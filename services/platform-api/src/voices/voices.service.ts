import { Injectable, NotFoundException } from '@nestjs/common';
import { getPool } from '../database/db.provider';

@Injectable()
export class VoicesService {
  async findAll(filters?: { language?: string; gender?: string; provider?: string }) {
    const pool = getPool();
    let query = `SELECT * FROM voices WHERE is_active = true`;
    const params: any[] = [];
    let i = 1;
    if (filters?.language) { query += ` AND $${i} = ANY(languages)`; params.push(filters.language); i++; }
    if (filters?.gender) { query += ` AND gender = $${i}`; params.push(filters.gender); i++; }
    if (filters?.provider) { query += ` AND provider = $${i}`; params.push(filters.provider); i++; }
    query += ` ORDER BY display_name ASC`;
    const { rows } = await pool.query(query, params);
    return rows;
  }

  async findOne(voiceId: string) {
    const pool = getPool();
    const { rows } = await pool.query(
      'SELECT * FROM voices WHERE voice_id = $1',
      [voiceId],
    );
    if (!rows.length) throw new NotFoundException('Voice not found');
    return rows[0];
  }

  async getLanguages() {
    const pool = getPool();
    const { rows } = await pool.query(
      `SELECT DISTINCT unnest(languages) AS language_code, COUNT(*) AS voice_count
       FROM voices WHERE is_active = true
       GROUP BY language_code ORDER BY voice_count DESC`,
    );
    return rows;
  }

  async getTopPicksByLanguage(languageCode: string) {
    const pool = getPool();
    const { rows } = await pool.query(
      `SELECT * FROM voices
       WHERE is_active = true AND $1 = ANY(languages)
       ORDER BY is_featured DESC, display_name ASC
       LIMIT 10`,
      [languageCode],
    );
    return rows;
  }

  // Preview voice — returns URL to sample audio
  async previewVoice(voiceId: string) {
    const voice = await this.findOne(voiceId);
    return {
      voice_id: voiceId,
      preview_url: voice.sample_url || null,
      provider: voice.provider,
    };
  }

  // Voice design (cloud only — ElevenLabs)
  async designVoice(params: {
    gender: string;
    age: string;
    accent: string;
    description: string;
    sample_text: string;
  }) {
    // In production: call ElevenLabs /v1/voice-generation/generate-voice
    // Returns designed voice preview
    return {
      message: 'Voice design preview generated',
      preview_audio_base64: null,
      params,
    };
  }

  // Voice clone
  async cloneVoice(name: string, description: string, tenantId: string) {
    return {
      message: 'Voice clone initiated',
      voice_id: null,
      name,
    };
  }
}
