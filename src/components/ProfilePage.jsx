import { useEffect, useState } from 'react';
import { ArrowLeft, CalendarDays, CircleUserRound, Crown, LoaderCircle, Trophy } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/client.js';
import { getMatchHistory } from '../services/playerService.js';

export default function ProfilePage({ user, onBack }) {
  const [profile, setProfile] = useState(null);
  const [matches, setMatches] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([getDoc(doc(db, 'profiles', user.uid)), getMatchHistory(user.uid)])
      .then(([snapshot, history]) => {
        if (!active) return;
        setProfile(snapshot.exists() ? snapshot.data() : null);
        setMatches(history);
      })
      .catch((reason) => { if (active) setError(reason.message || 'Could not load your profile.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user.uid]);

  return (
    <main className="profile-page">
      <button className="back-link" type="button" onClick={onBack}><ArrowLeft size={16} /> Back to arena</button>
      <section className="profile-hero">
        <div className="profile-avatar">{user.photoURL ? <img src={user.photoURL} alt="" /> : <CircleUserRound size={38} />}</div>
        <div><span className="eyebrow">PLAYER PROFILE</span><h1>{profile?.username || user.displayName || 'Arena player'}</h1><p>{user.email}</p></div>
      </section>
      {loading ? <p className="profile-loading"><LoaderCircle className="spin" /> Loading your stats…</p> : error ? <p className="form-error" role="alert">{error}</p> : (
        <>
          <section className="profile-stats">
            <div><Trophy size={18} /><strong>{profile?.wins || 0}</strong><span>Wins</span></div>
            <div><CalendarDays size={18} /><strong>{profile?.matches || 0}</strong><span>Matches</span></div>
            <div><Crown size={18} /><strong>{profile?.losses || 0}</strong><span>Losses</span></div>
          </section>
          <section className="history-card">
            <div className="history-heading"><div><span className="eyebrow">YOUR RECENT TABLES</span><h2>Match history</h2></div></div>
            {matches.length ? <div className="match-list">{matches.map((match) => (
              <article className="match-row" key={match.id}>
                <span className={`match-result ${match.result}`}>{match.result === 'win' ? 'W' : 'L'}</span>
                <div><strong>{match.result === 'win' ? 'Victory' : 'Match played'}</strong><small>Room {match.code} · {match.players?.length || 0} players</small></div>
                <time>{match.completedAt?.toDate ? match.completedAt.toDate().toLocaleDateString() : 'Recently'}</time>
              </article>
            ))}</div> : <p className="history-empty">Your multiplayer matches will appear here after your first game.</p>}
          </section>
        </>
      )}
    </main>
  );
}
