const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Kayıt olma
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Email kontrolü
    const emailExists = await User.findOne({ email });
    if (emailExists) {
      return res.status(400).json({ message: 'Bu email zaten kullanımda' });
    }

    // Kullanıcı adı kontrolü
    const usernameExists = await User.findOne({ username });
    if (usernameExists) {
      return res.status(400).json({ message: 'Bu kullanıcı adı zaten kullanımda' });
    }

    // Şifre hashleme
    const hashedPassword = await bcrypt.hash(password, 10);

    // Yeni kullanıcı oluşturma
    const newUser = new User({
      username,
      email,
      password: hashedPassword
    });

    const savedUser = await newUser.save();
    res.status(201).json({ message: 'Kullanıcı başarıyla oluşturuldu' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Giriş yapma
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('Login isteği:', { email }); // Debug için log ekleyelim

    // Kullanıcı kontrolü
    const user = await User.findOne({ email });
    if (!user) {
      console.log('Kullanıcı bulunamadı:', email);
      return res.status(400).json({ message: 'Email veya şifre hatalı' });
    }

    // Şifre kontrolü
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      console.log('Şifre hatalı:', email);
      return res.status(400).json({ message: 'Email veya şifre hatalı' });
    }

    // Token oluşturma
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log('Login başarılı:', email);

    res.json({
      token,
      userId: user._id,
      username: user.username,
      message: 'Giriş başarılı'
    });
  } catch (error) {
    console.error('Login hatası:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router; 