import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSocket } from '../contexts/SocketContext';
import Message from './Message';
import MessageInput from './MessageInput';

const Chat = ({ recipientId }) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const { socket, isCallActive } = useSocket();

  // Sohbet geçmişini yükle
  useEffect(() => {
    const loadMessages = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`/api/messages/${recipientId}`);
        setMessages(response.data);
      } catch (error) {
        console.error('Mesajlar yüklenirken hata:', error);
      } finally {
        setLoading(false);
      }
    };

    if (recipientId) {
      loadMessages();
    }

    return () => {
      setMessages([]);
    };
  }, [recipientId]);

  // Basitleştirilmiş arama süresi sayacı
  useEffect(() => {
    let timer = null;

    if (isCallActive) {
      timer = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }

    return () => {
      if (timer) {
        clearInterval(timer);
      }
      if (!isCallActive) {
        setCallDuration(0);
      }
    };
  }, [isCallActive]);

  // Arama süresini formatla
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="chat-container">
      {loading ? (
        <div>Yükleniyor...</div>
      ) : (
        <>
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
          </div>
          <MessageInput recipientId={recipientId} />
        </>
      )}
    </div>
  );
};

export default Chat; 