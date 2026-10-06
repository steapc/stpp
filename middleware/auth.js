const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { getJwtSecret } = require('../config/jwt');

async function authenticate(req, res, next) {
  const authorization = req.get('Authorization') || '';
  const match = authorization.match(/^Bearer\s+(\S+)$/i);
  if (!match) {
    return res.status(401).json({ error: 'Требуется Bearer-токен' });
  }

  let secret;
  try {
    secret = getJwtSecret();
  } catch (error) {
    return next(error);
  }

  let decoded;
  try {
    decoded = jwt.verify(match[1], secret);
  } catch {
    return res.status(401).json({ error: 'Недействительный или просроченный токен' });
  }

  if (!decoded || typeof decoded !== 'object' || !Number.isInteger(decoded.id)) {
    return res.status(401).json({ error: 'Недействительный токен' });
  }

  try {
    const user = await User.findByPk(decoded.id);
    if (!user) {
      return res.status(401).json({ error: 'Пользователь токена не найден' });
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role
    };
    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = authenticate;
