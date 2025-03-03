import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Box, 
  Grid, 
  Paper, 
  List, 
  ListItem, 
  ListItemText,
  TextField,
  IconButton,
  Typography,
  InputBase,
  Divider,
  Menu,
  MenuItem,
  Avatar,
  AppBar,
  Toolbar,
  useMediaQuery,
  Drawer,
  Fab
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import SearchIcon from '@mui/icons-material/Search';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import { io } from 'socket.io-client';
import api from '../utils/api';
import debounce from 'lodash/debounce';
import { useNavigate, useLocation } from 'react-router-dom';
import { keyframes } from '@emotion/react';
import ChatIcon from '@mui/icons-material/Chat';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EmojiPicker from 'emoji-picker-react';
import EmojiEmotionsIcon from '@mui/icons-material/EmojiEmotions';
import { encryptMessage, decryptMessage } from '../utils/encryption';
import VoiceCall from '../components/VoiceCall';
import PhoneCallbackIcon from '@mui/icons-material/PhoneCallback';
import PhoneMissedIcon from '@mui/icons-material/PhoneMissed';
import PhoneDisabledIcon from '@mui/icons-material/PhoneDisabled';
import { useSocket } from '../context/SocketContext';

// Yeni bildirim animasyonu için keyframes ekleyelim
const pulseAnimation = keyframes`
  0% {
    box-shadow: 0 0 0 0 rgba(0, 255, 157, 0.4);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(0, 255, 157, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(0, 255, 157, 0);
  }
`;

