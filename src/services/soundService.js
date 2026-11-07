let context;

export function playSound(type, enabled) {
  if (!enabled) return;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  context ||= new AudioContext();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const now = context.currentTime;
  const tones = type === 'dice' ? [520, 390, 610] : [480];
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(tones[0], now);
  if (tones.length > 1) oscillator.frequency.setValueAtTime(tones[1], now + 0.06);
  if (tones.length > 2) oscillator.frequency.setValueAtTime(tones[2], now + 0.12);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.08, now + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(now);
  oscillator.stop(now + 0.21);
}
