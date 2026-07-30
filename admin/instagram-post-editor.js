/**
 * Iconic Rentals — Instagram Post Editor
 *
 * Owns the edit overlay (#igPostEditor). Mirrors admin/clientele-editor.js's
 * shape (open(mode, item) for 'edit'/'create', dispatches
 * 'iconic-admin:instagram-post-saved' on save).
 *
 * Media Type (IMAGE/VIDEO/CAROUSEL_ALBUM) is metadata only — it doesn't
 * change how `media_url` itself is populated. media_url is always a
 * single representative image, uploaded via admin/image-upload-field.js
 * exactly like instagram_reels.thumbnail_url (Phase 6.11 built the same
 * "always uploads, no manual URL fallback" pattern there first).
 *
 * This was genuinely re-examined in Phase 6.12, which set out to add
 * real video-file upload support for VIDEO/CAROUSEL_ALBUM posts and
 * initially built exactly that — before catching, via the public
 * renderer, that it would have broken the site: js/instagram.js's feed
 * grid renders every post through a plain `<img src="' + post.media_url
 * + '">`, with no branching on media_type and no <video> element
 * anywhere in that code path. instagram_posts also has no thumbnail_url
 * column (unlike instagram_reels), confirming media_url was always meant
 * to be the feed-tile image, not raw video — a real MP4 upload here would
 * have rendered as a broken image icon on the public homepage the moment
 * an owner used it. So there is no "video upload" feature: every media
 * type just uploads one representative image the same way, and the real,
 * actual video (if any) lives on Instagram itself via the required
 * Permalink field, same as Reels already work.
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
  var fieldMediaUrlWebp = document.getElementById('igPostFieldMediaUrlWebp');
  var fieldPermalink = document.getElementById('igPostFieldPermalink');
  var fieldCaption = document.getElementById('igPostFieldCaption');
  var fieldSortOrder = document.getElementById('igPostFieldSortOrder');
  var fieldPublished = document.getElementById('igPostFieldPublished');

  var mediaField = global.IconicImageUploadField.create({
    fileInput: document.getElementById('igPostMediaFileInput'),
    previewImg: document.getElementById('igPostMediaPreview'),
    previewWrap: document.getElementById('igPostMediaPreviewWrap'),
    bucket: 'instagram',
    pathPrefix: 'posts/media'
  });

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
    fieldMediaType.value = item.media_type || 'IMAGE';
    fieldMediaUrlWebp.value = item.media_url_webp || '';
    fieldPermalink.value = item.permalink || '';
    fieldCaption.value = item.caption || '';
    fieldSortOrder.value = item.sort_order != null ? item.sort_order : 0;
    fieldPublished.checked = !!item.published;
    mediaField.reset(item.media_url);
    isDirty = false;
  }

  function validate() {
    clearFieldErrors();
    var ok = true;
    if (!mediaField.getUrl()) {
      global.IconicAdminUI.showToast('Upload an image for this post.', 'error');
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
      media_url: mediaField.getUrl(),
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
      if (!confirmed) return;
      mediaField.onAbandoned();
      closeImmediately();
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
      mediaField.onSaved();
      isDirty = false;
      closeImmediately();
      global.IconicAdminUI.showToast(currentMode === 'edit' ? 'Post updated.' : 'Post created.', 'success');
      document.dispatchEvent(new CustomEvent('iconic-admin:instagram-post-saved'));
    });
  });

  global.IconicInstagramPostEditor = { open: open };
})(window);
