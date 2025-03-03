const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const https = require('https');
const fs = require('fs');
const path = require('path');
const socketIo = require('socket.io');

dotenv.config();
const app = express();

// SSL sertifikalarını yükle
const options = {
  key: fs.readFileSync(path.join(__dirname, 'certs/localhost.key')),
  cert: fs.readFileSync(path.join(__dirname, 'certs/localhost.crt'))
};

// HTTPS sunucusu oluştur
const server = https.createServer(options, app);

// Socket.io'yu HTTPS sunucusuyla başlat
const io = socketIo(server, {
  cors: {
    origin: ["https://localhost:3000", "https://192.168.1.103:3000"],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"]
  }
});

// Middleware
app.use(cors({
  origin: [
    'https://localhost:3000',
    'https://192.168.1.103:3000'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));
app.use(express.json());

// MongoDB Bağlantısı
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB bağlantısı başarılı'))
  .catch((err) => console.log('MongoDB bağlantı hatası:', err));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/messages', require('./routes/messages'));

// io'yu app'e ekle
app.set('io', io);

// Socket.io bağlantı yönetimi
io.on('connection', (socket) => {
  console.log('Bir kullanıcı bağlandı');

  socket.on('join', (userId) => {
    console.log('Kullanıcı odaya katıldı:', userId);
    socket.join(userId);
  });

  socket.on('sendMessage', async (data) => {
    console.log('Mesaj alındı:', data);
    if (data.recipientId) {
      console.log('Mesaj gönderiliyor:', data.recipientId);
      io.to(data.recipientId).emit('receiveMessage', data);
    }
  });

  socket.on('callUser', ({ userToCall, signalData, callerName }) => {
    io.to(userToCall).emit('incomingCall', {
      signal: signalData,
      from: socket.id,
      callerName
    });
  });

  socket.on('answerCall', ({ to, signal }) => {
    io.to(to).emit('callAccepted', signal);
  });

  socket.on('rejectCall', ({ to }) => {
    io.to(to).emit('callRejected');
  });

  socket.on('endCall', ({ to }) => {
    io.to(to).emit('callEnded');
  });

  socket.on('disconnect', () => {
    console.log('Bir kullanıcı ayrıldı');
  });
});

// Server başlatma
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`HTTPS Server ${PORT} portunda çalışıyor`);
}); 