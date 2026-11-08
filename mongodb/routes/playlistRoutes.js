const express = require('express');
const playlistController = require('../controllers/playlistController');

const router = express.Router();

router.get('/', playlistController.getPlaylists);
router.get('/:id', playlistController.getPlaylistById);
router.post('/', playlistController.createPlaylist);
router.put('/:id', playlistController.updatePlaylist);
router.delete('/:id', playlistController.deletePlaylist);
router.post('/:id/tracks', playlistController.addTrack);
router.put('/:id/tracks/:trackId', playlistController.updateTrack);
router.delete('/:id/tracks/:trackId', playlistController.deleteTrack);

module.exports = router;
