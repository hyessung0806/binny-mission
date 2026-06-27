/* 비니의 미션달력 — 서비스워커 (오프라인 캐시)
   ⚠️ 앱/코드를 바꾸면 아래 CACHE 버전을 올리세요: binnymission-v1 → v2 → …
      (안 올리면 기기에 예전 버전이 남아 그대로 보임) */
const CACHE = "binnymission-v5";
const ASSETS = [
  "./", "./index.html", "./manifest.json",
  "./icon-192.png", "./icon-512.png", "./icon-maskable-512.png"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  let url;
  try { url = new URL(req.url); } catch (_) { return; }

  // Supabase REST/RPC 응답은 절대 캐시하지 않음 (항상 네트워크 → 오프라인이면 클라이언트가 캐시 화면으로 폴백)
  if (url.hostname.endsWith(".supabase.co")) return;

  // esm.sh 의 supabase-js 번들: network-first + 캐시 폴백 (오프라인에서도 앱 실행 보장)
  if (url.hostname === "esm.sh" || url.hostname.endsWith(".esm.sh")) {
    e.respondWith(
      fetch(req).then(res => { const cp = res.clone(); caches.open(CACHE).then(c => c.put(req, cp)); return res; })
        .catch(() => caches.match(req))
    );
    return;
  }

  // 앱 셸(같은 도메인): cache-first
  if (url.origin === self.location.origin) {
    e.respondWith(caches.match(req).then(c => c || fetch(req)));
  }
});
