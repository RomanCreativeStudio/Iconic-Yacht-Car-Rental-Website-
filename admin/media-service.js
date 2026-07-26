/**
 * Iconic Rentals — Media Manager Data Service
 *
 * Thin wrapper around Supabase for fleet_media / experience_media rows and
 * their backing files in Storage, shared by admin/media.js. Mirrors
 * admin/fleet-service.js's pattern: a plain object attached to window,
 * built on window.IconicSupabase.getClient(). This file does not enforce
 * access control — Storage RLS (see
 * supabase/migrations/20260726130400_storage_fleet_experience_buckets.sql)
 * and table RLS (20260726130200_fleet_media.sql, 20260726130300_experiences.sql)
 * are the real boundary; a non-admin session gets a permission error back
 * from Supabase, which callers must handle the same way fleet-service.js's
 * callers already do.
 *
 * Slot taxonomy (GALLERY_SLOTS / VIDEO_SLOTS below) is copied from
 * js/fleet-supabase-adapter.js on purpose, not imported — that file isn't
 * loaded on admin pages, and this data structure is small enough that
 * duplicating it beats adding a cross-boundary script dependency. Keep
 * both copies in sync; js/fleet-supabase-adapter.js's own header comment
 * says the same about js/fleet-data.js's shape.
 *
 * Storage path convention (fixed by
 * supabase/migrations/20260726130400_storage_fleet_experience_buckets.sql's
 * own header comment, followed here exactly):
 *   fleet-images / fleet-videos:       {slug}/{section}/{slot_key}.{ext}
 *   fleet-images / fleet-videos (gallery, no fixed slot): {slug}/gallery/{timestamp}-{name}.{ext}
 *   experience-images / experience-videos: {experience_id}/{kind}-{timestamp}-{name}.{ext}
 */
