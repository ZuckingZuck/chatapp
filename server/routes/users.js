const router = require('express').Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const Conversation = require('../models/Conversation');

// Kullanıcı arama
router.get('/search', auth, async (req, res) => {
  try {
    const query = req.query.query;
    if (!query) {
      return res.json([]);
    }

    const users = await User.find({
      $or: [
        { username: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } }
      ],
      _id: { $ne: req.user.userId }
    }).select('username email profilePic');
    
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Tüm konuşmaları getirme
router.get('/conversations', auth, async (req, res) => {
  try {
    const conversations = await Conversation.find({
      participants: req.user.userId
    })
    .populate('participants', 'username')
    .populate('lastMessage')
    .sort({ updatedAt: -1 });
    
    res.json(conversations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Kullanıcı detaylarını getir
router.get('/:id', auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('username'); // Sadece kullanıcı adını döndür

    if (!user) {
      return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
    }

    // Konuşma var mı kontrol et
    const conversation = await Conversation.findOne({
      participants: { 
        $all: [req.user.userId, req.params.id] 
      }
    });

    res.json({
      ...user.toObject(),
      hasConversation: !!conversation,
      conversationId: conversation?._id
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router; 