// Sends a finished monthly exam to Supabase and asks the marking function to mark it.
// Used by the Primary Step 2, ITP and iBT pages after "Submit All".
(function () {
  const cfg = window.MONTHLY_CLOUD_CONFIG || {};
  if (!cfg.supabaseUrl || !cfg.supabaseAnonKey) return;
  const SDK = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js";
  let client;

  function loadSdk() {
    if (window.supabase) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = SDK; s.onload = resolve; s.onerror = () => reject(new Error("Could not load Supabase"));
      document.head.appendChild(s);
    });
  }

  function banner(text, ok) {
    let el = document.getElementById("cloudStatus");
    if (!el) {
      el = document.createElement("div");
      el.id = "cloudStatus";
      el.setAttribute("role", "status");
      el.style.cssText = "position:fixed;left:50%;bottom:16px;transform:translateX(-50%);z-index:9999;max-width:90vw;padding:12px 18px;border-radius:8px;font:600 15px/1.4 sans-serif;box-shadow:0 6px 20px #0003";
      document.body.appendChild(el);
    }
    el.textContent = text;
    el.style.background = ok ? "#e8f6ec" : "#fff4e5";
    el.style.color = ok ? "#14532d" : "#7c2d12";
  }

  function readClips(dbName) {
    return new Promise((resolve) => {
      const r = indexedDB.open(dbName, 1);
      r.onupgradeneeded = () => r.result.createObjectStore("clips", { keyPath: "id" });
      r.onerror = () => resolve([]);
      r.onsuccess = () => {
        const d = r.result, q = d.transaction("clips").objectStore("clips").getAll();
        q.onsuccess = () => { d.close(); resolve(q.result); };
        q.onerror = () => { d.close(); resolve([]); };
      };
    });
  }

  const ext = (type) => ({ "audio/mp4": "m4a", "audio/ogg": "ogg", "audio/wav": "wav", "audio/mpeg": "mp3" })[String(type).split(";")[0]] || "webm";

  // examId: 'primary-step2' | 'itp' | 'ibt'. storeKey: localStorage key that progress is stored beside.
  // clipDb: IndexedDB name holding recordings; clipName maps a stored id to a file name.
  async function submit({ examId, examVersion, storeKey, state, studentName, className, clipDb, clipName }) {
    const progressKey = storeKey + "-cloud";
    let progress = {};
    try { progress = JSON.parse(localStorage.getItem(progressKey) || "{}"); } catch (e) {}
    if (progress.sent) return;
    banner("Sending your exam to your teacher…", true);
    try {
      await loadSdk();
      client = client || window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
      let { data: { session } } = await client.auth.getSession();
      if (!session) {
        const { data, error } = await client.auth.signInAnonymously();
        if (error) throw error;
        session = data.session;
      }
      const uid = session.user.id;
      if (!progress.attemptId) {
        const { data, error } = await client.from("monthly_exam_attempts")
          .insert({ exam_id: examId, exam_version: examVersion || storeKey, student_name: studentName || "", class_name: className || "", response_state: state })
          .select("id").single();
        if (error) throw error;
        progress.attemptId = data.id;
        localStorage.setItem(progressKey, JSON.stringify(progress));
      }
      for (const clip of await readClips(clipDb)) {
        const path = uid + "/" + progress.attemptId + "/" + clipName(clip.id) + "." + ext(clip.blob.type);
        const { error } = await client.storage.from("monthly-speaking").upload(path, clip.blob, { upsert: true, contentType: clip.blob.type || "audio/webm" });
        if (error) throw error;
      }
      const { error } = await client.from("monthly_exam_attempts")
        .update({ response_state: state, status: "submitted" }).eq("id", progress.attemptId);
      if (error) throw error;
      progress.sent = true;
      localStorage.setItem(progressKey, JSON.stringify(progress));
      banner("Your exam was sent to your teacher.", true);
      // Marking runs on the server; the student does not wait for it.
      client.functions.invoke("mark-monthly-attempt", { body: { attempt_id: progress.attemptId } }).catch(() => {});
    } catch (err) {
      console.error(err);
      banner("Your exam could not be sent. Keep this page open, check the internet, and reload to try again. You can also download your work for your teacher.", false);
    }
  }

  window.MonthlyCloud = { submit };
})();
