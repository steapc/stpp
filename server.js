const express = require('express');
const http = require('node:http');
const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
require('dotenv').config({ path: path.join(__dirname, 'mongodb', '.env'), override: false });
const cors = require('cors');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const playlistRoutes = require('./routes/playlistRoutes');
const authRoutes = require('./routes/authRoutes');
const authController = require('./controllers/authController');
const authenticate = require('./middleware/auth');
const sequelize = require('./db/database');
const { getJwtSecret } = require('./config/jwt');
const RoomEvent = require('./realtime/RoomEvent');

const port = process.env.PORT || 3000;
const allowedOrigins = (process.env.CLIENT_ORIGIN ||
  'http://localhost:5173,http://127.0.0.1:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const app = express();
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin(origin, callback) {
      callback(null, !origin || allowedOrigins.includes(origin));
    },
    methods: ['GET', 'POST'],
  },
});

app.use(cors({
  origin(origin, callback) {
    callback(null, !origin || allowedOrigins.includes(origin));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

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

const roomState = new Map();

function cleanName(value) {
  if (typeof value !== 'string') {
    return 'Аноним';
  }
  return value.trim().slice(0, 80) || 'Аноним';
}

async function saveRoomEvent(event) {
  if (mongoose.connection.readyState !== 1) {
    return;
  }

  try {
    await RoomEvent.create(event);
  } catch (error) {
    console.error('Room event history save failed:', error.message);
  }
}

async function roomPresence(roomId) {
  const sockets = await io.in(roomId).fetchSockets();
  return sockets.map((socket) => ({
    id: socket.id,
    name: socket.data.userName,
  }));
}

io.on('connection', (socket) => {
  socket.data.roomId = null;
  socket.data.userName = 'Аноним';

  socket.on('join-room', async (payload = {}, acknowledge) => {
    const roomId = typeof payload.roomId === 'string'
      ? `playlist:${payload.roomId.trim().slice(0, 120)}`
      : null;
    if (!roomId || roomId === 'playlist:' ) {
      if (typeof acknowledge === 'function') {
        acknowledge({ ok: false, error: 'Некорректный ID плейлиста' });
      }
      return;
    }

    if (socket.data.roomId && socket.data.roomId !== roomId) {
      await socket.leave(socket.data.roomId);
      io.to(socket.data.roomId).emit('participant-left', {
        roomId: socket.data.roomId,
        name: socket.data.userName,
      });
    }

    socket.data.roomId = roomId;
    socket.data.userName = cleanName(payload.userName);
    await socket.join(roomId);

    const participants = await roomPresence(roomId);
    io.to(roomId).emit('room-participants', { roomId, participants });
    io.to(roomId).emit('participant-joined', {
      roomId,
      name: socket.data.userName,
    });

    socket.emit('room-state', roomState.get(roomId) || null);

    if (mongoose.connection.readyState === 1) {
      const history = await RoomEvent.find({ roomId })
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();
      socket.emit('room-history', history.reverse());
    } else {
      socket.emit('room-history', []);
    }

    if (typeof acknowledge === 'function') {
      acknowledge({ ok: true, roomId });
    }
  });

  socket.on('leave-room', async (payload = {}) => {
    const roomId = typeof payload.roomId === 'string'
      ? `playlist:${payload.roomId.trim()}`
      : socket.data.roomId;
    if (!roomId) {
      return;
    }

    await socket.leave(roomId);
    if (socket.data.roomId === roomId) {
      socket.data.roomId = null;
    }
    io.to(roomId).emit('participant-left', {
      roomId,
      name: socket.data.userName,
    });
    io.to(roomId).emit('room-participants', {
      roomId,
      participants: await roomPresence(roomId),
    });
  });

  socket.on('chat-message', async (payload = {}, acknowledge) => {
    const roomId = socket.data.roomId;
    const text = typeof payload.text === 'string'
      ? payload.text.trim().slice(0, 1000)
      : '';
    if (!roomId || !text) {
      if (typeof acknowledge === 'function') {
        acknowledge({ ok: false, error: 'Введите текст сообщения' });
      }
      return;
    }

    const message = {
      id: `${Date.now()}-${socket.id}`,
      roomId,
      type: 'chat',
      userName: socket.data.userName,
      text,
      createdAt: new Date().toISOString(),
    };
    io.to(roomId).emit('chat-message', message);
    await saveRoomEvent(message);
    if (typeof acknowledge === 'function') {
      acknowledge({ ok: true });
    }
  });

  socket.on('typing', (payload = {}) => {
    if (!socket.data.roomId) {
      return;
    }
    socket.to(socket.data.roomId).emit('typing', {
      roomId: socket.data.roomId,
      name: socket.data.userName,
      isTyping: Boolean(payload.isTyping),
    });
  });

  socket.on('playback-state', async (payload = {}, acknowledge) => {
    const roomId = socket.data.roomId;
    if (!roomId) {
      if (typeof acknowledge === 'function') {
        acknowledge({ ok: false, error: 'Сначала войдите в комнату плейлиста' });
      }
      return;
    }

    const action = ['play', 'pause', 'change-track', 'seek'].includes(payload.action)
      ? payload.action
      : null;
    if (!action) {
      if (typeof acknowledge === 'function') {
        acknowledge({ ok: false, error: 'Некорректное состояние воспроизведения' });
      }
      return;
    }

    const state = {
      roomId,
      action,
      trackId: typeof payload.trackId === 'string'
        ? payload.trackId.slice(0, 120)
        : '',
      position: Number.isFinite(payload.position)
        ? Math.max(0, payload.position)
        : 0,
      changedBy: socket.data.userName,
      changedAt: new Date().toISOString(),
    };
    roomState.set(roomId, state);
    io.to(roomId).emit('playback-state', state);
    await saveRoomEvent({
      roomId,
      type: 'playback',
      userName: socket.data.userName,
      playback: state,
    });
    if (typeof acknowledge === 'function') {
      acknowledge({ ok: true });
    }
  });

  socket.on('disconnecting', async () => {
    const roomId = socket.data.roomId;
    if (!roomId) {
      return;
    }
    io.to(roomId).emit('participant-left', {
      roomId,
      name: socket.data.userName,
    });
    io.to(roomId).emit('room-participants', {
      roomId,
      participants: await roomPresence(roomId),
    });
  });
});

async function startServer() {
  try {
    getJwtSecret();
    await sequelize.authenticate();
    const historyUri = process.env.MONGO_HISTORY_URI || process.env.MONGO_URI;
    if (historyUri) {
      try {
        await mongoose.connect(historyUri, { serverSelectionTimeoutMS: 10000 });
        console.log('Room history MongoDB connected');
      } catch (error) {
        console.warn('Room history MongoDB unavailable:', error.message);
      }
    } else {
      console.log('Room history MongoDB is optional and not configured');
    }
    httpServer.listen(port, () => {
      console.log(`Server running on http://localhost:${port}`);
    });
  } catch (error) {
    console.error('Server startup failed:', error.message);
    process.exitCode = 1;
  }
}

if (require.main === module) {
  startServer();
}

module.exports = { app, httpServer, io, startServer };
