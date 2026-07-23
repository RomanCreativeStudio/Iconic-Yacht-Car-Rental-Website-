(function () {
  'use strict';

  /* Header scroll state */
  var header = document.querySelector('.site-header');
  var onScroll = function () {
    if (window.scrollY > 40) {
      header.classList.add('is-scrolled');
    } else {
      header.classList.remove('is-scrolled');
    }
    backToTop.classList.toggle('is-visible', window.scrollY > 700);
  };

  /* Mobile nav toggle */
  var navToggle = document.querySelector('.nav-toggle');
  var mainNav = document.querySelector('.main-nav');

  function closeNav() {
    mainNav.classList.remove('is-open');
    navToggle.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  navToggle.addEventListener('click', function () {
    var isOpen = mainNav.classList.toggle('is-open');
    navToggle.setAttribute('aria-expanded', String(isOpen));
    document.body.style.overflow = isOpen ? 'hidden' : '';
  });

  document.querySelectorAll('.nav-links a').forEach(function (link) {
    link.addEventListener('click', closeNav);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeNav();
  });

  /* Back to top */
  var backToTop = document.querySelector('.back-to-top');
  backToTop.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* Scroll reveal */
  var revealEls = document.querySelectorAll('.reveal, .reveal-stagger');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -60px 0px' }
    );
    revealEls.forEach(function (el) {
      io.observe(el);
    });
  } else {
    revealEls.forEach(function (el) {
      el.classList.add('is-visible');
    });
  }

  /* Fleet tabs */
  var fleetTabs = document.querySelectorAll('.fleet-tab');
  var fleetPanels = document.querySelectorAll('.fleet-panel');

  fleetTabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      var target = tab.getAttribute('data-target');

      fleetTabs.forEach(function (t) {
        t.classList.remove('is-active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('is-active');
      tab.setAttribute('aria-selected', 'true');

      fleetPanels.forEach(function (panel) {
        panel.classList.toggle('is-active', panel.id === target);
      });
    });
  });

  /* Booking form: pre-fill selection from fleet "Book" buttons */
  var rentalTypeField = document.getElementById('rentalType');
  var selectionField = document.getElementById('selection');
  var bookingSection = document.getElementById('booking');

  var yachtSelectValues = [];
  var carSelectValues = [];

  document.querySelectorAll('[data-book-yacht]').forEach(function (btn) {
    yachtSelectValues.push(btn.getAttribute('data-book-yacht'));
  });
  document.querySelectorAll('[data-book-car]').forEach(function (btn) {
    carSelectValues.push(btn.getAttribute('data-book-car'));
  });

  function populateSelectionOptions(type) {
    var list = type === 'Yacht Rental' ? yachtSelectValues : carSelectValues;
    selectionField.innerHTML = '<option value="" disabled selected>Select ' + (type === 'Yacht Rental' ? 'a yacht' : 'a vehicle') + '</option>';
    list.forEach(function (name) {
      var opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name;
      selectionField.appendChild(opt);
    });
    var otherOpt = document.createElement('option');
    otherOpt.value = 'Not sure yet';
    otherOpt.textContent = 'Not sure yet — advise me';
    selectionField.appendChild(otherOpt);
  }

  rentalTypeField.addEventListener('change', function () {
    populateSelectionOptions(rentalTypeField.value);
    toggleGuestsField();
  });

  document.querySelectorAll('[data-book-yacht], [data-book-car]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var isYacht = btn.hasAttribute('data-book-yacht');
      var value = isYacht ? btn.getAttribute('data-book-yacht') : btn.getAttribute('data-book-car');
      rentalTypeField.value = isYacht ? 'Yacht Rental' : 'Car Rental';
      populateSelectionOptions(rentalTypeField.value);
      selectionField.value = value;
      toggleGuestsField();
      bookingSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  /* Show/hide guest count for yachts only */
  var guestsField = document.querySelector('.form-field--guests');
  function toggleGuestsField() {
    if (!guestsField) return;
    var isYacht = rentalTypeField.value === 'Yacht Rental';
    guestsField.style.display = isYacht ? '' : 'none';
  }
  toggleGuestsField();

  /* Booking form validation + submit */
  var form = document.getElementById('bookingForm');
  var successPanel = document.getElementById('bookingSuccess');

  function setError(field, message) {
    var wrapper = field.closest('.form-field');
    var errorEl = wrapper.querySelector('.form-error');
    if (message) {
      wrapper.classList.add('has-error');
      errorEl.textContent = message;
    } else {
      wrapper.classList.remove('has-error');
      errorEl.textContent = '';
    }
  }

  function validateField(field) {
    if (!field.hasAttribute('required')) return true;
    var value = field.value.trim();

    if (!value) {
      setError(field, 'This field is required.');
      return false;
    }

    if (field.type === 'email') {
      var emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(value)) {
        setError(field, 'Enter a valid email address.');
        return false;
      }
    }

    if (field.type === 'tel') {
      var phonePattern = /^[\d\s()+-]{7,}$/;
      if (!phonePattern.test(value)) {
        setError(field, 'Enter a valid phone number.');
        return false;
      }
    }

    setError(field, '');
    return true;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    var fields = form.querySelectorAll('input, select, textarea');
    var isValid = true;
    fields.forEach(function (field) {
      if (field.offsetParent === null) return; // skip hidden fields (e.g. guests when hidden)
      if (!validateField(field)) isValid = false;
    });

    if (!isValid) {
      var firstError = form.querySelector('.has-error input, .has-error select, .has-error textarea');
      if (firstError) firstError.focus();
      return;
    }

    form.classList.add('is-hidden');
    successPanel.classList.add('is-visible');
    successPanel.focus();
    form.reset();
  });

  form.querySelectorAll('input, select, textarea').forEach(function (field) {
    field.addEventListener('blur', function () {
      if (field.hasAttribute('required')) validateField(field);
    });
  });

  /* Footer year */
  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
})();
