const mongoose = require('mongoose');

const roomEventSchema = new mongoose.Schema(
  {
    roomId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    type: {
      type: String,
      required: true,
      enum: ['chat', 'playback', 'join', 'leave'],
    },
    userName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    text: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    playback: {
      action: {
        type: String,
        enum: ['play', 'pause', 'change-track', 'seek'],
      },
      trackId: String,
      position: Number,
    },
  },
  {
    collection: 'lab7_room_events',
    timestamps: true,
  },
);

module.exports = mongoose.model('Lab7RoomEvent', roomEventSchema);
