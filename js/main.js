(function () {
  'use strict';

  /* Render homepage fleet grids from the shared fleet data module.
     No-op on pages (e.g. fleet detail) that don't have these containers. */
  if (window.IconicFleet && window.IconicFleetRender) {
    var yachtGrid = document.getElementById('yachtFleetGrid');
    var carGrid = document.getElementById('carFleetGrid');
    if (yachtGrid) window.IconicFleetRender.renderFleetGrid(yachtGrid, window.IconicFleet.getFleetByType('yacht'));
    if (carGrid) window.IconicFleetRender.renderFleetGrid(carGrid, window.IconicFleet.getFleetByType('car'));
  }

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

  /* Shared body-scroll lock (nav + lightbox can each hold a lock) */
  var scrollLockCount = 0;
  function lockBodyScroll() {
    scrollLockCount += 1;
    document.body.style.overflow = 'hidden';
  }
  function unlockBodyScroll() {
    scrollLockCount = Math.max(0, scrollLockCount - 1);
    if (scrollLockCount === 0) document.body.style.overflow = '';
  }

  /* Shared helpers for the booking forms (full form + Quick Book modal) */
  var pageLoadedAt = Date.now();

  function setButtonLoading(btn, isLoading) {
    if (isLoading) {
      btn.disabled = true;
      btn.classList.add('is-loading');
      if (!btn.querySelector('.btn-spinner')) {
        var spinner = document.createElement('span');
        spinner.className = 'btn-spinner';
        spinner.setAttribute('aria-hidden', 'true');
        btn.appendChild(spinner);
      }
      if (btn.dataset.loadingLabel) {
        btn.dataset.originalHtml = btn.dataset.originalHtml || btn.innerHTML;
        var spinnerEl = btn.querySelector('.btn-spinner');
        btn.textContent = btn.dataset.loadingLabel + ' ';
        if (spinnerEl) btn.appendChild(spinnerEl);
      }
    } else {
      btn.disabled = false;
      btn.classList.remove('is-loading');
      if (btn.dataset.originalHtml) {
        btn.innerHTML = btn.dataset.originalHtml;
      }
    }
  }

  function showFormBanner(banner, message) {
    if (!banner) return;
    banner.textContent = message;
    banner.hidden = false;
    banner.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function hideFormBanner(banner) {
    if (!banner) return;
    banner.hidden = true;
    banner.textContent = '';
  }

  /* Mobile nav toggle */
  var navToggle = document.querySelector('.nav-toggle');
  var mainNav = document.querySelector('.main-nav');

  function closeNav() {
    if (!mainNav.classList.contains('is-open')) return;
    mainNav.classList.remove('is-open');
    navToggle.setAttribute('aria-expanded', 'false');
    unlockBodyScroll();
  }

  navToggle.addEventListener('click', function () {
    var isOpen = mainNav.classList.toggle('is-open');
    navToggle.setAttribute('aria-expanded', String(isOpen));
    if (isOpen) {
      lockBodyScroll();
    } else {
      unlockBodyScroll();
    }
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

  /* Booking form: pre-fill selection from fleet "Book" buttons.
     Only present on index.html — guarded so shared chrome (header, nav,
     lightbox, floating widgets) still works unchanged on fleet detail pages. */
  var rentalTypeField = document.getElementById('rentalType');
  var selectionField = document.getElementById('selection');
  var bookingSection = document.getElementById('booking');
  var form = document.getElementById('bookingForm');
  var successPanel = document.getElementById('bookingSuccess');

  if (rentalTypeField && selectionField && bookingSection && form && successPanel) {
    var yachtSelectValues = [];
    var carSelectValues = [];

    document.querySelectorAll('[data-book-yacht]').forEach(function (btn) {
      yachtSelectValues.push(btn.getAttribute('data-book-yacht'));
    });
    document.querySelectorAll('[data-book-car]').forEach(function (btn) {
      carSelectValues.push(btn.getAttribute('data-book-car'));
    });

    var populateSelectionOptions = function (type) {
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
    };

    var guestsField = document.querySelector('.form-field--guests');
    var toggleGuestsField = function () {
      if (!guestsField) return;
      var isYacht = rentalTypeField.value === 'Yacht Rental';
      guestsField.style.display = isYacht ? '' : 'none';
    };

    var selectFleetItem = function (isYacht, value) {
      rentalTypeField.value = isYacht ? 'Yacht Rental' : 'Car Rental';
      populateSelectionOptions(rentalTypeField.value);
      selectionField.value = value;
      toggleGuestsField();
    };

    rentalTypeField.addEventListener('change', function () {
      populateSelectionOptions(rentalTypeField.value);
      toggleGuestsField();
    });

    document.querySelectorAll('[data-book-yacht], [data-book-car]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var isYacht = btn.hasAttribute('data-book-yacht');
        var value = isYacht ? btn.getAttribute('data-book-yacht') : btn.getAttribute('data-book-car');
        selectFleetItem(isYacht, value);
        bookingSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });

    toggleGuestsField();

    /* Cross-page prefill: a fleet detail page's "Book Now" links here as
       index.html?book=<slug>#booking. Resolve the slug via the shared
       fleet data module and prefill the same way an on-page card would. */
    (function () {
      var bookSlug = new URLSearchParams(window.location.search).get('book');
      if (!bookSlug || !window.IconicFleet) return;
      var item = window.IconicFleet.getFleetItem(bookSlug);
      if (!item) return;
      selectFleetItem(item.type === 'yacht', item.bookLabel);
      window.setTimeout(function () {
        bookingSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300);
    })();

    /* Booking form validation + submit */
    var setError = function (field, message) {
      var wrapper = field.closest('.form-field');
      var errorEl = wrapper.querySelector('.form-error');
      if (message) {
        wrapper.classList.add('has-error');
        errorEl.textContent = message;
        field.setAttribute('aria-invalid', 'true');
      } else {
        wrapper.classList.remove('has-error');
        errorEl.textContent = '';
        field.removeAttribute('aria-invalid');
      }
    };

    var shakeField = function (field) {
      var wrapper = field.closest('.form-field');
      wrapper.classList.remove('is-shaking');
      wrapper.offsetWidth; /* force reflow so the animation can retrigger */
      wrapper.classList.add('is-shaking');
    };

    var validateField = function (field) {
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
    };

    var bookingBanner = document.getElementById('bookingFormBanner');
    var bookingSubmitBtn = form.querySelector('button[type="submit"]');

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      hideFormBanner(bookingBanner);

      if (window.IconicBookingAPI && window.IconicBookingAPI.isLikelySpam(form, pageLoadedAt)) {
        // Silently "succeed" for bots — never reveal the honeypot to whoever/whatever tripped it.
        form.classList.add('is-hidden');
        successPanel.classList.add('is-visible');
        form.reset();
        return;
      }

      var fields = form.querySelectorAll('input, select, textarea');
      var isValid = true;
      fields.forEach(function (field) {
        if (field.offsetParent === null) return; // skip hidden fields (e.g. guests when hidden)
        if (!validateField(field)) {
          isValid = false;
          shakeField(field);
        }
      });

      if (!isValid) {
        var firstError = form.querySelector('.has-error input, .has-error select, .has-error textarea');
        if (firstError) firstError.focus();
        return;
      }

      var payload = {
        name: document.getElementById('fullName').value.trim(),
        phone: document.getElementById('phone').value.trim(),
        email: document.getElementById('email').value.trim(),
        rental_type: rentalTypeField.value,
        fleet_item: selectionField.value || null,
        date: document.getElementById('date').value || null,
        time: document.getElementById('time').value || null,
        duration: document.getElementById('duration').value || null,
        guests: guestsField && guestsField.style.display !== 'none' && document.getElementById('guests').value
          ? parseInt(document.getElementById('guests').value, 10)
          : null,
        message: document.getElementById('requests').value.trim() || null,
        source: 'full_form'
      };

      if (!window.IconicBookingAPI) {
        showFormBanner(bookingBanner, 'The reservation system is temporarily unavailable. Please call or email us directly.');
        return;
      }

      if (bookingSubmitBtn) setButtonLoading(bookingSubmitBtn, true);

      window.IconicBookingAPI.submitBooking(payload)
        .then(function () {
          if (window.IconicAnalytics) {
            window.IconicAnalytics.track('booking_form_submit', {
              form: 'full',
              rental_type: payload.rental_type,
              selection: payload.fleet_item
            });
          }

          form.classList.add('is-hidden');
          successPanel.classList.add('is-visible');
          successPanel.focus();
          form.reset();
        })
        .catch(function (err) {
          showFormBanner(bookingBanner, (err && err.message) || 'Something went wrong sending your request. Please try again or call us directly.');
        })
        .then(function () {
          if (bookingSubmitBtn) setButtonLoading(bookingSubmitBtn, false);
        });
    });

    form.querySelectorAll('input, select, textarea').forEach(function (field) {
      field.addEventListener('blur', function () {
        if (field.hasAttribute('required')) validateField(field);
      });
    });
  }

  /* Gallery lightbox (keyboard arrows + swipe between images) */
  var lightbox = document.getElementById('lightbox');
  var lightboxImage = document.getElementById('lightboxImage');
  var lightboxCaption = document.getElementById('lightboxCaption');
  var lightboxClose = document.querySelector('.lightbox-close');
  var lightboxPrevBtn = document.querySelector('.lightbox-prev');
  var lightboxNextBtn = document.querySelector('.lightbox-next');
  var lightboxTriggers = Array.prototype.slice.call(document.querySelectorAll('[data-lightbox-src]'));
  var lightboxTrigger = null;
  var lightboxIndex = -1;

  function showLightboxAt(index) {
    if (!lightboxTriggers.length) return;
    lightboxIndex = (index + lightboxTriggers.length) % lightboxTriggers.length;
    var trigger = lightboxTriggers[lightboxIndex];
    var src = trigger.getAttribute('data-lightbox-src');
    var caption = trigger.getAttribute('data-lightbox-caption') || '';

    lightboxImage.style.opacity = '0';
    window.setTimeout(function () {
      lightboxImage.src = src;
      lightboxImage.alt = caption;
      lightboxCaption.textContent = caption;
      lightboxImage.style.opacity = '1';
    }, 120);
  }

  function openLightbox(trigger) {
    if (!trigger.getAttribute('data-lightbox-src')) return;
    lightboxTrigger = trigger;
    lightboxIndex = lightboxTriggers.indexOf(trigger);
    showLightboxAt(lightboxIndex);

    lightbox.hidden = false;
    lightbox.classList.add('is-open');
    lockBodyScroll();
    /* Deferred past the entrance transition: a clicked <button> reclaims
       focus as part of the browser's own post-click handling, which runs
       later than a same-tick focus() call and would otherwise win the race. */
    window.setTimeout(function () {
      lightboxClose.focus();
    }, 320);
  }

  function closeLightbox() {
    if (lightbox.hidden) return;
    lightbox.classList.remove('is-open');
    unlockBodyScroll();
    window.setTimeout(function () {
      lightbox.hidden = true;
      lightboxImage.src = '';
    }, 300);
    if (lightboxTrigger) {
      lightboxTrigger.focus();
      lightboxTrigger = null;
    }
  }

  lightboxTriggers.forEach(function (trigger) {
    trigger.addEventListener('click', function () {
      openLightbox(trigger);
    });
  });

  if (lightboxPrevBtn) lightboxPrevBtn.addEventListener('click', function () { showLightboxAt(lightboxIndex - 1); });
  if (lightboxNextBtn) lightboxNextBtn.addEventListener('click', function () { showLightboxAt(lightboxIndex + 1); });

  lightboxClose.addEventListener('click', closeLightbox);

  lightbox.addEventListener('click', function (e) {
    if (e.target === lightbox) closeLightbox();
  });

  document.addEventListener('keydown', function (e) {
    if (lightbox.hidden) return;

    if (e.key === 'Escape') {
      closeLightbox();
    } else if (e.key === 'ArrowRight') {
      showLightboxAt(lightboxIndex + 1);
    } else if (e.key === 'ArrowLeft') {
      showLightboxAt(lightboxIndex - 1);
    } else if (e.key === 'Tab') {
      // Focusable controls are limited — keep focus cycling within the dialog.
      var focusables = [lightboxPrevBtn, lightboxNextBtn, lightboxClose].filter(Boolean);
      var currentIdx = focusables.indexOf(document.activeElement);
      e.preventDefault();
      var nextIdx = e.shiftKey
        ? (currentIdx <= 0 ? focusables.length - 1 : currentIdx - 1)
        : (currentIdx === -1 || currentIdx === focusables.length - 1 ? 0 : currentIdx + 1);
      focusables[nextIdx].focus();
    }
  });

  /* Touch swipe support */
  (function () {
    var touchStartX = null;
    var figure = document.querySelector('.lightbox-figure');
    if (!figure) return;

    figure.addEventListener('touchstart', function (e) {
      touchStartX = e.changedTouches[0].clientX;
    }, { passive: true });

    figure.addEventListener('touchend', function (e) {
      if (touchStartX === null) return;
      var dx = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(dx) > 50) {
        showLightboxAt(lightboxIndex + (dx < 0 ? 1 : -1));
      }
      touchStartX = null;
    }, { passive: true });
  })();

  /* Sticky mobile CTA + floating contact menu: hide on scroll down, show on scroll up */
  var stickyCta = document.getElementById('stickyMobileCta');
  var floatingContact = document.getElementById('floatingContact');
  var lastScrollY = window.scrollY;
  var scrollDirTicking = false;

  function handleScrollDirection() {
    var currentY = window.scrollY;
    var goingDown = currentY > lastScrollY && currentY > 120;

    if (stickyCta) stickyCta.classList.toggle('is-hidden', goingDown);
    if (floatingContact) floatingContact.classList.toggle('is-nudged', goingDown);

    lastScrollY = currentY;
    scrollDirTicking = false;
  }

  window.addEventListener('scroll', function () {
    if (!scrollDirTicking) {
      window.requestAnimationFrame(handleScrollDirection);
      scrollDirTicking = true;
    }
  }, { passive: true });

  /* Floating contact expand/collapse */
  var floatingToggle = document.getElementById('floatingContactToggle');
  if (floatingToggle && floatingContact) {
    floatingToggle.addEventListener('click', function () {
      var isOpen = floatingContact.classList.toggle('is-open');
      floatingToggle.setAttribute('aria-expanded', String(isOpen));
    });

    document.addEventListener('click', function (e) {
      if (floatingContact.classList.contains('is-open') && !floatingContact.contains(e.target)) {
        floatingContact.classList.remove('is-open');
        floatingToggle.setAttribute('aria-expanded', 'false');
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && floatingContact.classList.contains('is-open')) {
        floatingContact.classList.remove('is-open');
        floatingToggle.setAttribute('aria-expanded', 'false');
        floatingToggle.focus();
      }
    });
  }

  /* Quick Book modal */
  (function () {
    var modal = document.getElementById('quickBookModal');
    if (!modal) return;

    var qbForm = document.getElementById('quickBookForm');
    var qbSuccess = document.getElementById('quickBookSuccess');
    var openers = document.querySelectorAll('[data-quick-book]');
    var closers = modal.querySelectorAll('[data-quick-book-close]');
    var lastFocusedEl = null;

    var modalOpenedAt = null;

    function openModal(e) {
      if (e) e.preventDefault();
      lastFocusedEl = document.activeElement;
      modalOpenedAt = Date.now();
      modal.hidden = false;
      modal.classList.add('is-open');
      lockBodyScroll();
      window.setTimeout(function () {
        var firstField = modal.querySelector('#qbName');
        if (firstField) firstField.focus();
      }, 320);
    }

    function closeModal() {
      if (modal.hidden) return;
      modal.classList.remove('is-open');
      unlockBodyScroll();
      window.setTimeout(function () {
        modal.hidden = true;
      }, 300);
      if (lastFocusedEl) lastFocusedEl.focus();
    }

    openers.forEach(function (opener) {
      opener.addEventListener('click', function (e) {
        // "See all options" link inside the modal navigates instead of reopening.
        if (opener.hasAttribute('data-quick-book-full')) return;
        openModal(e);
      });
    });

    closers.forEach(function (closer) {
      closer.addEventListener('click', function (e) {
        if (closer.hasAttribute('data-quick-book-full')) {
          closeModal();
          return;
        }
        e.preventDefault();
        closeModal();
      });
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !modal.hidden) closeModal();

      if (e.key === 'Tab' && !modal.hidden) {
        var focusables = Array.prototype.slice.call(
          modal.querySelectorAll('button, [href], input, select, textarea')
        ).filter(function (el) { return el.offsetParent !== null; });
        if (!focusables.length) return;
        var first = focusables[0];
        var last = focusables[focusables.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    });

    function qbSetError(field, message) {
      var wrapper = field.closest('.form-field');
      var errorEl = wrapper.querySelector('.form-error');
      if (message) {
        wrapper.classList.add('has-error');
        errorEl.textContent = message;
        field.setAttribute('aria-invalid', 'true');
      } else {
        wrapper.classList.remove('has-error');
        errorEl.textContent = '';
        field.removeAttribute('aria-invalid');
      }
    }

    function qbShake(field) {
      var wrapper = field.closest('.form-field');
      wrapper.classList.remove('is-shaking');
      wrapper.offsetWidth; /* force reflow to allow re-trigger */
      wrapper.classList.add('is-shaking');
    }

    function qbValidateField(field) {
      if (!field.hasAttribute('required')) return true;
      var value = field.value.trim();

      if (!value) {
        qbSetError(field, 'This field is required.');
        return false;
      }
      if (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        qbSetError(field, 'Enter a valid email address.');
        return false;
      }
      if (field.type === 'tel' && !/^[\d\s()+-]{7,}$/.test(value)) {
        qbSetError(field, 'Enter a valid phone number.');
        return false;
      }

      qbSetError(field, '');
      return true;
    }

    var qbBanner = document.getElementById('quickBookFormBanner');
    var qbSubmitBtn = qbForm.querySelector('button[type="submit"]');

    function finishQbSuccess() {
      qbForm.classList.add('is-hidden');
      qbSuccess.classList.add('is-visible');
      qbSuccess.focus();
      qbForm.reset();

      window.setTimeout(function () {
        closeModal();
        window.setTimeout(function () {
          qbForm.classList.remove('is-hidden');
          qbSuccess.classList.remove('is-visible');
        }, 400);
      }, 2600);
    }

    qbForm.addEventListener('submit', function (e) {
      e.preventDefault();
      hideFormBanner(qbBanner);

      if (window.IconicBookingAPI && window.IconicBookingAPI.isLikelySpam(qbForm, modalOpenedAt)) {
        finishQbSuccess();
        return;
      }

      var fields = qbForm.querySelectorAll('input, select, textarea');
      var isValid = true;
      fields.forEach(function (field) {
        if (!qbValidateField(field)) {
          isValid = false;
          qbShake(field);
        }
      });

      if (!isValid) {
        var firstError = qbForm.querySelector('.has-error input, .has-error select, .has-error textarea');
        if (firstError) firstError.focus();
        return;
      }

      var qbPayload = {
        name: document.getElementById('qbName').value.trim(),
        phone: document.getElementById('qbPhone').value.trim(),
        email: document.getElementById('qbEmail').value.trim(),
        rental_type: document.getElementById('qbRentalType').value,
        fleet_item: null,
        date: document.getElementById('qbDate').value || null,
        time: null,
        duration: null,
        guests: null,
        message: null,
        source: 'quick_form'
      };

      if (!window.IconicBookingAPI) {
        showFormBanner(qbBanner, 'The reservation system is temporarily unavailable. Please call or email us directly.');
        return;
      }

      if (qbSubmitBtn) setButtonLoading(qbSubmitBtn, true);

      window.IconicBookingAPI.submitBooking(qbPayload)
        .then(function () {
          if (window.IconicAnalytics) {
            window.IconicAnalytics.track('booking_form_submit', {
              form: 'quick',
              rental_type: qbPayload.rental_type
            });
          }
          finishQbSuccess();
        })
        .catch(function (err) {
          showFormBanner(qbBanner, (err && err.message) || 'Something went wrong sending your request. Please try again or call us directly.');
        })
        .then(function () {
          if (qbSubmitBtn) setButtonLoading(qbSubmitBtn, false);
        });
    });

    qbForm.querySelectorAll('input, select, textarea').forEach(function (field) {
      field.addEventListener('blur', function () {
        if (field.hasAttribute('required')) qbValidateField(field);
      });
    });
  })();

  /* Active nav-link highlighting (scroll-spy) */
  (function () {
    var navLinks = Array.prototype.slice.call(document.querySelectorAll('.nav-links a[href^="#"]'));
    if (!navLinks.length || !('IntersectionObserver' in window)) return;

    var sections = navLinks
      .map(function (link) {
        var id = link.getAttribute('href').slice(1);
        return document.getElementById(id);
      })
      .filter(Boolean);

    if (!sections.length) return;

    var spy = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          var link = navLinks.filter(function (l) { return l.getAttribute('href') === '#' + entry.target.id; })[0];
          if (!link) return;
          if (entry.isIntersecting) {
            navLinks.forEach(function (l) { l.classList.remove('is-active-link'); });
            link.classList.add('is-active-link');
          }
        });
      },
      { rootMargin: '-45% 0px -50% 0px', threshold: 0 }
    );

    sections.forEach(function (section) { spy.observe(section); });
  })();

  /* Button ripple effect */
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('.btn');
    if (!btn) return;

    var rect = btn.getBoundingClientRect();
    var ripple = document.createElement('span');
    var size = Math.max(rect.width, rect.height) * 1.6;
    ripple.className = 'btn-ripple';
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
    ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
    btn.appendChild(ripple);
    window.setTimeout(function () {
      ripple.remove();
    }, 650);
  });

  /* FAQ accordion (single item open at a time) */
  (function () {
    var faqItems = Array.prototype.slice.call(document.querySelectorAll('.faq-item'));
    if (!faqItems.length) return;

    function closeFaq(item) {
      var btn = item.querySelector('.faq-question');
      var answer = item.querySelector('.faq-answer');
      btn.setAttribute('aria-expanded', 'false');
      answer.classList.remove('is-open');
      window.setTimeout(function () {
        answer.hidden = true;
      }, 650);
    }

    function openFaq(item) {
      var btn = item.querySelector('.faq-question');
      var answer = item.querySelector('.faq-answer');
      btn.setAttribute('aria-expanded', 'true');
      answer.hidden = false;
      window.requestAnimationFrame(function () {
        answer.classList.add('is-open');
      });
    }

    faqItems.forEach(function (item) {
      var btn = item.querySelector('.faq-question');
      btn.addEventListener('click', function () {
        var isOpen = btn.getAttribute('aria-expanded') === 'true';
        faqItems.forEach(function (other) {
          if (other !== item) closeFaq(other);
        });
        if (isOpen) {
          closeFaq(item);
        } else {
          openFaq(item);
        }
      });
    });
  })();

  /* Animated trust counters (count up once, when scrolled into view) */
  (function () {
    var counters = document.querySelectorAll('[data-counter]');
    if (!counters.length) return;

    function animateCounter(el) {
      var target = parseInt(el.getAttribute('data-count-to'), 10) || 0;
      var suffix = el.getAttribute('data-suffix') || '';
      var duration = 1600;
      var startTime = null;

      function tick(timestamp) {
        if (!startTime) startTime = timestamp;
        var progress = Math.min((timestamp - startTime) / duration, 1);
        var eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.round(eased * target).toLocaleString() + suffix;
        if (progress < 1) window.requestAnimationFrame(tick);
      }

      window.requestAnimationFrame(tick);
    }

    if ('IntersectionObserver' in window) {
      var counterObserver = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              animateCounter(entry.target);
              counterObserver.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.5 }
      );
      counters.forEach(function (el) { counterObserver.observe(el); });
    } else {
      counters.forEach(animateCounter);
    }
  })();

  /* Footer year */
  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
})();