(function (global) {
  'use strict';

  var GALLERY_SLOTS = {
    exterior: [
      { key: 'bow', label: 'Bow' },
      { key: 'stern', label: 'Stern' },
      { key: 'side-profile', label: 'Side Profile' },
      { key: 'flybridge', label: 'Flybridge' },
      { key: 'water-views', label: 'Water Views' }
    ],
    interior: [
      { key: 'main-salon', label: 'Main Salon' },
      { key: 'dining-area', label: 'Dining Area' },
      { key: 'master-cabin', label: 'Master Cabin' },
      { key: 'guest-cabins', label: 'Guest Cabins' },
      { key: 'bathrooms', label: 'Bathrooms' },
      { key: 'galley', label: 'Galley' },
      { key: 'helm', label: 'Helm' }
    ],
    lifestyle: [
      { key: 'dining-setup', label: 'Dining Setup' },
      { key: 'champagne-service', label: 'Champagne Service' },
      { key: 'guests-relaxing', label: 'Guests Relaxing' },
      { key: 'water-toys', label: 'Water Toys' },
      { key: 'swimming-platform', label: 'Swimming Platform' },
      { key: 'sunset-cruise', label: 'Sunset Cruise' },
      { key: 'night-lighting', label: 'Night Lighting' }
    ],
    drone: [
      { key: 'aerial-overview', label: 'Aerial Overview' },
      { key: 'departure-sequence', label: 'Departure Sequence' },
      { key: 'anchored-cove', label: 'Anchored Cove' },
      { key: 'golden-hour-aerial', label: 'Golden Hour Aerial' }
    ]
  };

  var VIDEO_SLOTS = {
    walkthrough: [{ key: 'full-walkthrough', label: 'Full Walkthrough', platform: 'video' }],
    reels: [{ key: 'instagram-reel', label: 'Instagram Reel', platform: 'instagram' }],
    tiktok: [{ key: 'tiktok-video', label: 'TikTok Video', platform: 'tiktok' }],
    tours360: [{ key: 'virtual-tour', label: '360° Virtual Tour', platform: 'tour360' }]
  };

  // hero/card are single-slot-per-item sections with no slot_key of their
  // own (fleet-supabase-adapter.js looks up slot_key === null for these);
  // gallery is an unlimited flat list. Both are still "fixed sections" for
  // the purposes of the upload target picker.
  var FLEET_IMAGE_SECTIONS = ['hero', 'card', 'gallery', 'exterior', 'interior', 'lifestyle', 'drone'];
  var FLEET_VIDEO_SECTIONS = ['walkthrough', 'reels', 'tiktok', 'tours360'];
  var EXPERIENCE_KINDS = { image: ['cover', 'photo'], video: ['video'] };

  var IMAGE_MIME_EXT = { 'image/jpeg': ['jpg', 'jpeg'], 'image/png': ['png'], 'image/webp': ['webp'] };
  var VIDEO_MIME_EXT = { 'video/mp4': ['mp4'], 'video/quicktime': ['mov'], 'video/webm': ['webm'] };
  var MAX_IMAGE_BYTES = 20 * 1024 * 1024; // 20 MB — matches the storage.buckets constraint
  var MAX_VIDEO_BYTES = 500 * 1024 * 1024; // 500 MB — matches the storage.buckets constraint

  function client() {
    return global.IconicSupabase && global.IconicSupabase.getClient();
  }

  function cfg() {
    return global.IconicBookingConfig || null;
  }

  /* -------------------------------------------------------------------
     File validation
  ------------------------------------------------------------------- */
  function extOf(filename) {
    var m = /\.([a-z0-9]+)$/i.exec(filename || '');
    return m ? m[1].toLowerCase() : '';
  }

  /** Classifies a File as 'image' | 'video' | null (unsupported), using
   *  MIME type when the browser reports one it recognizes, falling back
   *  to the file extension (some browsers send an empty/generic type for
   *  .mov files in particular). */
  function classifyFile(file) {
    var ext = extOf(file.name);
    var type = (file.type || '').toLowerCase();

    if (IMAGE_MIME_EXT[type] && IMAGE_MIME_EXT[type].indexOf(ext) !== -1) return 'image';
    if (VIDEO_MIME_EXT[type] && VIDEO_MIME_EXT[type].indexOf(ext) !== -1) return 'video';

    // Fallback: trust the extension alone if the MIME type was empty or
    // generic (application/octet-stream), which some OS/browser
    // combinations send for .mov and .webm.
    if (!type || type === 'application/octet-stream') {
      for (var img in IMAGE_MIME_EXT) if (IMAGE_MIME_EXT[img].indexOf(ext) !== -1) return 'image';
      for (var vid in VIDEO_MIME_EXT) if (VIDEO_MIME_EXT[vid].indexOf(ext) !== -1) return 'video';
    }
    return null;
  }

  /** @returns {{ok:boolean, error:?string, mediaType:?string}} */
  function validateFile(file) {
    var mediaType = classifyFile(file);
    if (!mediaType) {
      return { ok: false, error: '"' + file.name + '" isn’t a supported file type. Use JPG, PNG, or WEBP for images, or MP4, MOV, or WEBM for videos.' };
    }
    var maxBytes = mediaType === 'image' ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
    if (file.size > maxBytes) {
      var maxLabel = mediaType === 'image' ? '20 MB' : '500 MB';
      return { ok: false, error: '"' + file.name + '" is too large (' + formatBytes(file.size) + ') — the limit for ' + mediaType + 's is ' + maxLabel + '.' };
    }
    return { ok: true, error: null, mediaType: mediaType };
  }

  function formatBytes(bytes) {
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  /* -------------------------------------------------------------------
     Path building — see file header for the convention this follows.
  ------------------------------------------------------------------- */
  function sanitizeSegment(str) {
    return String(str || '')
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  function fleetMediaPath(opts) {
    var ext = extOf(opts.filename);
    var base = opts.slug + '/' + opts.section + '/';
    if (opts.slotKey) return base + opts.slotKey + '.' + ext;
    // hero/card/gallery: no fixed slot, path must stay unique per upload.
    var name = sanitizeSegment(opts.filename.replace(/\.[a-z0-9]+$/i, ''));
    return base + Date.now() + (name ? '-' + name : '') + '.' + ext;
  }

  function experienceMediaPath(opts) {
    var ext = extOf(opts.filename);
    var name = sanitizeSegment(opts.filename.replace(/\.[a-z0-9]+$/i, ''));
    return opts.experienceId + '/' + opts.kind + '-' + Date.now() + (name ? '-' + name : '') + '.' + ext;
  }

  function bucketFor(mediaType, parentType) {
    if (parentType === 'experience') return mediaType === 'video' ? 'experience-videos' : 'experience-images';
    return mediaType === 'video' ? 'fleet-videos' : 'fleet-images';
  }

  function publicUrl(bucket, storagePath) {
    var c = cfg();
    if (!storagePath || !c || !c.SUPABASE_URL) return null;
    return c.SUPABASE_URL.replace(/\/$/, '') + '/storage/v1/object/public/' + bucket + '/' + storagePath;
  }

  /* -------------------------------------------------------------------
     Uploads — raw XHR against the Storage REST API instead of the
     supabase-js storage client, solely because XHR exposes
     upload.onprogress (for the progress bars task 4/11 require) and a
     cancelable in-flight request (xhr.abort()); fetch/supabase-js's
     storage.upload() offer neither. RLS on storage.objects (admin-only
     insert/update) is still what actually authorizes this — the request
     just carries the signed-in admin's own access token, exactly like
     the Supabase client would attach internally.
  ------------------------------------------------------------------- */
  function uploadToStorage(bucket, path, file, onProgress, upsert) {
    var supabase = client();
    var c = cfg();
    var xhr = null;
    var aborted = false;

    var promise = (supabase ? supabase.auth.getSession() : Promise.resolve({ data: { session: null } }))
      .then(function (sessionResult) {
        if (aborted) throw { message: 'Upload cancelled.', cancelled: true };
        var session = sessionResult.data && sessionResult.data.session;
        if (!session) throw { message: 'Your session has expired — please sign in again.' };

        return new Promise(function (resolve, reject) {
          var url = c.SUPABASE_URL.replace(/\/$/, '') + '/storage/v1/object/' + bucket + '/' +
            path.split('/').map(encodeURIComponent).join('/');

          xhr = new XMLHttpRequest();
          xhr.open('POST', url, true);
          xhr.setRequestHeader('apikey', c.SUPABASE_ANON_KEY);
          xhr.setRequestHeader('Authorization', 'Bearer ' + session.access_token);
          xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
          xhr.setRequestHeader('x-upsert', upsert ? 'true' : 'false');
          xhr.upload.onprogress = function (e) {
            if (onProgress && e.lengthComputable) onProgress(e.loaded / e.total);
          };
          xhr.onload = function () {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve();
              return;
            }
            var message = 'Upload failed (' + xhr.status + ').';
            try {
              var body = JSON.parse(xhr.responseText);
              if (body && body.message) message = body.message;
            } catch (e) { /* non-JSON error body, keep the generic message */ }
            reject({ message: message, status: xhr.status });
          };
          xhr.onerror = function () {
            reject({ message: 'Network error while uploading — check your connection and try again.' });
          };
          xhr.onabort = function () {
            reject({ message: 'Upload cancelled.', cancelled: true });
          };
          xhr.send(file);
        });
      });

    return {
      promise: promise,
      cancel: function () {
        aborted = true;
        if (xhr) xhr.abort();
      }
    };
  }

  function removeFromStorage(bucket, paths) {
    var supabase = client();
    if (!supabase) return Promise.resolve({ error: { message: 'Not connected.' } });
    return supabase.storage.from(bucket).remove(paths).then(function (result) {
      return { error: result.error || null };
    });
  }

  /* -------------------------------------------------------------------
     Picker data (targets for the upload panel)
  ------------------------------------------------------------------- */
  function listFleetItems() {
    var supabase = client();
    if (!supabase) return Promise.resolve({ data: [], error: { message: 'Not connected.' } });
    return supabase.from('fleet_items').select('id,slug,name,type,published').order('name').then(function (r) {
      return { data: r.data || [], error: r.error || null };
    });
  }

  function listExperiences() {
    var supabase = client();
    if (!supabase) return Promise.resolve({ data: [], error: { message: 'Not connected.' } });
    return supabase.from('experiences').select('id,title,published').order('title').then(function (r) {
      return { data: r.data || [], error: r.error || null };
    });
  }

  /* -------------------------------------------------------------------
     Library — combined fleet_media + experience_media, each row tagged
     with parentType so the UI can filter/render either kind uniformly.
  ------------------------------------------------------------------- */
  function listLibrary() {
    var supabase = client();
    if (!supabase) return Promise.resolve({ data: [], error: { message: 'Not connected.' } });

    return Promise.all([
      supabase.from('fleet_media').select('*, fleet_items(id,name,slug,type,published)').order('created_at', { ascending: false }),
      supabase.from('experience_media').select('*, experiences(id,title,published)').order('created_at', { ascending: false })
    ]).then(function (results) {
      var fleetResult = results[0];
      var expResult = results[1];
      if (fleetResult.error) return { data: [], error: fleetResult.error };
      if (expResult.error) return { data: [], error: expResult.error };

      var fleetRows = (fleetResult.data || []).map(function (row) {
        var parent = row.fleet_items || {};
        return {
          id: row.id,
          parentType: 'fleet',
          parentId: parent.id,
          parentName: parent.name || '(deleted vehicle)',
          parentPublished: !!parent.published,
          mediaType: row.kind === 'video' ? 'video' : 'image',
          section: row.section,
          slotKey: row.slot_key,
          label: row.label,
          alt: row.alt,
          platform: row.platform,
          storage_path: row.storage_path,
          bucket: bucketFor(row.kind === 'video' ? 'video' : 'image', 'fleet'),
          sort_order: row.sort_order,
          created_at: row.created_at,
          raw: row
        };
      });

      var expRows = (expResult.data || []).map(function (row) {
        var parent = row.experiences || {};
        return {
          id: row.id,
          parentType: 'experience',
          parentId: parent.id,
          parentName: parent.title || '(deleted experience)',
          parentPublished: !!parent.published,
          mediaType: row.kind === 'video' ? 'video' : 'image',
          section: row.kind, // cover | photo | video
          slotKey: null,
          label: row.label,
          alt: row.alt,
          platform: row.platform,
          storage_path: row.storage_path,
          bucket: bucketFor(row.kind === 'video' ? 'video' : 'image', 'experience'),
          sort_order: row.sort_order,
          created_at: row.created_at,
          raw: row
        };
      });

      return { data: fleetRows.concat(expRows), error: null };
    });
  }

  /* -------------------------------------------------------------------
     Duplicate-filename guard — reuses the existing `label` column rather
     than adding a new one (see fleet_media/experience_media's schema:
     nothing currently tracks "original uploaded filename" separately).
     Only meaningful for flat/no-slot targets — slotted uploads always
     replace the same slot on purpose, so "duplicate" doesn't apply.
  ------------------------------------------------------------------- */
  function isDuplicateFilename(existingRows, parentId, sectionOrKind, filename) {
    return existingRows.some(function (row) {
      return row.parentId === parentId &&
        row.section === sectionOrKind &&
        !row.slotKey &&
        row.label === filename;
    });
  }

  /* -------------------------------------------------------------------
     High-level operations: upload, replace, delete — each keeps Storage
     and the database row in lockstep to avoid orphans in either
     direction (see file-level comment in admin/media.js for the exact
     ordering rules this follows).
  ------------------------------------------------------------------- */
  function insertFleetMediaRow(payload) {
    var supabase = client();
    return supabase.from('fleet_media').insert(payload).select().maybeSingle().then(function (r) {
      return { data: r.data || null, error: r.error || null };
    });
  }

  function updateFleetMediaRow(id, payload) {
    var supabase = client();
    return supabase.from('fleet_media').update(payload).eq('id', id).select().maybeSingle().then(function (r) {
      return { data: r.data || null, error: r.error || null };
    });
  }

  function deleteFleetMediaRow(id) {
    var supabase = client();
    return supabase.from('fleet_media').delete().eq('id', id).select().then(function (r) {
      if (r.error) return { error: r.error };
      if (!r.data || !r.data.length) return { error: { message: 'Nothing was deleted — you may not have permission.' } };
      return { error: null };
    });
  }

  function insertExperienceMediaRow(payload) {
    var supabase = client();
    return supabase.from('experience_media').insert(payload).select().maybeSingle().then(function (r) {
      return { data: r.data || null, error: r.error || null };
    });
  }

  function updateExperienceMediaRow(id, payload) {
    var supabase = client();
    return supabase.from('experience_media').update(payload).eq('id', id).select().maybeSingle().then(function (r) {
      return { data: r.data || null, error: r.error || null };
    });
  }

  function deleteExperienceMediaRow(id) {
    var supabase = client();
    return supabase.from('experience_media').delete().eq('id', id).select().then(function (r) {
      if (r.error) return { error: r.error };
      if (!r.data || !r.data.length) return { error: { message: 'Nothing was deleted — you may not have permission.' } };
      return { error: null };
    });
  }

  global.IconicMediaService = {
    GALLERY_SLOTS: GALLERY_SLOTS,
    VIDEO_SLOTS: VIDEO_SLOTS,
    FLEET_IMAGE_SECTIONS: FLEET_IMAGE_SECTIONS,
    FLEET_VIDEO_SECTIONS: FLEET_VIDEO_SECTIONS,
    EXPERIENCE_KINDS: EXPERIENCE_KINDS,

    validateFile: validateFile,
    classifyFile: classifyFile,
    formatBytes: formatBytes,
    fleetMediaPath: fleetMediaPath,
    experienceMediaPath: experienceMediaPath,
    bucketFor: bucketFor,
    publicUrl: publicUrl,

    uploadToStorage: uploadToStorage,
    removeFromStorage: removeFromStorage,

    listFleetItems: listFleetItems,
    listExperiences: listExperiences,
    listLibrary: listLibrary,
    isDuplicateFilename: isDuplicateFilename,

    insertFleetMediaRow: insertFleetMediaRow,
    updateFleetMediaRow: updateFleetMediaRow,
    deleteFleetMediaRow: deleteFleetMediaRow,
    insertExperienceMediaRow: insertExperienceMediaRow,
    updateExperienceMediaRow: updateExperienceMediaRow,
    deleteExperienceMediaRow: deleteExperienceMediaRow
  };
})(window);
