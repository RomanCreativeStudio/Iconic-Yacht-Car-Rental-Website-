/**
 * Populates the homepage Videos section (#videos) by aggregating video
 * content already defined across js/fleet-data.js (walkthroughs, drone,
 * reels, TikTok per vehicle), js/experiences-data.js (charter highlight /
 * client videos per experience), and js/instagram-data.js (Reels) — one
 * representative card per category, reusing the same video-card component
 * as the yacht detail pages and the Instagram section.
 *
 * No content is invented here: this file only decides, for each category,
 * which single real video (if any) to surface first, falling back to the
 * shared "coming soon" placeholder card otherwise.
 */
(function () {
  'use strict';

  if (!window.IconicMedia) return;

  var gridEl = document.getElementById('videosGrid');
  if (!gridEl) return;

  var fleet = (window.IconicFleet && window.IconicFleet.data) || [];
  var experiences = (window.IconicExperiences && window.IconicExperiences.data) || [];
  var reels = (window.IconicInstagram && window.IconicInstagram.reels) || [];

  function firstFleetVideo(key) {
    for (var i = 0; i < fleet.length; i++) {
      var list = (fleet[i].videos && fleet[i].videos[key]) || [];
      for (var j = 0; j < list.length; j++) {
        if (list[j].url) {
          return {
            label: list[j].label,
            platform: list[j].platform,
            url: list[j].url,
            thumbnail: list[j].thumbnail,
            thumbnailWebp: list[j].thumbnailWebp,
            captionPrefix: fleet[i].name
          };
        }
      }
    }
    return null;
  }

  function firstExperienceVideo(platform) {
    for (var i = 0; i < experiences.length; i++) {
      var list = experiences[i].videos || [];
      for (var j = 0; j < list.length; j++) {
        if (list[j].url && (!platform || list[j].platform === platform)) {
          return {
            label: list[j].label,
            platform: list[j].platform,
            url: list[j].url,
            thumbnail: list[j].thumbnail,
            thumbnailWebp: list[j].thumbnailWebp,
            captionPrefix: experiences[i].title
          };
        }
      }
    }
    return null;
  }

  function firstReel() {
    for (var i = 0; i < reels.length; i++) {
      if (reels[i].permalink) {
        return {
          label: reels[i].caption || 'Instagram Reel',
          platform: 'instagram',
          url: reels[i].permalink,
          thumbnail: reels[i].thumbnail_url,
          thumbnailWebp: reels[i].thumbnail_url_webp
        };
      }
    }
    return null;
  }

  var CATEGORIES = [
    { label: 'Yacht Walkthroughs', platform: 'walkthrough', find: function () { return firstFleetVideo('walkthrough'); } },
    { label: 'Drone Footage', platform: 'drone', find: function () { return firstFleetVideo('drone'); } },
    { label: 'Instagram Reels', platform: 'instagram', find: function () { return firstReel() || firstFleetVideo('reels'); } },
    { label: 'TikTok Videos', platform: 'tiktok', find: function () { return firstFleetVideo('tiktok'); } },
    { label: 'Charter Highlights', platform: 'video', find: function () { return firstExperienceVideo(null); } },
    { label: 'Client Videos', platform: 'client', find: function () { return firstExperienceVideo('client'); } }
  ];

  gridEl.innerHTML = CATEGORIES.map(function (cat) {
    var found = cat.find();
    if (found) {
      return window.IconicMedia.renderVideoCard(
        { label: found.label, platform: found.platform, url: found.url, thumbnail: found.thumbnail, thumbnailWebp: found.thumbnailWebp },
        { captionPrefix: found.captionPrefix }
      );
    }
    return window.IconicMedia.renderVideoCard({ label: cat.label, platform: cat.platform, url: null }, {});
  }).join('');
})();
