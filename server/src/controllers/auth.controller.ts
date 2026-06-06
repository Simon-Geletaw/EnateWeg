import { Request, Response, NextFunction } from 'express';
import { query, queryOne } from '../config/database';
import { SendOtpInput, VerifyOtpInput, RefreshTokenInput } from '../schemas';
import { generateAccessToken } from '../utils/auth';
import { generateRefreshToken, hashToken } from '../utils/crypto';
import { AppError } from '../middleware/errorHandler';

export async function sendOtp(req: Request<{}, {}, SendOtpInput>, res: Response, next: NextFunction) {
  try {
    // In MVP, we mock OTP sending. We just return success.
    res.json({ message: 'OTP sent successfully (mocked for MVP)' });
  } catch (error) {
    next(error);
  }
}

export async function verifyOtp(req: Request<{}, {}, VerifyOtpInput>, res: Response, next: NextFunction) {
  try {
    const { phone_number, otp, full_name, preferred_lang } = req.body;

    // Hardcode "123456" for testing MVP
    if (otp !== '123456') {
      throw new AppError(400, 'INVALID_OTP', 'Invalid OTP', 'የተሳሳተ የማረጋገጫ ኮድ');
    }

    // Upsert User
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

    // Generate tokens
    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
      [user.id, hashToken(refreshToken), expiresAt]
    );

    res.json({
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: 15 * 60, // 15 mins
      user: { id: user.id, full_name: user.full_name, is_new: isNew },
    });
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
      throw new AppError(401, 'INVALID_REFRESH_TOKEN', 'Invalid or expired refresh token', 'የተሳሳተ ወይም ጊዜው ያለፈበት ቶከን');
    }

    // Generate new tokens
    const accessToken = generateAccessToken(tokenRecord.user_id);
    const newRefreshToken = generateRefreshToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Revoke old, insert new
    await query(`UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1`, [tokenHash]);
    await query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
      [tokenRecord.user_id, hashToken(newRefreshToken), expiresAt]
    );

    res.json({
      access_token: accessToken,
      refresh_token: newRefreshToken,
      expires_in: 15 * 60,
    });
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
