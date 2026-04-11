import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ApiKeysService } from '../../api-keys/api-keys.service';

@Injectable()
export class ApiKeyMiddleware implements NestMiddleware {
  constructor(private apiKeysService: ApiKeysService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const apiKey = req.headers['x-api-key'] as string | undefined;
    if (!apiKey || !apiKey.startsWith('sk-tn_')) {
      // No x-api-key header — let JWT guard handle auth
      return next();
    }
    try {
      const context = await this.apiKeysService.validateApiKey(apiKey);
      // Attach tenant_id and key_id to request for downstream use
      (req as any).apiKeyContext = context;
      (req as any).tenantId = context.tenant_id;
    } catch (err: any) {
      res.status(err.status || 401).json({ message: err.message || 'Unauthorized' });
      return;
    }
    next();
  }
}
