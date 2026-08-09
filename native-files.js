(function () {
  function fsPlugin(){return window.Capacitor&&window.Capacitor.Plugins?window.Capacitor.Plugins.Filesystem||null:null;}
  function sharePlugin(){return window.Capacitor&&window.Capacitor.Plugins?window.Capacitor.Plugins.Share||null:null;}
  function isNative(){return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());}

  var FOLDER = "AgendaKerja";
  var PACKAGE_ID = "id.agendakerja.app";
  var EASY_LOCATION = "Internal storage/" + FOLDER;
  var FALLBACK_LOCATION = "Internal storage/Android/data/" + PACKAGE_ID + "/files/" + FOLDER;

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

  // Buka halaman setelan khusus Android "Izinkan akses ke semua file" buat app ini.
  // Ini SATU-SATUNYA cara ngasih izin ini (gak ada pop-up otomatis, kebijakan keamanan Android).
  function openAllFilesAccessSettings(){
    try{
      var intentUrl = "intent://" + PACKAGE_ID + "#Intent;scheme=package;action=android.settings.MANAGE_APP_ALL_FILES_ACCESS_PERMISSION;end";
      window.location.href = intentUrl;
      return true;
    }catch(e){ return false; }
  }

  async function tryWrite(fs, filename, base64, directory){
    var relPath = FOLDER + "/" + filename;
    return fs.writeFile({ path: relPath, data: base64, directory: directory, recursive: true });
  }

  // Simpan blob ke folder "AgendaKerja". Coba dulu di folder utama Penyimpanan Internal
  // (butuh izin "Akses semua file" yang diaktifkan manual lewat openAllFilesAccessSettings());
  // kalau belum diizinkan, otomatis fallback ke folder khusus app (selalu berhasil, tanpa izin tambahan).
  async function saveOrShareBlob(filename, blob, opts){
    opts = opts || {};
    if(!isNative() || !fsPlugin()){
      browserDownload(filename, blob);
      return { ok:true, mode:"browser" };
    }
    var fs = fsPlugin();
    var base64 = await blobToBase64(blob);
    var written = null, location = FALLBACK_LOCATION, easy = false;

    try{
      written = await tryWrite(fs, filename, base64, "EXTERNAL_STORAGE");
      location = EASY_LOCATION; easy = true;
    }catch(e){
      try{
        written = await tryWrite(fs, filename, base64, "EXTERNAL");
        location = FALLBACK_LOCATION; easy = false;
      }catch(e2){
        try{ browserDownload(filename, blob); }catch(e3){}
        return { ok:false, error:(e2 && e2.message) || String(e2) };
      }
    }

    if(opts.offerShare !== false){
      var sh = sharePlugin();
      if(sh && written && written.uri){
        try{ await sh.share({ title: filename, url: written.uri, dialogTitle: "Bagikan file (opsional)" }); }
        catch(e){ /* dibatalkan user, gapapa - file sudah tersimpan */ }
      }
    }
    return { ok:true, mode:"saved", easy: easy, location: location };
  }

  window.AgendaFiles = {
    saveOrShareBlob: saveOrShareBlob,
    openAllFilesAccessSettings: openAllFilesAccessSettings,
    EASY_LOCATION: EASY_LOCATION,
    FALLBACK_LOCATION: FALLBACK_LOCATION
  };
})();
