/* Google Analytics 4 (GA4) Configuration
 * Replace 'G-XXXXXXXXXX' below with your GA4 Measurement ID from https://analytics.google.com/
 */
window.GA_MEASUREMENT_ID = 'G-XXXXXXXXXX';

window.dataLayer = window.dataLayer || [];
function gtag() {
  window.dataLayer.push(arguments);
}
window.gtag = gtag;

(function initGA4() {
  var id = (window.GA_MEASUREMENT_ID || '').trim();
  if (!id || id === 'G-XXXXXXXXXX') return;

  var s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(id);
  document.head.appendChild(s);

  gtag('js', new Date());
  gtag('config', id, {
    anonymize_ip: true,
    page_title: document.title,
    page_location: window.location.href,
  });
})();
