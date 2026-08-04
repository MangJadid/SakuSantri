(function(){
  var box = document.getElementById('debug-error-box');
  var timer;
  let _isPrinting = false;
  function showErr(msg){
    if(_isPrinting) return;
    if(!msg || msg.trim()==='') return;
    // Abaikan error Service Worker, popup blocker, dan print
    const skip = ['ServiceWorker','sw.js','fetching the script','popup','Popup','blocked','window.open','print','Print'];
    if(skip.some(s=>msg.indexOf(s)!==-1)) return;
    box.style.display = 'flex';
    clearTimeout(timer);
    timer = setTimeout(function(){ box.style.display='none'; }, 6000);
  }
  window._setPrinting = function(v){ _isPrinting = v; };
  window.addEventListener('error', function(e){
    showErr(e.message);
  });
  window.addEventListener('unhandledrejection', function(e){
    showErr(e.reason && e.reason.message ? e.reason.message : JSON.stringify(e.reason));
  });
})();
