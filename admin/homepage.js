/**
 * Iconic Rentals — Homepage CMS
 *
 * Single-table CRUD against `site_content` (one row per section, keyed by
 * `section`), inlined directly rather than through a separate *-service.js
 * — matches admin/dashboard.js's pattern (a single table, no shared logic
 * two files both need), not admin/fleet-service.js's (shared between a
 * list view and a separate editor overlay, which this page doesn't have).
 *
 * Every section is driven by one schema entry below rather than one
 * hand-written form per section — the nine sections share exactly two
 * field shapes (a scalar value, or a reorderable list of small objects),
 * so a generic renderer avoids writing the same list-editor logic nine
 * times. Saving writes straight to site_content; as of Phase 6.6 the
 * public homepage (js/data-service.js + js/homepage-content.js) reads
 * eight of these nine sections live — Luxury Experience categories is
 * the one exception, with no public read path yet.
 *
 * Field type 'image' (Phase 6.13) is the one exception to the generic
 * text/textarea/list shapes above — it reuses admin/image-upload-field.js
 * exactly like admin/clientele-editor.js and admin/instagram-post-editor.js
 * do, rather than a plain text URL input. Only instagram_profile.avatar
 * uses it today, but it's implemented as a real field type (not a
 * one-off avatar hack) since that's this file's whole point: one schema
 * entry drives the form, not hand-written per-field code. Same full
 * public-URL storage convention as the other upload fields — see
 * image-upload-field.js's header comment for why (js/instagram.js reads
 * instagram_profile.avatar straight into an <img src>, no publicUrl()
 * transform at read time).
 */
