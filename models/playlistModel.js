/**
 * In-memory model for collaborative playlists.
 * Domain: platform for shared music listening and real-time playlist creation.
 */

let nextId = 4;

const playlists = [
  {
    id: 1,
    title: 'Evening Chill',
    description: 'Спокойные треки для совместного вечернего прослушивания',
    owner: 'alice',
    isPublic: true,
    tracks: [
      { title: 'Sunset Drive', artist: 'Night Owl', durationSec: 214 },
      { title: 'Soft Rain', artist: 'LoFi Lab', durationSec: 198 }
    ],
    listenersOnline: 3,
    createdAt: '2026-03-10T18:00:00.000Z',
    updatedAt: '2026-03-10T18:00:00.000Z'
  },
  {
    id: 2,
    title: 'Party Room #12',
    description: 'Плейлист комнаты для вечеринки в реальном времени',
    owner: 'bob',
    isPublic: true,
    tracks: [
      { title: 'Neon Lights', artist: 'DJ Pulse', durationSec: 245 },
      { title: 'Dance Floor', artist: 'Beat Crew', durationSec: 230 }
    ],
    listenersOnline: 8,
    createdAt: '2026-03-11T20:15:00.000Z',
    updatedAt: '2026-03-11T20:15:00.000Z'
  },
  {
    id: 3,
    title: 'Study Session',
    description: 'Фоновая музыка для совместной учёбы',
    owner: 'carol',
    isPublic: false,
    tracks: [
      { title: 'Focus Flow', artist: 'Ambient Works', durationSec: 312 }
    ],
    listenersOnline: 2,
    createdAt: '2026-03-12T09:30:00.000Z',
    updatedAt: '2026-03-12T09:30:00.000Z'
  }
];

function getAll() {
  return playlists;
}

function getById(id) {
  return playlists.find((playlist) => playlist.id === id);
}

function create(data) {
  const now = new Date().toISOString();
  const playlist = {
    id: nextId++,
    title: data.title,
    description: data.description || '',
    owner: data.owner,
    isPublic: data.isPublic !== undefined ? Boolean(data.isPublic) : true,
    tracks: Array.isArray(data.tracks) ? data.tracks : [],
    listenersOnline: Number.isInteger(data.listenersOnline) ? data.listenersOnline : 0,
    createdAt: now,
    updatedAt: now
  };
  playlists.push(playlist);
  return playlist;
}

function update(id, data) {
  const index = playlists.findIndex((playlist) => playlist.id === id);
  if (index === -1) {
    return null;
  }

  const current = playlists[index];
  const updated = {
    ...current,
    title: data.title,
    description: data.description || '',
    owner: data.owner,
    isPublic: data.isPublic !== undefined ? Boolean(data.isPublic) : current.isPublic,
    tracks: Array.isArray(data.tracks) ? data.tracks : [],
    listenersOnline: Number.isInteger(data.listenersOnline)
      ? data.listenersOnline
      : current.listenersOnline,
    updatedAt: new Date().toISOString()
  };

  playlists[index] = updated;
  return updated;
}

function remove(id) {
  const index = playlists.findIndex((playlist) => playlist.id === id);
  if (index === -1) {
    return null;
  }
  const [deleted] = playlists.splice(index, 1);
  return deleted;
}

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove
};
