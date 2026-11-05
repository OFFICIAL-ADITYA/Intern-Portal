import { createContext, useState } from 'react';
import { login, getMe } from '../services/auth.service';
import { useEffect } from 'react';

// Context exports are intentionally colocated with their provider for consumers.
// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  // Set loading to TRUE initially so we wait for the first check before redirecting
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);


  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currUser = await getMe();
        setUser(currUser);
      } catch (error) {
        console.error("Auth check failed:", error);
        setUser(null);
      } finally {
        // Once the check is done (success or fail), stop loading
        setLoading(false);
      }
    }

    checkAuth();
  }, [])

  // This is the correct way to "fix" it if you want to perform actions or log
  // the user state immediately after it has successfully updated.
  useEffect(() => {
    console.log("Current user state is now:", user);
  }, [user])


  const handleLogin = async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const data = await login(email, password);

      // Assumes backend might return { token, user } or similar structure
      const userToken = data.token;
      const userData = data.user || data;

      if (userToken) {
        setToken(userToken);
        localStorage.setItem('token', userToken);
      }
      setUser(userData);

      return data;
    } catch (err) {
      setError(err.message || 'Login failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setUser(null);
    setToken(null);
    setError(null);
    localStorage.removeItem('token');
  };

  return (
    <AuthContext.Provider value={{ user, setUser, token, setToken, loading, setLoading, error, setError, handleLogin, handleLogout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

