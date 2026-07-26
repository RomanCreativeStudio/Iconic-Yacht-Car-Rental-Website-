/**
 * Iconic Rentals — Media Manager
 *
 * Session + role check on load, exactly like admin/fleet.js — see that
 * file's header comment for why the real security boundary is the
 * database/storage RLS, not this JS.
 *
 * Orphan-avoidance rules this file follows everywhere it touches both
 * Storage and a database row together:
 *   - Upload:  storage write first, then the DB row. If the DB write
 *     fails, the just-uploaded object is deleted (rollback) so a failed
 *     save never leaves an unreferenced file behind.
 *   - Delete:  storage delete first, then the DB row. If the storage
 *     delete fails, the DB row is left alone — the file still exists, so
 *     nothing is orphaned in either direction, and the user can retry.
 *   - Replace (slotted sections — exterior/interior/lifestyle/drone/
 *     walkthrough/reels/tiktok/tours360): the storage path is
 *     deterministic (`{slug}/{section}/{slot_key}.{ext}`), so replacing
 *     is an upsert to the *same* path — the old file is overwritten in
 *     place by the Storage API itself, zero orphan risk.
 *   - Replace (flat sections — hero/card/gallery/experience media): the
 *     new file gets a fresh unique path, the DB row is updated to point
 *     at it, then the old object is deleted best-effort. If that last
 *     delete fails, the replace has still succeeded from the user's
 *     point of view (new content is live) — a toast says so rather than
 *     rolling back a working replace over a stale-file cleanup failure.
 *   - Hero/Card are modeled as "at most one row per vehicle" even though
 *     the table has no unique constraint enforcing that — uploading a
 *     new hero/card image auto-replaces the existing one instead of
 *     inserting a second, ambiguous row.
 */
