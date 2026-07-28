/**
 * Iconic Rentals — Instagram Post Editor
 *
 * Owns the edit overlay (#igPostEditor). Mirrors admin/clientele-editor.js's
 * shape (open(mode, item) for 'edit'/'create', dispatches
 * 'iconic-admin:instagram-post-saved' on save).
 */
(function (global) {
  'use strict';

  var MEDIA_TYPES = ['IMAGE', 'VIDEO', 'CAROUSEL_ALBUM'];

  var overlay = document.getElementById('igPostEditor');
  var form = document.getElementById('igPostEditorForm');
  var eyebrow = document.getElementById('igPostEditorEyebrow');
  var titleEl = document.getElementById('igPostEditorTitle');
  var banner = document.getElementById('igPostEditorBanner');
  var saveBtn = document.getElementById('igPostEditorSaveBtn');
  var cancelBtn = document.getElementById('igPostEditorCancelBtn');

  var fieldMediaType = document.getElementById('igPostFieldMediaType');
  var fieldMediaUrl = document.getElementById('igPostFieldMediaUrl');
  var fieldMediaUrlWebp = document.getElementById('igPostFieldMediaUrlWebp');
  var fieldPermalink = document.getElementById('igPostFieldPermalink');
  var fieldCaption = document.getElementById('igPostFieldCaption');
  var fieldSortOrder = document.getElementById('igPostFieldSortOrder');
  var fieldPublished = document.getElementById('igPostFieldPublished');

  var currentMode = null;
  var currentId = null;
  var isDirty = false;

  fieldMediaType.innerHTML = MEDIA_TYPES.map(function (t) { return '<option value="' + t + '">' + t + '</option>'; }).join('');

  function showBanner(message) { banner.textContent = message; banner.hidden = false; }
  function hideBanner() { banner.hidden = true; banner.textContent = ''; }

  function setFieldError(fieldEl, message) {
    var wrap = fieldEl.closest('.form-field');
    var errorEl = wrap && wrap.querySelector('.form-error');
    if (wrap) wrap.classList.toggle('has-error', !!message);
    if (errorEl) errorEl.textContent = message || '';
  }
  function clearFieldErrors() {
    [fieldMediaUrl, fieldPermalink].forEach(function (el) { setFieldError(el, ''); });
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
    fieldMediaType.value = item.media_type || 'IMAGE';
    fieldMediaUrl.value = item.media_url || '';
    fieldMediaUrlWebp.value = item.media_url_webp || '';
    fieldPermalink.value = item.permalink || '';
    fieldCaption.value = item.caption || '';
    fieldSortOrder.value = item.sort_order != null ? item.sort_order : 0;
    fieldPublished.checked = !!item.published;
    isDirty = false;
  }

  function validate() {
    clearFieldErrors();
    var ok = true;
    if (!fieldMediaUrl.value.trim()) {
      setFieldError(fieldMediaUrl, 'Media URL is required.');
      ok = false;
    }
    if (!fieldPermalink.value.trim()) {
      setFieldError(fieldPermalink, 'Permalink is required.');
      ok = false;
    }
    return ok;
  }

  function collectPayload() {
    return {
      media_type: fieldMediaType.value,
      media_url: fieldMediaUrl.value.trim(),
      media_url_webp: fieldMediaUrlWebp.value.trim() || null,
      permalink: fieldPermalink.value.trim(),
      caption: fieldCaption.value.trim() || null,
      sort_order: fieldSortOrder.value !== '' ? parseInt(fieldSortOrder.value, 10) : 0,
      published: fieldPublished.checked
    };
  }

  function open(mode, item) {
    currentMode = mode;
    currentId = mode === 'edit' ? item.id : null;
    resetForm();
    populate(item);
    eyebrow.textContent = mode === 'edit' ? 'Edit Post' : 'Add Post';
    titleEl.textContent = item.caption || 'New Post';
    overlay.hidden = false;
    requestAnimationFrame(function () { overlay.classList.add('is-open'); });
    fieldMediaUrl.focus();
  }

  function closeImmediately() {
    overlay.classList.remove('is-open');
    window.setTimeout(function () { overlay.hidden = true; }, 250);
  }

  function requestClose() {
    if (!isDirty) { closeImmediately(); return; }
    global.IconicAdminUI.confirmDialog({
      title: 'Discard unsaved changes?',
      message: 'You have unsaved changes to this post. Closing now will discard them.',
      confirmLabel: 'Discard Changes',
      cancelLabel: 'Keep Editing'
    }).then(function (confirmed) {
      if (confirmed) closeImmediately();
    });
  }

  document.querySelectorAll('[data-editor-close]').forEach(function (el) {
    if (el.closest('#igPostEditor')) el.addEventListener('click', requestClose);
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
      ? global.IconicInstagramPostService.update(currentId, payload)
      : global.IconicInstagramPostService.create(payload);

    savePromise.then(function (result) {
      setLoading(false);
      if (result.error) {
        showBanner(result.error.message || 'Something went wrong.');
        return;
      }
      if (!result.data) {
        showBanner('This change wasn’t saved — your account may not have permission to edit posts, or this entry no longer exists.');
        return;
      }
      if (global.IconicActivityLog) {
        global.IconicActivityLog.log(currentMode === 'edit' ? 'update' : 'create', 'instagram_post', result.data.id, { caption: result.data.caption });
      }
      isDirty = false;
      closeImmediately();
      global.IconicAdminUI.showToast(currentMode === 'edit' ? 'Post updated.' : 'Post created.', 'success');
      document.dispatchEvent(new CustomEvent('iconic-admin:instagram-post-saved'));
    });
  });

  global.IconicInstagramPostEditor = { open: open };
})(window);
