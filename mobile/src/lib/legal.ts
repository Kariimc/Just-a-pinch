import { Linking } from 'react-native';

// Public Privacy Policy & Terms, hosted via GitHub Pages from this repo's
// /docs folder (enable Settings → Pages → Source: /docs). If you ever move them
// to a custom domain, change only these two URLs — every link in the app reads
// from here.
export const PRIVACY_URL = 'https://kariimc.github.io/just-a-pinch/privacy.html';
export const TERMS_URL = 'https://kariimc.github.io/just-a-pinch/terms.html';

export function openPrivacy() {
  Linking.openURL(PRIVACY_URL).catch(() => {});
}

export function openTerms() {
  Linking.openURL(TERMS_URL).catch(() => {});
}
