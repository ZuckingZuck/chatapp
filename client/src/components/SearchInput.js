import React, { useState } from 'react';

const SearchInput = ({ onSearch }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const handleChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    
    // Minimum karakter kontrolünü kaldırdık
    // Boş string bile olsa aramaya izin ver
    onSearch(value);
  };

  const handleFocus = (e) => {
    // Input'a tıklandığında seçili metni koru
    e.target.select();
  };

  const handleBlur = (e) => {
    // Input'tan çıkıldığında değeri koru
    e.preventDefault();
  };

  return (
    <input
      type="text"
      value={searchTerm}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      placeholder="Kullanıcı ara..."
      className="search-input"
      autoComplete="off"
      // Input'un davranışını kontrol eden ek özellikler
      autoFocus={false}
      spellCheck={false}
      style={{ 
        outline: 'none',  // Focus outline'ı kaldır
        caretColor: 'auto' // İmleci görünür yap
      }}
    />
  );
};

export default SearchInput; 