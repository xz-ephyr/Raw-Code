import type { Request, Response, NextFunction } from 'express';

const API_KEY = process.env.API_KEY;

export function auth(req: Request, res: Response, next: NextFunction) {
  if (API_KEY && req.headers['x-api-key'] !== API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}