(function () {
  'use strict';

  var auth = window.IconicAdminAuth;
  var supabase = auth && auth.requireClient();
  if (!supabase) return;
  var svc = window.IconicMediaService;

  var mediaView = document.getElementById('mediaView');
  var signOutBtn = document.getElementById('signOutBtn');
  var searchInput = document.getElementById('mediaSearch');
  var sortSelect = document.getElementById('mediaSort');
  var gridEl = document.getElementById('mediaGrid');
  var emptyEl = document.getElementById('mediaEmpty');
  var emptyTextEl = document.getElementById('mediaEmptyText');
  var bannerEl = document.getElementById('mediaBanner');

  var uploadPanel = document.getElementById('uploadPanel');
  var uploadBanner = document.getElementById('uploadBanner');
  var openUploadBtn = document.getElementById('openUploadBtn');
  var uploadCancelBtn = document.getElementById('uploadCancelBtn');
  var uploadStartBtn = document.getElementById('uploadStartBtn');

  var targetFleetItem = document.getElementById('targetFleetItem');
  var targetExperience = document.getElementById('targetExperience');
  var noExperiencesHint = document.getElementById('noExperiencesHint');
  var targetFleetKind = document.getElementById('targetFleetKind');
  var targetFleetSection = document.getElementById('targetFleetSection');
  var targetFleetSlotWrap = document.getElementById('targetFleetSlotWrap');
  var targetFleetSlot = document.getElementById('targetFleetSlot');
  var targetExperienceKind = document.getElementById('targetExperienceKind');

  var dropzone = document.getElementById('mediaDropzone');
  var browseFilesBtn = document.getElementById('browseFilesBtn');
  var fileInput = document.getElementById('fileInput');
  var uploadListEl = document.getElementById('uploadList');
  var replaceFileInput = document.getElementById('replaceFileInput');

  var filters = { parentType: '', parentId: '', mediaType: '', published: '' };
  // Deep link from Fleet Manager's "Manage Media" button — see
  // admin/fleet.js's card actions. Absent for any other entry point.
  var linkedFleetItemId = new URLSearchParams(window.location.search).get('fleetItemId');
  var allMediaRows = [];
  var fleetItems = [];
  var experiences = [];
  var targetType = 'fleet'; // 'fleet' | 'experience'
  var uploadQueue = []; // { uid, file, mediaType, status, progress, error, controller }
  var uploadQueueCounter = 0;
  var replaceContext = null; // the media-row object currently being replaced

  function showBanner(el, message) {
    el.textContent = message;
    el.hidden = false;
  }
  function hideBanner(el) {
    el.hidden = true;
    el.textContent = '';
  }

  function escapeHtml(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function basename(path) {
    if (!path) return '';
    var parts = path.split('/');
    return parts[parts.length - 1];
  }

  /* -------------------------------------------------------------------
     Boot: auth guard, then load library + picker data.
  ------------------------------------------------------------------- */
  auth.getSessionAndRole(supabase).then(function (result) {
    if (!result.session || !auth.hasDashboardAccess(result.role)) {
      window.location.replace('login.html');
      return;
    }
    mediaView.hidden = false;
    signOutBtn.hidden = false;
    if (linkedFleetItemId) applyFleetItemDeepLink();
    loadPickerData();
    loadLibrary();
  });

  /** Pre-filters the library to one vehicle and pre-selects it in the
   *  upload target picker, when arriving via Fleet Manager's "Manage
   *  Media" button rather than the Media nav link directly. */
  function applyFleetItemDeepLink() {
    filters.parentType = 'fleet';
    filters.parentId = linkedFleetItemId;
    document.querySelectorAll('.admin-filter-tab[data-filter="parentType"]').forEach(function (btn) {
      var active = btn.getAttribute('data-value') === 'fleet';
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-selected', String(active));
    });
  }

  signOutBtn.addEventListener('click', function () {
    supabase.auth.signOut().then(function () {
      window.location.replace('login.html');
    });
  });

  /* -------------------------------------------------------------------
     Library loading + rendering
  ------------------------------------------------------------------- */
  function loadLibrary() {
    hideBanner(bannerEl);
    gridEl.innerHTML = '<p class="fleet-empty-loading admin-muted">Loading media…</p>';
    emptyEl.hidden = true;

    svc.listLibrary().then(function (result) {
      if (result.error) {
        gridEl.innerHTML = '';
        showBanner(bannerEl, 'Couldn’t load the media library: ' + result.error.message);
        return;
      }
      allMediaRows = result.data;
      render();
    });
  }

  var pickerReady = false;

  function loadPickerData() {
    openUploadBtn.disabled = true;
    Promise.all([
      svc.listFleetItems().then(function (result) {
        fleetItems = result.data || [];
        targetFleetItem.innerHTML = fleetItems.map(function (item) {
          return '<option value="' + item.id + '">' + escapeHtml(item.name) + ' (' + item.type + ')</option>';
        }).join('');
        if (linkedFleetItemId) targetFleetItem.value = linkedFleetItemId;
        populateSectionOptions();
      }),
      svc.listExperiences().then(function (result) {
        experiences = result.data || [];
        noExperiencesHint.hidden = !!experiences.length;
        targetExperience.innerHTML = experiences.map(function (item) {
          return '<option value="' + item.id + '">' + escapeHtml(item.title) + '</option>';
        }).join('');
        targetExperience.disabled = !experiences.length;
      })
    ]).then(function () {
      pickerReady = true;
      openUploadBtn.disabled = false;
    });
  }

  function matchesFilters(row) {
    if (filters.parentType && row.parentType !== filters.parentType) return false;
    if (filters.parentId && String(row.parentId) !== String(filters.parentId)) return false;
    if (filters.mediaType && row.mediaType !== filters.mediaType) return false;
    if (filters.published === 'true' && !row.parentPublished) return false;
    if (filters.published === 'false' && row.parentPublished) return false;

    var term = searchInput.value.trim().toLowerCase();
    if (term) {
      var haystack = [row.parentName, row.label, row.section, basename(row.storage_path)].join(' ').toLowerCase();
      if (haystack.indexOf(term) === -1) return false;
    }
    return true;
  }

  function sortRows(rows) {
    var sorted = rows.slice();
    switch (sortSelect.value) {
      case 'oldest':
        sorted.sort(function (a, b) { return new Date(a.created_at) - new Date(b.created_at); });
        break;
      case 'filename':
        sorted.sort(function (a, b) { return basename(a.storage_path).localeCompare(basename(b.storage_path)); });
        break;
      case 'newest':
      default:
        sorted.sort(function (a, b) { return new Date(b.created_at) - new Date(a.created_at); });
        break;
    }
    return sorted;
  }

  function mediaThumb(row) {
    var url = svc.publicUrl(row.bucket, row.storage_path);
    if (!url) {
      return '<div class="media-card-thumb media-card-thumb--empty"><span>No file</span></div>';
    }
    if (row.mediaType === 'video') {
      return '<div class="media-card-thumb"><video src="' + escapeHtml(url) + '" muted preload="metadata" controls></video></div>';
    }
    return '<div class="media-card-thumb"><img src="' + escapeHtml(url) + '" alt="' + escapeHtml(row.alt || row.label || '') + '" loading="lazy" /></div>';
  }

  function cardMarkup(row) {
    var parentBadge = row.parentType === 'fleet' ? 'Vehicle' : 'Experience';
    var statusBadge = row.parentPublished
      ? '<span class="fleet-badge fleet-badge--published">Published</span>'
      : '<span class="fleet-badge fleet-badge--draft">Draft</span>';
    var slotLabel = row.slotKey ? (row.section + ' · ' + row.slotKey) : row.section;

    return (
      '<div class="media-card" data-id="' + row.id + '" data-parent-type="' + row.parentType + '">' +
      mediaThumb(row) +
      '<div class="media-card-badges">' +
      '<span class="fleet-badge">' + parentBadge + '</span>' +
      statusBadge +
      '</div>' +
      '<div class="media-card-body">' +
      '<h4 class="media-card-title">' + escapeHtml(row.parentName) + '</h4>' +
      '<span class="media-card-meta">' + escapeHtml(slotLabel) + '</span>' +
      '<span class="media-card-filename">' + escapeHtml(basename(row.storage_path) || 'No file uploaded') + '</span>' +
      '<div class="media-card-actions">' +
      '<button type="button" class="btn btn-ghost" data-action="replace" data-id="' + row.id + '">Replace</button>' +
      '<button type="button" class="btn btn-danger" data-action="delete" data-id="' + row.id + '">Delete</button>' +
      '</div></div></div>'
    );
  }

  function render() {
    var filtered = sortRows(allMediaRows.filter(matchesFilters));
    if (!filtered.length) {
      gridEl.innerHTML = '';
      emptyEl.hidden = false;
      emptyTextEl.textContent = allMediaRows.length === 0
        ? 'Upload photos or videos to get started.'
        : 'No media matches your search and filters — try clearing one.';
      return;
    }
    emptyEl.hidden = true;
    gridEl.innerHTML = filtered.map(cardMarkup).join('');
  }

  searchInput.addEventListener('input', function () {
    window.clearTimeout(searchInput._debounce);
    searchInput._debounce = window.setTimeout(render, 250);
  });
  sortSelect.addEventListener('change', render);

  document.querySelectorAll('#mediaView .admin-filter-tab[data-filter]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var group = btn.getAttribute('data-filter');
      var value = btn.getAttribute('data-value');
      var siblings = document.querySelectorAll('#mediaView .admin-filter-tab[data-filter="' + group + '"]');
      siblings.forEach(function (s) {
        s.classList.remove('is-active');
        s.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('is-active');
      btn.setAttribute('aria-selected', 'true');
      filters[group] = value;
      render();
    });
  });

  function findRow(id) {
    return allMediaRows.filter(function (r) { return String(r.id) === String(id); })[0] || null;
  }

  /* -------------------------------------------------------------------
     Card actions: replace / delete
  ------------------------------------------------------------------- */
  gridEl.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-action]');
    if (!btn) return;
    var row = findRow(btn.getAttribute('data-id'));
    if (!row) return;

    if (btn.getAttribute('data-action') === 'replace') {
      replaceContext = row;
      replaceFileInput.accept = row.mediaType === 'video'
        ? '.mp4,.mov,.webm,video/mp4,video/quicktime,video/webm'
        : '.jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp';
      replaceFileInput.value = '';
      replaceFileInput.click();
    } else if (btn.getAttribute('data-action') === 'delete') {
      window.IconicAdminUI.confirmDialog({
        title: 'Delete this media item?',
        message: 'This permanently removes "' + basename(row.storage_path) + '" from ' + escapeHtml(row.parentName) + '. This cannot be undone.',
        confirmLabel: 'Delete Media',
        cancelLabel: 'Cancel'
      }).then(function (confirmed) {
        if (confirmed) performDelete(row);
      });
    }
  });

  replaceFileInput.addEventListener('change', function () {
    var file = replaceFileInput.files[0];
    var row = replaceContext;
    replaceContext = null;
    if (!file || !row) return;

    var validation = svc.validateFile(file);
    if (!validation.ok) {
      window.IconicAdminUI.showToast(validation.error, 'error');
      return;
    }
    if (validation.mediaType !== row.mediaType) {
      window.IconicAdminUI.showToast('Choose a ' + row.mediaType + ' file to replace this item.', 'error');
      return;
    }

    window.IconicAdminUI.confirmDialog({
      title: 'Replace this file?',
      message: '"' + basename(row.storage_path) + '" will be replaced with "' + file.name + '".',
      confirmLabel: 'Replace File',
      cancelLabel: 'Cancel'
    }).then(function (confirmed) {
      if (confirmed) performReplace(row, file);
    });
  });

  function rowDbFns(row) {
    return row.parentType === 'fleet'
      ? { update: svc.updateFleetMediaRow, del: svc.deleteFleetMediaRow }
      : { update: svc.updateExperienceMediaRow, del: svc.deleteExperienceMediaRow };
  }

  function performReplace(row, file) {
    var fns = rowDbFns(row);
    var isSlotted = !!row.slotKey;
    var path = isSlotted
      ? row.storage_path // deterministic — same path, upsert overwrites in place
      : (row.parentType === 'fleet'
        ? svc.fleetMediaPath({ slug: (fleetItems.filter(function (f) { return f.id === row.parentId; })[0] || {}).slug || row.parentId, section: row.section, slotKey: null, filename: file.name })
        : svc.experienceMediaPath({ experienceId: row.parentId, kind: row.section, filename: file.name }));

    var upload = svc.uploadToStorage(row.bucket, path, file, function () {}, isSlotted);
    upload.promise.then(function () {
      return fns.update(row.id, { storage_path: path, label: file.name });
    }).then(function (result) {
      if (result.error) {
        window.IconicAdminUI.showToast('Uploaded, but couldn’t update the record: ' + result.error.message, 'error');
        return;
      }
      if (!isSlotted && row.storage_path !== path) {
        svc.removeFromStorage(row.bucket, [row.storage_path]).then(function (rm) {
          if (rm.error) console.error('Old file cleanup failed (replace still succeeded):', rm.error);
        });
      }
      window.IconicAdminUI.showToast('File replaced.', 'success');
      loadLibrary();
    }).catch(function (err) {
      window.IconicAdminUI.showToast(err.message || 'Replace failed.', 'error');
    });
  }

  function performDelete(row) {
    if (!row.storage_path) {
      rowDbFns(row).del(row.id).then(function (result) {
        if (result.error) { window.IconicAdminUI.showToast('Couldn’t delete: ' + result.error.message, 'error'); return; }
        window.IconicAdminUI.showToast('Media deleted.', 'success');
        loadLibrary();
      });
      return;
    }
    svc.removeFromStorage(row.bucket, [row.storage_path]).then(function (rm) {
      if (rm.error) {
        window.IconicAdminUI.showToast('Couldn’t delete the file: ' + rm.error.message, 'error');
        return;
      }
      rowDbFns(row).del(row.id).then(function (result) {
        if (result.error) {
          window.IconicAdminUI.showToast('File removed, but the record couldn’t be deleted: ' + result.error.message, 'error');
          return;
        }
        window.IconicAdminUI.showToast('Media deleted.', 'success');
        loadLibrary();
      });
    });
  }

  /* -------------------------------------------------------------------
     Upload panel: target picker
  ------------------------------------------------------------------- */
  function setTargetType(type) {
    targetType = type;
    document.querySelectorAll('[data-target-type]').forEach(function (btn) {
      var active = btn.getAttribute('data-target-type') === type;
      btn.classList.toggle('is-active', active);
    });
    document.querySelectorAll('[data-target-group="fleet"]').forEach(function (el) { el.hidden = type !== 'fleet'; });
    document.querySelectorAll('[data-target-group="experience"]').forEach(function (el) { el.hidden = type !== 'experience'; });
  }

  document.querySelectorAll('[data-target-type]').forEach(function (btn) {
    btn.addEventListener('click', function () { setTargetType(btn.getAttribute('data-target-type')); });
  });

  function populateSectionOptions() {
    var kind = targetFleetKind.value;
    var sections = kind === 'video' ? svc.FLEET_VIDEO_SECTIONS : svc.FLEET_IMAGE_SECTIONS;
    targetFleetSection.innerHTML = sections.map(function (s) {
      return '<option value="' + s + '">' + s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, ' ') + '</option>';
    }).join('');
    populateSlotOptions();
  }

  function populateSlotOptions() {
    var kind = targetFleetKind.value;
    var section = targetFleetSection.value;
    var slotMap = kind === 'video' ? svc.VIDEO_SLOTS : svc.GALLERY_SLOTS;
    var slots = slotMap[section];
    if (!slots) {
      targetFleetSlotWrap.hidden = true;
      targetFleetSlot.innerHTML = '';
      return;
    }
    targetFleetSlotWrap.hidden = false;
    targetFleetSlot.innerHTML = slots.map(function (s) {
      return '<option value="' + s.key + '">' + escapeHtml(s.label) + '</option>';
    }).join('');
  }

  targetFleetKind.addEventListener('change', populateSectionOptions);
  targetFleetSection.addEventListener('change', populateSlotOptions);

  /* -------------------------------------------------------------------
     Upload panel: open / close
  ------------------------------------------------------------------- */
  function openUploadPanel() {
    hideBanner(uploadBanner);
    uploadQueue.forEach(function (item) { if (item.previewUrl) URL.revokeObjectURL(item.previewUrl); });
    uploadQueue = [];
    renderUploadList();
    setTargetType('fleet');
    populateSectionOptions();
    uploadPanel.hidden = false;
    requestAnimationFrame(function () { uploadPanel.classList.add('is-open'); });
  }

  function closeUploadPanel() {
    uploadQueue.forEach(function (item) {
      if (item.status === 'uploading' && item.cancel) item.cancel();
    });
    uploadPanel.classList.remove('is-open');
    window.setTimeout(function () { uploadPanel.hidden = true; }, 250);
  }

  openUploadBtn.addEventListener('click', openUploadPanel);
  uploadCancelBtn.addEventListener('click', closeUploadPanel);
  document.querySelectorAll('[data-upload-close]').forEach(function (el) {
    el.addEventListener('click', closeUploadPanel);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && uploadPanel.classList.contains('is-open')) closeUploadPanel();
  });

  /* -------------------------------------------------------------------
     Upload panel: drag & drop / browse / queue rendering
  ------------------------------------------------------------------- */
  browseFilesBtn.addEventListener('click', function () { fileInput.click(); });
  fileInput.addEventListener('change', function () {
    addFilesToQueue(fileInput.files);
    fileInput.value = '';
  });

  ['dragenter', 'dragover'].forEach(function (evt) {
    dropzone.addEventListener(evt, function (e) {
      e.preventDefault();
      dropzone.classList.add('is-dragover');
    });
  });
  ['dragleave', 'drop'].forEach(function (evt) {
    dropzone.addEventListener(evt, function (e) {
      e.preventDefault();
      dropzone.classList.remove('is-dragover');
    });
  });
  dropzone.addEventListener('drop', function (e) {
    if (e.dataTransfer && e.dataTransfer.files) addFilesToQueue(e.dataTransfer.files);
  });
  dropzone.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); }
  });

  function addFilesToQueue(fileList) {
    Array.prototype.forEach.call(fileList, function (file) {
      var validation = svc.validateFile(file);
      var uid = 'u' + (++uploadQueueCounter);
      uploadQueue.push({
        uid: uid,
        file: file,
        mediaType: validation.mediaType,
        status: validation.ok ? 'queued' : 'error',
        progress: 0,
        error: validation.ok ? null : validation.error,
        cancel: null,
        // Created once per queued file, not per render — re-creating this
        // inside uploadRowMarkup() (called on every progress tick) would
        // both leak blob URLs and reload/flicker the preview each time.
        previewUrl: (function () { try { return URL.createObjectURL(file); } catch (e) { return null; } })()
      });
    });
    renderUploadList();
  }

  function uploadRowMarkup(item) {
    var url = item.previewUrl;
    var thumb = item.mediaType === 'video'
      ? (url ? '<video src="' + url + '" muted preload="metadata"></video>' : '<div class="media-upload-thumb--empty"></div>')
      : (url ? '<img src="' + url + '" alt="" />' : '<div class="media-upload-thumb--empty"></div>');

    var statusLine = '';
    if (item.status === 'error') {
      statusLine = '<span class="media-upload-error">' + escapeHtml(item.error) + '</span>';
    } else if (item.status === 'done') {
      statusLine = '<span class="media-upload-done">Uploaded</span>';
    } else if (item.status === 'uploading') {
      statusLine = '<div class="media-progress"><div class="media-progress-bar" style="width:' + Math.round(item.progress * 100) + '%"></div></div>';
    } else {
      statusLine = '<span class="admin-muted">Queued — ' + svc.formatBytes(item.file.size) + '</span>';
    }

    var actions = '';
    if (item.status === 'error') {
      actions = '<button type="button" class="btn btn-ghost" data-queue-action="retry" data-uid="' + item.uid + '">Retry</button>';
    } else if (item.status === 'uploading') {
      actions = '<button type="button" class="btn btn-ghost" data-queue-action="cancel" data-uid="' + item.uid + '">Cancel</button>';
    }
    if (item.status !== 'uploading') {
      actions += '<button type="button" class="btn btn-ghost" data-queue-action="remove" data-uid="' + item.uid + '">Remove</button>';
    }

    return (
      '<div class="media-upload-row" data-uid="' + item.uid + '">' +
      '<div class="media-upload-thumb">' + thumb + '</div>' +
      '<div class="media-upload-info">' +
      '<span class="media-upload-name">' + escapeHtml(item.file.name) + '</span>' +
      statusLine +
      '</div>' +
      '<div class="media-upload-actions">' + actions + '</div>' +
      '</div>'
    );
  }

  function renderUploadList() {
    uploadListEl.innerHTML = uploadQueue.map(uploadRowMarkup).join('');
  }

  uploadListEl.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-queue-action]');
    if (!btn) return;
    var uid = btn.getAttribute('data-uid');
    var item = uploadQueue.filter(function (q) { return q.uid === uid; })[0];
    if (!item) return;
    var action = btn.getAttribute('data-queue-action');

    if (action === 'remove') {
      if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      uploadQueue = uploadQueue.filter(function (q) { return q.uid !== uid; });
      renderUploadList();
    } else if (action === 'cancel') {
      if (item.cancel) item.cancel();
    } else if (action === 'retry') {
      var revalidated = svc.validateFile(item.file);
      item.status = revalidated.ok ? 'queued' : 'error';
      item.error = revalidated.ok ? null : revalidated.error;
      renderUploadList();
    }
  });

  /* -------------------------------------------------------------------
     Upload panel: resolving the current target + starting uploads
  ------------------------------------------------------------------- */
  function currentTarget() {
    if (targetType === 'fleet') {
      var fleetItem = fleetItems.filter(function (f) { return String(f.id) === String(targetFleetItem.value); })[0];
      var kind = targetFleetKind.value;
      var section = targetFleetSection.value;
      var slotMap = kind === 'video' ? svc.VIDEO_SLOTS : svc.GALLERY_SLOTS;
      var slotDef = slotMap[section] ? slotMap[section].filter(function (s) { return s.key === targetFleetSlot.value; })[0] : null;
      return {
        parentType: 'fleet',
        fleetItem: fleetItem,
        kind: kind,
        section: section,
        slotKey: slotDef ? slotDef.key : null,
        platform: slotDef ? slotDef.platform : null,
        multiple: section === 'gallery'
      };
    }
    var experience = experiences.filter(function (x) { return String(x.id) === String(targetExperience.value); })[0];
    return {
      parentType: 'experience',
      experience: experience,
      kind: targetExperienceKind.value,
      multiple: true
    };
  }

  function existingSingularRow(target) {
    if (target.parentType === 'fleet') {
      if (target.section !== 'hero' && target.section !== 'card') return null;
      return allMediaRows.filter(function (r) {
        return r.parentType === 'fleet' && r.parentId === target.fleetItem.id && r.section === target.section;
      })[0] || null;
    }
    if (target.kind !== 'cover') return null;
    return allMediaRows.filter(function (r) {
      return r.parentType === 'experience' && r.parentId === target.experience.id && r.section === 'cover';
    })[0] || null;
  }

  function uploadOneItem(item, target) {
    item.status = 'uploading';
    item.progress = 0;
    renderUploadList();

    var bucket = svc.bucketFor(item.mediaType, target.parentType);
    var path, upsert;
    var existing = existingSingularRow(target);

    if (target.parentType === 'fleet') {
      upsert = !!target.slotKey;
      path = svc.fleetMediaPath({ slug: target.fleetItem.slug, section: target.section, slotKey: target.slotKey, filename: item.file.name });
    } else {
      upsert = false;
      path = svc.experienceMediaPath({ experienceId: target.experience.id, kind: target.kind, filename: item.file.name });
    }

    var upload = svc.uploadToStorage(bucket, path, item.file, function (progress) {
      item.progress = progress;
      renderUploadList();
    }, upsert);
    item.cancel = upload.cancel;

    return upload.promise.then(function () {
      if (target.parentType === 'fleet') {
        var fleetPayload = {
          fleet_item_id: target.fleetItem.id,
          kind: item.mediaType === 'video' ? 'video' : 'photo',
          section: target.section,
          slot_key: target.slotKey || null,
          label: item.file.name,
          alt: null,
          platform: target.platform || null,
          storage_path: path,
          sort_order: 0
        };
        return existing
          ? svc.updateFleetMediaRow(existing.id, fleetPayload)
          : svc.insertFleetMediaRow(fleetPayload);
      }
      var expPayload = {
        experience_id: target.experience.id,
        kind: target.kind,
        label: item.file.name,
        alt: null,
        platform: target.kind === 'video' ? 'video' : null,
        storage_path: path,
        sort_order: 0
      };
      return existing
        ? svc.updateExperienceMediaRow(existing.id, expPayload)
        : svc.insertExperienceMediaRow(expPayload);
    }).then(function (result) {
      if (result.error) {
        return svc.removeFromStorage(bucket, [path]).then(function () {
          throw { message: result.error.message };
        });
      }
      if (existing && existing.storage_path && existing.storage_path !== path) {
        svc.removeFromStorage(bucket, [existing.storage_path]).then(function (rm) {
          if (rm.error) console.error('Old file cleanup failed (replace still succeeded):', rm.error);
        });
      }
      item.status = 'done';
      item.progress = 1;
      renderUploadList();
    }).catch(function (err) {
      if (err && err.cancelled) {
        item.status = 'queued';
        item.progress = 0;
      } else {
        item.status = 'error';
        item.error = (err && err.message) || 'Upload failed.';
      }
      renderUploadList();
    });
  }

  uploadStartBtn.addEventListener('click', function () {
    hideBanner(uploadBanner);
    var target = currentTarget();

    if (target.parentType === 'fleet' && !target.fleetItem) {
      showBanner(uploadBanner, 'Choose a vehicle first.');
      return;
    }
    if (target.parentType === 'experience' && !target.experience) {
      showBanner(uploadBanner, 'Choose an experience first — none exist yet, so there’s nothing to attach media to.');
      return;
    }

    var pending = uploadQueue.filter(function (q) { return q.status === 'queued'; });
    if (!pending.length) {
      showBanner(uploadBanner, 'Add at least one valid file first.');
      return;
    }
    if (!target.multiple && pending.length > 1) {
      showBanner(uploadBanner, 'This section only takes one file at a time — remove the extras first.');
      return;
    }

    // Duplicate-filename guard for flat/multi targets (see
    // media-service.js's isDuplicateFilename comment for why this
    // reuses `label` rather than a new column).
    var parentId = target.parentType === 'fleet' ? target.fleetItem.id : (target.experience && target.experience.id);
    var sectionKey = target.parentType === 'fleet' ? target.section : target.kind;
    var duplicateNames = {};
    pending.forEach(function (item) {
      if (svc.isDuplicateFilename(allMediaRows, parentId, sectionKey, item.file.name) || duplicateNames[item.file.name]) {
        item.status = 'error';
        item.error = 'A file named "' + item.file.name + '" is already attached here.';
      }
      duplicateNames[item.file.name] = true;
    });
    renderUploadList();
    pending = pending.filter(function (item) { return item.status === 'queued'; });
    if (!pending.length) return;

    uploadStartBtn.disabled = true;
    uploadStartBtn.textContent = uploadStartBtn.dataset.loadingLabel;

    Promise.all(pending.map(function (item) { return uploadOneItem(item, target); })).then(function () {
      uploadStartBtn.disabled = false;
      uploadStartBtn.textContent = uploadStartBtn.dataset.label;
      var succeeded = uploadQueue.filter(function (q) { return q.status === 'done'; }).length;
      if (succeeded) {
        window.IconicAdminUI.showToast(succeeded + ' file' + (succeeded === 1 ? '' : 's') + ' uploaded.', 'success');
        loadLibrary();
      }
    });
  });
})();
