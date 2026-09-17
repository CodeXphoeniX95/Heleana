import { Request, Response, NextFunction } from 'express';
import { verifyToken, JwtPayload } from '../services/auth.service';

// Étend le type Request d'Express pour porter l'utilisateur authentifié
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/**
 * Middleware d'authentification JWT.
 * Vérifie le header Authorization: Bearer <token>
 * Injecte req.user si le token est valide.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Token d\'authentification manquant' });
    return;
  }

  const token = authHeader.slice(7).trim();

  try {
    const payload = verifyToken(token);
    req.user = payload;
    next();
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Token invalide';
    if (message.includes('expired')) {
      res.status(401).json({ error: 'Token expiré, veuillez vous reconnecter' });
    } else {
      res.status(401).json({ error: 'Token invalide' });
    }
  }
}
