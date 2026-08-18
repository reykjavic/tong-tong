/**
 * Viewer-request CloudFront Function — "tong-tong-soft-404"
 *
 * Serves the SPA shell (index.html) ONLY for the site's real routes, so
 * client-side deep links keep working, and lets every other request fall
 * through to the origin. Unknown paths then hit S3's 403/404, which the
 * distribution's custom error responses turn into /404.html with a real
 * HTTP 404 — instead of today's "200 OK + client-rendered 404" soft 404
 * that Google flags in Search Console.
 *
 * Associate with the DEFAULT behavior, event type: viewer-request.
 *
 * IMPORTANT: keep SPA_ROUTES in sync with the <Route> list in src/App.tsx.
 * Any route added there must be added here too, or its deep link will start
 * returning a hard 404 instead of loading the app.
 *
 * NOTE: CloudFront Functions run a restricted ES5 runtime — no const/let,
 * arrow functions, or template literals.
 */

var SPA_ROUTES = [
  '/',
  '/about',
  '/menu',
  '/order',
  '/contact',
  '/hours',
  '/posts',
  '/impressum',
  '/datenschutz',
  '/dashboard',
];

function handler(event) {
  var request = event.request;
  var uri = request.uri;

  // Trailing-slash variant of a known route ("/menu/") is the same page.
  if (uri.length > 1 && uri.charAt(uri.length - 1) === '/') {
    uri = uri.slice(0, -1);
  }

  if (SPA_ROUTES.indexOf(uri) !== -1) {
    request.uri = '/index.html';
    return request;
  }

  // Everything else (assets, /admin/, sitemap.xml, robots.txt, the menu PDF,
  // unknown paths) passes through untouched. Unknown paths → origin 404 →
  // custom error response → /404.html with HTTP 404.
  return request;
}
