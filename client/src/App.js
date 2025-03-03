import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material';
import Login from './pages/Login';
import Register from './pages/Register';
import Chat from './pages/Chat';
import PrivateRoute from './components/PrivateRoute';
import { SocketProvider } from './context/SocketContext';
import CallDialog from './components/CallDialog';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#00ff9d', // Neon yeşil
      light: '#33ffb1',
      dark: '#00b36e',
    },
    secondary: {
      main: '#9d00ff', // Neon mor
      light: '#b133ff',
      dark: '#6e00b3',
    },
    background: {
      default: '#0a0a0a',
      paper: '#1a1a1a',
    },
    text: {
      primary: '#ffffff',
      secondary: '#b3b3b3',
    },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          borderRadius: 12,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <SocketProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/" element={
              <PrivateRoute>
                <Chat />
              </PrivateRoute>
            } />
          </Routes>
          <CallDialog />
        </Router>
      </SocketProvider>
    </ThemeProvider>
  );
}

export default App;
