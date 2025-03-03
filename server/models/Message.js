const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['text', 'call_log'],  // mesaj tipi: normal mesaj veya arama kaydı
    default: 'text'
  },
  encrypted: {
    type: Boolean,
    default: function() {
      return this.type === 'text';  // Sadece text mesajları şifrele
    }
  }
}, { timestamps: true });

module.exports = mongoose.model('Message', messageSchema); 