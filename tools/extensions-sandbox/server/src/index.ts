import express from 'express';
import cors from 'cors';
import { healthRouter } from './routes/health.js';
import { manifestRouter, multerErrorHandler } from './routes/manifest.js';
import { validateRouter } from './routes/validate.js';
import { authRouter } from './routes/auth.js';

const app = express();
const PORT = Number(process.env.PORT) || 4000;

app.use(cors({ origin: 'http://localhost:3000' }));
app.use(express.json());

// Request logging middleware: logs each incoming request and its response
// status + duration so activity is visible in the console during `npm run dev`.
app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
  const start = Date.now();
  console.log(`[sandbox-server] --> ${req.method} ${req.originalUrl}`);
  res.on('finish', () => {
    const durationMs = Date.now() - start;
    console.log(
      `[sandbox-server] <-- ${req.method} ${req.originalUrl} ${res.statusCode} (${durationMs}ms)`,
    );
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
  console.error('[sandbox-server]', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`[sandbox-server] listening on http://localhost:${PORT}`);
  console.log(`[sandbox-server] routes: ${ROUTES.join(', ')}`);
});
