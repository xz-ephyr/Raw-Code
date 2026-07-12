import express from 'express';
import cors from 'cors';
import { migrate } from './db.js';
import { auth } from './middleware/auth.js';
import proxyRoutes from './routes/proxy.js';
import projectRoutes from './routes/projects.js';
import fileRoutes from './routes/files.js';
import sessionRoutes from './routes/sessions.js';
import messageRoutes from './routes/messages.js';
import configRoutes from './routes/config.js';
import memoryRoutes from './routes/memory.js';
import gmailRoutes from './routes/gmail.js';
import websearchRoutes from './routes/websearch.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: Infinity }));
app.use(auth);

app.use(proxyRoutes);
app.use(projectRoutes);
app.use(fileRoutes);
app.use(sessionRoutes);
app.use(messageRoutes);
app.use(configRoutes);
app.use(memoryRoutes);
app.use(gmailRoutes);
app.use(websearchRoutes);

const PORT = process.env.PORT || 3001;

async function start() {
  await migrate();
  app.listen(PORT, () => {
    console.log(`raw-code server running on http://localhost:${PORT}`);
  });
}

start();
