// ===== PUSH NOTIFICATION (Bendahara) — porting dari Saku Santri's push-device.js,
// cuma bagian push notification-nya (bukan lazy-load/device-monitor yang khusus
// santri). Satu project Supabase yang sama, jadi VAPID key & edge function URL
// sama persis. Bedanya: app_source:'bendahara' saat simpan subscription, dan
// tidak ada gating role -- bel notifikasi bendahara sudah ditampilkan ke semua
// user login tanpa batasan role. =====
const VAPID_PUBLIC_KEY_BD = 'BFY1KcdVaEFgXe_qujetvzOPuulb7Q7DNpQasCptcH7rWK4hqh3w-u4ab9xxgOAXOSAn4nh7tKPFbKZDP-nU42U';
const PUSH_FUNCTION_URL_BD = 'https://menfnmfwtxgcgvkbbjxh.supabase.co/functions/v1/send-push';

function urlBase64ToUint8ArrayBD(base64String){
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g,'+').replace(/_/g,'/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map(c=>c.charCodeAt(0)));
}

async function registerPushNotificationBD(){
  try{
    if(!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    const reg = await navigator.serviceWorker.ready;

    // Cek apakah sudah ada subscription
    const existingSub = await reg.pushManager.getSubscription();

    // Cek permission
    if(Notification.permission === 'denied'){
      tampilkanBannerNotifBD('blocked');
      return;
    }

    if(Notification.permission === 'default'){
      // Belum pernah izinkan — tampilkan banner
      tampilkanBannerNotifBD('ask');
      return;
    }

    // Sudah granted
    if(!existingSub){
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8ArrayBD(VAPID_PUBLIC_KEY_BD)
      });
      await simpanSubscriptionBD(sub);
    } else {
      // Pastikan tersimpan di DB
      await simpanSubscriptionBD(existingSub);
    }
    hapusBannerNotifBD();
  } catch(e){
    console.log('Push registration failed:', e.message);
  }
}

function tampilkanBannerNotifBD(tipe){
  if(document.getElementById('notif-banner-bd')) return;
  const banner = document.createElement('div');
  banner.id = 'notif-banner-bd';
  banner.style.cssText = 'position:fixed;bottom:16px;left:50%;transform:translateX(-50%);width:calc(100% - 32px);max-width:480px;background:#fff;border:2px solid var(--green-b);border-radius:14px;padding:14px 16px;z-index:9999;box-shadow:0 4px 20px rgba(0,0,0,.15);display:flex;gap:12px;align-items:center';

  if(tipe === 'ask'){
    banner.innerHTML = `
      <span style="color:var(--green);flex-shrink:0">${svgIcon('bell',22)}</span>
      <div style="flex:1">
        <div style="font-weight:700;font-size:13px;color:var(--green)">Aktifkan Notifikasi</div>
        <div style="font-size:12px;color:var(--text-m);margin-top:2px">Izinkan notifikasi agar kamu bisa menerima pengingat dari Admin</div>
      </div>
      <button onclick="mintaIzinNotifBD()" style="background:var(--green);color:#fff;border:none;border-radius:8px;padding:8px 14px;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap">Izinkan</button>
      <button onclick="hapusBannerNotifBD()" style="background:none;border:none;cursor:pointer;color:var(--text-l);font-size:18px;padding:0 4px">${svgIcon('x',16)}</button>
    `;
  } else {
    banner.innerHTML = `
      <span style="color:var(--red);flex-shrink:0">${svgIcon('bell-off',22)}</span>
      <div style="flex:1">
        <div style="font-weight:700;font-size:13px;color:var(--red)">Notifikasi Diblokir</div>
        <div style="font-size:12px;color:var(--text-m);margin-top:2px">Buka pengaturan browser → izinkan notifikasi untuk site ini</div>
      </div>
      <button onclick="hapusBannerNotifBD()" style="background:none;border:none;cursor:pointer;color:var(--text-l);font-size:18px;padding:0 4px">${svgIcon('x',16)}</button>
    `;
  }
  document.body.appendChild(banner);
}

function hapusBannerNotifBD(){
  document.getElementById('notif-banner-bd')?.remove();
}

async function mintaIzinNotifBD(){
  hapusBannerNotifBD();
  const permission = await Notification.requestPermission();
  if(permission === 'granted'){
    registerPushNotificationBD();
    toast('✅ Notifikasi berhasil diaktifkan!');
  } else {
    tampilkanBannerNotifBD('blocked');
  }
}

async function simpanSubscriptionBD(sub){
  const username = SESSION?.username || '';
  const pengurusId = SESSION?.id || null;
  await SB.from('push_subscriptions').upsert({
    pengurus_id: pengurusId,
    username: username,
    subscription: sub.toJSON(),
    app_source: 'bendahara',
    updated_at: new Date().toISOString()
  }, { onConflict: 'username' });
}
