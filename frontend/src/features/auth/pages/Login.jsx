import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import '../../../app/App.css';


const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).toLowerCase());
};

export default function Login() {

  const [values, setValues] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [notification, setNotification] = useState(null);

  const { handleLogin } = useAuth();
  const navigate = useNavigate();

  const notify = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  const isEmailValid = touched.email && !errors.email && values.email.trim() && validateEmail(values.email);
  const isEmailInvalid = touched.email && errors.email;

  const isPasswordValid = touched.password && !errors.password && values.password.trim().length > 0;
  const isPasswordInvalid = touched.password && errors.password;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setValues((prev) => ({ ...prev, [name]: value }));

    if (name === 'email') {
      if (!value.trim()) {
        setErrors((prev) => ({ ...prev, email: 'Email is required.' }));
      } else if (!validateEmail(value)) {
        setErrors((prev) => ({ ...prev, email: 'Please enter a valid email address.' }));
      } else {
        setErrors((prev) => {
          const next = { ...prev };
          delete next.email;
          return next;
        });
      }
    }

    if (name === 'password') {
      if (!value) {
        setErrors((prev) => ({ ...prev, password: 'Password is required.' }));
      } else {
        setErrors((prev) => {
          const next = { ...prev };
          delete next.password;
          return next;
        });
      }
    }
  };

  const handleBlur = (e) => {
    const { name } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
  };

  const submit = async (event) => {
    event.preventDefault();

    setLoading(true);

    try {
      const data = await handleLogin(values.email.trim().toLowerCase(), values.password);

      setLoading(false);
      notify('success', 'Logged in successfully!');

      const userData = data.user || data;
      navigate(`/${userData.role}/dashboard`);
    } catch (error) {
      console.error(error);
      setLoading(false);
      let errMsg = error.message || 'Invalid email or password.';
      if (error.statusCode === 429 || error.status === 429 || error.retryAfter || (typeof errMsg === 'string' && errMsg.includes('Too many'))) {
        const minutes = error.retryAfter ? Math.ceil(error.retryAfter / 60) : 15;
        errMsg = `Too many login attempts. Please wait ${minutes} minute${minutes === 1 ? '' : 's'} before trying again.`;
      }
      notify('error', errMsg);
    }
  };

  return (
    <div className="auth-page">
      {notification && (
        <div className={`notification ${notification.type}`}>
          <span className="notification-icon">{notification.type === 'error' ? '✖' : '✔'}</span>
          <span>{notification.message}</span>
          <button className="close-btn" onClick={() => setNotification(null)}>×</button>
        </div>
      )}

      <div className="brand-panel">
        <div className="brand">
          <span className="brand-icon">🚀</span>
          <strong>uptoskills</strong>
        </div>

        <div className="brand-content">
          <h1>Step up your career with <em>in-demand skills</em></h1>
          <p>Everything you need to manage your internship journey in one secure place.</p>

          <div className="feature-card">
            <span>NEW PATHWAY</span>
            <h2>AI-Powered Skill Assessments</h2>
            <p>Get customized learning recommendations based on your current skill levels and career goals.</p>
          </div>
        </div>

        <small>Copyright © 2026 UptoSkills</small>
      </div>

      <div className="form-side">
        <div className="auth-card">
          <h2>Welcome Back</h2>
          <p className="sub">Sign in to access your assigned dashboard.</p>

          <form onSubmit={submit} noValidate>
            <label className="field">
              <b>Email Address</b>
              <div
                className={`input-wrap ${isEmailInvalid ? 'invalid' : isEmailValid ? 'valid' : ''
                  }`}
              >
                <span className="input-icon">✉️</span>
                <input
                  type="email"
                  name="email"
                  placeholder="e.g. intern@uptoskills.com"
                  value={values.email}
                  onChange={handleChange}
                  onBlur={handleBlur}
                />
              </div>
              {isEmailInvalid && (
                <span className="field-error">{errors.email}</span>
              )}
            </label>

            <label className="field">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '4px' }}>
                <b>Intern Code or Password</b>
              </div>
              <small style={{ display: 'block', color: 'var(--text-secondary, #6b7280)', fontSize: '0.75rem', marginBottom: '6px' }}>
                First time? Use your Intern Code. Otherwise, use your password.
              </small>
              <div
                className={`input-wrap ${isPasswordInvalid ? 'invalid' : isPasswordValid ? 'valid' : ''
                  }`}
              >
                <span className="input-icon">🔒</span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  placeholder="Password or Intern Code"
                  value={values.password}
                  onChange={handleChange}
                  onBlur={handleBlur}
                />
                <button
                  type="button"
                  className="eye"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? '👁️' : '🙈'}
                </button>
              </div>
              {isPasswordInvalid && (
                <span className="field-error">{errors.password}</span>
              )}
            </label>

            <button
              type="submit"
              className="primary"
              disabled={loading}
              style={{ marginTop: '16px' }}
            >
              {loading ? <span className="spinner"></span> : 'Sign In'}
            </button>
          </form>

          <Link className="auth-link" to="/forgot-password">Forgot Password?</Link>
        </div>
      </div>
    </div>
  );
}