import React, { useState } from 'react';
import { 
  Box, 
  TextField, 
  Button, 
  Typography, 
  Container,
  Paper 
} from '@mui/material';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import api from '../utils/api';

function Login() {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      console.log('Giriş denemesi:', formData.email); // Debug için log ekleyelim
      
      const response = await api.post('/auth/login', formData);
      console.log('Giriş başarılı:', response.data);
      
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('userId', response.data.userId);
      localStorage.setItem('username', response.data.username);
      navigate('/');
    } catch (error) {
      console.error('Giriş hatası:', error);
      
      // Hata mesajını göster
      const errorMessage = error.response?.data?.message || 'Giriş yapılamadı';
      alert(errorMessage);
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Paper elevation={3} sx={{ p: 4, mt: 8 }}>
        <Typography component="h1" variant="h5" align="center">
          Giriş Yap
        </Typography>
        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
          <TextField
            margin="normal"
            required
            fullWidth
            label="Email"
            name="email"
            autoComplete="email"
            onChange={(e) => setFormData({...formData, email: e.target.value})}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            name="password"
            label="Şifre"
            type="password"
            onChange={(e) => setFormData({...formData, password: e.target.value})}
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
          >
            Giriş Yap
          </Button>
          <Link to="/register" style={{ textDecoration: 'none' }}>
            <Typography align="center" color="primary">
              Hesabın yok mu? Kayıt ol
            </Typography>
          </Link>
        </Box>
      </Paper>
    </Container>
  );
}

export default Login; 