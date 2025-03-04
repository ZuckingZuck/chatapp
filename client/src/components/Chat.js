import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useSocket } from '../context/SocketContext';
import Message from './Message';
import MessageInput from './MessageInput';

const Chat = ({ recipientId }) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [callDuration, setCallDuration] = useState(0);
  const timerRef = useRef(null);
  const messagesEndRef = useRef(null);
  const { socket, isCallActive } = useSocket();

  // Mesajları yükle
  useEffect(() => {
    const loadMessages = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`/api/messages/${recipientId}`);
        setMessages(response.data);
        scrollToBottom();
      } catch (err) {
        setError('Mesajlar yüklenirken hata oluştu');
        console.error('Mesaj yükleme hatası:', err);
      } finally {
        setLoading(false);
      }
    };

    if (recipientId) {
      loadMessages();
    }

    return () => {
      setMessages([]);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [recipientId]);

  // Yeni mesajları dinle
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (message) => {
      if (message.senderId === recipientId || message.recipientId === recipientId) {
        setMessages(prev => [...prev, message]);
        scrollToBottom();
      }
    };

    socket.on('receiveMessage', handleNewMessage);

    return () => {
      socket.off('receiveMessage', handleNewMessage);
    };
  }, [socket, recipientId]);

  // Arama süresini yönet
  useEffect(() => {
    if (isCallActive) {
      timerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (!isCallActive) {
        setCallDuration(0);
      }
    };
  }, [isCallActive]);

  // Otomatik kaydırma
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Arama süresini formatla
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) return <div>Mesajlar yükleniyor...</div>;
  if (error) return <div>{error}</div>;

  return (
    <div className="chat-container">
      {isCallActive && (
        <div className="call-duration">
          Arama Süresi: {formatDuration(callDuration)}
        </div>
      )}
      <div className="messages-container">
        {messages.map((message) => (
          <Message
            key={message._id}
            message={message}
            isSender={message.senderId !== recipientId}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>
      <MessageInput 
        recipientId={recipientId}
        onMessageSent={(newMessage) => {
          setMessages(prev => [...prev, newMessage]);
          scrollToBottom();
        }}
      />
    </div>
  );
};

export default Chat; 