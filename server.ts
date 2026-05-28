import dotenv from 'dotenv';
import express from 'express';
import path from "path";
import { createServer as createViteServer } from "vite";

dotenv.config();
async function startServer() {
  const { createBackendApp } = await import('./backend/app');
  const app = await createBackendApp();

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      root: path.join(process.cwd(), 'frontend'),
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log("Mounted Vite Dev Server Middleware successfully.");
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log("Serving production bundle from dist folder.");
  }

  app.listen(3000, '0.0.0.0', () => {
    console.log(`Express application successfully booted on host 0.0.0.0 port 3000`);
  });
}

startServer();
