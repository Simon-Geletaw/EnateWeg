import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/auth';
import { AppError } from './errorHandler';
import { queryOne } from '../config/database';

export interface AuthRequest extends Request {
  user?: {
    id: string;
  };
}

export async function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new AppError(401, 'UNAUTHORIZED', 'No token provided or invalid format', 'ምንም ቶከን አልቀረበም ወይም የተሳሳተ ቅርጸት');
    }

    const token = authHeader.split(' ')[1];
    const payload = verifyAccessToken(token);

    const user = await queryOne('SELECT id, is_active FROM users WHERE id = $1', [payload.userId]);
    if (!user || !user.is_active) {
      throw new AppError(401, 'UNAUTHORIZED', 'User not found or inactive', 'ተጠቃሚው አልተገኘም ወይም ንቁ አይደለም');
    }

    req.user = { id: payload.userId };
    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      next(new AppError(401, 'TOKEN_EXPIRED', 'Access token expired', 'የመዳረሻ ቶከን ጊዜው አልፏል'));
    } else if (error.name === 'JsonWebTokenError') {
      next(new AppError(401, 'INVALID_TOKEN', 'Invalid access token', 'የተሳሳተ የመዳረሻ ቶከን'));
    } else {
      next(error);
    }
  }
}
