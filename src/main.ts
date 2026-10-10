import './styles.css';
import { injectFontCss } from './content/fonts';
import { startActivityRewards } from './core/rewards';
import { startApp } from './ui/app';

injectFontCss();
startApp();
startActivityRewards();

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
