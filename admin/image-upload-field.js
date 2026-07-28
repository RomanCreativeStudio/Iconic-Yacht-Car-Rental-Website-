/**
 * Iconic Rentals — Single-Image Upload Field (Phase 6.11)
 *
 * Wires a file input + preview <img> for one image field that's part of
 * a larger form whose Save happens separately/later — unlike
 * admin/settings.js's logo field, which writes to the database the
 * instant the upload finishes, because site_settings' one row always
 * exists. Clientele/Instagram editors don't have that guarantee (a
 * brand-new entry has no row yet in 'create' mode), so this defers the
 * database write to the form's own Save button while still uploading
 * the file itself immediately on selection — same "uploads immediately"
 * UX as Settings/Media Manager, just a deferred DB write.
 *
 * Reuses admin/media-service.js's uploadToStorage()/removeFromStorage()/
 * publicUrl() as-is — this file only adds the state machine, not a
 * second upload pipeline.
 *
 * The database column this feeds (clientele_endorsements.photo/.logo,
 * instagram_posts.media_url, instagram_reels.thumbnail_url) was designed
 * in Phase 6.6 as a plain URL/path string, used directly as an <img src>
 * by js/clientele.js / js/instagram.js — neither runs it through
 * publicUrl() at read time. So getUrl() below returns the *full* public
 * URL, not a bare Storage path, which is what keeps those renderers
 * correct with zero changes to them (this phase's "no renderer
 * rewrites" rule). That also means an existing value might be an
 * external URL or a static /images/... path some admin pasted in before
 * this upload feature existed — never one of this bucket's own objects.
 * pathFromUrl() below only ever resolves a path for a URL that actually
 * starts with this exact bucket's own public-URL prefix, so replacing or
 * abandoning a pre-existing external value never attempts (or risks) a
 * Storage delete against something this system never uploaded.
 *
 * Note (Phase 6.12): instagram_posts.media_url is upload-only here for
 * every media_type (IMAGE/VIDEO/CAROUSEL_ALBUM alike) — see
 * admin/instagram-post-editor.js's header comment for why an actual
 * video/multi-image file was never the right target for this column in
 * the first place, matching how instagram_reels.thumbnail_url already
 * always uploads too. This file itself only ever handles images; no
 * video-upload branch exists or is needed anywhere in this field.
 *
 * Orphan handling (mirrors admin/media.js's documented rules, adapted
 * for a field embedded in a create/edit form rather than a standalone
 * media row):
 *   - A fresh upload replaces the current value immediately (the old
 *     file, if any, is left alone in Storage until Save succeeds).
 *   - After a successful Save that used a freshly-uploaded file, the
 *     field's onSaved() best-effort deletes the *previous* file, if it
 *     was one of ours — matching media.js's "flat sections" replace rule.
 *   - If the editor is closed/discarded without ever saving the fresh
 *     upload, onAbandoned() best-effort deletes it instead, so a
 *     cancelled create/edit never leaves an orphaned file behind.
 */
