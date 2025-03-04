import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSocket } from '../contexts/SocketContext';
import Message from './Message';
import MessageInput from './MessageInput';

const Chat = ({ recipientId }) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const { socket, isCallActive, currentCallUser } = useSocket();

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

    // Component unmount olduğunda temizlik yap
    return () => {
      setMessages([]);
    };
  }, [recipientId]);

  // Arama süresi sayacı
  useEffect(() => {
    let timer;
    
    if (isCallActive && (currentCallUser?.id === recipientId)) {
      timer = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      setCallDuration(0);
    }

    return () => {
      if (timer) {
        clearInterval(timer);
      }
    };
  }, [isCallActive, currentCallUser, recipientId]);

  // Arama bittiğinde süreyi sıfırla
  useEffect(() => {
    const handleCallEnded = () => {
      setCallDuration(0);
    };

    socket?.on('callEnded', handleCallEnded);

    return () => {
      socket?.off('callEnded', handleCallEnded);
    };
  }, [socket]);

  // Yeni mesaj geldiğinde
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (message) => {
      if (message.senderId === recipientId || message.recipientId === recipientId) {
        setMessages(prev => [...prev, message]);
      }
    };

    socket.on('receiveMessage', handleNewMessage);

    return () => {
      socket.off('receiveMessage', handleNewMessage);
    };
  }, [socket, recipientId]);

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
          {isCallActive && currentCallUser?.id === recipientId && (
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