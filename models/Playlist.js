const { DataTypes } = require('sequelize');
const sequelize = require('../db/database');

const Playlist = sequelize.define(
  'Playlist',
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: ''
    },
    owner: {
      type: DataTypes.STRING,
      allowNull: false
    },
    isPublic: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    tracks: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: []
    },
    listenersOnline: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: { min: 0 }
    }
  },
  {
    tableName: 'playlists',
    timestamps: true
  }
);

module.exports = Playlist;
