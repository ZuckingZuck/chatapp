import React, { useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
  IconButton,
  Avatar,
  Snackbar,
  Alert
} from '@mui/material';
import CallIcon from '@mui/icons-material/Call';
import CallEndIcon from '@mui/icons-material/CallEnd';
import { useSocket } from '../context/SocketContext';
import Peer from 'simple-peer-light';
import api from '../utils/api';

const CallDialog = () => {
  const navigate = useNavigate();
  const { 
    socket, 
    incomingCall, 
    setIncomingCall, 
    setIsCallActive,
    setCurrentCallUser,
    ringtone 
  } = useSocket();

  const peerRef = useRef();
  const localAudioRef = useRef();
  const remoteAudioRef = useRef();
  const callTimerRef = useRef();
  const [error, setError] = React.useState('');
  const [callDuration, setCallDuration] = React.useState(0);

  // Arama sayacını başlat
  const startCallTimer = () => {
    setCallDuration(0);
    callTimerRef.current = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
  };

  useEffect(() => {
    if (!socket) return;

    const handleCallAccepted = (signal) => {
      console.log('Call accepted signal received:', signal);
      try {
        if (peerRef.current) {
          peerRef.current.signal(signal);
          startCallTimer(); // Arama kabul edildiğinde sayacı başlat
        }
      } catch (err) {
        console.error('Signal handling error:', err);
        setError('Arama bağlantısı kurulamadı');
        cleanupCall();
      }
    };

    const handleCallRejected = () => {
      setError('Arama reddedildi');
      cleanupCall();
    };

    const handleCallEnded = () => {
      cleanupCall();
    };

    socket.on('callAccepted', handleCallAccepted);
    socket.on('callRejected', handleCallRejected);
    socket.on('callEnded', handleCallEnded);

    return () => {
      socket.off('callAccepted', handleCallAccepted);
      socket.off('callRejected', handleCallRejected);
      socket.off('callEnded', handleCallEnded);
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
      }
    };
  }, [socket]);

  const answerCall = async () => {
    try {
      if (!incomingCall) {
        throw new Error('Arama bilgisi bulunamadı');
      }

      // Zil sesini durdur
      if (ringtone) {
        ringtone.pause();
        ringtone.currentTime = 0;
      }

      // Mikrofon erişimi iste
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

      peer.on('signal', signal => {
        socket.emit('answerCall', { 
          signal,
          to: incomingCall.from 
        });
      });

      peer.on('stream', remoteStream => {
        remoteAudioRef.current.srcObject = remoteStream;
      });

      peer.signal(incomingCall.signal);
      peerRef.current = peer;

      // Aramayı aktif et ve kullanıcıyı ayarla
      setIsCallActive(true);
      setCurrentCallUser({
        _id: incomingCall.from,
        username: incomingCall.callerName
      });

      // Sohbete yönlendir
      navigate('/', { 
        state: { 
          recipientId: incomingCall.from,
          username: incomingCall.callerName
        }
      });

      // Gelen aramayı temizle
      setIncomingCall(null);

    } catch (err) {
      console.error('Answer call error:', err);
      setError(err.message || 'Arama yanıtlanırken bir hata oluştu');
      cleanupCall();
    }
  };

  const rejectCall = () => {
    if (ringtone) {
      ringtone.pause();
      ringtone.currentTime = 0;
    }
    socket?.emit('rejectCall', { to: incomingCall?.from });
    cleanupCall();
  };

  const cleanupCall = () => {
    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
    }

    if (localAudioRef.current?.srcObject) {
      localAudioRef.current.srcObject.getTracks().forEach(track => track.stop());
      localAudioRef.current.srcObject = null;
    }

    if (remoteAudioRef.current?.srcObject) {
      remoteAudioRef.current.srcObject.getTracks().forEach(track => track.stop());
      remoteAudioRef.current.srcObject = null;
    }

    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
    }

    setIncomingCall(null);
    setIsCallActive(false);
    setCallDuration(0);
  };

  return (
    <>
      <Dialog
        open={!!incomingCall}
        onClose={rejectCall}
        sx={{
          '& .MuiDialog-paper': {
            minWidth: '300px'
          }
        }}
      >
        <DialogTitle>Gelen Arama</DialogTitle>
        <DialogContent>
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <Avatar 
              sx={{ 
                width: 60, 
                height: 60, 
                mx: 'auto', 
                mb: 2,
                bgcolor: 'primary.main'
              }}
            >
              {incomingCall?.callerName?.[0]?.toUpperCase()}
            </Avatar>
            <Typography variant="h6" gutterBottom>
              {incomingCall?.callerName}
            </Typography>
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center', gap: 2 }}>
              <IconButton 
                onClick={answerCall} 
                sx={{ 
                  bgcolor: 'success.main',
                  color: 'white',
                  '&:hover': { bgcolor: 'success.dark' }
                }}
              >
                <CallIcon />
              </IconButton>
              <IconButton 
                onClick={rejectCall} 
                sx={{ 
                  bgcolor: 'error.main',
                  color: 'white',
                  '&:hover': { bgcolor: 'error.dark' }
                }}
              >
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
        <Alert onClose={() => setError('')} severity="error">
          {error}
        </Alert>
      </Snackbar>
    </>
  );
};

export default CallDialog; 