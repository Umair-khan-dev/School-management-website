import express from 'express';
import apiRouter from '../backend/src/routes/api.ts';
import { db } from '../backend/src/config/db.ts';
import { errorHandler } from '../backend/src/middleware/auth.ts';

const app = express();

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use(async (_req, res, next) => {
  try {
    await db.connect();
    next();
  } catch (error) {
    console.error('Vercel API database connection failed:', error);
    res.status(503).json({
      success: false,
      message: 'The school database is unavailable. Check the deployment MySQL environment variables.',
    });
  }
});

app.use((req, _res, next) => {
  if (req.url?.startsWith('/api/')) {
    req.url = req.url.slice('/api'.length);
  }
  next();
});

app.use('/', apiRouter);
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'API endpoint not found.' });
});
app.use(errorHandler);

export default app;
