(function () {
  function fsPlugin(){return window.Capacitor&&window.Capacitor.Plugins?window.Capacitor.Plugins.Filesystem||null:null;}
  function sharePlugin(){return window.Capacitor&&window.Capacitor.Plugins?window.Capacitor.Plugins.Share||null:null;}
  function isNative(){return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());}

  function blobToBase64(blob){
    return new Promise(function(resolve,reject){
      var reader = new FileReader();
      reader.onloadend = function(){
        var res = reader.result || "";
        var idx = res.indexOf(",");
        resolve(idx >= 0 ? res.substring(idx+1) : res);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  function browserDownload(filename, blob){
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function(){ URL.revokeObjectURL(url); }, 2000);
  }

  // Simpan blob sebagai file lalu buka menu Bagikan/Simpan bawaan Android.
  // Balik ke cara <a download> biasa kalau dibuka lewat browser (bukan app Android).
  async function saveOrShareBlob(filename, blob){
    if(!isNative() || !fsPlugin()){
      browserDownload(filename, blob);
      return true;
    }
    try{
      var fs = fsPlugin();
      var base64 = await blobToBase64(blob);
      var written = await fs.writeFile({ path: filename, data: base64, directory: "CACHE" });
      var sh = sharePlugin();
      if(sh && written && written.uri){
        await sh.share({ title: filename, url: written.uri, dialogTitle: "Simpan atau bagikan file" });
      }
      return true;
    }catch(e){
      try{ browserDownload(filename, blob); }catch(e2){}
      return false;
    }
  }

  window.AgendaFiles = { saveOrShareBlob: saveOrShareBlob };
})();
