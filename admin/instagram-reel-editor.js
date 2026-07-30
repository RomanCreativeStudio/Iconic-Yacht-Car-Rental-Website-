/**
 * Iconic Rentals — Instagram Reel Editor
 *
 * Owns the edit overlay (#igReelEditor). Same shape as
 * admin/instagram-post-editor.js, a separate file rather than one
 * conditional-fields editor since reels and posts genuinely have
 * different fields (no media_type) — keeps each form simple instead of
 * branching internally, matching how Fleet/Media/Experience each get
 * their own dedicated editor rather than one do-everything form.
 *
 * Thumbnail (Phase 6.11) is a real upload via admin/image-upload-field.js
 * — always an image (a static preview frame), unlike a post's media_url,
 * so there's no mode toggle needed here at all.
 */
(function (global) {
  'use strict';

  var overlay = document.getElementById('igReelEditor');
  var form = document.getElementById('igReelEditorForm');
  var eyebrow = document.getElementById('igReelEditorEyebrow');
  var titleEl = document.getElementById('igReelEditorTitle');
  var banner = document.getElementById('igReelEditorBanner');
  var saveBtn = document.getElementById('igReelEditorSaveBtn');
  var cancelBtn = document.getElementById('igReelEditorCancelBtn');

  var fieldCaption = document.getElementById('igReelFieldCaption');
  var fieldPermalink = document.getElementById('igReelFieldPermalink');
  var fieldThumbnailWebp = document.getElementById('igReelFieldThumbnailWebp');
  var fieldSortOrder = document.getElementById('igReelFieldSortOrder');
  var fieldPublished = document.getElementById('igReelFieldPublished');

  var thumbnailField = global.IconicImageUploadField.create({
    fileInput: document.getElementById('igReelThumbnailFileInput'),
    previewImg: document.getElementById('igReelThumbnailPreview'),
    previewWrap: document.getElementById('igReelThumbnailPreviewWrap'),
    bucket: 'instagram',
    pathPrefix: 'reels/thumbnail'
  });

  var currentMode = null;
  var currentId = null;
  var isDirty = false;

  function showBanner(message) { banner.textContent = message; banner.hidden = false; }
  function hideBanner() { banner.hidden = true; banner.textContent = ''; }

  function setFieldError(fieldEl, message) {
    var wrap = fieldEl.closest('.form-field');
    var errorEl = wrap && wrap.querySelector('.form-error');
    if (wrap) wrap.classList.toggle('has-error', !!message);
    if (errorEl) errorEl.textContent = message || '';
  }
  function clearFieldErrors() {
    [fieldPermalink].forEach(function (el) { setFieldError(el, ''); });
  }

  function markDirty() { isDirty = true; }
  form.addEventListener('input', markDirty);
  form.addEventListener('change', markDirty);

  function resetForm() {
    hideBanner();
    clearFieldErrors();
    form.reset();
    isDirty = false;
  }

  function populate(item) {
    fieldCaption.value = item.caption || '';
    fieldPermalink.value = item.permalink || '';
    thumbnailField.reset(item.thumbnail_url);
    fieldThumbnailWebp.value = item.thumbnail_url_webp || '';
    fieldSortOrder.value = item.sort_order != null ? item.sort_order : 0;
    fieldPublished.checked = !!item.published;
    isDirty = false;
  }

  function validate() {
    clearFieldErrors();
    var ok = true;
    if (!fieldPermalink.value.trim()) {
      setFieldError(fieldPermalink, 'Permalink is required.');
      ok = false;
    }
    return ok;
  }

  function collectPayload() {
    return {
      caption: fieldCaption.value.trim() || null,
      permalink: fieldPermalink.value.trim(),
      thumbnail_url: thumbnailField.getUrl(),
      thumbnail_url_webp: fieldThumbnailWebp.value.trim() || null,
      sort_order: fieldSortOrder.value !== '' ? parseInt(fieldSortOrder.value, 10) : 0,
      published: fieldPublished.checked
    };
  }

  function open(mode, item) {
    currentMode = mode;
    currentId = mode === 'edit' ? item.id : null;
    resetForm();
    populate(item);
    eyebrow.textContent = mode === 'edit' ? 'Edit Reel' : 'Add Reel';
    titleEl.textContent = item.caption || 'New Reel';
    overlay.hidden = false;
    requestAnimationFrame(function () { overlay.classList.add('is-open'); });
    fieldPermalink.focus();
  }

  function closeImmediately() {
    overlay.classList.remove('is-open');
    window.setTimeout(function () { overlay.hidden = true; }, 250);
  }

  function requestClose() {
    if (!isDirty) { closeImmediately(); return; }
    global.IconicAdminUI.confirmDialog({
      title: 'Discard unsaved changes?',
      message: 'You have unsaved changes to this reel. Closing now will discard them.',
      confirmLabel: 'Discard Changes',
      cancelLabel: 'Keep Editing'
    }).then(function (confirmed) {
      if (!confirmed) return;
      thumbnailField.onAbandoned();
      closeImmediately();
    });
  }

  document.querySelectorAll('[data-editor-close]').forEach(function (el) {
    if (el.closest('#igReelEditor')) el.addEventListener('click', requestClose);
  });
  cancelBtn.addEventListener('click', requestClose);

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && overlay.classList.contains('is-open')) requestClose();
  });

  window.addEventListener('beforeunload', function (e) {
    if (isDirty && !overlay.hidden) {
      e.preventDefault();
      e.returnValue = '';
    }
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!validate()) return;
    hideBanner();

    var payload = collectPayload();
    var setLoading = function (loading) {
      saveBtn.disabled = loading;
      saveBtn.textContent = loading ? (saveBtn.dataset.loadingLabel || 'Saving…') : (saveBtn.dataset.label || 'Save Changes');
    };
    setLoading(true);

    var savePromise = currentMode === 'edit'
      ? global.IconicInstagramReelService.update(currentId, payload)
      : global.IconicInstagramReelService.create(payload);

    savePromise.then(function (result) {
      setLoading(false);
      if (result.error) {
        showBanner(result.error.message || 'Something went wrong.');
        return;
      }
      if (!result.data) {
        showBanner('This change wasn’t saved — your account may not have permission to edit reels, or this entry no longer exists.');
        return;
      }
      if (global.IconicActivityLog) {
        global.IconicActivityLog.log(currentMode === 'edit' ? 'update' : 'create', 'instagram_reel', result.data.id, { caption: result.data.caption });
      }
      thumbnailField.onSaved();
      isDirty = false;
      closeImmediately();
      global.IconicAdminUI.showToast(currentMode === 'edit' ? 'Reel updated.' : 'Reel created.', 'success');
      document.dispatchEvent(new CustomEvent('iconic-admin:instagram-reel-saved'));
    });
  });

  global.IconicInstagramReelEditor = { open: open };
})(window);
