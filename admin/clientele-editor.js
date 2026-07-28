/**
 * Iconic Rentals — Clientele Endorsement Editor
 *
 * Owns the edit overlay (#clEditor). Mirrors admin/experience-editor.js's
 * shape (open(mode, item) for 'edit'/'create', dispatches
 * 'iconic-admin:endorsement-saved' on save) — a plain form, no
 * dynamic-list fields needed.
 */
(function (global) {
  'use strict';

  var overlay = document.getElementById('clEditor');
  var form = document.getElementById('clEditorForm');
  var eyebrow = document.getElementById('clEditorEyebrow');
  var titleEl = document.getElementById('clEditorTitle');
  var banner = document.getElementById('clEditorBanner');
  var saveBtn = document.getElementById('clEditorSaveBtn');
  var cancelBtn = document.getElementById('clEditorCancelBtn');

  var fieldName = document.getElementById('clFieldName');
  var fieldRole = document.getElementById('clFieldRole');
  var fieldQuote = document.getElementById('clFieldQuote');
  var fieldPhoto = document.getElementById('clFieldPhoto');
  var fieldLogo = document.getElementById('clFieldLogo');
  var fieldSortOrder = document.getElementById('clFieldSortOrder');
  var fieldApproved = document.getElementById('clFieldApproved');

  var currentMode = null; // 'edit' | 'create'
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
    [fieldName, fieldQuote].forEach(function (el) { setFieldError(el, ''); });
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
    fieldName.value = item.name || '';
    fieldRole.value = item.role || '';
    fieldQuote.value = item.quote || '';
    fieldPhoto.value = item.photo || '';
    fieldLogo.value = item.logo || '';
    fieldSortOrder.value = item.sort_order != null ? item.sort_order : 0;
    fieldApproved.checked = !!item.approved;
    isDirty = false;
  }

  function validate() {
    clearFieldErrors();
    var ok = true;
    if (!fieldName.value.trim()) {
      setFieldError(fieldName, 'Name is required.');
      ok = false;
    }
    if (!fieldQuote.value.trim()) {
      setFieldError(fieldQuote, 'Quote is required.');
      ok = false;
    }
    return ok;
  }

  function collectPayload() {
    return {
      name: fieldName.value.trim(),
      role: fieldRole.value.trim() || null,
      quote: fieldQuote.value.trim(),
      photo: fieldPhoto.value.trim() || null,
      logo: fieldLogo.value.trim() || null,
      sort_order: fieldSortOrder.value !== '' ? parseInt(fieldSortOrder.value, 10) : 0,
      approved: fieldApproved.checked
    };
  }

  function open(mode, item) {
    currentMode = mode;
    currentId = mode === 'edit' ? item.id : null;
    resetForm();
    populate(item);
    eyebrow.textContent = mode === 'edit' ? 'Edit Endorsement' : 'Add Endorsement';
    titleEl.textContent = item.name || 'New Endorsement';
    overlay.hidden = false;
    requestAnimationFrame(function () { overlay.classList.add('is-open'); });
    fieldName.focus();
  }

  function closeImmediately() {
    overlay.classList.remove('is-open');
    window.setTimeout(function () { overlay.hidden = true; }, 250);
  }

  function requestClose() {
    if (!isDirty) { closeImmediately(); return; }
    global.IconicAdminUI.confirmDialog({
      title: 'Discard unsaved changes?',
      message: 'You have unsaved changes to this endorsement. Closing now will discard them.',
      confirmLabel: 'Discard Changes',
      cancelLabel: 'Keep Editing'
    }).then(function (confirmed) {
      if (confirmed) closeImmediately();
    });
  }

  document.querySelectorAll('[data-editor-close]').forEach(function (el) {
    if (el.closest('#clEditor')) el.addEventListener('click', requestClose);
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
      ? global.IconicClienteleService.update(currentId, payload)
      : global.IconicClienteleService.create(payload);

    savePromise.then(function (result) {
      setLoading(false);
      if (result.error) {
        showBanner(result.error.message || 'Something went wrong.');
        return;
      }
      if (!result.data) {
        showBanner('This change wasn’t saved — your account may not have permission to edit endorsements, or this entry no longer exists.');
        return;
      }
      if (global.IconicActivityLog) {
        global.IconicActivityLog.log(currentMode === 'edit' ? 'update' : 'create', 'clientele_endorsement', result.data.id, { name: result.data.name });
      }
      isDirty = false;
      closeImmediately();
      global.IconicAdminUI.showToast(currentMode === 'edit' ? 'Endorsement updated.' : 'Endorsement created.', 'success');
      document.dispatchEvent(new CustomEvent('iconic-admin:endorsement-saved'));
    });
  });

  global.IconicClienteleEditor = { open: open };
})(window);
