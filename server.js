const express = require('express');
const playlistRoutes = require('./routes/playlistRoutes');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.get('/', (req, res) => {
  res.status(200).json({
    project: 'Платформа для совместного прослушивания музыки и создания плейлистов',
    api: {
      playlists: '/playlists'
    }
  });
});

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

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
