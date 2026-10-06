const express = require('express');
const playlistController = require('../controllers/playlistController');
const authenticate = require('../middleware/auth');
const isAdmin = require('../middleware/isAdmin');

const router = express.Router();

router.get('/', playlistController.getPlaylists);
router.get('/:id', playlistController.getPlaylistById);
router.post('/', authenticate, isAdmin, playlistController.createPlaylist);
router.put('/:id', authenticate, isAdmin, playlistController.updatePlaylist);
router.delete('/:id', authenticate, isAdmin, playlistController.deletePlaylist);

module.exports = router;
