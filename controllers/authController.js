const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { getJwtSecret } = require('../config/jwt');

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function register(req, res, next) {
  try {
    const { email, password } = req.body || {};
    if (typeof email !== 'string' || !isValidEmail(email.trim())) {
      return res.status(400).json({ error: 'Укажите корректный email' });
    }
    if (
      typeof password !== 'string' ||
      password.length < 8 ||
      Buffer.byteLength(password, 'utf8') > 72
    ) {
      return res.status(400).json({
        error: 'Пароль должен содержать не менее 8 символов и не более 72 байт'
      });
    }

    const normalizedEmail = normalizeEmail(email);
    const existingUser = await User.findOne({ where: { email: normalizedEmail } });
    if (existingUser) {
      return res.status(409).json({ error: 'Пользователь с таким email уже существует' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      email: normalizedEmail,
      passwordHash,
      role: 'user'
    });

    return res.status(201).json({
      message: 'Регистрация успешно завершена',
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ error: 'Пользователь с таким email уже существует' });
    }
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ error: 'Укажите корректный email' });
    }
    return next(error);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body || {};
    if (typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: 'Укажите email и пароль' });
    }
    if (Buffer.byteLength(password, 'utf8') > 72) {
      return res.status(400).json({ error: 'Пароль не должен превышать 72 байта' });
    }

    const user = await User.findOne({
      where: { email: normalizeEmail(email) }
    });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      getJwtSecret(),
      { expiresIn: '1h' }
    );

    return res.status(200).json({
      message: 'Вход выполнен успешно',
      token,
      expiresIn: '1h'
    });
  } catch (error) {
    return next(error);
  }
}

function getProfile(req, res) {
  return res.status(200).json({
    user: {
      id: req.user.id,
      email: req.user.email,
      role: req.user.role
    }
  });
}

module.exports = {
  register,
  login,
  getProfile
};
