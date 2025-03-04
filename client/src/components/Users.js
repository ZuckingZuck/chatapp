import React, { useState, useEffect } from 'react';
import axios from 'axios';
import SearchInput from './SearchInput';
import UserList from './UserList';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Tüm kullanıcıları yükle
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/api/users');
        setUsers(response.data);
        setFilteredUsers(response.data);
      } catch (err) {
        setError('Kullanıcılar yüklenirken hata oluştu');
        console.error('Kullanıcı yükleme hatası:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  // Arama işlemi - minimum karakter kontrolü kaldırıldı
  const handleSearch = (searchTerm) => {
    if (!searchTerm.trim()) {
      setFilteredUsers(users);
      return;
    }

    const filtered = users.filter(user => 
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredUsers(filtered);
  };

  if (loading) return <div>Yükleniyor...</div>;
  if (error) return <div>{error}</div>;

  return (
    <div className="users-container">
      <SearchInput onSearch={handleSearch} />
      <UserList users={filteredUsers} />
    </div>
  );
};

export default Users; 