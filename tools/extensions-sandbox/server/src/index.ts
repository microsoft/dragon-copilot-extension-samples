import express from 'express';
import cors from 'cors';
import { healthRouter } from './routes/health.js';
import { manifestRouter, multerErrorHandler } from './routes/manifest.js';
import { validateRouter } from './routes/validate.js';
import { authRouter } from './routes/auth.js';
import { createLogger } from './utils/logger.js';

const app = express();
const PORT = Number(process.env.PORT) || 4000;

const httpLog = createLogger('http');
const serverLog = createLogger('server');

app.use(cors({ origin: 'http://localhost:3000' }));
app.use(express.json());

// Request logging middleware: logs each incoming request and its response
// status + duration so activity is visible in the console during `npm run dev`.
// We log `req.path` (not `req.originalUrl`) so query-string values — which in a
// healthcare context could carry sensitive/PHI-shaped data — never reach logs.
app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
  const start = Date.now();
  httpLog.info(`--> ${req.method} ${req.path}`);
  res.on('finish', () => {
    const durationMs = Date.now() - start;
    httpLog.info(`<-- ${req.method} ${req.path} ${res.statusCode} (${durationMs}ms)`);
  });
  next();
});

app.use('/api/health', healthRouter);
app.use('/api/manifest', manifestRouter);
app.use('/api/validate', validateRouter);
app.use('/api/auth', authRouter);

const ROUTES = ['/api/health', '/api/manifest', '/api/validate', '/api/auth'];

// Handle multer-specific errors with user-friendly messages
app.use('/api/manifest', multerErrorHandler);

// Global error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  serverLog.error('Unhandled error while processing request:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  serverLog.info(`listening on http://localhost:${PORT}`);
  serverLog.info(`routes: ${ROUTES.join(', ')}`);
});
