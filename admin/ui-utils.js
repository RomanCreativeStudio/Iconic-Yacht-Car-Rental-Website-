/**
 * Iconic Rentals — Admin UI Utilities
 *
 * Small, shared, dependency-free helpers for the Fleet Manager (and any
 * future admin page): toast notifications and a promise-based confirm
 * dialog, replacing the browser's native confirm() with something that
 * matches the rest of the dashboard's visual language. Pure UI — no
 * Supabase calls, no page-specific knowledge.
 */
(function (global) {
  'use strict';

  function ensureToastStack() {
    var stack = document.querySelector('.admin-toast-stack');
    if (!stack) {
      stack = document.createElement('div');
      stack.className = 'admin-toast-stack';
      document.body.appendChild(stack);
    }
    return stack;
  }

  /** type: 'success' (default) | 'error' */
  function showToast(message, type) {
    var stack = ensureToastStack();
    var toast = document.createElement('div');
    toast.className = 'admin-toast admin-toast--' + (type || 'success');
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    toast.textContent = message;
    stack.appendChild(toast);

    window.setTimeout(function () {
      toast.style.transition = 'opacity 0.3s ease';
      toast.style.opacity = '0';
      window.setTimeout(function () {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 300);
    }, 4200);
  }

  /**
   * Resolves true if the user confirms, false if they cancel, dismiss
   * (Escape), or click the backdrop.
   * @param {Object} options - { title, message, confirmLabel, cancelLabel }
   */
  function confirmDialog(options) {
    options = options || {};
    return new Promise(function (resolve) {
      var overlay = document.createElement('div');
      overlay.className = 'admin-confirm';
      overlay.innerHTML =
        '<div class="admin-confirm-backdrop"></div>' +
        '<div class="admin-confirm-card" role="alertdialog" aria-modal="true" aria-labelledby="adminConfirmTitle">' +
        '<h3 id="adminConfirmTitle"></h3><p></p>' +
        '<div class="admin-confirm-actions">' +
        '<button type="button" class="btn btn-ghost" data-action="cancel"></button>' +
        '<button type="button" class="btn btn-danger" data-action="confirm"></button>' +
        '</div>' +
        '</div>';

      overlay.querySelector('h3').textContent = options.title || 'Are you sure?';
      overlay.querySelector('p').textContent = options.message || '';
      overlay.querySelector('[data-action="cancel"]').textContent = options.cancelLabel || 'Cancel';
      overlay.querySelector('[data-action="confirm"]').textContent = options.confirmLabel || 'Confirm';

      function close(result) {
        document.removeEventListener('keydown', onKeydown);
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        resolve(result);
      }
      function onKeydown(e) {
        if (e.key === 'Escape') close(false);
      }

      overlay.querySelector('[data-action="cancel"]').addEventListener('click', function () { close(false); });
      overlay.querySelector('[data-action="confirm"]').addEventListener('click', function () { close(true); });
      overlay.querySelector('.admin-confirm-backdrop').addEventListener('click', function () { close(false); });
      document.addEventListener('keydown', onKeydown);

      document.body.appendChild(overlay);
      overlay.querySelector('[data-action="confirm"]').focus();
    });
  }

  global.IconicAdminUI = {
    showToast: showToast,
    confirmDialog: confirmDialog
  };
})(window);
