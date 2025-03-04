import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);
  const [currentCallUser, setCurrentCallUser] = useState(null);
  const [isCallActive, setIsCallActive] = useState(false);
  const [ringtone, setRingtone] = useState(null);

  // Bildirim gösterme fonksiyonu
  const showNotification = (title, body) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/logo192.png'
      });
    }
  };

  useEffect(() => {
    // Bildirim izni iste
    if ('Notification' in window) {
      Notification.requestPermission();
    }

    const SOCKET_URL = process.env.NODE_ENV === 'production'
      ? 'https://chatapi.ipsstech.com.tr'
      : window.location.origin;

    const newSocket = io(SOCKET_URL, {
      path: '/socket.io/',
      transports: ['websocket', 'polling'],
      secure: true,
      rejectUnauthorized: false,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 20000
    });
    
    setSocket(newSocket);

    // Ringtone'u bir kez oluştur
    const audio = new Audio('/ringtone.mp3');
    audio.loop = true;
    setRingtone(audio);

    newSocket.on('connect', () => {
      console.log('Socket.io bağlantısı kuruldu');
      const userId = localStorage.getItem('userId');
      if (userId) {
        newSocket.emit('join', userId);
      }
    });

    newSocket.on('incomingCall', (data) => {
      console.log('Gelen arama:', data);
      if (!isCallActive) {
        setIncomingCall(data);
        showNotification('Gelen Arama', `${data.callerName} sizi arıyor`);
        // Zil sesini çal
        audio.play().catch(err => console.log('Ses çalma hatası:', err));
      } else {
        newSocket.emit('rejectCall', { to: data.from });
      }
    });

    newSocket.on('callAccepted', () => {
      audio.pause();
      audio.currentTime = 0;
      setIsCallActive(true);
    });

    newSocket.on('callRejected', () => {
      audio.pause();
      audio.currentTime = 0;
      setIncomingCall(null);
      setIsCallActive(false);
    });

    newSocket.on('callEnded', () => {
      audio.pause();
      audio.currentTime = 0;
      setIncomingCall(null);
      setIsCallActive(false);
    });

    // Bağlantı hata yönetimi
    newSocket.on('connect_error', (error) => {
      console.error('Socket bağlantı hatası:', error);
      // Polling'e geri dön
      if (error.type === 'TransportError') {
        newSocket.io.opts.transports = ['polling', 'websocket'];
      }
    });

    return () => {
      if (newSocket) {
        newSocket.close();
      }
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
    };
  }, []);

  // Socket.io bağlantı yönetimi
  useEffect(() => {
    if (!socket) return;

    socket.on('connect', () => {
      console.log('Socket bağlandı');
    });

    socket.on('disconnect', () => {
      console.log('Socket bağlantısı kesildi');
    });

    socket.on('error', (error) => {
      console.error('Socket hatası:', error);
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('error');
    };
  }, [socket]);

  return (
    <SocketContext.Provider value={{ 
      socket, 
      incomingCall, 
      setIncomingCall,
      currentCallUser,
      setCurrentCallUser,
      isCallActive,
      setIsCallActive,
      ringtone
    }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext); 