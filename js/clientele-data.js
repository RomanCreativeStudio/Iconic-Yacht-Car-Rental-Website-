/**
 * Iconic Rentals — Clientele & Social Proof Data
 *
 * Backs the homepage "Who We Serve" section. CLIENTELE_CATEGORIES is
 * general marketing copy about the *kinds* of guests the company serves —
 * it names no individual and makes no claim about a specific person, so
 * it's safe to publish today.
 *
 * CLIENTELE_ENDORSEMENTS is where a real, named endorsement (quote, name,
 * role, photo/logo) goes once a client has explicitly approved its use.
 *
 * IMPORTANT: never add an entry to CLIENTELE_ENDORSEMENTS with an invented
 * name, quote, logo, or claim. Every entry here must correspond to a real
 * person/brand who has given permission to be featured, and must have
 * approved: true set only after that permission is confirmed. The section
 * shows an honest "coming soon" state when this array is empty, exactly
 * like js/experiences-data.js and js/instagram-data.js do for their own
 * not-yet-populated content.
 */
(function (global) {
  'use strict';

  var CLIENTELE_CATEGORIES = [
    {
      key: 'athlete',
      label: 'Professional Athletes',
      description: 'Off-season charters and private celebrations, arranged around travel schedules with total discretion.'
    },
    {
      key: 'college-athlete',
      label: 'College Athletes',
      description: 'Milestone celebrations and getaways for student-athletes and their families.'
    },
    {
      key: 'influencer',
      label: 'Influencers & Creators',
      description: 'Content-ready charters and drives, styled and scheduled around a shoot or campaign.'
    },
    {
      key: 'luxury-traveler',
      label: 'Luxury Travelers',
      description: 'White-glove charters and exotic drives for guests who expect precision at every step.'
    },
    {
      key: 'celebrity',
      label: 'Celebrities & Public Figures',
      description: 'Fully private arrangements, off the public booking trail, with no compromise on service.'
    }
  ];

  /* No endorsements have been approved for publication yet — left empty
     rather than filled with invented names or quotes. */
  var CLIENTELE_ENDORSEMENTS = [];

  function getApproved() {
    return CLIENTELE_ENDORSEMENTS.filter(function (entry) { return entry.approved === true; });
  }

  global.IconicClientele = {
    categories: CLIENTELE_CATEGORIES,
    endorsements: CLIENTELE_ENDORSEMENTS,
    getApproved: getApproved
  };

  /**
   * Adding a real, approved endorsement later:
   *   1. Push an object into CLIENTELE_ENDORSEMENTS:
   *      { id, name, role, quote, photo, photoWebp, logo, approved: true }
   *      (role is a short line like "PGA Tour" or "Luxury Travel Blogger" —
   *      only what the client has agreed to be described as.)
   *   2. Nothing else changes — js/clientele.js already renders every
   *      entry with approved === true, and hides the empty state once at
   *      least one exists.
   */
})(window);
