const mongoose = require('mongoose');
const Playlist = require('../models/Playlist');

const PLAYLIST_FIELDS = new Set([
  'title',
  'description',
  'owner',
  'isPublic',
  'tracks',
  'listenersOnline'
]);
const TRACK_FIELDS = new Set(['title', 'artist', 'durationSec']);

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function rejectUnknownFields(body, allowedFields, res) {
  const unknownFields = Object.keys(body).filter((field) => !allowedFields.has(field));
  if (unknownFields.length === 0) {
    return false;
  }

  res.status(400).json({
    error: `Неизвестные поля: ${unknownFields.join(', ')}`
  });
  return true;
}

function validateObjectId(value, res) {
  if (/^[0-9a-fA-F]{24}$/.test(value)) {
    return true;
  }

  res.status(400).json({ error: 'Некорректный MongoDB ObjectId' });
  return false;
}

function validatePlaylistBody(req, res, { partial = false } = {}) {
  if (!isObject(req.body)) {
    res.status(400).json({ error: 'Тело запроса должно быть JSON-объектом' });
    return false;
  }

  if (rejectUnknownFields(req.body, PLAYLIST_FIELDS, res)) {
    return false;
  }

  if (!partial && (typeof req.body.title !== 'string' || typeof req.body.owner !== 'string')) {
    res.status(400).json({ error: 'Поля title и owner обязательны' });
    return false;
  }

  if (partial && Object.keys(req.body).length === 0) {
    res.status(400).json({ error: 'Передайте хотя бы одно поле для обновления' });
    return false;
  }

  return true;
}

function validateTrackBody(req, res, { partial = false } = {}) {
  if (!isObject(req.body)) {
    res.status(400).json({ error: 'Тело запроса должно быть JSON-объектом' });
    return false;
  }

  if (rejectUnknownFields(req.body, TRACK_FIELDS, res)) {
    return false;
  }

  if (!partial && (typeof req.body.title !== 'string' || typeof req.body.artist !== 'string')) {
    res.status(400).json({ error: 'Поля title и artist обязательны' });
    return false;
  }

  if (partial && Object.keys(req.body).length === 0) {
    res.status(400).json({ error: 'Передайте хотя бы одно поле для обновления' });
    return false;
  }

  return true;
}

function sendError(error, next) {
  if (error instanceof mongoose.Error.ValidationError || error instanceof mongoose.Error.StrictModeError) {
    error.status = 400;
  }
  next(error);
}

async function getPlaylists(req, res, next) {
  try {
    const playlists = await Playlist.find().sort({ createdAt: -1 });
    res.status(200).json({ count: playlists.length, data: playlists });
  } catch (error) {
    sendError(error, next);
  }
}

async function getPlaylistById(req, res, next) {
  if (!validateObjectId(req.params.id, res)) {
    return;
  }

  try {
    const playlist = await Playlist.findById(req.params.id);
    if (!playlist) {
      return res.status(404).json({ error: 'Плейлист не найден' });
    }
    res.status(200).json({ data: playlist });
  } catch (error) {
    sendError(error, next);
  }
}

async function createPlaylist(req, res, next) {
  if (!validatePlaylistBody(req, res)) {
    return;
  }

  try {
    const playlist = await Playlist.create(req.body);
    res.status(201).json({
      message: 'Плейлист успешно создан',
      data: playlist
    });
  } catch (error) {
    sendError(error, next);
  }
}

async function updatePlaylist(req, res, next) {
  if (!validateObjectId(req.params.id, res) || !validatePlaylistBody(req, res)) {
    return;
  }

  try {
    const playlist = await Playlist.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!playlist) {
      return res.status(404).json({ error: 'Плейлист не найден' });
    }
    res.status(200).json({
      message: 'Плейлист успешно обновлён',
      data: playlist
    });
  } catch (error) {
    sendError(error, next);
  }
}

async function deletePlaylist(req, res, next) {
  if (!validateObjectId(req.params.id, res)) {
    return;
  }

  try {
    const playlist = await Playlist.findByIdAndDelete(req.params.id);
    if (!playlist) {
      return res.status(404).json({ error: 'Плейлист не найден' });
    }
    res.status(204).send();
  } catch (error) {
    sendError(error, next);
  }
}

async function addTrack(req, res, next) {
  if (!validateObjectId(req.params.id, res) || !validateTrackBody(req, res)) {
    return;
  }

  try {
    const playlist = await Playlist.findById(req.params.id);
    if (!playlist) {
      return res.status(404).json({ error: 'Плейлист не найден' });
    }
    playlist.tracks.push(req.body);
    await playlist.save();
    res.status(201).json({
      message: 'Трек добавлен в плейлист',
      data: playlist
    });
  } catch (error) {
    sendError(error, next);
  }
}

async function updateTrack(req, res, next) {
  if (
    !validateObjectId(req.params.id, res) ||
    !validateObjectId(req.params.trackId, res) ||
    !validateTrackBody(req, res, { partial: true })
  ) {
    return;
  }

  try {
    const playlist = await Playlist.findById(req.params.id);
    if (!playlist) {
      return res.status(404).json({ error: 'Плейлист не найден' });
    }

    const track = playlist.tracks.id(req.params.trackId);
    if (!track) {
      return res.status(404).json({ error: 'Трек не найден в плейлисте' });
    }

    Object.assign(track, req.body);
    await playlist.save();
    res.status(200).json({
      message: 'Трек обновлён',
      data: playlist
    });
  } catch (error) {
    sendError(error, next);
  }
}

async function deleteTrack(req, res, next) {
  if (!validateObjectId(req.params.id, res) || !validateObjectId(req.params.trackId, res)) {
    return;
  }

  try {
    const playlist = await Playlist.findById(req.params.id);
    if (!playlist) {
      return res.status(404).json({ error: 'Плейлист не найден' });
    }

    const track = playlist.tracks.id(req.params.trackId);
    if (!track) {
      return res.status(404).json({ error: 'Трек не найден в плейлисте' });
    }

    track.deleteOne();
    await playlist.save();
    res.status(200).json({
      message: 'Трек удалён',
      data: playlist
    });
  } catch (error) {
    sendError(error, next);
  }
}

module.exports = {
  getPlaylists,
  getPlaylistById,
  createPlaylist,
  updatePlaylist,
  deletePlaylist,
  addTrack,
  updateTrack,
  deleteTrack
};
