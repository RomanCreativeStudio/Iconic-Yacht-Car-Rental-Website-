/**
 * Iconic Rentals — Settings
 *
 * Single-row CRUD against `site_settings` (see the singleton-row trick in
 * supabase/migrations/20260727000000_phase_6_4_cms_extensions.sql),
 * inlined directly like admin/homepage.js — one table, no shared logic
 * between multiple files that would justify a separate service module.
 *
 * The logo upload reuses admin/media-service.js's uploadToStorage()/
 * publicUrl() as-is (both are already bucket-agnostic) rather than
 * building a second upload pipeline — only the file-type/size validation
 * is local to this file, since a logo's rules (PNG/JPG/WEBP/SVG, 5 MB)
 * differ from fleet/experience media's (no SVG, 20/500 MB).
 */
(function () {
  'use strict';

  var auth = window.IconicAdminAuth;
  var supabase = auth && auth.requireClient();
  if (!supabase) return;
  var svc = window.IconicMediaService;

  var settingsView = document.getElementById('settingsView');
  var signOutBtn = document.getElementById('signOutBtn');
  var banner = document.getElementById('settingsBanner');
  var successBanner = document.getElementById('settingsSuccessBanner');
  var form = document.getElementById('settingsForm');
  var saveBtn = document.getElementById('settingsSaveBtn');

  var fields = {
    business_name: document.getElementById('settingBusinessName'),
    phone: document.getElementById('settingPhone'),
    email: document.getElementById('settingEmail'),
    booking_email: document.getElementById('settingBookingEmail'),
    address: document.getElementById('settingAddress'),
    google_maps_url: document.getElementById('settingGoogleMaps'),
    seo_title: document.getElementById('settingSeoTitle'),
    seo_description: document.getElementById('settingSeoDescription')
  };
  var socialFields = {
    instagram: document.getElementById('settingInstagram'),
    facebook: document.getElementById('settingFacebook'),
    tiktok: document.getElementById('settingTiktok'),
    youtube: document.getElementById('settingYoutube'),
    whatsapp: document.getElementById('settingWhatsapp')
  };

  var logoPreviewWrap = document.getElementById('logoPreviewWrap');
  var logoPreview = document.getElementById('logoPreview');
  var logoFileInput = document.getElementById('logoFileInput');

  var LOGO_MIME_EXT = { 'image/png': ['png'], 'image/jpeg': ['jpg', 'jpeg'], 'image/webp': ['webp'], 'image/svg+xml': ['svg'] };
  var MAX_LOGO_BYTES = 5 * 1024 * 1024;

  var currentSettings = null;
  var canWrite = true;

  function showBanner(el, message) { el.textContent = message; el.hidden = false; }
  function hideBanner(el) { el.hidden = true; el.textContent = ''; }

  auth.getSessionAndRole(supabase).then(function (result) {
    if (!result.session || !auth.hasDashboardAccess(result.role)) {
      window.location.replace('login.html');
      return;
    }
    canWrite = result.role === 'admin';
    saveBtn.hidden = !canWrite;
    logoFileInput.disabled = !canWrite;
    settingsView.hidden = false;
    signOutBtn.hidden = false;
    loadSettings();
  });

  signOutBtn.addEventListener('click', function () {
    if (window.IconicActivityLog) window.IconicActivityLog.log('logout', 'session', null, null);
    supabase.auth.signOut().then(function () { window.location.replace('login.html'); });
  });

  function loadSettings() {
    supabase.from('site_settings').select('*').eq('id', true).maybeSingle().then(function (result) {
      if (result.error) {
        showBanner(banner, 'Couldn’t load settings: ' + result.error.message);
        return;
      }
      currentSettings = result.data || {};
      populate(currentSettings);
      if (!canWrite) {
        Object.keys(fields).forEach(function (k) { fields[k].disabled = true; });
        Object.keys(socialFields).forEach(function (k) { socialFields[k].disabled = true; });
      }
    });
  }

  function populate(settings) {
    Object.keys(fields).forEach(function (key) {
      fields[key].value = settings[key] || '';
    });
    var social = settings.social_links || {};
    Object.keys(socialFields).forEach(function (key) {
      socialFields[key].value = social[key] || '';
    });
    if (settings.logo_path) {
      logoPreview.src = svc.publicUrl('logos', settings.logo_path);
      logoPreviewWrap.hidden = false;
    } else {
      logoPreviewWrap.hidden = true;
    }
  }

  function extOf(filename) {
    var m = /\.([a-z0-9]+)$/i.exec(filename || '');
    return m ? m[1].toLowerCase() : '';
  }

  function validateLogo(file) {
    var ext = extOf(file.name);
    var type = (file.type || '').toLowerCase();
    var matches = LOGO_MIME_EXT[type] && LOGO_MIME_EXT[type].indexOf(ext) !== -1;
    if (!matches) {
      return { ok: false, error: 'Logos must be PNG, JPG, WEBP, or SVG.' };
    }
    if (file.size > MAX_LOGO_BYTES) {
      return { ok: false, error: 'Logo is too large — the limit is 5 MB.' };
    }
    return { ok: true };
  }

  logoFileInput.addEventListener('change', function () {
    var file = logoFileInput.files[0];
    if (!file) return;
    var validation = validateLogo(file);
    if (!validation.ok) {
      window.IconicAdminUI.showToast(validation.error, 'error');
      logoFileInput.value = '';
      return;
    }

    var path = 'logo.' + extOf(file.name);
    var upload = svc.uploadToStorage('logos', path, file, function () {}, true);
    upload.promise.then(function () {
      return supabase.from('site_settings').update({ logo_path: path }).eq('id', true).select().maybeSingle();
    }).then(function (result) {
      if (result.error) {
        window.IconicAdminUI.showToast('Uploaded, but couldn’t save the logo path: ' + result.error.message, 'error');
        return;
      }
      currentSettings = result.data;
      populate(currentSettings);
      if (window.IconicActivityLog) window.IconicActivityLog.log('update', 'site_settings', 'logo', { path: path });
      window.IconicAdminUI.showToast('Logo updated.', 'success');
    }).catch(function (err) {
      window.IconicAdminUI.showToast(err.message || 'Logo upload failed.', 'error');
    }).then(function () {
      logoFileInput.value = '';
    });
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!canWrite) return;
    hideBanner(banner);
    hideBanner(successBanner);

    var payload = {};
    Object.keys(fields).forEach(function (key) { payload[key] = fields[key].value.trim() || null; });
    var social = {};
    Object.keys(socialFields).forEach(function (key) {
      var val = socialFields[key].value.trim();
      if (val) social[key] = val;
    });
    payload.social_links = social;

    saveBtn.disabled = true;
    saveBtn.textContent = saveBtn.dataset.loadingLabel;

    supabase.from('site_settings').update(payload).eq('id', true).select().maybeSingle().then(function (result) {
      saveBtn.disabled = false;
      saveBtn.textContent = saveBtn.dataset.label;
      if (result.error) {
        showBanner(banner, 'Couldn’t save: ' + result.error.message);
        return;
      }
      currentSettings = result.data;
      if (window.IconicActivityLog) window.IconicActivityLog.log('update', 'site_settings', 'settings', null);
      showBanner(successBanner, 'Settings saved.');
      window.IconicAdminUI.showToast('Settings saved.', 'success');
    });
  });
})();
