import { useEffect, useState } from 'react';

/**
 * The moving background on the two login screens.
 *
 * There are two cuts of the same scene, because one cannot serve both shapes. A phone
 * held upright is about 0.46 wide-to-tall; the landscape cut is 1.35. Letting the
 * browser `cover` one with the other throws away roughly two thirds of the frame, and
 * what survives is a slab of the middle — the composition is gone. So the portrait cut
 * is a 9:16 render of the same scene, framed for it, and this component picks whichever
 * one matches the viewport.
 *
 * The pick is made in JavaScript on purpose. The obvious markup — several <source>
 * elements with `media` attributes — looks right and does not work: browsers evaluate
 * those once, when the element is first parsed, and never re-evaluate them on resize or
 * rotation, and Chrome dropped support for `media` on <source> inside <video> entirely.
 * matchMedia is the thing that actually tracks the viewport, so the swap survives a
 * phone being turned sideways.
 *
 * `key` is what makes the swap take effect: changing only `src` on a <video> that has
 * already loaded leaves the old footage playing until something calls load(). Remounting
 * the element is simpler than orchestrating that by hand, and it costs nothing — only the
 * chosen file is ever fetched, so a phone never downloads the desktop cut.
 */

/** Anything this shape or taller gets the portrait cut: phones, and tablets held upright. */
const PORTRAIT_QUERY = '(max-aspect-ratio: 3/4)';

function isPortrait(): boolean {
  // Guard for a non-browser render; the landscape cut is the safe default because it is
  // the one that degrades to a sensible crop on every shape.
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia(PORTRAIT_QUERY).matches;
}

export default function AuthBackdropVideo({ className }: { className: string }) {
  const [portrait, setPortrait] = useState(isPortrait);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia(PORTRAIT_QUERY);
    const onChange = (e: MediaQueryListEvent) => setPortrait(e.matches);
    setPortrait(mq.matches);          // the viewport may have changed before this ran
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const base = portrait ? '/mobler-login-bg-portrait' : '/mobler-login-bg';

  return (
    /*
      Every attribute here is load-bearing:
        muted + playsInline — the conditions for autoplay at all. An unmuted video is
          refused everywhere, and without playsInline iOS takes the video fullscreen.
        loop — seamless, because each clip plays forward then backward, so its last
          frame is its first. A straight loop of either cut visibly jumps.
        preload="metadata" — keeps ~700 KB off the critical path of a login screen.
        poster — the clip's own first frame, so the handover is invisible, and it is
          what stays on screen when autoplay is refused, data saver is on, or the
          viewer asked for reduced motion (the CSS hides the video then).
      Decoration only: aria-hidden, no controls, and nothing here can block signing in.
      Neither file has an audio track.
    */
    <video
      key={base}
      className={className}
      aria-hidden="true"
      autoPlay
      muted
      loop
      playsInline
      preload="metadata"
      poster={`${base}.webp`}
    >
      <source src={`${base}.mp4`} type="video/mp4" />
    </video>
  );
}
