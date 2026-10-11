import './styles.css';
import { injectFontCss } from './content/fonts';
import { startActivityRewards } from './core/rewards';
import { startApp } from './ui/app';
import { watchForUpdates } from './core/updates';

injectFontCss();
startApp();
startActivityRewards();

if (import.meta.env.PROD) watchForUpdates();

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
