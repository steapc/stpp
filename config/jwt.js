function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || Buffer.byteLength(secret, 'utf8') < 32) {
    throw new Error('JWT_SECRET должен содержать не менее 32 байт');
  }

  return secret;
}

module.exports = { getJwtSecret };
