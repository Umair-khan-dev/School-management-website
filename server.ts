import 'dotenv/config';
import express from 'express';
import http from 'http';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { db } from './backend/src/config/db.ts';
import apiRouter from './backend/src/routes/api.ts';
import { errorHandler } from './backend/src/middleware/auth.ts';

async function startServer() {
  await db.connect();
  console.log(`Connected to MySQL database "${process.env.MYSQL_DATABASE || 'mydatabase'}"`);

  const app = express();
  const server = http.createServer(app);
  const PORT = Number(process.env.PORT) || 5000;

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Mount REST API routes
  app.use('/api', apiRouter);

  app.use('/api', (_req, res) => {
    res.status(404).json({
      success: false,
      message: 'API endpoint not found.',
    });
  });

  // Error handling middleware for API routes
  app.use('/api', errorHandler);

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: { server },
        watch: {
          ignored: [
            '**/backend/**',
            '**/backend/database/**',
            '**/*.json',
            '**/dist/**',
            '**/.git/**',
          ],
        },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  function listenOnPort(port: number) {
    server.removeAllListeners('error');
    server.once('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        console.warn(`Port ${port} is currently in use, trying http://localhost:${port + 1}...`);
        listenOnPort(port + 1);
      } else {
        console.error('Server error:', err);
      }
    });

    server.listen(port, '0.0.0.0', () => {
      console.log(`PinkEdu Full-Stack Server running on http://localhost:${port}`);
    });
  }

  listenOnPort(PORT);
}

startServer().catch((error: unknown) => {
  console.error('Failed to start PinkEdu:', error);
  process.exitCode = 1;
});
