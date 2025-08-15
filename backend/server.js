import express from 'express';
import cors from 'cors';
import routes from './routes/index.js';
import { initDb, clearDb } from './db.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Serve static files from the React app build folder
app.use(express.static(path.join(__dirname, '../build')));

app.get('/api/v1/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/v1', routes);

// Development-only: clear the database
if (process.env.NODE_ENV !== 'production') {
  app.post('/api/v1/dev/clear-db', async (req, res) => {
    await clearDb();
    res.json({ message: 'Database cleared.' });
  });
}

// Catchall handler: send back React's index.html for any non-API route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../build', 'index.html'));
});

initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}); 