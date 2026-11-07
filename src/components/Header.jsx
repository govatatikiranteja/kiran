import { useState } from 'react';
import { ChevronDown, CircleUserRound, Crown, LogOut, Menu, X } from 'lucide-react';

export default function Header({ user, onLogin, onLogout, onProfile, onNavigate }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const username = user?.displayName || user?.email?.split('@')[0] || 'Player';

  function navigate(target) {
    setMenuOpen(false);
    onNavigate(target);
  }

  return (
    <header className="site-header">
      <div className="header-inner">
        <button className="brand" type="button" onClick={() => navigate('home')} aria-label="Ludo Arena home">
          <span className="brand-mark"><span /><span /><span /><span /></span>
          <span className="brand-copy"><strong>LUDO <em>ARENA</em></strong><small>ROLL. RACE. WIN.</small></span>
        </button>
        <button className="mobile-menu-toggle" type="button" onClick={() => setMenuOpen((open) => !open)} aria-label={menuOpen ? 'Close menu' : 'Open menu'}>
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
        <nav className={`main-nav${menuOpen ? ' nav-open' : ''}`}>
          <button type="button" onClick={() => navigate('home')}>Home</button>
          <button type="button" onClick={() => navigate('how')}>How to play</button>
          <button type="button" onClick={() => navigate('leaderboard')}><Crown size={15} /> Leaderboard</button>
          <span className="nav-divider" />
          {user ? (
            <div className="user-menu">
              <button className="user-menu-trigger" type="button" onClick={onProfile}>
                {user.photoURL ? <img src={user.photoURL} alt="" /> : <CircleUserRound size={18} />}
                <span>{username}</span><ChevronDown size={14} />
              </button>
              <button className="logout-link" type="button" onClick={onLogout}><LogOut size={15} /> Sign out</button>
            </div>
          ) : (
            <button type="button" className="nav-login" onClick={onLogin}>Log in</button>
          )}
        </nav>
      </div>
    </header>
  );
}
