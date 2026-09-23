module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('playlists', 'listenersOnline', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('playlists', 'listenersOnline');
  }
};
