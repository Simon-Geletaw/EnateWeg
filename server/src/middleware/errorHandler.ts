/**
 * Global error handling middleware.
 * Catches all unhandled errors, formats them per the API spec
 * (code, message_am, message_en, detail), and sends a JSON response.
 */
import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  public statusCode: number;
  public code: string;
  public messageAm: string;
  public messageEn: string;
  public detail: any;

  constructor(
    statusCode: number,
    code: string,
    messageEn: string,
    messageAm: string = messageEn,
    detail: any = null
  ) {
    super(messageEn);
    this.statusCode = statusCode;
    this.code = code;
    this.messageEn = messageEn;
    this.messageAm = messageAm;
    this.detail = detail;
  }
}

export function errorHandler(
  err: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // If it's our custom AppError, use its fields
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message_am: err.messageAm,
        message_en: err.messageEn,
        detail: err.detail,
      },
    });
    return;
  }

  // Zod validation errors
  if (err.name === 'ZodError') {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message_am: 'የግቤት ስህተት።',
        message_en: 'Validation error.',
        detail: (err as any).errors,
      },
    });
    return;
  }

  // Unexpected errors
  console.error('❌ Unhandled error:', err);
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message_am: 'ያልተጠበቀ ስህተት ተከስቷል።',
      message_en: 'An unexpected error occurred.',
      detail: process.env.NODE_ENV === 'development' ? err.message : null,
    },
  });
}
