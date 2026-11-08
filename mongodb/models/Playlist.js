const mongoose = require('mongoose');

const trackSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    artist: {
      type: String,
      required: true,
      trim: true
    },
    durationSec: {
      type: Number,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: 'durationSec must be a non-negative integer'
      }
    }
  },
  { _id: true, strict: 'throw' }
);

const playlistSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      default: '',
      trim: true
    },
    owner: {
      type: String,
      required: true,
      trim: true
    },
    isPublic: {
      type: Boolean,
      default: true
    },
    tracks: {
      type: [trackSchema],
      default: []
    },
    listenersOnline: {
      type: Number,
      min: 0,
      default: 0,
      validate: {
        validator: Number.isInteger,
        message: 'listenersOnline must be a non-negative integer'
      }
    }
  },
  {
    collection: 'lab6_playlists',
    timestamps: true,
    strict: 'throw',
    toJSON: {
      virtuals: true,
      versionKey: false
    }
  }
);

module.exports = mongoose.model('MongoPlaylist', playlistSchema);