(function () {
  'use strict';

  var auth = window.IconicAdminAuth;
  var supabase = auth && auth.requireClient();
  if (!supabase) return;

  var SECTIONS = [
    {
      key: 'hero', label: 'Hero',
      fields: [
        { key: 'eyebrow', label: 'Eyebrow', type: 'text' },
        { key: 'title', label: 'Title', type: 'text' },
        { key: 'subtitle', label: 'Subtitle', type: 'textarea' },
        { key: 'cta_primary_label', label: 'Primary CTA Label', type: 'text' },
        { key: 'cta_primary_href', label: 'Primary CTA Link', type: 'text' },
        { key: 'cta_secondary_label', label: 'Secondary CTA Label', type: 'text' },
        { key: 'cta_secondary_href', label: 'Secondary CTA Link', type: 'text' },
        { key: 'stats', label: 'Stats', type: 'list', addLabel: 'Stat', itemFields: [{ key: 'value', label: 'Value', placeholder: 'e.g. 12+' }, { key: 'label', label: 'Label', placeholder: 'e.g. Years in Miami' }] }
      ]
    },
    {
      key: 'about', label: 'About',
      fields: [
        { key: 'eyebrow', label: 'Eyebrow', type: 'text' },
        { key: 'title', label: 'Title', type: 'text' },
        { key: 'body', label: 'Body', type: 'textarea' },
        { key: 'pillars', label: 'Pillars', type: 'list', addLabel: 'Pillar', itemFields: [{ key: 'icon', label: 'Icon key' }, { key: 'title', label: 'Title' }, { key: 'description', label: 'Description' }] }
      ]
    },
    {
      key: 'trust', label: 'Trust Section',
      fields: [
        { key: 'title', label: 'Title', type: 'text' },
        { key: 'pillars', label: 'Pillars', type: 'list', addLabel: 'Pillar', itemFields: [{ key: 'icon', label: 'Icon key' }, { key: 'label', label: 'Label' }] }
      ]
    },
    {
      key: 'statistics', label: 'Statistics',
      fields: [
        { key: 'items', label: 'Counters', type: 'list', addLabel: 'Counter', itemFields: [{ key: 'count', label: 'Count', placeholder: 'e.g. 2400' }, { key: 'suffix', label: 'Suffix', placeholder: 'e.g. +' }, { key: 'label', label: 'Label', placeholder: 'e.g. Happy Clients' }] }
      ]
    },
    {
      key: 'faq', label: 'FAQ',
      fields: [
        { key: 'items', label: 'Questions', type: 'list', addLabel: 'Question', itemFields: [{ key: 'question', label: 'Question' }, { key: 'answer', label: 'Answer', long: true }] }
      ]
    },
    {
      key: 'instagram_profile', label: 'Instagram Profile',
      fields: [
        { key: 'handle', label: 'Handle', type: 'text', placeholder: '@iconic_yacht' },
        { key: 'name', label: 'Display Name', type: 'text' },
        { key: 'url', label: 'Profile URL', type: 'text' },
        { key: 'bio', label: 'Bio', type: 'textarea' },
        { key: 'avatar', label: 'Avatar', type: 'image', bucket: 'avatars', pathPrefix: 'instagram/avatar' },
        { key: 'follower_count', label: 'Follower Count', type: 'text', placeholder: 'Leave blank until real — never invent a number' },
        { key: 'post_count', label: 'Post Count', type: 'text', placeholder: 'Leave blank until real — never invent a number' }
      ]
    },
    {
      key: 'videos_section', label: 'Videos Section',
      fields: [
        { key: 'eyebrow', label: 'Eyebrow', type: 'text' },
        { key: 'title', label: 'Title', type: 'text' },
        { key: 'subtitle', label: 'Subtitle', type: 'textarea' }
      ]
    },
    {
      key: 'clientele_categories', label: 'Clientele Categories',
      fields: [
        { key: 'items', label: 'Categories', type: 'list', addLabel: 'Category', itemFields: [{ key: 'key', label: 'Key' }, { key: 'label', label: 'Label' }, { key: 'description', label: 'Description', long: true }] }
      ]
    },
    {
      key: 'experience_categories', label: 'Experience Categories',
      fields: [
        { key: 'items', label: 'Categories', type: 'list', addLabel: 'Category', itemFields: [{ key: 'key', label: 'Key' }, { key: 'label', label: 'Label' }] }
      ]
    }
  ];

  var homepageView = document.getElementById('homepageView');
  var signOutBtn = document.getElementById('signOutBtn');
  var tabsEl = document.getElementById('sectionTabs');
  var banner = document.getElementById('homepageBanner');
  var successBanner = document.getElementById('homepageSuccessBanner');
  var form = document.getElementById('sectionForm');
  var formTitle = document.getElementById('sectionFormTitle');
  var fieldsEl = document.getElementById('sectionFields');
  var saveBtn = document.getElementById('sectionSaveBtn');

  var allContent = {}; // section key -> stored data object
  var activeSection = SECTIONS[0].key;
  var listControllers = {}; // field key -> { getValues() }
  var imageControllers = {}; // field key -> IconicImageUploadField instance
  var canWrite = true;

  function escapeHtml(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function showBanner(el, message) { el.textContent = message; el.hidden = false; }
  function hideBanner(el) { el.hidden = true; el.textContent = ''; }

  auth.getSessionAndRole(supabase).then(function (result) {
    if (!result.session || !auth.hasDashboardAccess(result.role)) {
      window.location.replace('login.html');
      return;
    }
    canWrite = result.role === 'admin';
    saveBtn.hidden = !canWrite;
    homepageView.hidden = false;
    signOutBtn.hidden = false;
    renderTabs();
    loadAllContent();
  });

  signOutBtn.addEventListener('click', function () {
    if (window.IconicActivityLog) window.IconicActivityLog.log('logout', 'session', null, null);
    supabase.auth.signOut().then(function () { window.location.replace('login.html'); });
  });

  function renderTabs() {
    tabsEl.innerHTML = SECTIONS.map(function (s) {
      return '<button type="button" class="admin-filter-tab' + (s.key === activeSection ? ' is-active' : '') + '" data-section="' + s.key + '" role="tab" aria-selected="' + (s.key === activeSection) + '">' + s.label + '</button>';
    }).join('');
  }

  tabsEl.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-section]');
    if (!btn) return;
    activeSection = btn.getAttribute('data-section');
    renderTabs();
    renderForm();
  });

  function loadAllContent() {
    supabase.from('site_content').select('*').then(function (result) {
      if (result.error) {
        showBanner(banner, 'Couldn’t load homepage content: ' + result.error.message);
        return;
      }
      allContent = {};
      (result.data || []).forEach(function (row) { allContent[row.section] = row.data || {}; });
      saveBtn.disabled = !canWrite;
      renderForm();
    });
  }

  /* -------------------------------------------------------------------
     Generic reorderable list-of-objects editor — same drag/remove/add
     interaction as admin/fleet-editor.js's createDynamicList, extended to
     multiple named fields per row instead of one. Duplicated rather than
     imported from fleet-editor.js on purpose (see admin/media-service.js's
     header comment for the same reasoning: no cross-page script
     dependency for a small, self-contained helper).
  ------------------------------------------------------------------- */
  function createObjectListEditor(containerEl, addBtn, initialItems, itemFields, addLabel) {
    var items = (initialItems || []).map(function (obj) {
      var copy = {};
      itemFields.forEach(function (f) { copy[f.key] = obj && obj[f.key] != null ? String(obj[f.key]) : ''; });
      return copy;
    });

    function render() {
      containerEl.innerHTML = '';
      if (!items.length) {
        var empty = document.createElement('p');
        empty.className = 'dynamic-list-empty';
        empty.textContent = 'None yet.';
        containerEl.appendChild(empty);
        return;
      }
      items.forEach(function (obj, idx) {
        var row = document.createElement('div');
        row.className = 'dynamic-list-row dynamic-object-row';
        row.draggable = true;

        var handle = document.createElement('span');
        handle.className = 'dynamic-list-handle';
        handle.setAttribute('aria-hidden', 'true');
        handle.textContent = '⡗';
        row.appendChild(handle);

        var fieldsWrap = document.createElement('div');
        fieldsWrap.className = 'dynamic-object-fields';
        itemFields.forEach(function (f) {
          var input = document.createElement(f.long ? 'textarea' : 'input');
          if (!f.long) input.type = 'text';
          else input.rows = 2;
          input.value = obj[f.key];
          input.placeholder = f.placeholder || f.label;
          input.addEventListener('input', function () {
            obj[f.key] = input.value;
            if (typeof containerEl._markDirty === 'function') containerEl._markDirty();
          });
          fieldsWrap.appendChild(input);
        });
        row.appendChild(fieldsWrap);

        var removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'dynamic-list-remove';
        removeBtn.setAttribute('aria-label', 'Remove this entry');
        removeBtn.textContent = '×';
        removeBtn.addEventListener('click', function () {
          items.splice(idx, 1);
          if (typeof containerEl._markDirty === 'function') containerEl._markDirty();
          render();
        });
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
          if (typeof containerEl._markDirty === 'function') containerEl._markDirty();
          render();
        });
      });
    }

    render();
    addBtn.onclick = function () {
      var blank = {};
      itemFields.forEach(function (f) { blank[f.key] = ''; });
      items.push(blank);
      if (typeof containerEl._markDirty === 'function') containerEl._markDirty();
      render();
      var lastInputs = containerEl.querySelectorAll('.dynamic-list-row:last-child input, .dynamic-list-row:last-child textarea');
      if (lastInputs.length) lastInputs[0].focus();
    };

    return {
      getValues: function () {
        return items
          .filter(function (obj) { return itemFields.some(function (f) { return obj[f.key].trim() !== ''; }); })
          .map(function (obj) {
            var out = {};
            itemFields.forEach(function (f) { out[f.key] = obj[f.key].trim(); });
            return out;
          });
      }
    };
  }

  /* -------------------------------------------------------------------
     Form rendering, driven entirely by the active section's schema.
  ------------------------------------------------------------------- */
  function renderForm() {
    // Leaving a section behind (switching tabs) is this page's closest
    // equivalent to closing Clientele/Instagram's editor overlay without
    // saving — clean up any freshly-uploaded-but-unsaved image the same
    // way requestClose()'s discard branch does there. A no-op for any
    // controller whose upload was already saved (onSaved() already
    // cleared its freshUpload flag) or that never uploaded anything.
    Object.keys(imageControllers).forEach(function (key) { imageControllers[key].onAbandoned(); });

    var section = SECTIONS.filter(function (s) { return s.key === activeSection; })[0];
    var data = allContent[activeSection] || {};
    formTitle.textContent = section.label;
    fieldsEl.innerHTML = '';
    listControllers = {};
    imageControllers = {};

    section.fields.forEach(function (f) {
      var wrap = document.createElement('div');
      wrap.className = 'form-field full';

      var label = document.createElement('label');
      label.textContent = f.label;
      wrap.appendChild(label);

      if (f.type === 'list') {
        var listEl = document.createElement('div');
        listEl.className = 'dynamic-list';
        listEl._markDirty = function () { saveBtn.disabled = !canWrite; };
        var addBtn = document.createElement('button');
        addBtn.type = 'button';
        addBtn.className = 'btn btn-ghost dynamic-list-add';
        addBtn.textContent = '+ Add ' + (f.addLabel || 'Item');
        wrap.appendChild(listEl);
        wrap.appendChild(addBtn);
        listControllers[f.key] = createObjectListEditor(listEl, addBtn, data[f.key], f.itemFields, f.addLabel);
      } else if (f.type === 'image') {
        var previewWrap = document.createElement('div');
        previewWrap.hidden = true;
        previewWrap.style.marginBottom = '0.5rem';
        var previewImg = document.createElement('img');
        previewImg.alt = 'Current ' + f.label.toLowerCase();
        previewImg.style.cssText = 'max-height:120px;max-width:200px;display:block;background:rgba(255,255,255,0.04);padding:0.5rem;border-radius:var(--radius-sm);';
        previewWrap.appendChild(previewImg);
        wrap.appendChild(previewWrap);

        var fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.id = 'homepageField_' + f.key;
        fileInput.accept = '.jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp';
        wrap.appendChild(fileInput);

        var hint = document.createElement('span');
        hint.className = 'admin-toggle-hint';
        hint.textContent = 'JPG, PNG, or WEBP, up to 20 MB. Uploads immediately.';
        wrap.appendChild(hint);

        imageControllers[f.key] = window.IconicImageUploadField.create({
          fileInput: fileInput,
          previewImg: previewImg,
          previewWrap: previewWrap,
          bucket: f.bucket,
          pathPrefix: f.pathPrefix
        });
        imageControllers[f.key].reset(data[f.key]);
      } else {
        var input = document.createElement(f.type === 'textarea' ? 'textarea' : 'input');
        if (f.type !== 'textarea') input.type = 'text';
        else input.rows = 3;
        input.id = 'homepageField_' + f.key;
        input.placeholder = f.placeholder || '';
        input.value = data[f.key] != null ? data[f.key] : '';
        wrap.appendChild(input);
      }

      fieldsEl.appendChild(wrap);
    });

    if (!canWrite) {
      fieldsEl.querySelectorAll('input, textarea, button').forEach(function (el) { el.disabled = true; });
    }
  }

  function collectFormData() {
    var section = SECTIONS.filter(function (s) { return s.key === activeSection; })[0];
    var out = {};
    section.fields.forEach(function (f) {
      if (f.type === 'list') {
        out[f.key] = listControllers[f.key] ? listControllers[f.key].getValues() : [];
      } else if (f.type === 'image') {
        out[f.key] = imageControllers[f.key] ? imageControllers[f.key].getUrl() : null;
      } else {
        var input = document.getElementById('homepageField_' + f.key);
        out[f.key] = input ? input.value.trim() : '';
      }
    });
    return out;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!canWrite) return;
    hideBanner(banner);
    hideBanner(successBanner);

    var data = collectFormData();
    saveBtn.disabled = true;
    saveBtn.textContent = saveBtn.dataset.loadingLabel;

    supabase.from('site_content')
      .upsert({ section: activeSection, data: data }, { onConflict: 'section' })
      .select()
      .maybeSingle()
      .then(function (result) {
        saveBtn.textContent = saveBtn.dataset.label;
        if (result.error) {
          showBanner(banner, 'Couldn’t save: ' + result.error.message);
          saveBtn.disabled = false;
          return;
        }
        allContent[activeSection] = data;
        Object.keys(imageControllers).forEach(function (key) { imageControllers[key].onSaved(); });
        if (window.IconicActivityLog) window.IconicActivityLog.log('update', 'site_content', activeSection, null);
        showBanner(successBanner, SECTIONS.filter(function (s) { return s.key === activeSection; })[0].label + ' saved.');
        window.IconicAdminUI.showToast('Homepage content saved.', 'success');
      });
  });
})();
