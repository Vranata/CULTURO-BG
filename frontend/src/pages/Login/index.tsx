import React from 'react';

const Auth: React.FC = () => {
  return (
    <div style={{ maxWidth: '400px', margin: '80px auto', padding: '40px 24px', background: 'var(--surface-bg)', borderRadius: '20px', boxShadow: 'var(--shadow-soft)', border: '1px solid var(--border-color)', backdropFilter: 'blur(8px)' }}>
      <h1 style={{ textAlign: 'center', color: 'var(--text-primary)', fontWeight: 800 }}>Вход и Регистрация</h1>
      <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Placeholder компонент за вход/регистрация.</p>
    </div>
  );
};

export default Auth;
