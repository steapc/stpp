const Playlist = require('./Playlist');

function serialize(playlist) {
  return playlist ? playlist.toJSON() : null;
}

async function getAll() {
  const playlists = await Playlist.findAll({ order: [['id', 'ASC']] });
  return playlists.map(serialize);
}

async function getById(id) {
  return serialize(await Playlist.findByPk(id));
}

async function create(data) {
  return serialize(await Playlist.create(data));
}

async function update(id, data) {
  const [updatedCount] = await Playlist.update(data, {
    where: { id }
  });
  if (updatedCount === 0) {
    return null;
  }

  return getById(id);
}

async function remove(id) {
  const playlist = await getById(id);
  if (!playlist) {
    return null;
  }

  await Playlist.destroy({ where: { id } });
  return playlist;
}

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove
};
