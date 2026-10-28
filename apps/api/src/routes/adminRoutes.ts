import { Router } from 'express';
import { z } from 'zod';
import { dbQuery } from '../db/pool.js';
import { requireRole } from '../middleware/auth.js';
import { ApiError, sendSuccess } from '../middleware/errorHandler.js';

export const adminRouter = Router();

adminRouter.use(requireRole('ADMIN'));

// -----------------------------------------------------------------------------
// 1. POST /api/v1/admin/observations/:id/flag
// Flags or re-validates a PM2.5 observation and records an audit log entry
// -----------------------------------------------------------------------------
adminRouter.post('/v1/admin/observations/:id/flag', async (req, res, next) => {
  try {
    const obsId = Number(req.params.id);
    if (!Number.isInteger(obsId) || obsId <= 0) {
      throw new ApiError(
        400,
        'INVALID_OBSERVATION_ID',
        'ID bản ghi quan trắc không hợp lệ.'
      );
    }

    const bodySchema = z.object({
      qualityFlag: z.enum([
        'VALID',
        'HIGH_EXTREME',
        'SUSPECT_SPIKE',
        'INVALID_NEGATIVE',
        'INVALID_OUT_OF_RANGE',
        'INVALID_TIMESTAMP',
        'OUTSIDE_STUDY_AREA',
      ]),
      reason: z.string().min(5).max(500),
    });
    const { qualityFlag, reason } = bodySchema.parse(req.body);

    const existing = await dbQuery(
      `SELECT id, station_id, pm25_ugm3, quality_flag, measured_at_utc FROM pm25_observations WHERE id = $1 LIMIT 1`,
      [obsId]
    );
    if (existing.rows.length === 0) {
      throw new ApiError(
        404,
        'OBSERVATION_NOT_FOUND',
        `Không tìm thấy bản ghi quan trắc #${obsId}.`
      );
    }
    const oldRow = existing.rows[0];

    await dbQuery(
      `UPDATE pm25_observations SET quality_flag = $1 WHERE id = $2`,
      [qualityFlag, obsId]
    );

    const auditRes = await dbQuery(
      `
      INSERT INTO audit_logs (
        actor_user_id,
        action_type,
        target_table,
        target_id,
        old_values,
        new_values,
        reason,
        ip_address
      )
      VALUES ($1::uuid, 'UPDATE_OBSERVATION_QUALITY_FLAG', 'pm25_observations', $2, $3::jsonb, $4::jsonb, $5, $6)
      RETURNING id, created_at_utc
      `,
      [
        req.user!.sub,
        String(obsId),
        JSON.stringify({ qualityFlag: oldRow.quality_flag }),
        JSON.stringify({ qualityFlag }),
        reason,
        req.ip || '127.0.0.1',
      ]
    );

    sendSuccess(res, {
      observationId: obsId,
      previousQualityFlag: oldRow.quality_flag,
      newQualityFlag: qualityFlag,
      auditLogId: auditRes.rows[0].id,
      updatedAtUtc: auditRes.rows[0].created_at_utc,
    });
  } catch (err) {
    next(err);
  }
});

// -----------------------------------------------------------------------------
// 2. PATCH /api/v1/admin/alerts/:id/status
// Acknowledges or resolves an alert and writes to audit_logs
// -----------------------------------------------------------------------------
adminRouter.patch('/v1/admin/alerts/:id/status', async (req, res, next) => {
  try {
    const alertId = req.params.id;
    const bodySchema = z.object({
      status: z.enum(['ACTIVE', 'ACKNOWLEDGED', 'RESOLVED']),
      reason: z.string().min(3).max(500).default('Cập nhật bởi quản trị viên'),
    });
    const { status, reason } = bodySchema.parse(req.body);

    const existing = await dbQuery(
      `SELECT id, status, title_vi FROM air_quality_alerts WHERE id = $1::uuid LIMIT 1`,
      [alertId]
    );
    if (existing.rows.length === 0) {
      throw new ApiError(
        404,
        'ALERT_NOT_FOUND',
        `Không tìm thấy cảnh báo với ID '${alertId}'.`
      );
    }
    const oldRow = existing.rows[0];

    await dbQuery(
      `
      UPDATE air_quality_alerts
      SET
        status = $1,
        resolved_at_utc = CASE WHEN $1 = 'RESOLVED' THEN NOW() ELSE resolved_at_utc END
      WHERE id = $2::uuid
      `,
      [status, alertId]
    );

    await dbQuery(
      `
      INSERT INTO audit_logs (
        actor_user_id,
        action_type,
        target_table,
        target_id,
        old_values,
        new_values,
        reason,
        ip_address
      )
      VALUES ($1::uuid, 'UPDATE_ALERT_STATUS', 'air_quality_alerts', $2, $3::jsonb, $4::jsonb, $5, $6)
      `,
      [
        req.user!.sub,
        alertId,
        JSON.stringify({ status: oldRow.status }),
        JSON.stringify({ status }),
        reason,
        req.ip || '127.0.0.1',
      ]
    );

    sendSuccess(res, {
      alertId,
      previousStatus: oldRow.status,
      newStatus: status,
    });
  } catch (err) {
    next(err);
  }
});

// -----------------------------------------------------------------------------
// 3. GET /api/v1/admin/audit-logs
// -----------------------------------------------------------------------------
adminRouter.get('/v1/admin/audit-logs', async (_req, res, next) => {
  try {
    const result = await dbQuery(`
      SELECT
        al.id,
        al.action_type,
        al.target_table,
        al.target_id,
        al.old_values,
        al.new_values,
        al.reason,
        al.created_at_utc,
        u.email AS actor_email,
        u.full_name AS actor_name
      FROM audit_logs al
      LEFT JOIN users u ON u.id = al.actor_user_id
      ORDER BY al.created_at_utc DESC
      LIMIT 50
    `);

    sendSuccess(res, result.rows);
  } catch (err) {
    next(err);
  }
});
