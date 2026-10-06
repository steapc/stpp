const express = require('express');
const playlistRoutes = require('./routes/playlistRoutes');
const authRoutes = require('./routes/authRoutes');
const authController = require('./controllers/authController');
const authenticate = require('./middleware/auth');
const sequelize = require('./db/database');
const { getJwtSecret } = require('./config/jwt');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.get('/', (req, res) => {
  res.status(200).json({
    project: 'Платформа для совместного прослушивания музыки и создания плейлистов',
    api: {
      playlists: '/playlists',
      auth: '/auth',
      profile: '/profile'
    }
  });
});

app.use('/auth', authRoutes);
app.get('/profile', authenticate, authController.getProfile);
app.use('/playlists', playlistRoutes);

app.use((req, res) => {
  res.status(404).json({
    error: `Маршрут ${req.method} ${req.originalUrl} не найден`
  });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({
    error: err.message || 'Внутренняя ошибка сервера'
  });
});

async function startServer() {
  try {
    getJwtSecret();
    await sequelize.authenticate();
    app.listen(port, () => {
      console.log(`Server running on http://localhost:${port}`);
    });
  } catch (error) {
    console.error('Server startup failed:', error.message);
    process.exitCode = 1;
  }
}

startServer();

module.exports = app;
