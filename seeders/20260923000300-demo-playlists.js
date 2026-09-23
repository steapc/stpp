module.exports = {
  async up(queryInterface) {
    const now = new Date();

    await queryInterface.bulkInsert('playlists', [
      {
        title: 'Evening Chill',
        description: 'Спокойные треки для совместного вечернего прослушивания',
        owner: 'alice',
        isPublic: true,
        tracks: JSON.stringify([
          { title: 'Sunset Drive', artist: 'Night Owl', durationSec: 214 },
          { title: 'Soft Rain', artist: 'LoFi Lab', durationSec: 198 }
        ]),
        listenersOnline: 3,
        createdAt: now,
        updatedAt: now
      },
      {
        title: 'Party Room #12',
        description: 'Плейлист комнаты для вечеринки в реальном времени',
        owner: 'bob',
        isPublic: true,
        tracks: JSON.stringify([
          { title: 'Neon Lights', artist: 'DJ Pulse', durationSec: 245 },
          { title: 'Dance Floor', artist: 'Beat Crew', durationSec: 230 }
        ]),
        listenersOnline: 8,
        createdAt: now,
        updatedAt: now
      },
      {
        title: 'Study Session',
        description: 'Фоновая музыка для совместной учёбы',
        owner: 'carol',
        isPublic: false,
        tracks: JSON.stringify([
          { title: 'Focus Flow', artist: 'Ambient Works', durationSec: 312 }
        ]),
        listenersOnline: 2,
        createdAt: now,
        updatedAt: now
      }
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('playlists', null, {});
  }
};
