import React, { useState, useEffect } from 'react';

export function formatSum(n) {
  if (!n && n !== 0) return '';
  return Number(n).toLocaleString('uz-UZ');
}

export default function SummaInput({ value, onChange, placeholder = "0", required, className }) {
  const [display, setDisplay] = useState(value ? Number(value).toLocaleString('uz-UZ') : '');

  // Tashqaridan value o'zgarganda (masalan mahsulot tanlanganda) — yangilansin
  useEffect(() => {
    if (value !== undefined && value !== null && value !== '') {
      setDisplay(Number(value).toLocaleString('uz-UZ'));
    } else if (value === '' || value === 0) {
      setDisplay('');
    }
  }, [value]);

  const handleChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '');
    const num = raw ? Number(raw) : '';
    setDisplay(raw ? Number(raw).toLocaleString('uz-UZ') : '');
    onChange(num);
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      value={display}
      onChange={handleChange}
      placeholder={placeholder}
      required={required}
      className={className || 'form-input'}
      style={{ fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.02em' }}
    />
  );
}