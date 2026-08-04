function _updateOfflineScreen(){
  const el = document.getElementById('offline-screen');
  if(!el) return;
  if(!navigator.onLine){
    el.classList.add('show');
  } else {
    el.classList.remove('show');
  }
}
window.addEventListener('offline', _updateOfflineScreen);
window.addEventListener('online', _updateOfflineScreen);
_updateOfflineScreen();
