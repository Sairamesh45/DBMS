import { createServer } from './server';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
const app = createServer();

app.listen(PORT, () => {
  console.log(`[MEDGUARD BACKEND] Server running on http://127.0.0.1:${PORT}`);
  console.log(`[MEDGUARD BACKEND] Health check available at http://127.0.0.1:${PORT}/api/health`);
  console.log(`[MEDGUARD BACKEND] Database: SQLite3 persistence active in server/medguard.db`);
});
