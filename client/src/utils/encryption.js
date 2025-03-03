import CryptoJS from 'crypto-js';

// Sabit bir anahtar (fallback için)
const FALLBACK_SECRET = 'your-very-long-and-secure-secret-key-2024';

// İki kullanıcı arasındaki mesajlar için ortak anahtar oluştur
const generateConversationKey = (userId1, userId2) => {
  // Kullanıcı ID'lerini sırala ve birleştir
  const sortedIds = [userId1, userId2].sort().join('_');
  const secret = process.env.REACT_APP_ENCRYPTION_SECRET || FALLBACK_SECRET;
  
  try {
    const hmac = CryptoJS.HmacSHA256(sortedIds, secret);
    return hmac.toString();
  } catch (error) {
    console.error('Anahtar oluşturma hatası:', error);
    // Fallback olarak basit bir hash kullan
    return CryptoJS.SHA256(sortedIds + secret).toString();
  }
};

// Mesajı şifrele
export const encryptMessage = (message, senderId, recipientId) => {
  try {
    const conversationKey = generateConversationKey(senderId, recipientId);
    const encrypted = CryptoJS.AES.encrypt(message, conversationKey).toString();
    return encrypted;
  } catch (error) {
    console.error('Şifreleme hatası:', error);
    return message; // Şifreleme başarısız olursa orijinal mesajı döndür
  }
};

// Mesajı çöz
export const decryptMessage = (encryptedMessage, senderId, recipientId) => {
  try {
    const conversationKey = generateConversationKey(senderId, recipientId);
    const decrypted = CryptoJS.AES.decrypt(encryptedMessage, conversationKey);
    return decrypted.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.error('Mesaj çözme hatası:', error);
    return '🔒 Şifrelenmiş mesaj';
  }
}; 