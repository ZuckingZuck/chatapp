const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const socketIo = require('socket.io');

dotenv.config();
const app = express();

// CORS ayarları
const allowedOrigins = ['https://chat.ipsstech.com.tr'];

// CORS middleware'ini yapılandır
app.use(cors({
  origin: function(origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('CORS policy violation'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['Content-Range', 'X-Content-Range']
}));

// HTTP sunucusu oluştur
const server = http.createServer(app);

// Socket.io'yu HTTP sunucusuyla başlat
const io = socketIo(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  path: '/socket.io/',
  pingTimeout: 60000,
  pingInterval: 25000,
  upgradeTimeout: 30000,
  allowUpgrades: true,
  cookie: false
});

// Pre-flight istekleri için OPTIONS handler
app.options('*', cors());

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Headers middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'https://chat.ipsstech.com.tr');
  res.header('Access-Control-Allow-Credentials', true);
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  next();
});

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

// WebSocket bağlantı hatalarını yakala
io.engine.on("connection_error", (err) => {
  console.log('Socket.io bağlantı hatası:', err);
});

// Server başlatma
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`HTTP Server ${PORT} portunda çalışıyor`);
}); 