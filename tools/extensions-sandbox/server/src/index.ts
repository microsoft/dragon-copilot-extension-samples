import express from 'express';
import cors from 'cors';
import { healthRouter } from './routes/health.js';

const app = express();
const PORT = Number(process.env.PORT) || 4000;

app.use(cors({ origin: 'http://localhost:3000' }));
app.use(express.json());

app.use('/api/health', healthRouter);

// Global error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[sandbox-server]', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`[sandbox-server] listening on http://localhost:${PORT}`);
});
