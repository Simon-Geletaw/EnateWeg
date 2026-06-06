import { Request, Response, NextFunction } from 'express';
import { query, queryOne } from '../config/database';
import { AppError } from '../middleware/errorHandler';

export async function searchIngredients(req: Request, res: Response, next: NextFunction) {
  try {
    const { q, fasting, page = '1', limit = '20' } = req.query;
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const offset = (pageNum - 1) * limitNum;

    let sql = `SELECT * FROM ingredients WHERE is_active = TRUE`;
    const params: any[] = [];
    let paramIndex = 1;

    if (q) {
      sql += ` AND (name_am ILIKE $${paramIndex} OR name_en ILIKE $${paramIndex})`;
      params.push(`%${q}%`);
      paramIndex++;
    }

    if (fasting === 'true') {
      sql += ` AND is_fasting_safe = TRUE`;
    }

    // Count total
    const countSql = sql.replace('*', 'COUNT(*) as total');
    const countResult = await queryOne(countSql, params);
    const total = parseInt(countResult?.total || '0', 10);

    // Add pagination
    sql += ` ORDER BY name_en ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limitNum, offset);

    const results = await query(sql, params);

    res.json({
      results,
      total,
      page: pageNum,
    });
  } catch (error) {
    next(error);
  }
}

export async function getIngredient(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const ingredient = await queryOne(`SELECT * FROM ingredients WHERE id = $1`, [id]);
    
    if (!ingredient) {
      throw new AppError(404, 'NOT_FOUND', 'Ingredient not found', 'ግብዓት አልተገኘም');
    }

    res.json(ingredient);
  } catch (error) {
    next(error);
  }
}
