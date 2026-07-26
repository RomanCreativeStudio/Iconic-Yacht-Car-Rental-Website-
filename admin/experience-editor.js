/**
 * Iconic Rentals — Experience Editor
 *
 * Owns the edit overlay (#expEditor). Mirrors admin/fleet-editor.js's
 * shape (open(mode, item) for 'edit'/'duplicate', dispatches
 * 'iconic-admin:experience-saved' on save) but experiences have no
 * dynamic-list fields (no specs/features/amenities equivalent), so this
 * file is a plain form — no createDynamicList/createKeyValueList needed.
 */
(function (global) {
  'use strict';

  // Mirrors the `category` check constraint on the `experiences` table
  // (supabase/migrations/20260726130300_experiences.sql) and
  // js/experiences-data.js's EXPERIENCE_CATEGORIES — kept in sync with
  // both by hand, same as admin/media-service.js already does for the
  // fleet media slot taxonomy.
  var CATEGORIES = [
    { key: 'birthday', label: 'Birthday Charters' },
    { key: 'proposal', label: 'Proposal Cruises' },
    { key: 'bachelor', label: 'Bachelor & Bachelorette Parties' },
    { key: 'corporate', label: 'Corporate Events' },
    { key: 'sunset', label: 'Sunset Cruises' },
    { key: 'athlete', label: 'Professional Athlete Charters' },
    { key: 'influencer', label: 'Influencer Experiences' },
    { key: 'vacation', label: 'Luxury Vacations' },
    { key: 'family', label: 'Family Experiences' },
    { key: 'vip', label: 'VIP Events' }
  ];

  var overlay = document.getElementById('expEditor');
  var form = document.getElementById('expEditorForm');
  var eyebrow = document.getElementById('expEditorEyebrow');
  var titleEl = document.getElementById('expEditorTitle');
  var banner = document.getElementById('expEditorBanner');
  var saveBtn = document.getElementById('expEditorSaveBtn');
  var cancelBtn = document.getElementById('expEditorCancelBtn');

  var fieldTitle = document.getElementById('expFieldTitle');
  var fieldCategory = document.getElementById('expFieldCategory');
  var fieldYacht = document.getElementById('expFieldYacht');
  var fieldDate = document.getElementById('expFieldDate');
  var fieldSortOrder = document.getElementById('expFieldSortOrder');
  var fieldDescription = document.getElementById('expFieldDescription');
  var fieldInstaPost = document.getElementById('expFieldInstaPost');
  var fieldInstaReel = document.getElementById('expFieldInstaReel');
  var fieldReviewQuote = document.getElementById('expFieldReviewQuote');
  var fieldReviewName = document.getElementById('expFieldReviewName');
  var fieldReviewRating = document.getElementById('expFieldReviewRating');
  var fieldPublished = document.getElementById('expFieldPublished');
  var fieldFeatured = document.getElementById('expFieldFeatured');
  var fieldArchived = document.getElementById('expFieldArchived');

  var currentMode = null; // 'edit' | 'duplicate'
  var currentId = null;
  var isDirty = false;

  fieldCategory.innerHTML = CATEGORIES.map(function (c) {
    return '<option value="' + c.key + '">' + c.label + '</option>';
  }).join('');

  /**
   * @param {?string} selectValue - slug to select once options load. Omit
   *   to preserve whatever's currently selected instead — callers that set
   *   fieldYacht.value themselves right after calling this must pass it
   *   here rather than assigning it separately: this fetch is async, so a
   *   separate synchronous assignment would run before the matching
   *   <option> exists and silently fail to stick (values.value ignores a
   *   value with no matching option), then get overwritten by this
   *   function's own "preserve current" restore once it does resolve.
   */
  function loadYachtOptions(selectValue) {
    var supabase = global.IconicSupabase && global.IconicSupabase.getClient();
    if (!supabase) return;
    var toSelect = selectValue != null ? selectValue : fieldYacht.value;
    supabase.from('fleet_items').select('slug,name').order('name').then(function (result) {
      var items = result.data || [];
      fieldYacht.innerHTML = '<option value="">— Not tied to one vehicle —</option>' +
        items.map(function (i) { return '<option value="' + i.slug + '">' + escapeHtml(i.name) + '</option>'; }).join('');
      if (toSelect) fieldYacht.value = toSelect;
    });
  }
  loadYachtOptions();

  function escapeHtml(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function showBanner(message) {
    banner.textContent = message;
    banner.hidden = false;
  }
  function hideBanner() {
    banner.hidden = true;
    banner.textContent = '';
  }

  function setFieldError(fieldEl, message) {
    var wrap = fieldEl.closest('.form-field');
    var errorEl = wrap && wrap.querySelector('.form-error');
    if (wrap) wrap.classList.toggle('has-error', !!message);
    if (errorEl) errorEl.textContent = message || '';
  }

  function clearFieldErrors() {
    [fieldTitle, fieldCategory].forEach(function (el) { setFieldError(el, ''); });
  }

  function markDirty() { isDirty = true; }
  form.addEventListener('input', markDirty);
  form.addEventListener('change', markDirty);

  // Archiving retires an experience — it makes no sense for an archived
  // row to still be marked published, so checking Archived un-checks
  // Published for the user rather than silently allowing a contradictory
  // state (mirrors the migration comment's documented intent).
  fieldArchived.addEventListener('change', function () {
    if (fieldArchived.checked) fieldPublished.checked = false;
  });

  function resetForm() {
    hideBanner();
    clearFieldErrors();
    form.reset();
    isDirty = false;
  }

  function populate(item) {
    fieldTitle.value = item.title || '';
    fieldCategory.value = item.category || CATEGORIES[0].key;
    loadYachtOptions(item.yacht_slug || '');
    fieldDate.value = item.date_text || '';
    fieldSortOrder.value = item.sort_order != null ? item.sort_order : 0;
    fieldDescription.value = item.description || '';
    fieldInstaPost.value = item.instagram_post_url || '';
    fieldInstaReel.value = item.instagram_reel_url || '';
    fieldReviewQuote.value = item.client_review_quote || '';
    fieldReviewName.value = item.client_review_guest_name || '';
    fieldReviewRating.value = item.client_review_rating != null ? item.client_review_rating : '';
    fieldPublished.checked = !!item.published;
    fieldFeatured.checked = !!item.featured;
    fieldArchived.checked = !!item.archived;
    isDirty = false;
  }

  function validate() {
    clearFieldErrors();
    var ok = true;
    if (!fieldTitle.value.trim()) {
      setFieldError(fieldTitle, 'Title is required.');
      ok = false;
    }
    if (!fieldCategory.value) {
      setFieldError(fieldCategory, 'Category is required.');
      ok = false;
    }
    var rating = fieldReviewRating.value;
    if (rating !== '' && (Number(rating) < 1 || Number(rating) > 5)) {
      setFieldError(fieldReviewRating, 'Rating must be between 1 and 5.');
      ok = false;
    }
    return ok;
  }

  function collectPayload() {
    return {
      title: fieldTitle.value.trim(),
      category: fieldCategory.value,
      yacht_slug: fieldYacht.value || null,
      date_text: fieldDate.value.trim() || null,
      sort_order: fieldSortOrder.value !== '' ? parseInt(fieldSortOrder.value, 10) : 0,
      description: fieldDescription.value.trim() || null,
      instagram_post_url: fieldInstaPost.value.trim() || null,
      instagram_reel_url: fieldInstaReel.value.trim() || null,
      client_review_quote: fieldReviewQuote.value.trim() || null,
      client_review_guest_name: fieldReviewName.value.trim() || null,
      client_review_rating: fieldReviewRating.value !== '' ? parseInt(fieldReviewRating.value, 10) : null,
      published: fieldPublished.checked,
      featured: fieldFeatured.checked,
      archived: fieldArchived.checked
    };
  }

  function open(mode, item) {
    currentMode = mode;
    currentId = mode === 'edit' ? item.id : null;
    resetForm();
    populate(item);
    eyebrow.textContent = mode === 'duplicate' ? 'Duplicate Experience' : 'Edit Experience';
    titleEl.textContent = item.title || (mode === 'duplicate' ? 'New Experience' : 'Experience');
    overlay.hidden = false;
    requestAnimationFrame(function () { overlay.classList.add('is-open'); });
    fieldTitle.focus();
  }

  function closeImmediately() {
    overlay.classList.remove('is-open');
    window.setTimeout(function () { overlay.hidden = true; }, 250);
  }

  function requestClose() {
    if (!isDirty) { closeImmediately(); return; }
    global.IconicAdminUI.confirmDialog({
      title: 'Discard unsaved changes?',
      message: 'You have unsaved changes to this experience. Closing now will discard them.',
      confirmLabel: 'Discard Changes',
      cancelLabel: 'Keep Editing'
    }).then(function (confirmed) {
      if (confirmed) closeImmediately();
    });
  }

  document.querySelectorAll('[data-editor-close]').forEach(function (el) {
    el.addEventListener('click', requestClose);
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
      ? global.IconicExperienceService.update(currentId, payload)
      : global.IconicExperienceService.create(payload);

    savePromise.then(function (result) {
      setLoading(false);
      if (result.error) {
        var msg = result.error.message || 'Something went wrong.';
        showBanner(msg);
        return;
      }
      if (!result.data) {
        showBanner('This change wasn’t saved — your account may not have permission to edit experiences, or this experience no longer exists.');
        return;
      }
      if (global.IconicActivityLog) {
        global.IconicActivityLog.log(currentMode === 'edit' ? 'update' : 'create', 'experience', result.data.id, { title: result.data.title });
      }
      isDirty = false;
      closeImmediately();
      global.IconicAdminUI.showToast(currentMode === 'edit' ? 'Experience updated.' : 'Experience created.', 'success');
      document.dispatchEvent(new CustomEvent('iconic-admin:experience-saved'));
    });
  });

  global.IconicExperienceEditor = { open: open };
})(window);
