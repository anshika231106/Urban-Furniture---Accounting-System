import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);

const API_BASE = '/api/auth';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore session on mount
  useEffect(() => {
    const token = localStorage.getItem('uf_token');
    if (token) {
      fetch(`${API_BASE}/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((data) => setUser(data.user))
        .catch(() => {
          localStorage.removeItem('uf_token');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (loginId, password) => {
    let res;
    try {
      res = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loginId, password }),
      });
    } catch (err) {
      throw new Error('Backend server disconnected. Please ensure backend server is running on port 3001.');
    }

    let data;
    try {
      data = await res.json();
    } catch (err) {
      throw new Error('Server returned invalid response. Please check server logs.');
    }

    if (!res.ok) {
      throw new Error(data.error || 'Invalid Login Id or Password');
    }

    localStorage.setItem('uf_token', data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const signup = useCallback(async (loginId, email, password) => {
    const res = await fetch(`${API_BASE}/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ loginId, email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Sign up failed');
    }

    localStorage.setItem('uf_token', data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const createUser = useCallback(async (name, loginId, email, role, password) => {
    const token = localStorage.getItem('uf_token');
    const res = await fetch(`${API_BASE}/create-user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name, loginId, email, role, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Failed to create user');
    }

    return data.user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('uf_token');
    setUser(null);
  }, []);

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    signup,
    createUser,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
