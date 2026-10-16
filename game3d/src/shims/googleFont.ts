// Stand-in for `@remotion/google-fonts/<Family>`: adds a Google Fonts stylesheet link and resolves once the
// face is usable (or after a timeout, so an offline game still renders with a fallback font).
const linked = new Set<string>();

const ensureLink = (family: string, weights: string[]) => {
  if (linked.has(family)) return;
  linked.add(family);
  // the game already loads Press Start 2P itself
  if (family === 'Press Start 2P') return;
  try {
    const l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = `https://fonts.googleapis.com/css2?family=${family.replace(/ /g, '+')}:wght@${weights.join(';')}&display=swap`;
    document.head.appendChild(l);
  } catch {
    /* no DOM: nothing to load */
  }
};

export const makeLoader = (family: string, defaultWeights: string[]) =>
  (_style?: string, opts?: { weights?: string[] }) => {
    const weights = opts?.weights?.length ? opts.weights : defaultWeights;
    ensureLink(family, weights);
    return {
      fontFamily: family,
      waitUntilDone: () =>
        Promise.race([
          document.fonts.load(`${weights[0]} 16px "${family}"`).then(() => undefined),
          new Promise<void>((r) => setTimeout(r, 4000)),
        ]),
    };
  };
