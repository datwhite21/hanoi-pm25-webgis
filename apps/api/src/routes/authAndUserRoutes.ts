import { Router } from 'express';
import { z } from 'zod';
import { dbQuery } from '../db/pool.js';
import { createAccessToken, requireAuth } from '../middleware/auth.js';
import { ApiError, sendSuccess } from '../middleware/errorHandler.js';

export const authAndUserRouter = Router();

// -----------------------------------------------------------------------------
// 1. POST /api/v1/auth/login
// -----------------------------------------------------------------------------
authAndUserRouter.post('/v1/auth/login', async (req, res, next) => {
  try {
    const bodySchema = z.object({
      email: z.string().email(),
      password: z.string().min(6),
    });
    const { email, password } = bodySchema.parse(req.body);

    const result = await dbQuery<{
      id: string;
      email: string;
      full_name: string;
      role: 'USER' | 'ADMIN';
      is_active: boolean;
    }>(
      `
      SELECT id, email, full_name, role, is_active
      FROM users
      WHERE LOWER(email) = LOWER($1)
        AND password_hash = crypt($2, password_hash)
      LIMIT 1
      `,
      [email, password]
    );

    if (result.rows.length === 0) {
      throw new ApiError(
        401,
        'INVALID_CREDENTIALS',
        'Email hoặc mật khẩu không chính xác.'
      );
    }

    const user = result.rows[0];
    if (!user.is_active) {
      throw new ApiError(
        403,
        'ACCOUNT_DISABLED',
        'Tài khoản đã bị vô hiệu hóa.'
      );
    }

    await dbQuery(`UPDATE users SET last_login_at_utc = NOW() WHERE id = $1`, [
      user.id,
    ]);

    const accessToken = createAccessToken({
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      role: user.role,
    });

    sendSuccess(res, {
      accessToken,
      tokenType: 'Bearer',
      expiresInSeconds: 86400,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
      },
    });
  } catch (err) {
    next(err);
  }
});

// -----------------------------------------------------------------------------
// 2. POST /api/v1/auth/register
// -----------------------------------------------------------------------------
authAndUserRouter.post('/v1/auth/register', async (req, res, next) => {
  try {
    const bodySchema = z.object({
      email: z.string().email(),
      password: z.string().min(8),
      fullName: z.string().min(2).max(120),
    });
    const { email, password, fullName } = bodySchema.parse(req.body);

    const existing = await dbQuery(
      `SELECT id FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1`,
      [email]
    );
    if (existing.rows.length > 0) {
      throw new ApiError(
        409,
        'EMAIL_ALREADY_EXISTS',
        'Email này đã được đăng ký trong hệ thống.'
      );
    }

    const insertRes = await dbQuery<{
      id: string;
      email: string;
      full_name: string;
      role: 'USER' | 'ADMIN';
    }>(
      `
      INSERT INTO users (email, password_hash, full_name, role, is_active)
      VALUES ($1, crypt($2, gen_salt('bf')), $3, 'USER', TRUE)
      RETURNING id, email, full_name, role
      `,
      [email, password, fullName]
    );

    const newUser = insertRes.rows[0];
    const accessToken = createAccessToken({
      id: newUser.id,
      email: newUser.email,
      fullName: newUser.full_name,
      role: newUser.role,
    });

    sendSuccess(
      res,
      {
        accessToken,
        tokenType: 'Bearer',
        user: {
          id: newUser.id,
          email: newUser.email,
          fullName: newUser.full_name,
          role: newUser.role,
        },
      },
      undefined,
      201
    );
  } catch (err) {
    next(err);
  }
});

// -----------------------------------------------------------------------------
// 3. GET /api/v1/user/favorites & POST /api/v1/user/favorites
// Automatically resolves nearest_station_id & administrative_area_id via PostGIS!
// -----------------------------------------------------------------------------
authAndUserRouter.get(
  '/v1/user/favorites',
  requireAuth,
  async (req, res, next) => {
    try {
      const userId = req.user!.sub;
      const result = await dbQuery(
        `
        SELECT
          ufl.id,
          ufl.label_name,
          ufl.latitude,
          ufl.longitude,
          ufl.custom_pm25_threshold_ugm3,
          ufl.enable_alert,
          ufl.created_at_utc,
          ms.external_station_id AS nearest_station_ext_id,
          ms.name AS nearest_station_name,
          aa.code AS area_code,
          aa.name_vi AS area_name_vi
        FROM user_favorite_locations ufl
        LEFT JOIN monitoring_stations ms ON ms.id = ufl.nearest_station_id
        LEFT JOIN administrative_areas aa ON aa.id = ufl.administrative_area_id
        WHERE ufl.user_id = $1::uuid
        ORDER BY ufl.created_at_utc DESC
        `,
        [userId]
      );

      sendSuccess(
        res,
        result.rows.map((r) => ({
          id: r.id,
          labelName: r.label_name,
          coordinates: {
            latitude: Number(r.latitude),
            longitude: Number(r.longitude),
          },
          customPm25ThresholdUgM3: Number(r.custom_pm25_threshold_ugm3),
          enableAlert: r.enable_alert,
          nearestStation: r.nearest_station_ext_id
            ? {
                externalStationId: r.nearest_station_ext_id,
                name: r.nearest_station_name,
              }
            : null,
          administrativeArea: r.area_code
            ? {
                code: r.area_code,
                nameVi: r.area_name_vi,
              }
            : null,
          createdAtUtc: r.created_at_utc,
        }))
      );
    } catch (err) {
      next(err);
    }
  }
);

authAndUserRouter.post(
  '/v1/user/favorites',
  requireAuth,
  async (req, res, next) => {
    try {
      const bodySchema = z.object({
        labelName: z.string().min(2).max(120),
        latitude: z.number().min(20.4).max(21.5),
        longitude: z.number().min(105.2).max(106.1),
        customPm25ThresholdUgM3: z.number().min(10).max(300).default(35.0),
        enableAlert: z.boolean().default(true),
      });
      const body = bodySchema.parse(req.body);
      const userId = req.user!.sub;

      const insertRes = await dbQuery(
        `
        WITH pt AS (
          SELECT ST_SetSRID(ST_MakePoint($4, $3), 4326) AS geom
        ),
        nearest_st AS (
          SELECT ms.id
          FROM monitoring_stations ms, pt
          ORDER BY ms.geom::geography <-> pt.geom::geography
          LIMIT 1
        ),
        containing_aa AS (
          SELECT aa.id
          FROM administrative_areas aa, pt
          WHERE aa.admin_level = 2 AND ST_Contains(aa.geom, pt.geom)
          LIMIT 1
        )
        INSERT INTO user_favorite_locations (
          user_id,
          label_name,
          geom,
          latitude,
          longitude,
          nearest_station_id,
          administrative_area_id,
          custom_pm25_threshold_ugm3,
          enable_alert
        )
        SELECT
          $1::uuid,
          $2,
          pt.geom,
          $3,
          $4,
          (SELECT id FROM nearest_st),
          (SELECT id FROM containing_aa),
          $5,
          $6
        FROM pt
        RETURNING id, label_name, latitude, longitude, custom_pm25_threshold_ugm3, enable_alert, created_at_utc
        `,
        [
          userId,
          body.labelName,
          body.latitude,
          body.longitude,
          body.customPm25ThresholdUgM3,
          body.enableAlert,
        ]
      );

      sendSuccess(res, insertRes.rows[0], undefined, 201);
    } catch (err) {
      next(err);
    }
  }
);

