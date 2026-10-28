import { Router } from 'express';
import { z } from 'zod';
import { dbQuery } from '../db/pool.js';
import { requireRole } from '../middleware/auth.js';
import { ApiError, sendSuccess } from '../middleware/errorHandler.js';
import { runFullIngestionPipeline } from '../ingestion/ingestionOrchestrator.js';

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

// -----------------------------------------------------------------------------
// 4. POST /api/v1/admin/ingestion/trigger & GET /api/v1/admin/ingestion/jobs
// -----------------------------------------------------------------------------
adminRouter.post('/v1/admin/ingestion/trigger', async (req, res, next) => {
  try {
    const bodySchema = z
      .object({
        sources: z
          .array(
            z.enum([
              'OPENAQ_V3',
              'WAQI_API',
              'OPEN_METEO_CAMS',
              'OPEN_METEO_WEATHER',
            ])
          )
          .optional(),
      })
      .optional();
    const parsed = bodySchema.parse(req.body);

    const report = await runFullIngestionPipeline(
      'MANUAL_ADMIN',
      parsed?.sources
    );

    await dbQuery(
      `
      INSERT INTO audit_logs (
        actor_user_id,
        action_type,
        target_table,
        target_id,
        new_values,
        reason,
        ip_address
      )
      VALUES ($1::uuid, 'TRIGGER_INGESTION_PIPELINE', 'ingestion_jobs', 'BATCH_RUN', $2::jsonb, 'Kích hoạt thu thập dữ liệu thủ công bởi Quản trị viên', $3)
      `,
      [
        req.user!.sub,
        JSON.stringify({
          sources: report.sources.map((s) => ({
            sourceCode: s.sourceCode,
            status: s.status,
          })),
          totalDurationMs: report.totalDurationMs,
        }),
        req.ip || '127.0.0.1',
      ]
    );

    sendSuccess(res, report);
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/v1/admin/ingestion/jobs', async (_req, res, next) => {
  try {
    const result = await dbQuery(`
      SELECT
        ij.id,
        ds.code AS source_code,
        ds.name AS source_name,
        ij.trigger_type,
        ij.status,
        ij.records_fetched,
        ij.records_inserted,
        ij.records_flagged_qc,
        ij.duration_ms,
        ij.error_message,
        ij.started_at_utc,
        ij.finished_at_utc
      FROM ingestion_jobs ij
      JOIN data_sources ds ON ds.id = ij.data_source_id
      ORDER BY ij.started_at_utc DESC
      LIMIT 30
    `);
    sendSuccess(res, result.rows);
  } catch (err) {
    next(err);
  }
});

// -----------------------------------------------------------------------------
// 5. GET /api/v1/admin/alert-rules & PATCH /api/v1/admin/alert-rules/:id
// -----------------------------------------------------------------------------
let alertRulesBootstrapped = false;

async function ensureAlertRulesTable(): Promise<void> {
  if (alertRulesBootstrapped) return;
  await dbQuery(`
    CREATE TABLE IF NOT EXISTS alert_rules (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      code VARCHAR(64) NOT NULL UNIQUE,
      name_vi VARCHAR(255) NOT NULL,
      alert_category VARCHAR(64) NOT NULL,
      metric_name VARCHAR(64) NOT NULL,
      comparison_operator VARCHAR(16) NOT NULL DEFAULT '>',
      threshold_value DOUBLE PRECISION NOT NULL,
      unit VARCHAR(32) NOT NULL,
      severity VARCHAR(64) NOT NULL,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      description_vi TEXT NOT NULL,
      updated_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await dbQuery(`
    INSERT INTO alert_rules (
      id, code, name_vi, alert_category, metric_name, comparison_operator,
      threshold_value, unit, severity, is_active, description_vi
    )
    VALUES
      (
        '00000000-0000-0000-0000-000000000201',
        'RULE_PM25_QCVN_EXCEEDED',
        'Vượt quy chuẩn QCVN 05:2023/BTNMT (24h)',
        'PM25_CONCENTRATION',
        'pm25_ugm3',
        '>',
        50,
        'µg/m³',
        'UNHEALTHY_SENSITIVE',
        TRUE,
        'Phát cảnh báo khi nồng độ PM2.5 quan trắc vượt giới hạn 50 µg/m³ theo QCVN 05:2023/BTNMT.'
      ),
      (
        '00000000-0000-0000-0000-000000000202',
        'RULE_PM25_WHO_EXCEEDED',
        'Vượt khuyến nghị WHO 2021 (24h)',
        'PM25_CONCENTRATION',
        'pm25_ugm3',
        '>',
        15,
        'µg/m³',
        'MODERATE',
        TRUE,
        'Theo dõi mức vượt ngưỡng khuyến nghị 15 µg/m³ của Tổ chức Y tế Thế giới (WHO 2021).'
      ),
      (
        '00000000-0000-0000-0000-000000000203',
        'RULE_VN_AQI_POOR',
        'Chỉ số VN_AQI chạm ngưỡng Xấu (>= 151)',
        'AQI_THRESHOLD',
        'vn_aqi',
        '>=',
        151,
        'VN_AQI',
        'UNHEALTHY',
        TRUE,
        'Cảnh báo sức khỏe cộng đồng khi chỉ số VN_AQI NowCast đạt mức Xấu (>= 151) theo QĐ 1459/QĐ-TCMT.'
      ),
      (
        '00000000-0000-0000-0000-000000000204',
        'RULE_CAMS_FORECAST_SPIKE',
        'Dự báo mô hình CAMS tăng cao 24h tới',
        'MODEL_FORECAST',
        'model_pm25_ugm3',
        '>=',
        75,
        'µg/m³',
        'UNHEALTHY',
        TRUE,
        'Cảnh báo sớm từ mô hình số trị CAMS 0.4° khi dự báo PM2.5 trong 24h tới đạt >= 75 µg/m³.'
      )
    ON CONFLICT (code) DO NOTHING;
  `);

  alertRulesBootstrapped = true;
}

adminRouter.get('/v1/admin/alert-rules', async (_req, res, next) => {
  try {
    await ensureAlertRulesTable();
    const result = await dbQuery(`
      SELECT
        id,
        code,
        name_vi,
        alert_category,
        metric_name,
        comparison_operator,
        threshold_value,
        unit,
        severity,
        is_active,
        description_vi,
        updated_at_utc
      FROM alert_rules
      ORDER BY code ASC
    `);
    sendSuccess(
      res,
      result.rows.map((r) => ({
        id: r.id,
        code: r.code,
        nameVi: r.name_vi,
        alertCategory: r.alert_category,
        metricName: r.metric_name,
        comparisonOperator: r.comparison_operator,
        thresholdValue: Number(r.threshold_value),
        unit: r.unit,
        severity: r.severity,
        isActive: Boolean(r.is_active),
        descriptionVi: r.description_vi,
        updatedAtUtc: r.updated_at_utc,
      }))
    );
  } catch (err) {
    next(err);
  }
});

adminRouter.patch('/v1/admin/alert-rules/:id', async (req, res, next) => {
  try {
    await ensureAlertRulesTable();
    const ruleId = req.params.id;
    const bodySchema = z.object({
      thresholdValue: z.number().min(1).max(1000).optional(),
      isActive: z.boolean().optional(),
      reason: z
        .string()
        .min(3)
        .max(500)
        .default('Cập nhật quy tắc cảnh báo bởi Quản trị viên'),
    });
    const { thresholdValue, isActive, reason } = bodySchema.parse(req.body);

    const existing = await dbQuery(
      `SELECT id, code, threshold_value, is_active FROM alert_rules WHERE id = $1::uuid LIMIT 1`,
      [ruleId]
    );
    if (existing.rows.length === 0) {
      throw new ApiError(
        404,
        'ALERT_RULE_NOT_FOUND',
        `Không tìm thấy quy tắc cảnh báo '${ruleId}'.`
      );
    }
    const oldRow = existing.rows[0];
    const nextThreshold =
      thresholdValue !== undefined
        ? thresholdValue
        : Number(oldRow.threshold_value);
    const nextActive =
      isActive !== undefined ? isActive : Boolean(oldRow.is_active);

    const updatedRes = await dbQuery(
      `
      UPDATE alert_rules
      SET
        threshold_value = $1,
        is_active = $2,
        updated_at_utc = NOW()
      WHERE id = $3::uuid
      RETURNING id, code, name_vi, threshold_value, unit, is_active, updated_at_utc
      `,
      [nextThreshold, nextActive, ruleId]
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
      VALUES ($1::uuid, 'UPDATE_ALERT_RULE', 'alert_rules', $2, $3::jsonb, $4::jsonb, $5, $6)
      `,
      [
        req.user!.sub,
        oldRow.code,
        JSON.stringify({
          thresholdValue: Number(oldRow.threshold_value),
          isActive: Boolean(oldRow.is_active),
        }),
        JSON.stringify({
          thresholdValue: nextThreshold,
          isActive: nextActive,
        }),
        reason,
        req.ip || '127.0.0.1',
      ]
    );

    const u = updatedRes.rows[0];
    sendSuccess(res, {
      id: u.id,
      code: u.code,
      nameVi: u.name_vi,
      thresholdValue: Number(u.threshold_value),
      unit: u.unit,
      isActive: Boolean(u.is_active),
      updatedAtUtc: u.updated_at_utc,
    });
  } catch (err) {
    next(err);
  }
});


