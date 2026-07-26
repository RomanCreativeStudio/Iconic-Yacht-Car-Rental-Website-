/**
 * Iconic Rentals — Fleet Editor
 *
 * Owns the large edit overlay (#fleetEditor). Handles two modes only —
 * "edit" (an existing row, saved via UPDATE) and "duplicate" (a copy of
 * an existing row that doesn't exist yet, saved via INSERT) — there is
 * deliberately no blank "create from scratch" mode in this phase; see
 * CLIENT_SETUP.md, "Fleet Manager" for why adding a genuinely new
 * vehicle is left to a later phase (it needs photos before it can be
 * published, and media upload isn't built yet).
 *
 * admin/fleet.js owns the list/grid and calls window.IconicFleetEditor.open(...);
 * this file dispatches a 'iconic-admin:fleet-saved' event on the document
 * after a successful save so fleet.js knows to refresh the list, keeping
 * the two files from needing to know much about each other.
 */
(function (global) {
  'use strict';

  var overlay = document.getElementById('fleetEditor');
  var form = document.getElementById('fleetEditorForm');
  var eyebrow = document.getElementById('fleetEditorEyebrow');
  var titleEl = document.getElementById('fleetEditorTitle');
  var banner = document.getElementById('fleetEditorBanner');
  var saveBtn = document.getElementById('fleetEditorSaveBtn');
  var cancelBtn = document.getElementById('fleetEditorCancelBtn');

  var fieldType = document.getElementById('fieldType');
  var fieldName = document.getElementById('fieldName');
  var fieldSlug = document.getElementById('fieldSlug');
  var fieldCategory = document.getElementById('fieldCategory');
  var fieldTagline = document.getElementById('fieldTagline');
  var fieldDescription = document.getElementById('fieldDescription');
  var fieldStartingPrice = document.getElementById('fieldStartingPrice');
  var fieldDeposit = document.getElementById('fieldDeposit');
  var fieldCapacity = document.getElementById('fieldCapacity');
  var fieldPublished = document.getElementById('fieldPublished');
  var fieldFeatured = document.getElementById('fieldFeatured');
  var fieldAvailable = document.getElementById('fieldAvailable');

  var specsListEl = document.getElementById('specsList');
  var featuresListEl = document.getElementById('featuresList');
  var amenitiesListEl = document.getElementById('amenitiesList');
  var durationListEl = document.getElementById('durationList');

  var currentMode = null; // 'edit' | 'duplicate'
  var currentId = null;
  var isDirty = false;
  var specsController, featuresController, amenitiesController, durationController;

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
    [fieldName, fieldSlug, fieldCategory].forEach(function (el) { setFieldError(el, ''); });
  }

  function markDirty() {
    isDirty = true;
  }

  form.addEventListener('input', markDirty);
  form.addEventListener('change', markDirty);

  /* -------------------------------------------------------------------
     Generic flat-string dynamic list (Features, Amenities, Duration).
     Supports add / remove / drag-reorder.
  ------------------------------------------------------------------- */
  function createDynamicList(containerEl, addBtn, initialItems, placeholder) {
    var items = (initialItems || []).slice();

    function render() {
      containerEl.innerHTML = '';
      if (!items.length) {
        var empty = document.createElement('p');
        empty.className = 'dynamic-list-empty';
        empty.textContent = 'None yet.';
        containerEl.appendChild(empty);
        return;
      }
      items.forEach(function (val, idx) {
        var row = document.createElement('div');
        row.className = 'dynamic-list-row';
        row.draggable = true;

        var handle = document.createElement('span');
        handle.className = 'dynamic-list-handle';
        handle.setAttribute('aria-hidden', 'true');
        handle.textContent = '⡗';

        var input = document.createElement('input');
        input.type = 'text';
        input.value = val;
        input.placeholder = placeholder || '';
        input.addEventListener('input', function () {
          items[idx] = input.value;
          markDirty();
        });

        var removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'dynamic-list-remove';
        removeBtn.setAttribute('aria-label', 'Remove this entry');
        removeBtn.textContent = '×';
        removeBtn.addEventListener('click', function () {
          items.splice(idx, 1);
          markDirty();
          render();
        });

        row.appendChild(handle);
        row.appendChild(input);
        row.appendChild(removeBtn);
        containerEl.appendChild(row);

        row.addEventListener('dragstart', function (e) {
          e.dataTransfer.setData('text/plain', String(idx));
          e.dataTransfer.effectAllowed = 'move';
        });
        row.addEventListener('dragover', function (e) { e.preventDefault(); });
        row.addEventListener('drop', function (e) {
          e.preventDefault();
          var from = Number(e.dataTransfer.getData('text/plain'));
          if (isNaN(from) || from === idx) return;
          var moved = items.splice(from, 1)[0];
          items.splice(idx, 0, moved);
          markDirty();
          render();
        });
      });
    }

    render();
    addBtn.onclick = function () {
      items.push('');
      markDirty();
      render();
      var lastInput = containerEl.querySelector('.dynamic-list-row:last-child input');
      if (lastInput) lastInput.focus();
    };

    return {
      getValues: function () {
        return items.map(function (v) { return v.trim(); }).filter(function (v) { return v !== ''; });
      }
    };
  }

  /* -------------------------------------------------------------------
     Key/value dynamic list (Specifications -> the `specs` jsonb column).
     Internally an array of [key, value] pairs so display order is
     preserved (matches how fleet-data.js's own `specs` object is
     order-sensitive for display, per its schema comment).
  ------------------------------------------------------------------- */
  function createKeyValueList(containerEl, addBtn, initialObject) {
    var pairs = [];
    Object.keys(initialObject || {}).forEach(function (key) {
      pairs.push([key, String(initialObject[key])]);
    });

    function render() {
      containerEl.innerHTML = '';
      if (!pairs.length) {
        var empty = document.createElement('p');
        empty.className = 'dynamic-list-empty';
        empty.textContent = 'None yet.';
        containerEl.appendChild(empty);
        return;
      }
      pairs.forEach(function (pair, idx) {
        var row = document.createElement('div');
        row.className = 'dynamic-list-row';
        row.draggable = true;

        var handle = document.createElement('span');
        handle.className = 'dynamic-list-handle';
        handle.setAttribute('aria-hidden', 'true');
        handle.textContent = '⡗';

        var keyInput = document.createElement('input');
        keyInput.type = 'text';
        keyInput.value = pair[0];
        keyInput.placeholder = 'Label (e.g. Length)';
        keyInput.style.maxWidth = '38%';
        keyInput.addEventListener('input', function () {
          pairs[idx][0] = keyInput.value;
          markDirty();
        });

        var valueInput = document.createElement('input');
        valueInput.type = 'text';
        valueInput.value = pair[1];
        valueInput.placeholder = 'Value (e.g. 85 ft)';
        valueInput.addEventListener('input', function () {
          pairs[idx][1] = valueInput.value;
          markDirty();
        });

        var removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'dynamic-list-remove';
        removeBtn.setAttribute('aria-label', 'Remove this specification');
        removeBtn.textContent = '×';
        removeBtn.addEventListener('click', function () {
          pairs.splice(idx, 1);
          markDirty();
          render();
        });

        row.appendChild(handle);
        row.appendChild(keyInput);
        row.appendChild(valueInput);
        row.appendChild(removeBtn);
        containerEl.appendChild(row);

        row.addEventListener('dragstart', function (e) {
          e.dataTransfer.setData('text/plain', String(idx));
          e.dataTransfer.effectAllowed = 'move';
        });
        row.addEventListener('dragover', function (e) { e.preventDefault(); });
        row.addEventListener('drop', function (e) {
          e.preventDefault();
          var from = Number(e.dataTransfer.getData('text/plain'));
          if (isNaN(from) || from === idx) return;
          var moved = pairs.splice(from, 1)[0];
          pairs.splice(idx, 0, moved);
          markDirty();
          render();
        });
      });
    }

    render();
    addBtn.onclick = function () {
      pairs.push(['', '']);
      markDirty();
      render();
      var lastInput = containerEl.querySelector('.dynamic-list-row:last-child input');
      if (lastInput) lastInput.focus();
    };

    return {
      getObject: function () {
        var out = {};
        pairs.forEach(function (pair) {
          var key = pair[0].trim();
          var value = pair[1].trim();
          if (key !== '' && value !== '') out[key] = value;
        });
        return out;
      }
    };
  }

  function slugify(text) {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /* Auto-fill the slug from the name, but only while the slug field
     hasn't been touched by hand yet — a manual edit "locks" it. */
  var slugTouched = false;
  fieldSlug.addEventListener('input', function () { slugTouched = true; });
  fieldName.addEventListener('input', function () {
    if (!slugTouched) fieldSlug.value = slugify(fieldName.value);
  });

  function resetForm() {
    hideBanner();
    clearFieldErrors();
    form.reset();
    slugTouched = false;
    isDirty = false;
  }

  function populate(item) {
    fieldType.value = item.type || 'yacht';
    fieldName.value = item.name || '';
    fieldSlug.value = item.slug || '';
    fieldCategory.value = item.category || '';
    fieldTagline.value = item.tagline || '';
    fieldDescription.value = item.description || '';
    fieldStartingPrice.value = item.starting_price != null ? item.starting_price : '';
    fieldDeposit.value = item.deposit_amount != null ? item.deposit_amount : '';
    fieldCapacity.value = item.capacity != null ? item.capacity : '';
    fieldPublished.checked = !!item.published;
    fieldFeatured.checked = !!item.featured;
    fieldAvailable.checked = item.available !== false;

    specsController = createKeyValueList(specsListEl, document.querySelector('[data-add="specs"]'), item.specs || {});
    featuresController = createDynamicList(featuresListEl, document.querySelector('[data-add="features"]'), item.features || [], 'e.g. Sun Deck');
    amenitiesController = createDynamicList(amenitiesListEl, document.querySelector('[data-add="amenities"]'), item.amenities || [], 'e.g. Bluetooth sound system');
    durationController = createDynamicList(durationListEl, document.querySelector('[data-add="duration"]'), item.duration_options || [], 'e.g. Full day');

    slugTouched = true; // never auto-overwrite an existing/duplicated slug
    isDirty = false;
  }

  function validate() {
    clearFieldErrors();
    var ok = true;

    if (!fieldName.value.trim()) {
      setFieldError(fieldName, 'Name is required.');
      ok = false;
    }
    var slug = fieldSlug.value.trim();
    if (!slug) {
      setFieldError(fieldSlug, 'Slug is required.');
      ok = false;
    } else if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
      setFieldError(fieldSlug, 'Lowercase letters, numbers, and hyphens only (e.g. "azure-horizon").');
      ok = false;
    }
    if (!fieldCategory.value.trim()) {
      setFieldError(fieldCategory, 'Category is required.');
      ok = false;
    }
    return ok;
  }

  function collectPayload() {
    var name = fieldName.value.trim();
    var category = fieldCategory.value.trim();
    return {
      type: fieldType.value,
      name: name,
      slug: fieldSlug.value.trim(),
      category: category,
      tagline: fieldTagline.value.trim() || null,
      description: fieldDescription.value.trim() || null,
      starting_price: fieldStartingPrice.value !== '' ? Number(fieldStartingPrice.value) : null,
      deposit_amount: fieldDeposit.value !== '' ? Number(fieldDeposit.value) : null,
      capacity: fieldCapacity.value !== '' ? parseInt(fieldCapacity.value, 10) : null,
      published: fieldPublished.checked,
      featured: fieldFeatured.checked,
      available: fieldAvailable.checked,
      specs: specsController.getObject(),
      features: featuresController.getValues(),
      amenities: amenitiesController.getValues(),
      duration_options: durationController.getValues(),
      book_label: global.IconicFleetService.deriveBookLabel(name, category)
    };
  }

  function open(mode, item) {
    currentMode = mode;
    currentId = mode === 'edit' ? item.id : null;
    resetForm();
    populate(item);
    eyebrow.textContent = mode === 'duplicate' ? 'Duplicate Vehicle' : 'Edit Vehicle';
    titleEl.textContent = item.name || (mode === 'duplicate' ? 'New Vehicle' : 'Vehicle');
    overlay.hidden = false;
    requestAnimationFrame(function () { overlay.classList.add('is-open'); });
    fieldName.focus();
  }

  function closeImmediately() {
    overlay.classList.remove('is-open');
    window.setTimeout(function () { overlay.hidden = true; }, 250);
  }

  function requestClose() {
    if (!isDirty) {
      closeImmediately();
      return;
    }
    global.IconicAdminUI.confirmDialog({
      title: 'Discard unsaved changes?',
      message: 'You have unsaved changes to this vehicle. Closing now will discard them.',
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
      saveBtn.textContent = loading
        ? (saveBtn.dataset.loadingLabel || 'Saving…')
        : (saveBtn.dataset.label || 'Save Changes');
    };
    setLoading(true);

    var savePromise = currentMode === 'edit'
      ? global.IconicFleetService.update(currentId, payload)
      : global.IconicFleetService.create(payload);

    savePromise.then(function (result) {
      setLoading(false);
      if (result.error) {
        var msg = result.error.message || 'Something went wrong.';
        if (result.error.code === '23505' || /duplicate key/i.test(msg)) {
          setFieldError(fieldSlug, 'That slug is already in use — choose a different one.');
          msg = 'That slug is already in use — choose a different one.';
        }
        showBanner(msg);
        return;
      }
      if (!result.data) {
        // An UPDATE blocked by Row Level Security (a signed-in `staff`
        // session, per the admin-only write policy) completes without a
        // thrown error but affects zero rows — PostgREST has nothing to
        // hand back. Treat "no row came back" as a failure, not a
        // silent success, so a non-admin never sees a false "Saved."
        showBanner('This change wasn’t saved — your account may not have permission to edit the fleet, or this vehicle no longer exists.');
        return;
      }
      isDirty = false;
      closeImmediately();
      global.IconicAdminUI.showToast(
        currentMode === 'edit' ? 'Vehicle updated.' : 'Vehicle created.',
        'success'
      );
      document.dispatchEvent(new CustomEvent('iconic-admin:fleet-saved'));
    });
  });

  global.IconicFleetEditor = { open: open };
})(window);