(function (global) {
  'use strict';

  var svc = global.IconicMediaService;

  function extOf(filename) {
    var m = /\.([a-z0-9]+)$/i.exec(filename || '');
    return m ? m[1].toLowerCase() : '';
  }

  function sanitizeSegment(str) {
    return String(str || '')
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * @param {Object} opts
   * @param {HTMLInputElement} opts.fileInput
   * @param {HTMLImageElement} opts.previewImg
   * @param {HTMLElement} opts.previewWrap
   * @param {string} opts.bucket
   * @param {string} opts.pathPrefix - e.g. 'clientele/photo' — the final
   *   path is `${pathPrefix}-${Date.now()}-${sanitized filename}.${ext}`.
   */
  function create(opts) {
    var fileInput = opts.fileInput;
    var previewImg = opts.previewImg;
    var previewWrap = opts.previewWrap;
    var bucket = opts.bucket;
    var pathPrefix = opts.pathPrefix;

    // svc.publicUrl(bucket, 'x') always ends in '/x' for a non-empty
    // path — stripping that trailing segment gives this bucket's own
    // URL prefix, the one reliable signal that a stored URL is (or
    // isn't) a file this system manages.
    var bucketUrlPrefix = (function () {
      var sample = svc.publicUrl(bucket, 'x');
      return sample ? sample.slice(0, sample.length - 1) : null;
    })();

    function pathFromUrl(url) {
      if (!bucketUrlPrefix || !url || url.indexOf(bucketUrlPrefix) !== 0) return null;
      return url.slice(bucketUrlPrefix.length);
    }

    var originalUrl = null; // exact value last known saved in the DB (or null)
    var originalPath = null; // same, as a bucket-relative path — only set if it's one of ours
    var currentUrl = null; // what getUrl() returns right now
    var currentPath = null; // bucket-relative path for currentUrl — only set if it's one of ours
    var freshUpload = false; // true if currentUrl was uploaded this session and not yet saved

    function updatePreview() {
      if (currentUrl) {
        previewImg.src = currentUrl;
        previewWrap.hidden = false;
      } else {
        previewWrap.hidden = true;
      }
    }

    function reset(existingUrl) {
      originalUrl = existingUrl || null;
      originalPath = pathFromUrl(originalUrl);
      currentUrl = originalUrl;
      currentPath = originalPath;
      freshUpload = false;
      fileInput.value = '';
      updatePreview();
    }

    fileInput.addEventListener('change', function () {
      var file = fileInput.files[0];
      if (!file) return;
      var validation = svc.validateFile(file);
      if (!validation.ok || validation.mediaType !== 'image') {
        global.IconicAdminUI.showToast(validation.error || 'Only image files are supported here.', 'error');
        fileInput.value = '';
        return;
      }

      var path = pathPrefix + '-' + Date.now() + '-' + sanitizeSegment(file.name.replace(/\.[a-z0-9]+$/i, '')) + '.' + extOf(file.name);
      fileInput.disabled = true;
      var upload = svc.uploadToStorage(bucket, path, file, function () {}, false);
      upload.promise.then(function () {
        currentPath = path;
        currentUrl = svc.publicUrl(bucket, path);
        freshUpload = true;
        updatePreview();
        global.IconicAdminUI.showToast('Image uploaded — save the form to keep it.', 'success');
      }).catch(function (err) {
        global.IconicAdminUI.showToast(err.message || 'Upload failed.', 'error');
      }).then(function () {
        fileInput.disabled = false;
        fileInput.value = '';
      });
    });

    /** Call after a successful Save. Best-effort deletes the file this
     *  field just replaced, if that previous value was one of ours. */
    function onSaved() {
      var toDelete = (freshUpload && originalPath && originalPath !== currentPath) ? originalPath : null;
      originalUrl = currentUrl;
      originalPath = currentPath;
      freshUpload = false;
      if (toDelete) {
        svc.removeFromStorage(bucket, [toDelete]).catch(function () { /* best-effort */ });
      }
    }

    /** Call when the editor closes without saving. Best-effort deletes a
     *  freshly-uploaded-but-never-saved file so it doesn't orphan. */
    function onAbandoned() {
      if (freshUpload && currentPath) {
        svc.removeFromStorage(bucket, [currentPath]).catch(function () { /* best-effort */ });
      }
    }

    return {
      reset: reset,
      getUrl: function () { return currentUrl; },
      onSaved: onSaved,
      onAbandoned: onAbandoned
    };
  }

  /**
   * Best-effort delete of a stored URL when an entire row (endorsement,
   * post, reel) is deleted — the list views (admin/clientele.js,
   * admin/instagram.js) call this after a successful row delete, so a
   * removed endorsement/post/reel doesn't leave its photo/logo/media
   * file behind in Storage. Same bucket-prefix safety check as
   * pathFromUrl() above: only ever deletes a URL that actually belongs
   * to the given bucket, so pre-existing external/manual URLs are never
   * touched.
   */
  function removeIfManaged(bucket, url) {
    if (!url) return Promise.resolve();
    var sample = svc.publicUrl(bucket, 'x');
    var prefix = sample ? sample.slice(0, sample.length - 1) : null;
    if (!prefix || url.indexOf(prefix) !== 0) return Promise.resolve();
    return svc.removeFromStorage(bucket, [url.slice(prefix.length)]).catch(function () { /* best-effort */ });
  }

  global.IconicImageUploadField = { create: create, removeIfManaged: removeIfManaged };
})(window);
