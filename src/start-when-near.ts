const NEAR_SCREENS = 1;

// A section's own fitting work is only worth doing once the visitor is about to reach it, so it starts when the section is within
// one screen below the viewport or already behind it, which also covers jumps by a link, a hash or the End key.
export function startWhenNear(section: Element | null, start: () => void): void {
  if (section === null) {
    return;
  }
  const isNear = (): boolean => section.getBoundingClientRect().top <= window.innerHeight * (1 + NEAR_SCREENS);
  let frame = 0;
  const begin = (): void => {
    window.cancelAnimationFrame(frame);
    window.removeEventListener('scroll', handleScroll);
    window.removeEventListener('hashchange', begin);
    document.removeEventListener('click', handleClick, true);
    section.removeEventListener('focusin', begin);
    start();
  };
  const handleScroll = (): void => {
    window.cancelAnimationFrame(frame);
    frame = window.requestAnimationFrame(() => {
      if (isNear()) {
        begin();
      }
    });
  };
  const handleClick = (event: Event): void => {
    if (event.target instanceof Element && event.target.closest('a[href^="#"]') !== null) {
      begin();
    }
  };

  if (window.location.hash !== '' || isNear()) {
    start();
    return;
  }
  window.addEventListener('scroll', handleScroll, { passive: true });
  window.addEventListener('hashchange', begin);
  document.addEventListener('click', handleClick, true);
  section.addEventListener('focusin', begin);
}
