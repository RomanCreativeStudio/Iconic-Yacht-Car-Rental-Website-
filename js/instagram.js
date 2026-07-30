/**
 * Populates the homepage Instagram section (#instagram) from
 * js/instagram-data.js. Kept as its own script (like fleet-detail.js) so
 * the day this reads from a real Instagram Graph API feed instead of
 * manually-curated data, only this file changes.
 *
 * Waits for 'iconic:instagram-ready' (Phase 6.5) — js/data-service.js may
 * still be deciding between a live profile and this static fallback when
 * this script first executes (posts/reels are always static; see
 * js/data-service.js's header comment for why).
 */
document.addEventListener('iconic:instagram-ready', function () {
  'use strict';

  if (!window.IconicInstagram || !window.IconicMedia) return;

  var escapeHtml = window.IconicMedia.escapeHtml;
  var ICONS = window.IconicMedia.icons;
  var profile = window.IconicInstagram.profile;
  var posts = window.IconicInstagram.posts || [];
  var reels = window.IconicInstagram.reels || [];

  /* Profile preview */
  var handleEl = document.getElementById('instagramHandle');
  var bioEl = document.getElementById('instagramBio');
  var avatarEl = document.getElementById('instagramAvatar');
  var statsEl = document.getElementById('instagramStats');

  if (handleEl) handleEl.textContent = profile.handle;
  if (bioEl) bioEl.textContent = profile.bio;
  if (avatarEl && profile.avatar) {
    avatarEl.innerHTML =
      '<picture>' + (profile.avatarWebp ? '<source srcset="' + profile.avatarWebp + '" type="image/webp" />' : '') + '<img src="' + profile.avatar + '" alt="' + escapeHtml(profile.name) + ' on Instagram" /></picture>';
  }
  if (statsEl) {
    /* Real, checkable numbers only — an em dash instead of a guessed
       follower/post count until the client shares real figures or the
       Graph API is connected and can report them automatically. */
    statsEl.innerHTML =
      '<div class="instagram-stat"><dt>Posts</dt><dd>' + (profile.postCount != null ? profile.postCount.toLocaleString() : '—') + '</dd></div>' +
      '<div class="instagram-stat"><dt>Followers</dt><dd>' + (profile.followerCount != null ? profile.followerCount.toLocaleString() : '—') + '</dd></div>';
  }

  /* Recent Posts grid */
  var feedEl = document.getElementById('instagramFeed');
  if (feedEl) {
    if (posts.length) {
      feedEl.innerHTML = posts.map(function (post) {
        var caption = post.caption || 'Instagram post';
        return (
          '<a class="instagram-tile" href="' + escapeHtml(post.permalink || profile.url) + '" target="_blank" rel="noopener" aria-label="View on Instagram: ' + escapeHtml(caption) + '">' +
          /* alt="" here: the link's aria-label and the visible
             .instagram-tile-caption span (below) already carry this same
             caption text, so the image itself is decorative — giving it
             real alt text would make screen readers announce the same
             caption three times over. */
          '<picture>' + (post.media_url_webp ? '<source srcset="' + post.media_url_webp + '" type="image/webp" />' : '') + '<img src="' + post.media_url + '" alt="" loading="lazy" /></picture>' +
          '<span class="instagram-tile-icon">' + ICONS.instagram + '</span>' +
          '<span class="instagram-tile-caption">' + escapeHtml(caption) + '</span>' +
          '</a>'
        );
      }).join('');
    } else {
      feedEl.innerHTML =
        '<a class="instagram-tile instagram-tile--solo" href="' + escapeHtml(profile.url) + '" target="_blank" rel="noopener" aria-label="View on Instagram">' +
        '<div class="instagram-tile-placeholder">' + ICONS.instagram + '<span>' + escapeHtml(profile.handle) + '</span></div>' +
        '</a>';
    }
  }

  /* Reels — real entries render via the shared video-card component (same
     one used on yacht detail pages), so the two always look and behave
     identically. None exist yet, so this shows an honest empty state. */
  var reelsEl = document.getElementById('instagramReels');
  if (reelsEl) {
    if (reels.length) {
      reelsEl.innerHTML = window.IconicMedia.renderVideoGrid(reels.map(function (reel) {
        return {
          label: reel.caption || 'Instagram Reel',
          platform: 'instagram',
          url: reel.permalink,
          thumbnail: reel.thumbnail_url,
          thumbnailWebp: reel.thumbnail_url_webp
        };
      }), { captionPrefix: profile.name });
    } else {
      reelsEl.innerHTML =
        '<div class="instagram-reels-empty">' +
        ICONS.play +
        '<p>Reels are coming soon — follow <a href="' + escapeHtml(profile.url) + '" target="_blank" rel="noopener">' + escapeHtml(profile.handle) + '</a> for the latest.</p>' +
        '</div>';
    }
  }
});
