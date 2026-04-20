import type { NextFunction, Request, Response } from 'express';

const BEARER_PREFIX = 'Bearer ';

export function requireRemoteApiKey(req: Request, res: Response, next: NextFunction): void {
  const apiKey = process.env.PDFWM_API_KEY;

  if (!apiKey) {
    res.status(500).json({ error: 'PDFWM_API_KEY is required for remote MCP deployment' });
    return;
  }

  if (req.header('authorization') !== `${BEARER_PREFIX}${apiKey}`) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  next();
}
