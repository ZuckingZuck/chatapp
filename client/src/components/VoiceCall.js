import React, { useState, useRef, useEffect } from 'react';
import { 
  IconButton, 
  Dialog, 
  DialogContent,
  DialogTitle,
  Box,
  Typography,
  Avatar,
  CircularProgress,
  Snackbar,
  Alert,
  Badge,
  Tooltip
} from '@mui/material';
import CallIcon from '@mui/icons-material/Call';
import CallEndIcon from '@mui/icons-material/CallEnd';
import PhoneInTalkIcon from '@mui/icons-material/PhoneInTalk';
import Peer from 'simple-peer-light';
import { useSocket } from '../context/SocketContext';

const VoiceCall = ({ 
  currentChat, 
  onCallEvent, 
  callDuration,
  setCallDuration 
}) => {
  const { 
    socket, 
    incomingCall, 
    setIncomingCall, 
    isCallActive, 
    setIsCallActive,
    ringtone 
  } = useSocket();
  const [calling, setCalling] = useState(false);
  const [peer, setPeer] = useState(null);
  const [error, setError] = useState('');
  const [isCallEnding, setIsCallEnding] = useState(false);
  const peerRef = useRef();
  const localAudioRef = useRef();
  const remoteAudioRef = useRef();
  const callTimerRef = useRef();

  // Diğer kullanıcının bilgilerini al
  const otherUser = currentChat?.participants?.find(
    p => p._id !== localStorage.getItem('userId')
  );

  // Mobil bildirim için
  useEffect(() => {
    // Bildirim izni iste
    if ('Notification' in window) {
      Notification.requestPermission();
    }
  }, []);

  const showNotification = (title, body) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/logo192.png' // PWA ikonunuz varsa kullanın
      });
    }
  };

  useEffect(() => {
    if (!socket) return;

    socket.on('incomingCall', ({ from, signal, callerName }) => {
      setIncomingCall({ from, signal, callerName });
      // Mobil bildirim göster
      showNotification('Gelen Arama', `${callerName} sizi arıyor`);
      // Ses çal
      playRingtone();
    });

    socket.on('callAccepted', (signal) => {
      if (peerRef.current) {
        peerRef.current.signal(signal);
        setCalling(false);
        setIsCallActive(true);
        startCallTimer();
      }
    });

    socket.on('callRejected', () => {
      endCall();
      setError('Arama reddedildi');
    });

    socket.on('callEnded', () => {
      if (isCallActive) {
        endCall();
      }
    });

    return () => {
      socket.off('incomingCall');
      socket.off('callAccepted');
      socket.off('callRejected');
      socket.off('callEnded');
    };
  }, [socket, isCallActive]);

  // Zil sesi için
  const ringtoneRef = useRef(new Audio('/ringtone.mp3')); // Zil sesi dosyasını public klasörüne ekleyin

  const playRingtone = () => {
    if (ringtoneRef.current) {
      ringtoneRef.current.loop = true;
      ringtoneRef.current.play().catch(err => console.log('Ses çalma hatası:', err));
    }
  };

  const stopRingtone = () => {
    if (ringtoneRef.current) {
      ringtoneRef.current.pause();
      ringtoneRef.current.currentTime = 0;
    }
  };

  const checkMediaSupport = async () => {
    // Mobil tarayıcılar için alternatif kontrol
    if (navigator.mediaDevices === undefined) {
      navigator.mediaDevices = {};
    }

    // getUserMedia için eski tarayıcı desteği
    if (navigator.mediaDevices.getUserMedia === undefined) {
      navigator.mediaDevices.getUserMedia = function(constraints) {
        const getUserMedia = navigator.webkitGetUserMedia || 
                           navigator.mozGetUserMedia ||
                           navigator.msGetUserMedia;

        if (!getUserMedia) {
          return Promise.reject(new Error('Tarayıcınızda sesli arama özelliği bulunamadı. Lütfen Chrome veya Firefox kullanın.'));
        }

        return new Promise((resolve, reject) => {
          getUserMedia.call(navigator, constraints, resolve, reject);
        });
      }
    }

    // HTTPS kontrolü
    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
      throw new Error('Sesli arama özelliği için güvenli bağlantı (HTTPS) gereklidir.');
    }

    try {
      // Test için mikrofon erişimi iste
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        throw new Error('Mikrofon izni reddedildi. Lütfen mikrofon erişimine izin verin.');
      } else {
        throw new Error('Mikrofon erişimi sağlanamadı: ' + err.message);
      }
    }
  };

  const startCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: false 
      });
      
      localAudioRef.current.srcObject = stream;
      
      const peer = new Peer({
        initiator: true,
        trickle: false,
        stream,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
          ]
        }
      });

      peer.on('signal', (signal) => {
        socket.emit('callUser', {
          userToCall: otherUser._id,
          signalData: signal,
          from: localStorage.getItem('userId'),
          callerName: localStorage.getItem('username')
        });
      });

      peer.on('stream', (remoteStream) => {
        remoteAudioRef.current.srcObject = remoteStream;
      });

      peerRef.current = peer;
      setCalling(true);
    } catch (err) {
      console.error('Mikrofon erişim hatası:', err);
      setError('Mikrofon erişimi sağlanamadı');
    }
  };

  const answerCall = async () => {
    try {
      if (ringtone) {
        ringtone.pause();
        ringtone.currentTime = 0;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: false 
      });
      
      localAudioRef.current.srcObject = stream;

      const peer = new Peer({
        initiator: false,
        trickle: false,
        stream
      });

      peer.on('signal', (signal) => {
        socket.emit('answerCall', { 
          signal, 
          to: incomingCall.from 
        });
      });

      peer.on('stream', (remoteStream) => {
        remoteAudioRef.current.srcObject = remoteStream;
      });

      peer.signal(incomingCall.signal);
      peerRef.current = peer;
      setIsCallActive(true);
      setIncomingCall(null);
      startCallTimer();
    } catch (err) {
      console.error('Mikrofon erişim hatası:', err);
      setError('Mikrofon erişimi sağlanamadı');
    }
  };

  const rejectCall = () => {
    stopRingtone();
    socket.emit('rejectCall', { to: incomingCall.from });
    addCallMessage('rejected');
    setIncomingCall(null);
  };

  const endCall = () => {
    if (isCallEnding) return;
    setIsCallEnding(true);

    if (ringtone) {
      ringtone.pause();
      ringtone.currentTime = 0;
    }

    if (peerRef.current) {
      peerRef.current.destroy();
    }

    if (localAudioRef.current?.srcObject) {
      localAudioRef.current.srcObject.getTracks().forEach(track => track.stop());
    }

    if (remoteAudioRef.current?.srcObject) {
      remoteAudioRef.current.srcObject.getTracks().forEach(track => track.stop());
    }

    clearInterval(callTimerRef.current);
    
    if (isCallActive && callDuration > 0) {
      addCallMessage('ended');
    }

    setIsCallActive(false);
    setCalling(false);
    setCallDuration(0);
    
    if (socket && otherUser) {
      socket.emit('endCall', { to: otherUser._id });
    }
    
    setIncomingCall(null);

    setTimeout(() => {
      setIsCallEnding(false);
    }, 1000);
  };

  const startCallTimer = () => {
    setCallDuration(0);
    callTimerRef.current = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Arama durumunu iptal et
  const cancelCall = () => {
    if (calling) {
      if (peerRef.current) {
        peerRef.current.destroy();
      }
      if (localAudioRef.current?.srcObject) {
        localAudioRef.current.srcObject.getTracks().forEach(track => track.stop());
      }
      socket.emit('rejectCall', { to: otherUser._id });
      addCallMessage('missed');
      setCalling(false);
    }
  };

  // Arama sonlandığında veya iptal edildiğinde sohbete mesaj ekle
  const addCallMessage = (status) => {
    onCallEvent({
      type: 'call_log',
      status: status,
      duration: status === 'ended' ? callDuration : 0
    });
  };

  return (
    <>
      <Box sx={{ ml: 'auto', mr: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        {/* Arama süresi göstergesi */}
        {(isCallActive || calling) && (
          <Typography 
            variant="body2" 
            sx={{ 
              color: isCallActive ? 'success.main' : 'warning.main',
              fontWeight: 'medium'
            }}
          >
            {isCallActive ? formatDuration(callDuration) : 'Aranıyor...'}
          </Typography>
        )}

        {isCallActive ? (
          <Tooltip title="Aramayı sonlandır">
            <Badge
              color="error"
              variant="dot"
              overlap="circular"
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'right',
              }}
            >
              <IconButton 
                onClick={endCall}
                sx={{ 
                  bgcolor: 'error.main',
                  color: 'white',
                  '&:hover': { bgcolor: 'error.dark' },
                  animation: 'pulse 1.5s infinite'
                }}
              >
                <CallEndIcon />
              </IconButton>
            </Badge>
          </Tooltip>
        ) : calling ? (
          <Tooltip title="Aramayı iptal et">
            <Badge
              color="warning"
              variant="dot"
              overlap="circular"
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'right',
              }}
            >
              <IconButton 
                onClick={cancelCall}
                sx={{ 
                  bgcolor: 'warning.main',
                  color: 'white',
                  '&:hover': { bgcolor: 'warning.dark' }
                }}
              >
                <CallEndIcon />
              </IconButton>
            </Badge>
          </Tooltip>
        ) : (
          <Tooltip title="Sesli arama başlat">
            <IconButton 
              onClick={startCall}
              sx={{ 
                bgcolor: 'primary.main',
                color: 'white',
                '&:hover': { bgcolor: 'primary.dark' }
              }}
            >
              <CallIcon />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {/* Gelen arama bildirimi */}
      <Dialog
        open={!!incomingCall}
        onClose={() => {
          if (ringtone) {
            ringtone.pause();
            ringtone.currentTime = 0;
          }
          socket?.emit('rejectCall', { to: incomingCall?.from });
          setIncomingCall(null);
        }}
      >
        <DialogTitle>Gelen Arama</DialogTitle>
        <DialogContent>
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <Avatar sx={{ width: 60, height: 60, mx: 'auto', mb: 2 }}>
              {incomingCall?.callerName?.[0]?.toUpperCase()}
            </Avatar>
            <Typography variant="h6" gutterBottom>
              {incomingCall?.callerName}
            </Typography>
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center', gap: 2 }}>
              <IconButton onClick={answerCall} color="primary">
                <CallIcon />
              </IconButton>
              <IconButton onClick={rejectCall} color="error">
                <CallEndIcon />
              </IconButton>
            </Box>
          </Box>
        </DialogContent>
      </Dialog>

      {/* Ses elementleri */}
      <audio ref={localAudioRef} autoPlay muted />
      <audio ref={remoteAudioRef} autoPlay />

      {/* Hata bildirimi */}
      <Snackbar 
        open={!!error} 
        autoHideDuration={6000} 
        onClose={() => setError('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setError('')} severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>
    </>
  );
};

export default VoiceCall; 