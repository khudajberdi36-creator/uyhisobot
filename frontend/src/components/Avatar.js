import React from 'react';

// Ismdan rang olish — har xil ism har xil rang
function nameToColor(name) {
  const colors = [
    ['#6c63ff', '#a78bfa'], // purple
    ['#22c55e', '#4ade80'], // green
    ['#3b82f6', '#60a5fa'], // blue
    ['#f97316', '#fb923c'], // orange
    ['#ec4899', '#f472b6'], // pink
    ['#14b8a6', '#2dd4bf'], // teal
    ['#eab308', '#fbbf24'], // yellow
    ['#ef4444', '#f87171'], // red
  ];
  if (!name) return colors[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

export default function Avatar({ name = '', size = 36, radius = 9, fontSize = 14 }) {
  const letter = (name || '?')[0].toUpperCase();
  const [c1, c2] = nameToColor(name);
  return (
    <div style={{
      width: size, height: size, borderRadius: radius,
      background: `linear-gradient(135deg, ${c1}, ${c2})`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize, fontWeight: 800, color: 'white',
      flexShrink: 0, userSelect: 'none',
      boxShadow: `0 2px 8px ${c1}44`,
    }}>
      {letter}
    </div>
  );
}