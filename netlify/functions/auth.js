/*
  Netlify Function — GitHub OAuth proxy for Sveltia CMS.

  Sveltia (formerly Decap/Netlify CMS) opens a popup window pointing at
  ${base_url}/${auth_endpoint}?provider=github&scope=repo,user ; this function:
   1. Redirects the user to GitHub for authorization
   2. Handles the callback, swaps the code for an access token
   3. Posts the token back to the opener window via postMessage so the CMS
      can pick it up and start committing on the user's behalf

  Required Netlify env vars (set in Site settings → Environment variables):
    OAUTH_CLIENT_ID      — GitHub OAuth app Client ID
    OAUTH_CLIENT_SECRET  — GitHub OAuth app Client secret

  GitHub OAuth app ("flavorhouse", owned by theflavorhouse130):
    Homepage URL:               https://flavorhouse130.com
    Authorization callback URL: https://flavorhouse130.com/.netlify/functions/auth/callback

  This MUST match admin/config.yml's base_url — the callback this function sends to
  GitHub is built from whatever domain it's accessed through, so config.yml and the
  OAuth App's registered callback have to name the same domain or GitHub rejects the
  login with a redirect_uri mismatch.

  Scope of the token is governed by Sveltia's request — typically "repo,user".
  Token is NEVER stored server-side; it lives only in the browser session.
*/

const CLIENT_ID = process.env.OAUTH_CLIENT_ID;
const CLIENT_SECRET = process.env.OAUTH_CLIENT_SECRET;

const STATUS = {
  success: 'success',
  error: 'error',
};

function renderClosePage(status, content) {
  // postMessage protocol Decap/Sveltia expects:
  //   "authorization:github:success:{json}"
  //   "authorization:github:error:{json}"
  const message = `authorization:github:${status}:${JSON.stringify(content)}`;
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Authorizing…</title>
  </head>
  <body>
    <p>Authorizing with GitHub… this window will close automatically.</p>
    <script>
      (function () {
        var allowedOrigin = window.location.origin;
        function send() {
          if (window.opener) {
            window.opener.postMessage(${JSON.stringify(message)}, allowedOrigin);
          }
        }
        // The CMS posts "authorizing:github" back at us, then expects the auth message.
        window.addEventListener('message', function (event) {
          if (event.data === 'authorizing:github') {
            send();
          }
        }, false);
        send();
        setTimeout(function () { window.close(); }, 1200);
      })();
    </script>
  </body>
</html>`;
}

export const handler = async (event) => {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    return {
      statusCode: 500,
      body: 'OAuth not configured: OAUTH_CLIENT_ID / OAUTH_CLIENT_SECRET env vars missing in Netlify.',
    };
  }

  const url = new URL(event.rawUrl);
  // Strip the function prefix so we can route on the trailing path.
  const subpath = url.pathname
    .replace(/^\/\.netlify\/functions\/auth/, '')
    .replace(/^\/api\/auth/, '');

  // Step 1: kick off the OAuth dance.
  if (subpath === '' || subpath === '/') {
    const scope = url.searchParams.get('scope') || 'repo,user';
    const callback = `${url.origin}/.netlify/functions/auth/callback`;
    const ghUrl = new URL('https://github.com/login/oauth/authorize');
    ghUrl.searchParams.set('client_id', CLIENT_ID);
    ghUrl.searchParams.set('redirect_uri', callback);
    ghUrl.searchParams.set('scope', scope);
    return {
      statusCode: 302,
      headers: { Location: ghUrl.toString() },
    };
  }

  // Step 2: GitHub redirected the user back with ?code=… — swap for a token.
  if (subpath === '/callback') {
    const code = url.searchParams.get('code');
    if (!code) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
        body: renderClosePage(STATUS.error, { error: 'missing_code' }),
      };
    }

    let tokenJson = null;
    try {
      const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          code,
        }),
      });
      tokenJson = await tokenRes.json();
    } catch (err) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
        body: renderClosePage(STATUS.error, { error: 'token_fetch_failed', detail: String(err) }),
      };
    }

    if (!tokenJson || !tokenJson.access_token) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
        body: renderClosePage(STATUS.error, {
          error: tokenJson?.error || 'no_access_token',
          detail: tokenJson?.error_description || null,
        }),
      };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
      body: renderClosePage(STATUS.success, {
        token: tokenJson.access_token,
        provider: 'github',
      }),
    };
  }

  return { statusCode: 404, body: 'Not found' };
};
