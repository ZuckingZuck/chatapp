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
import api from '../utils/api';

function Register() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: ''
  });
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/auth/register', formData);
      navigate('/login');
    } catch (error) {
      console.error('Kayıt hatası:', error);
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Paper elevation={3} sx={{ p: 4, mt: 8 }}>
        <Typography component="h1" variant="h5" align="center">
          Kayıt Ol
        </Typography>
        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
          <TextField
            margin="normal"
            required
            fullWidth
            label="Kullanıcı Adı"
            name="username"
            onChange={(e) => setFormData({...formData, username: e.target.value})}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            label="Email"
            name="email"
            type="email"
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
            Kayıt Ol
          </Button>
          <Link to="/login" style={{ textDecoration: 'none' }}>
            <Typography align="center" color="primary">
              Zaten hesabın var mı? Giriş yap
            </Typography>
          </Link>
        </Box>
      </Paper>
    </Container>
  );
}

export default Register; 