function Chat() {
  const { socket, incomingCall, setCurrentCallUser, setIsCallActive } = useSocket();
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [currentChat, setCurrentChat] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [anchorEl, setAnchorEl] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const username = localStorage.getItem('username');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const messagesEndRef = React.useRef(null);
  const messagesContainerRef = React.useRef(null);
  const [newMessageAlert, setNewMessageAlert] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const isMobile = useMediaQuery((theme) => theme.breakpoints.down('sm'));
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [inCall, setInCall] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const callTimerRef = useRef();

  // Konuşmaları yükle
  const loadConversations = async () => {
    try {
      const response = await api.get('/users/conversations');
      setConversations(response.data);
    } catch (error) {
      console.error('Konuşmaları yükleme hatası:', error);
    }
  };

  // Mesajları yükle
  const loadMessages = async (recipientId, newPage = 0, append = false) => {
    try {
      if (recipientId) {
        setIsLoadingMore(true);
        const response = await api.get(`/messages/${recipientId}?page=${newPage}&limit=20`);
        const messages = response.data.messages || [];
        
        // Mesajları işle
        const processedMessages = messages.map(msg => {
          // Mesaj tipine göre işlem yap
          if (msg.type === 'text' && msg.encrypted) {
            return {
              ...msg,
              content: decryptMessage(msg.content, msg.sender._id, msg.recipient._id)
            };
          }
          // Call log veya şifresiz mesajlar için direkt içeriği kullan
          return msg;
        });

        setHasMore(response.data.hasMore);
        setMessages(prev => append ? [...processedMessages, ...prev] : processedMessages);
        setPage(newPage);
        setIsLoadingMore(false);
      }
    } catch (error) {
      console.error('Mesajları yükleme hatası:', error);
      setIsLoadingMore(false);
      setMessages([]);
    }
  };

  // İlk yükleme ve sayfa yenilemede konuşmaları getir
  useEffect(() => {
    loadConversations();
  }, []);

  // Seçili sohbetin mesajlarını yükle
  useEffect(() => {
    if (currentChat) {
      const recipientId = currentChat.participants?.find(
        p => p._id !== localStorage.getItem('userId')
      )?._id;
      if (recipientId) {
        setPage(0);
        setHasMore(true);
        loadMessages(recipientId);
      }
    }
  }, [currentChat]);

  // Mevcut sohbet değiştiğinde
  useEffect(() => {
    if (currentChat) {
      const otherUser = currentChat.participants.find(
        p => p._id !== localStorage.getItem('userId')
      );
      setCurrentCallUser(otherUser);
    }
  }, [currentChat, setCurrentCallUser]);

  const debouncedSearch = useCallback(
    debounce(async (query) => {
      if (query.trim()) {
        try {
          const response = await api.get(`/users/search?query=${query}`);
          setSearchResults(response.data);
        } catch (error) {
          console.error('Kullanıcı arama hatası:', error);
        }
      } else {
        setSearchResults([]);
      }
    }, 300),
    []
  );

  useEffect(() => {
    debouncedSearch(searchQuery);
    return () => debouncedSearch.cancel();
  }, [searchQuery, debouncedSearch]);

  // Socket mesaj dinleyicisi
  useEffect(() => {
    if (socket) {
      const handleNewMessage = (message) => {
        if (message.sender._id !== localStorage.getItem('userId')) {
          if (currentChat?.participants?.some(p => p._id === message.sender._id)) {
            setMessages(prev => {
              const currentMessages = Array.isArray(prev) ? prev : [];
              
              // Sadece text tipindeki mesajları çöz
              const processedMessage = {
                ...message,
                content: message.type === 'text' && message.encrypted ?
                  decryptMessage(message.content, message.sender._id, message.recipient._id) :
                  message.content
              };

              const messageExists = currentMessages.some(m => m._id === message._id);
              if (messageExists) return currentMessages;
              
              const newMessages = [...currentMessages, processedMessage];
              setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
              return newMessages;
            });
          } else {
            setNewMessageAlert(message.sender._id);
          }
          loadConversations();
        }
      };

      socket.on('receiveMessage', handleNewMessage);
      return () => socket.off('receiveMessage', handleNewMessage);
    }
  }, [socket, currentChat]);

  // Location state'inden gelen sohbeti kontrol et
  useEffect(() => {
    if (location.state?.recipientId) {
      // Konuşmayı yükle
      const recipientId = location.state.recipientId;
      const existingConv = conversations.find(conv => 
        conv.participants.some(p => p._id === recipientId)
      );

      if (existingConv) {
        setCurrentChat(existingConv);
        loadMessages(recipientId);
      } else {
        // Yeni konuşma oluştur
        const newChat = {
          participants: [
            { _id: localStorage.getItem('userId'), username: localStorage.getItem('username') },
            { _id: recipientId, username: location.state.username }
          ]
        };
        setCurrentChat(newChat);
        loadMessages(recipientId);
      }

      // State'i temizle
      window.history.replaceState({}, document.title);
    }
  }, [location, conversations]);

  // Sohbet yükleme fonksiyonunu güncelle
  const loadConversation = async (userId) => {
    try {
      // Önce konuşma var mı kontrol et
      const existingConv = conversations.find(conv => 
        conv.participants.some(p => p._id === userId)
      );

      if (existingConv) {
        setCurrentChat(existingConv);
        loadMessages(userId);
        return;
      }

      // Konuşma yoksa yeni kullanıcı bilgilerini al
      const userResponse = await api.get(`/users/${userId}`);
      const newChat = {
        participants: [
          { _id: localStorage.getItem('userId'), username: localStorage.getItem('username') },
          { _id: userId, username: userResponse.data.username }
        ],
        messages: []
      };

      setCurrentChat(newChat);
      loadMessages(userId);

      // Konuşmaları yenile
      loadConversations();
    } catch (error) {
      console.error('Konuşma yükleme hatası:', error);
    }
  };

  // Mesaj gönderme fonksiyonunu güncelle
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !currentChat) return;

    const recipientId = currentChat.participants.find(
      p => p._id !== localStorage.getItem('userId')
    )?._id;

    if (!recipientId) return;

    try {
      const messageData = {
        sender: localStorage.getItem('userId'),
        recipient: recipientId,
        content: encryptMessage(newMessage, localStorage.getItem('userId'), recipientId),
        type: 'text',
        encrypted: true
      };

      const response = await api.post('/messages', messageData);
      
      // Gönderilen mesajı işle
      const processedMessage = {
        ...response.data,
        content: newMessage, // Orijinal mesajı göster
        sender: {
          _id: localStorage.getItem('userId'),
          username: localStorage.getItem('username')
        },
        recipient: {
          _id: recipientId,
          username: currentChat.participants.find(p => p._id === recipientId)?.username
        }
      };
      
      setMessages(prev => [...prev, processedMessage]);
      setNewMessage('');

      if (socket) {
        socket.emit('sendMessage', {
          ...response.data,
          recipientId
        });
      }

      // Konuşmaları yenile
      loadConversations();
    } catch (error) {
      console.error('Mesaj gönderme hatası:', error);
    }
  };

  // Sohbet başlığını göster
  const getCurrentChatTitle = () => {
    if (!currentChat) return '';
    
    const otherParticipant = currentChat.participants?.find(
      p => p._id !== localStorage.getItem('userId')
    );
    
    return otherParticipant?.username || '';
  };

  const handleProfileClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('username');
    navigate('/login');
  };

  // Scroll to bottom when new message is sent
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Scroll olayını dinle
  const handleScroll = useCallback((e) => {
    const container = e.target;
    if (container.scrollTop === 0 && hasMore && !isLoadingMore) {
      const recipientId = currentChat.participants?.find(
        p => p._id !== localStorage.getItem('userId')
      )?._id;
      if (recipientId) {
        loadMessages(recipientId, page + 1, true);
      }
    }
  }, [currentChat, hasMore, isLoadingMore, page]);

  // Yeni mesaj geldiğinde en alta scroll
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleChatSelect = (conv) => {
    setCurrentChat(conv);
    setNewMessageAlert(null);
    if (isMobile) {
      setMobileOpen(false);
    }
  };

  // Mobil görünümde sohbetten çık
  const handleBackToList = () => {
    setCurrentChat(null);
  };

  // Emoji input için özel input type kullanımı
  const handleEmojiClick = () => {
    const input = document.createElement('input');
    input.setAttribute('type', 'text');
    input.setAttribute('inputmode', 'none');
    input.classList.add('emoji-input');
    input.style.position = 'fixed';
    input.style.opacity = 0;
    input.style.top = '50%';
    input.style.left = '50%';
    
    document.body.appendChild(input);
    input.focus();
    
    input.addEventListener('input', (e) => {
      setNewMessage(prev => prev + e.data);
      document.body.removeChild(input);
    });

    input.addEventListener('blur', () => {
      document.body.removeChild(input);
    });
  };

  // Masaüstü için emoji seçici fonksiyonu
  const onEmojiClick = (emojiObject) => {
    setNewMessage(prev => prev + emojiObject.emoji);
  };

  // Arama olaylarını işle
  const handleCallEvent = async (callEvent) => {
    const userId = localStorage.getItem('userId');
    const recipientId = currentChat.participants.find(p => p._id !== userId)?._id;
    
    let content = '';
    switch (callEvent.status) {
      case 'ended':
        content = `📞 Sesli arama sonlandı (${formatDuration(callEvent.duration)})`;
        break;
      case 'missed':
        content = '📞 Cevapsız arama';
        break;
      case 'rejected':
        content = '📞 Arama reddedildi';
        break;
      default:
        return;
    }

    const messageData = {
      sender: userId,
      recipient: recipientId,
      content: content,
      type: 'call_log',
      encrypted: false
    };

    try {
      const response = await api.post('/messages', messageData);
      setMessages(prev => [...prev, response.data]);
      if (socket) {  // socket kontrolü ekleyelim
        socket.emit('sendMessage', {
          ...response.data,
          recipientId
        });
      }
      loadConversations();
    } catch (error) {
      console.error('Arama kaydı eklenirken hata:', error);
    }
  };

  // Süre formatı için yardımcı fonksiyon
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Mesaj render fonksiyonu
  const renderMessage = (message, index) => {
    const isMyMessage = message.sender._id === localStorage.getItem('userId');
    
    // Arama kaydı mesajı
    if (message.type === 'call_log') {
      return (
        <Box
          key={message._id || index}
          sx={{
            display: 'flex',
            justifyContent: 'center',
            my: 1
          }}
        >
          <Paper
            sx={{
              p: 1,
              px: 2,
              bgcolor: 'background.default',
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              gap: 1
            }}
          >
            {message.content.includes('sonlandı') ? (
              <PhoneCallbackIcon color="success" />
            ) : message.content.includes('Cevapsız') ? (
              <PhoneMissedIcon color="error" />
            ) : (
              <PhoneDisabledIcon color="warning" />
            )}
            <Typography variant="body2" color="text.secondary">
              {message.content}  {/* Şifresiz içerik */}
            </Typography>
          </Paper>
        </Box>
      );
    }

    // Normal mesaj
    return (
      <Box
        key={message._id || index}
        sx={{
          display: 'flex',
          justifyContent: isMyMessage ? 'flex-end' : 'flex-start',
          mb: 1
        }}
      >
        <Paper
          sx={{
            p: 1.5,
            px: 2,
            bgcolor: isMyMessage ? 'primary.dark' : 'background.paper',
            color: isMyMessage ? 'white' : 'text.primary',
            maxWidth: '70%',
            borderRadius: isMyMessage ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
            border: t => !isMyMessage && '1px solid rgba(255, 255, 255, 0.1)',
            position: 'relative',
            '&::after': isMyMessage ? {
              content: '""',
              position: 'absolute',
              bottom: 0,
              right: '-10px',
              width: '20px',
              height: '20px',
              bgcolor: 'primary.dark',
              borderBottomLeftRadius: '50%',
              zIndex: -1,
            } : {}
          }}
        >
          <Typography>{message.content}</Typography>
        </Paper>
      </Box>
    );
  };

  const SidebarContent = () => (
    <Paper sx={{ 
      height: '100%',
      bgcolor: 'background.paper',
      borderRight: '1px solid rgba(255, 255, 255, 0.1)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      <Box sx={{ p: 2 }}>
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center',
          bgcolor: 'rgba(255, 255, 255, 0.05)',
          borderRadius: 2,
          p: 1
        }}>
          <InputBase
            sx={{ 
              ml: 1, 
              flex: 1,
              color: 'text.primary'
            }}
            placeholder="Kullanıcı ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <IconButton sx={{ color: 'primary.main' }}>
            <SearchIcon />
          </IconButton>
        </Box>
      </Box>
      
      {searchResults.length > 0 && (
        <>
          <Typography variant="subtitle2" sx={{ p: 2, pb: 1 }}>
            Arama Sonuçları
          </Typography>
          <List>
            {searchResults.map((user) => (
              <ListItem 
                button 
                key={user._id}
                onClick={() => loadConversation(user._id)}
              >
                <ListItemText 
                  primary={user.username}
                  secondary={user.email}
                />
              </ListItem>
            ))}
          </List>
          <Divider />
        </>
      )}

      <Typography variant="subtitle2" sx={{ p: 2, pb: 1 }}>
        Konuşmalar
      </Typography>
      <Box sx={{ 
        flexGrow: 1, 
        overflow: 'auto',
        overflowX: 'hidden',
        p: 2,
        display: 'flex',
        flexDirection: 'column',
        maxHeight: { xs: 'calc(100vh - 180px)', sm: 'calc(100vh - 200px)' },
        gap: 1,
        '&::-webkit-scrollbar': {
          width: '6px',
          height: '0',
        },
        '&::-webkit-scrollbar-track': {
          background: 'rgba(0, 0, 0, 0.1)',
          borderRadius: '10px',
          margin: '10px',
        },
        '&::-webkit-scrollbar-thumb': {
          background: 'linear-gradient(45deg, #00ff9d 30%, #00b36e 90%)',
          borderRadius: '10px',
          border: '2px solid transparent',
          backgroundClip: 'padding-box',
          '&:hover': {
            background: 'linear-gradient(45deg, #33ffb1 30%, #00ff9d 90%)',
          }
        },
        scrollbarWidth: 'thin',
        scrollbarColor: '#00ff9d transparent',
      }}>
        <List>
          {conversations.map((conv) => {
            const otherParticipant = conv.participants.find(
              p => p._id !== localStorage.getItem('userId')
            );
            const hasNewMessage = newMessageAlert === otherParticipant?._id;
            const isSelected = currentChat?._id === conv._id;
            
            // Son mesajı çöz
            const lastMessageContent = conv.lastMessage?.content && conv.lastMessage?.encrypted ? 
              decryptMessage(
                conv.lastMessage.content,
                conv.lastMessage.sender,
                conv.lastMessage.recipient
              ) : 
              conv.lastMessage?.content;
            
            return (
              <ListItem 
                button 
                key={conv._id}
                onClick={() => handleChatSelect(conv)}
                selected={isSelected}
                sx={{
                  mb: 1,
                  mx: 1,
                  borderRadius: 2,
                  position: 'relative',
                  cursor: 'pointer',
                  animation: hasNewMessage ? `${pulseAnimation} 2s infinite` : 'none',
                  bgcolor: isSelected ? 'rgba(0, 255, 157, 0.15)' : 'transparent',
                  transition: 'all 0.3s ease',
                  '&::before': isSelected ? {
                    content: '""',
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: '4px',
                    bgcolor: 'primary.main',
                    borderRadius: '4px',
                  } : {},
                  '&.Mui-selected': {
                    bgcolor: 'rgba(0, 255, 157, 0.15)',
                    '&:hover': {
                      bgcolor: 'rgba(0, 255, 157, 0.25)',
                    },
                  },
                  '&:hover': {
                    bgcolor: isSelected ? 'rgba(0, 255, 157, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                  },
                  borderLeft: isSelected ? '4px solid' : 'none',
                  borderLeftColor: 'primary.main',
                }}
              >
                <Avatar sx={{ 
                  mr: 2,
                  bgcolor: hasNewMessage ? 'primary.main' : isSelected ? 'primary.main' : 'secondary.main',
                  transform: isSelected ? 'scale(1.1)' : 'scale(1)',
                  transition: 'transform 0.3s ease',
                  border: isSelected ? '2px solid' : 'none',
                  borderColor: 'primary.light',
                }}>
                  {otherParticipant?.username[0].toUpperCase()}
                </Avatar>
                <ListItemText 
                  primary={otherParticipant?.username}
                  secondary={lastMessageContent}
                  primaryTypographyProps={{
                    sx: { 
                      color: hasNewMessage ? 'primary.main' : isSelected ? 'primary.light' : 'text.primary',
                      fontWeight: isSelected ? 500 : 400,
                    }
                  }}
                  secondaryTypographyProps={{
                    sx: { 
                      color: hasNewMessage ? 'primary.light' : isSelected ? 'text.primary' : 'text.secondary',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      opacity: isSelected ? 1 : 0.7,
                    }
                  }}
                />
              </ListItem>
            );
          })}
        </List>
      </Box>
    </Paper>
  );

  // Component unmount olduğunda sayacı temizle
  useEffect(() => {
    return () => {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
      }
    };
  }, []);

  return (
    <Box sx={{ 
      flexGrow: 1, 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      bgcolor: 'background.default',
    }}>
      <AppBar position="static" sx={{ 
        bgcolor: 'background.paper',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          {isMobile && (
            <IconButton
              color="inherit"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2, display: { sm: 'none' } }}
            >
              <MenuIcon />
            </IconButton>
          )}
          <Typography variant="h6" sx={{ 
            background: 'linear-gradient(45deg, #00ff9d 30%, #9d00ff 90%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            Logo
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={handleProfileClick}>
            <Avatar sx={{ 
              bgcolor: 'transparent',
              border: '2px solid',
              borderColor: 'primary.main',
              color: 'primary.main'
            }}>
              {username ? username[0].toUpperCase() : <AccountCircleIcon />}
            </Avatar>
            {!isMobile && (
              <Typography sx={{ ml: 1, color: 'text.primary' }}>
                {username}
              </Typography>
            )}
          </Box>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleClose}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
          >
            <MenuItem onClick={handleClose}>Profil</MenuItem>
            <MenuItem onClick={handleLogout}>Çıkış Yap</MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Box sx={{ display: 'flex', flexGrow: 1, overflow: 'hidden' }}>
        {/* Mobil drawer */}
        {isMobile ? (
          <Drawer
            variant="temporary"
            open={mobileOpen}
            onClose={handleDrawerToggle}
            ModalProps={{
              keepMounted: true, // Daha iyi mobil performansı için
            }}
            sx={{
              display: { xs: 'block', sm: 'none' },
              '& .MuiDrawer-paper': { 
                boxSizing: 'border-box', 
                width: '100%',
                bgcolor: 'background.default'
              },
            }}
          >
            <SidebarContent />
          </Drawer>
        ) : (
          // Desktop sidebar
          <Box sx={{ width: 320, flexShrink: 0, display: { xs: 'none', sm: 'block' } }}>
            <SidebarContent />
          </Box>
        )}

        {/* Ana içerik */}
        <Box sx={{ flexGrow: 1 }}>
          <Paper sx={{ 
            height: '100%', 
            display: 'flex', 
            flexDirection: 'column',
            bgcolor: 'background.paper',
            position: 'relative'
          }}>
            {currentChat ? (
              <>
                <Box sx={{ 
                  p: 2, 
                  borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                  bgcolor: inCall ? 'rgba(0, 200, 83, 0.1)' : 'background.paper',
                  display: 'flex',
                  alignItems: 'center',
                  transition: 'background-color 0.3s ease',
                  position: 'relative',
                  zIndex: 1,
                  minHeight: 64,
                  width: '100%',
                  boxSizing: 'border-box'
                }}>
                  {isMobile && (
                    <IconButton 
                      edge="start" 
                      onClick={handleBackToList}
                      sx={{ mr: 1 }}
                    >
                      <ArrowBackIcon />
                    </IconButton>
                  )}
                  <Avatar sx={{ 
                    mr: 2,
                    bgcolor: 'secondary.main'
                  }}>
                    {getCurrentChatTitle()[0]?.toUpperCase()}
                  </Avatar>
                  <Typography variant="h6">
                    {getCurrentChatTitle()}
                  </Typography>
                  <VoiceCall 
                    currentChat={currentChat} 
                    onCallEvent={handleCallEvent}
                    callDuration={callDuration}
                    setCallDuration={setCallDuration}
                  />
                </Box>

                <Box 
                  ref={messagesContainerRef}
                  onScroll={handleScroll}
                  sx={{ 
                    flexGrow: 1, 
                    overflow: 'auto', 
                    overflowX: 'hidden',
                    p: 2,
                    display: 'flex',
                    flexDirection: 'column',
                    maxHeight: { xs: 'calc(100vh - 180px)', sm: 'calc(100vh - 200px)' },
                    gap: 1,
                    '&::-webkit-scrollbar': {
                      width: '6px',
                      height: '0',
                    },
                    '&::-webkit-scrollbar-track': {
                      background: 'rgba(0, 0, 0, 0.1)',
                      borderRadius: '10px',
                      margin: '10px',
                    },
                    '&::-webkit-scrollbar-thumb': {
                      background: 'linear-gradient(45deg, #00ff9d 30%, #00b36e 90%)',
                      borderRadius: '10px',
                      border: '2px solid transparent',
                      backgroundClip: 'padding-box',
                      '&:hover': {
                        background: 'linear-gradient(45deg, #33ffb1 30%, #00ff9d 90%)',
                      }
                    },
                    scrollbarWidth: 'thin',
                    scrollbarColor: '#00ff9d transparent',
                  }}
                >
                  {Array.isArray(messages) && messages.map((message, index) => renderMessage(message, index))}
                  <div ref={messagesEndRef} />
                </Box>

                <Box sx={{ 
                  p: { xs: 1, sm: 2 }, 
                  bgcolor: 'background.paper',
                  borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                  position: 'relative'
                }}>
                  {!isMobile && showEmojiPicker && (
                    <Box sx={{
                      position: 'absolute',
                      bottom: '100%',
                      right: 16,
                      zIndex: 1,
                      '.EmojiPickerReact': {
                        '--epr-bg-color': '#1a1a1a',
                        '--epr-category-label-bg-color': '#0a0a0a',
                        '--epr-hover-bg-color': 'rgba(0, 255, 157, 0.15)',
                        '--epr-focus-bg-color': 'rgba(0, 255, 157, 0.25)',
                        '--epr-highlight-color': '#00ff9d',
                        '--epr-search-border-color': 'rgba(255, 255, 255, 0.1)',
                        '--epr-category-label-text-color': '#ffffff',
                        '--epr-text-color': '#ffffff',
                      }
                    }}>
                      <EmojiPicker
                        onEmojiClick={onEmojiClick}
                        autoFocusSearch={false}
                        theme="dark"
                        width={350}
                      />
                    </Box>
                  )}
                  <Grid container spacing={1}>
                    <Grid item xs>
                      <TextField
                        fullWidth
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Mesajınızı yazın..."
                        variant="outlined"
                        size={isMobile ? "small" : "medium"}
                        InputProps={{
                          startAdornment: (
                            <IconButton 
                              onClick={isMobile ? handleEmojiClick : () => setShowEmojiPicker(!showEmojiPicker)}
                              sx={{ 
                                color: 'primary.main',
                                '&:hover': { color: 'primary.light' }
                              }}
                            >
                              <EmojiEmotionsIcon />
                            </IconButton>
                          ),
                        }}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            bgcolor: 'background.default',
                            borderRadius: 3,
                          }
                        }}
                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      />
                    </Grid>
                    <Grid item>
                      <IconButton 
                        onClick={handleSendMessage}
                        sx={{ 
                          bgcolor: 'primary.main',
                          color: 'background.paper',
                          '&:hover': {
                            bgcolor: 'primary.dark',
                          }
                        }}
                      >
                        <SendIcon />
                      </IconButton>
                    </Grid>
                  </Grid>
                </Box>
              </>
            ) : (
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                height: '100%',
                flexDirection: 'column',
                gap: 2,
                p: 2,
                textAlign: 'center'
              }}>
                {isMobile ? (
                  <Fab
                    color="primary"
                    onClick={handleDrawerToggle}
                    sx={{
                      position: 'absolute',
                      bottom: 16,
                      right: 16,
                    }}
                  >
                    <ChatIcon />
                  </Fab>
                ) : (
                  <>
                    <Typography variant="h5" sx={{ color: 'text.secondary' }}>
                      Sohbet başlatmak için bir kullanıcı seçin
                    </Typography>
                    <Box sx={{ 
                      width: 100, 
                      height: 100, 
                      borderRadius: '50%',
                      border: '2px solid',
                      borderColor: 'primary.main',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <ChatIcon sx={{ fontSize: 40, color: 'primary.main' }} />
                    </Box>
                  </>
                )}
              </Box>
            )}
          </Paper>
        </Box>
      </Box>
    </Box>
  );
}

export default Chat; 