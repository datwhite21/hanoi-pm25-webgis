import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import { publicRouter } from './routes/publicRoutes.js';
import { authAndUserRouter } from './routes/authAndUserRoutes.js';
import { adminRouter } from './routes/adminRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN.split(','),
      credentials: true,
    })
  );
  app.use(express.json({ limit: '1mb' }));

  const limiter = rateLimit({
    windowMs: 60 * 1000,
    max: 180,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Quá nhiều yêu cầu từ địa chỉ IP này. Vui lòng thử lại sau 1 phút.',
      },
    },
  });
  app.use('/api', limiter);

  app.use('/api', publicRouter);
  app.use('/api', authAndUserRouter);
  app.use('/api', adminRouter);

  app.use((_req, res) => {
    res.status(404).json({
      success: false,
      error: {
        code: 'ENDPOINT_NOT_FOUND',
        message: 'Không tìm thấy đường dẫn API được yêu cầu.',
      },
    });
  });

  app.use(errorHandler);
  return app;
}

