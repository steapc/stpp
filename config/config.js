require('dotenv').config();

const config = {
  use_env_variable: 'DATABASE_URL',
  dialect: 'postgres',
  logging: false
};

module.exports = {
  development: config,
  test: config,
  production: config
};
