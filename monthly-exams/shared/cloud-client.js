(function () {
  'use strict';
  const config = window.MONTHLY_CLOUD_CONFIG;
  const sessionKey = 'monthly-cloud-student-v1';
  let sessionPromise;
  function stored() { try { return JSON.parse(localStorage.getItem(sessionKey) || 'null'); } catch { return null; } }
  async function session() {
    if (sessionPromise) return sessionPromise;
    sessionPromise = (async () => {
      if (!config?.url || !config?.publicKey) throw Error('The secure marking connection has not been activated yet. Your browser responses remain saved.');
      try { localStorage.setItem('monthly-cloud-storage-check','1');localStorage.removeItem('monthly-cloud-storage-check'); }
      catch { throw Error('This browser cannot preserve a private cloud identity. Download your browser backup and ask your teacher for help.'); }
      let current = stored();
      if (current?.access_token && current.expires_at > Date.now() / 1000 + 90) return current;
      const refresh = !!current?.refresh_token;
      const r = await fetch(config.url + '/auth/v1/' + (refresh ? 'token?grant_type=refresh_token' : 'signup'), {
        method: 'POST', headers: { apikey: config.publicKey, 'Content-Type': 'application/json' },
        body: JSON.stringify(refresh ? { refresh_token: current.refresh_token } : { data: { purpose: 'adult-monthly-exam' } })
      });
      if (!r.ok) throw Error('Private student sign-in failed. Please retry; do not clear browser data or your recordings.');
      current = await r.json();
      if (!current.access_token || !current.user?.id) throw Error('Private sign-in returned no student identity.');
      current.expires_at ||= Date.now() / 1000 + current.expires_in;
      localStorage.setItem(sessionKey, JSON.stringify(current));
      return current;
    })();
    try { return await sessionPromise; } finally { sessionPromise = null; }
  }
  async function call(action, data = {}) {
    const s = await session();
    const r = await fetch(config.url + '/functions/v1/monthly-mark', {
      method: 'POST', headers: { apikey: config.publicKey, Authorization: 'Bearer ' + (config.gatewayKey || s.access_token), 'x-student-authorization': 'Bearer '+s.access_token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...data }), signal: AbortSignal.timeout(140000)
    });
    const result = await r.json().catch(() => ({}));
    if (!r.ok) throw Error(result.error || 'The marking service is unavailable. Your browser responses are still saved.');
    return result;
  }
  async function upload(attemptId, id, blob) {
    const s = await session();
    if (blob.size > 12 * 1024 * 1024) throw Error('A recording is too large for automatic marking. Download it for your teacher.');
    let r;
    try { r = await fetch(config.url + '/storage/v1/object/monthly-speaking/' + s.user.id + '/' + attemptId + '/' + id, {
      method: 'POST', headers: { apikey: config.publicKey, Authorization: 'Bearer ' + s.access_token, 'Content-Type': blob.type || 'audio/webm', 'x-upsert': 'true' }, body: blob,
      // A stalled upload must fail and retry, not block every later save and the final submission.
      signal: AbortSignal.timeout(120000)
    }); } catch { throw Error('A recording is still uploading or the connection dropped. Keep this page open; it will try again automatically.'); }
    if (!r.ok) throw Error('A recording could not upload. Nothing was submitted for marking; retry with your browser backup intact.');
  }
  window.MonthlyCloud = { session, call, upload };
})();
