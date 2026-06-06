import { Request, Response, NextFunction } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { query, queryOne } from '../config/database';
import { SendOtpInput, VerifyOtpInput, RefreshTokenInput } from '../schemas';
import { generateAccessToken } from '../utils/auth';
import { generateRefreshToken, hashToken } from '../utils/crypto';
import { AppError } from '../middleware/errorHandler';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/**
 * HELPER: Common token generation logic used by OTP and Google
 */
async function issueTokens(userId: string) {
  const accessToken = generateAccessToken(userId);
  const refreshToken = generateRefreshToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

  await query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
    [userId, hashToken(refreshToken), expiresAt]
  );

  return { accessToken, refreshToken };
}

export async function sendOtp(req: Request<{}, {}, SendOtpInput>, res: Response, next: NextFunction) {
  try {
    res.json({ message: 'OTP sent successfully (mocked for MVP)' });
  } catch (error) {
    next(error);
  }
}

export async function verifyOtp(req: Request<{}, {}, VerifyOtpInput>, res: Response, next: NextFunction) {
  try {
    const { phone_number, otp, full_name, preferred_lang } = req.body;

    if (otp !== '123456') {
      throw new AppError(400, 'INVALID_OTP', 'Invalid OTP', 'የተሳሳተ የማረጋገጫ ኮድ');
    }

    let user = await queryOne('SELECT id, full_name FROM users WHERE phone_number = $1', [phone_number]);
    let isNew = false;

    if (!user) {
      if (!full_name) {
        throw new AppError(400, 'NAME_REQUIRED', 'Full name is required for new users', 'ለአዲስ ተጠቃሚዎች ሙሉ ስም ያስፈልጋል');
      }
      isNew = true;
      const result = await query(
        `INSERT INTO users (phone_number, full_name, preferred_lang) 
         VALUES ($1, $2, $3) RETURNING id, full_name`,
        [phone_number, full_name, preferred_lang || 'am']
      );
      user = result[0];
    }

    const { accessToken, refreshToken } = await issueTokens(user.id);

    res.json({
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: 15 * 60,
      user: { id: user.id, full_name: user.full_name, is_new: isNew },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GOOGLE LOGIN: Verifies Google ID Token and upserts user
 */
export async function googleLogin(req: Request, res: Response, next: NextFunction) {
  try {
    const { id_token } = req.body;
    if (!id_token) throw new AppError(400, 'TOKEN_REQUIRED', 'ID Token is required');

    const ticket = await googleClient.verifyIdToken({
      idToken: id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    
    const payload = ticket.getPayload();
    if (!payload) throw new AppError(401, 'INVALID_TOKEN', 'Invalid Google Token');

    const { sub: googleId, email, name } = payload;

    // Try finding by google_id or email
    let user = await queryOne('SELECT id, full_name FROM users WHERE google_id = $1 OR email = $2', [googleId, email]);
    let isNew = false;

    if (!user) {
      isNew = true;
      const result = await query(
        `INSERT INTO users (google_id, email, full_name) VALUES ($1, $2, $3) RETURNING id, full_name`,
        [googleId, email, name]
      );
      user = result[0];
    }

    const { accessToken, refreshToken } = await issueTokens(user.id);

    res.json({
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: 15 * 60,
      user: { id: user.id, full_name: user.full_name, is_new: isNew },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET ME: Returns current authenticated user's profile
 */
export async function getMe(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user?.id; // Set by auth middleware
    const user = await queryOne('SELECT id, phone_number, email, full_name, is_onboarded FROM users WHERE id = $1', [userId]);
    
    if (!user) throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
    res.json(user);
  } catch (error) {
    next(error);
  }
}

/**
 * ONBOARDING: Updates profile and sets is_onboarded to true
 */
export async function onboard(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user?.id;
    const { birth_date, gender, goals } = req.body;

    await query(
      'UPDATE users SET birth_date = $1, gender = $2, goals = $3, is_onboarded = true WHERE id = $4',
      [birth_date, gender, goals, userId]
    );

    res.json({ message: 'Onboarding completed' });
  } catch (error) {
    next(error);
  }
}

export async function refresh(req: Request<{}, {}, RefreshTokenInput>, res: Response, next: NextFunction) {
  try {
    const { refresh_token } = req.body;
    const tokenHash = hashToken(refresh_token);

    const tokenRecord = await queryOne(
      `SELECT user_id, expires_at, revoked_at FROM refresh_tokens WHERE token_hash = $1`,
      [tokenHash]
    );

    if (!tokenRecord || tokenRecord.revoked_at || new Date(tokenRecord.expires_at) < new Date()) {
      throw new AppError(401, 'INVALID_REFRESH_TOKEN', 'Invalid or expired refresh token');
    }

    const { accessToken, refreshToken: newRefreshToken } = await issueTokens(tokenRecord.user_id);
    await query(`UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1`, [tokenHash]);

    res.json({ access_token: accessToken, refresh_token: newRefreshToken, expires_in: 15 * 60 });
  } catch (error) {
    next(error);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction) {
  try {
    const { refresh_token } = req.body;
    if (refresh_token) {
      await query(`UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1`, [hashToken(refresh_token)]);
    }
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}