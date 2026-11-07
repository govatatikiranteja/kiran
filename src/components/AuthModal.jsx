import { useState } from 'react';
import { ArrowLeft, Chrome, Eye, EyeOff, ShieldCheck, X } from 'lucide-react';
import { loginWithEmail, loginWithGoogle, registerWithEmail } from '../services/authService.js';
import { firebaseConfigured } from '../firebase/client.js';

export default function AuthModal({ onClose }) {
  const [mode, setMode] = useState('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(event) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (mode === 'signup') await registerWithEmail(email, password, username.trim());
      else await loginWithEmail(email, password);
      onClose();
    } catch (reason) {
      setError(reason.message || 'We could not complete sign in.');
    } finally {
      setBusy(false);
    }
  }

  async function googleLogin() {
    setError('');
    setBusy(true);
    try {
      await loginWithGoogle();
      onClose();
    } catch (reason) {
      setError(reason.message || 'Google sign in failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-title">
        <button className="icon-button modal-close" type="button" onClick={onClose} aria-label="Close sign in"><X size={19} /></button>
        <div className="auth-mark">LA</div>
        <p className="eyebrow">WELCOME TO THE TABLE</p>
        <h2 id="auth-title">{mode === 'signup' ? 'Create your account' : 'Good to have you back'}</h2>
        <p className="muted">Sign in to play with friends and save your match history.</p>
        <button type="button" className="google-button" disabled={busy || !firebaseConfigured} onClick={googleLogin}>
          <Chrome size={18} /> Continue with Google
        </button>
        <div className="form-divider"><span>or continue with email</span></div>
        <form onSubmit={submit} className="auth-form">
          {mode === 'signup' && (
            <label>
              Username
              <input value={username} onChange={(event) => setUsername(event.target.value)} minLength="2" maxLength="24" required placeholder="Your name at the table" autoComplete="nickname" />
            </label>
          )}
          <label>
            Email address
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required placeholder="you@example.com" autoComplete="email" />
          </label>
          <label>
            Password
            <span className="password-field">
              <input type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} minLength="6" required placeholder="At least 6 characters" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} />
              <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button>
            </span>
          </label>
          {error && <p className="form-error" role="alert">{error}</p>}
          {!firebaseConfigured && <p className="form-note">Authentication needs Firebase setup. Add the values in <code>.env</code> to enable it.</p>}
          <button className="button button-primary auth-submit" type="submit" disabled={busy || !firebaseConfigured}>{busy ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Sign in'}</button>
        </form>
        <p className="auth-switch">
          {mode === 'signup' ? 'Already have an account?' : 'New to Ludo Arena?'}
          <button type="button" onClick={() => { setMode(mode === 'signup' ? 'login' : 'signup'); setError(''); }}>
            {mode === 'signup' ? 'Sign in' : 'Create an account'}
          </button>
        </p>
        <p className="secure-note"><ShieldCheck size={14} /> Your account stays yours. Always.</p>
        <button className="auth-back" type="button" onClick={onClose}><ArrowLeft size={15} /> Back to the arena</button>
      </section>
    </div>
  );
}
