const playlistModel = require('../models/playlistModel');

function parseId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function validatePlaylistPayload(body, { partial = false } = {}) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return 'Тело запроса должно быть JSON-объектом';
  }

  if (!partial || body.title !== undefined) {
    if (typeof body.title !== 'string' || body.title.trim() === '') {
      return 'Поле title обязательно и должно быть непустой строкой';
    }
  }

  if (!partial || body.owner !== undefined) {
    if (typeof body.owner !== 'string' || body.owner.trim() === '') {
      return 'Поле owner обязательно и должно быть непустой строкой';
    }
  }

  if (body.description !== undefined && typeof body.description !== 'string') {
    return 'Поле description должно быть строкой';
  }

  if (body.isPublic !== undefined && typeof body.isPublic !== 'boolean') {
    return 'Поле isPublic должно быть boolean';
  }

  if (body.tracks !== undefined) {
    if (!Array.isArray(body.tracks)) {
      return 'Поле tracks должно быть массивом';
    }

    for (const track of body.tracks) {
      if (!track || typeof track !== 'object') {
        return 'Каждый трек должен быть объектом';
      }
      if (typeof track.title !== 'string' || track.title.trim() === '') {
        return 'У каждого трека должно быть непустое поле title';
      }
      if (typeof track.artist !== 'string' || track.artist.trim() === '') {
        return 'У каждого трека должно быть непустое поле artist';
      }
      if (
        track.durationSec !== undefined &&
        (!Number.isInteger(track.durationSec) || track.durationSec < 0)
      ) {
        return 'Поле durationSec должно быть неотрицательным целым числом';
      }
    }
  }

  if (
    body.listenersOnline !== undefined &&
    (!Number.isInteger(body.listenersOnline) || body.listenersOnline < 0)
  ) {
    return 'Поле listenersOnline должно быть неотрицательным целым числом';
  }

  return null;
}

function getPlaylists(req, res, next) {
  try {
    const playlists = playlistModel.getAll();
    res.status(200).json({
      count: playlists.length,
      data: playlists
    });
  } catch (error) {
    next(error);
  }
}

function getPlaylistById(req, res, next) {
  try {
    const id = parseId(req.params.id);
    if (!id) {
      return res.status(400).json({ error: 'Некорректный ID плейлиста' });
    }

    const playlist = playlistModel.getById(id);
    if (!playlist) {
      return res.status(404).json({ error: `Плейлист с id=${id} не найден` });
    }

    res.status(200).json({ data: playlist });
  } catch (error) {
    next(error);
  }
}

function createPlaylist(req, res, next) {
  try {
    const validationError = validatePlaylistPayload(req.body);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const playlist = playlistModel.create({
      title: req.body.title.trim(),
      description: req.body.description ? req.body.description.trim() : '',
      owner: req.body.owner.trim(),
      isPublic: req.body.isPublic,
      tracks: req.body.tracks,
      listenersOnline: req.body.listenersOnline
    });

    res.status(201).json({
      message: 'Плейлист успешно создан',
      data: playlist
    });
  } catch (error) {
    next(error);
  }
}

function updatePlaylist(req, res, next) {
  try {
    const id = parseId(req.params.id);
    if (!id) {
      return res.status(400).json({ error: 'Некорректный ID плейлиста' });
    }

    const validationError = validatePlaylistPayload(req.body);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const playlist = playlistModel.update(id, {
      title: req.body.title.trim(),
      description: req.body.description ? req.body.description.trim() : '',
      owner: req.body.owner.trim(),
      isPublic: req.body.isPublic,
      tracks: req.body.tracks,
      listenersOnline: req.body.listenersOnline
    });

    if (!playlist) {
      return res.status(404).json({ error: `Плейлист с id=${id} не найден` });
    }

    res.status(200).json({
      message: 'Плейлист успешно обновлён',
      data: playlist
    });
  } catch (error) {
    next(error);
  }
}

function deletePlaylist(req, res, next) {
  try {
    const id = parseId(req.params.id);
    if (!id) {
      return res.status(400).json({ error: 'Некорректный ID плейлиста' });
    }

    const playlist = playlistModel.remove(id);
    if (!playlist) {
      return res.status(404).json({ error: `Плейлист с id=${id} не найден` });
    }

    res.status(200).json({
      message: 'Плейлист успешно удалён',
      data: playlist
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getPlaylists,
  getPlaylistById,
  createPlaylist,
  updatePlaylist,
  deletePlaylist
};
