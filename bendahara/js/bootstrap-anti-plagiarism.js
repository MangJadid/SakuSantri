/* ===== Proteksi Anti-Plagiasi ===== */
(function(){
  var allow = ['INPUT','TEXTAREA'];
  document.addEventListener('contextmenu', function(e){ e.preventDefault(); });
  document.addEventListener('selectstart', function(e){
    if (allow.indexOf(e.target.tagName) === -1) e.preventDefault();
  });
  document.addEventListener('copy', function(e){
    if (allow.indexOf(e.target.tagName) === -1) e.preventDefault();
  });
  document.addEventListener('cut', function(e){
    if (allow.indexOf(e.target.tagName) === -1) e.preventDefault();
  });
  document.addEventListener('dragstart', function(e){
    if (e.target.tagName === 'IMG') e.preventDefault();
  });
  document.addEventListener('keydown', function(e){
    var k = e.key;
    var blocked =
      (e.ctrlKey && (k === 'u' || k === 'U')) ||
      (e.ctrlKey && (k === 's' || k === 'S')) ||
      (e.ctrlKey && e.shiftKey && ['I','i','J','j','C','c'].indexOf(k) !== -1) ||
      k === 'F12';
    if (blocked){ e.preventDefault(); e.stopPropagation(); }
  });
})();
