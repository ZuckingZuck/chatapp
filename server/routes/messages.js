const router = require('express').Router();
const auth = require('../middleware/auth');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');

// Mesaj gönderme
router.post('/', auth, async (req, res) => {
  try {
    const { recipient, content, type = 'text', encrypted = true } = req.body;
    const sender = req.user.userId;

    console.log('Yeni mesaj:', { sender, recipient, content });

    // Yeni mesaj oluştur
    const newMessage = new Message({
      sender,
      recipient,
      content,
      type,
      encrypted
    });

    // Mesajı kaydet
    const savedMessage = await newMessage.save();
    const populatedMessage = await Message.findById(savedMessage._id)
      .populate('sender', 'username')
      .populate('recipient', 'username');

    // Konuşmayı bul veya oluştur
    let conversation = await Conversation.findOne({
      participants: { $all: [sender, recipient] }
    });

    if (!conversation) {
      conversation = new Conversation({
        participants: [sender, recipient],
        lastMessage: savedMessage._id
      });
    } else {
      conversation.lastMessage = savedMessage._id;
    }

    await conversation.save();
    
    console.log('Mesaj kaydedildi:', populatedMessage);

    // Socket.io ile sadece alıcıya mesajı gönder
    if (recipient !== sender) {
      req.app.get('io').to(recipient).emit('receiveMessage', populatedMessage);
    }

    res.status(201).json(populatedMessage);
  } catch (error) {
    console.error('Mesaj gönderme hatası:', error);
    res.status(500).json({ message: error.message });
  }
});

// Mesajları getirme
router.get('/:userId', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 0;
    const limit = parseInt(req.query.limit) || 20;
    
    const messages = await Message.find({
      $or: [
        { sender: req.user.userId, recipient: req.params.userId },
        { sender: req.params.userId, recipient: req.user.userId }
      ]
    })
    .populate('sender', 'username')
    .populate('recipient', 'username')
    .sort({ createdAt: -1 }) // En yeni mesajları önce getir
    .skip(page * limit)
    .limit(limit);

    const totalMessages = await Message.countDocuments({
      $or: [
        { sender: req.user.userId, recipient: req.params.userId },
        { sender: req.params.userId, recipient: req.user.userId }
      ]
    });

    res.json({
      messages: messages.reverse(), // Mesajları tekrar eski sıralamasına çevir
      hasMore: totalMessages > (page + 1) * limit
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router; 