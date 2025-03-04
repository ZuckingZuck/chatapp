import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';

const CallNotification = () => {
  const navigate = useNavigate();
  const { 
    incomingCall, 
    setIncomingCall, 
    socket, 
    setIsCallActive,
    setCurrentCallUser,
    ringtone 
  } = useSocket();

  const handleAcceptCall = () => {
    if (!incomingCall) return;

    // Arayanın ID'sini al
    const callerId = incomingCall.from;
    
    // Arayanın bilgilerini sakla
    setCurrentCallUser({
      id: callerId,
      name: incomingCall.callerName
    });

    // Aramayı kabul et
    socket.emit('answerCall', {
      to: callerId,
      signal: incomingCall.signal
    });

    // Arama durumunu aktif yap
    setIsCallActive(true);

    // Zil sesini durdur
    if (ringtone) {
      ringtone.pause();
      ringtone.currentTime = 0;
    }

    // Arayanın sohbet sayfasına yönlendir
    navigate(`/chat/${callerId}`);

    // Bildirim penceresini kapat
    setIncomingCall(null);
  };

  // ... diğer kodlar aynı kalacak
}; 