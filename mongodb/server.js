const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const playlistRoutes = require('./routes/playlistRoutes');

const app = express();
const port = Number(process.env.PORT) || 3001;

const allowedOrigins = (process.env.CLIENT_ORIGIN ||
  'http://localhost:5173,http://127.0.0.1:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(express.json());
app.use(cors({
  origin(origin, callback) {
    callback(null, !origin || allowedOrigins.includes(origin));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.get('/', (req, res) => {
  res.status(200).json({
    project: 'Платформа совместного прослушивания музыки и создания плейлистов',
    database: 'MongoDB',
    api: { playlists: '/playlists' }
  });
});

app.use('/playlists', playlistRoutes);

app.use((req, res) => {
  res.status(404).json({
    error: `Маршрут ${req.method} ${req.originalUrl} не найден`
  });
});

app.use((error, req, res, next) => {
  console.error(error);
  const status = Number.isInteger(error.status) ? error.status : 500;
  const message = status < 500 ? error.message : 'Внутренняя ошибка сервера';
  res.status(status).json({ error: message });
});

async function startServer() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error('MONGO_URI не задан. Создайте mongodb/.env на основе mongodb/.env.example.');
  }

  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 10000 });
  console.log('MongoDB connected');

  return app.listen(port, () => {
    console.log(`MongoDB API running on http://localhost:${port}`);
  });
}

if (require.main === module) {
  startServer().catch((error) => {
    console.error('MongoDB server startup failed:', error.message);
    process.exitCode = 1;
  });
}

module.exports = { app, startServer };
