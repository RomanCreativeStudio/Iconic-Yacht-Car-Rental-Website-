/**
 * Iconic Rentals — Fleet Data
 *
 * Single source of truth for every yacht and vehicle in the fleet.
 * The homepage fleet grid and the fleet detail template both render
 * from this file, so adding a new yacht or car means adding one
 * object here — no HTML duplication required.
 *
 * This shape is deliberately flat and CMS-friendly: swapping this
 * static array for a fetch() against a headless CMS or API later
 * requires no template changes, only a change to how FLEET_DATA
 * is populated.
 */
(function (global) {
  'use strict';

  var FLEET_DATA = [
    {
      slug: 'azure-horizon',
      type: 'yacht',
      name: 'Azure Horizon',
      category: 'Motor Yacht',
      tagline: 'Sun-soaked open water, effortless sophistication.',
      heroImage: '/images/yacht-aerial.jpg',
      heroImageWebp: '/images/yacht-aerial.webp',
      cardImage: '/images/yacht-aerial.jpg',
      cardImageWebp: '/images/yacht-aerial.webp',
      gallery: [
        { src: '/images/yacht-aerial.jpg', webp: '/images/yacht-aerial.webp', alt: 'Aerial view of Azure Horizon cruising turquoise water' },
        { src: '/images/about-yacht-deck.jpg', webp: '/images/about-yacht-deck.webp', alt: 'Azure Horizon deck lounge at sunset' },
        { src: '/images/yacht-marina-dusk.jpg', webp: '/images/yacht-marina-dusk.webp', alt: 'Azure Horizon docked at marina at dusk' }
      ],
      /* Categorized brochure gallery for the fleet detail page. Most shots
         are still "Image Coming Soon" — this yacht only has 4 real photos
         site-wide, reused here wherever they genuinely fit — but the full
         set of categories/slots is defined up front so real photography
         can be dropped in later without touching fleet-detail.js. */
      galleries: {
        exterior: [
          { key: 'bow', label: 'Bow', src: null, webp: null, alt: null },
          { key: 'stern', label: 'Stern', src: null, webp: null, alt: null },
          { key: 'side-profile', label: 'Side Profile', src: '/images/yacht-marina-dusk.jpg', webp: '/images/yacht-marina-dusk.webp', alt: "Azure Horizon's profile at the marina, dusk" },
          { key: 'flybridge', label: 'Flybridge', src: null, webp: null, alt: null },
          { key: 'water-views', label: 'Water Views', src: null, webp: null, alt: null }
        ],
        interior: [
          { key: 'main-salon', label: 'Main Salon', src: null, webp: null, alt: null },
          { key: 'dining-area', label: 'Dining Area', src: null, webp: null, alt: null },
          { key: 'master-cabin', label: 'Master Cabin', src: null, webp: null, alt: null },
          { key: 'guest-cabins', label: 'Guest Cabins', src: null, webp: null, alt: null },
          { key: 'bathrooms', label: 'Bathrooms', src: null, webp: null, alt: null },
          { key: 'galley', label: 'Galley', src: null, webp: null, alt: null },
          { key: 'helm', label: 'Helm', src: null, webp: null, alt: null }
        ],
        lifestyle: [
          { key: 'dining-setup', label: 'Dining Setup', src: null, webp: null, alt: null },
          { key: 'champagne-service', label: 'Champagne Service', src: '/images/about-yacht-deck.jpg', webp: '/images/about-yacht-deck.webp', alt: "Champagne service on Azure Horizon's aft deck" },
          { key: 'guests-relaxing', label: 'Guests Relaxing', src: null, webp: null, alt: null },
          { key: 'water-toys', label: 'Water Toys', src: null, webp: null, alt: null },
          { key: 'swimming-platform', label: 'Swimming Platform', src: null, webp: null, alt: null },
          { key: 'sunset-cruise', label: 'Sunset Cruise', src: '/images/hero-yacht-miami.jpg', webp: '/images/hero-yacht-miami.webp', alt: 'Azure Horizon at sunset against the Miami skyline' },
          { key: 'night-lighting', label: 'Night Lighting', src: null, webp: null, alt: null }
        ],
        /* Aerial/drone footage gets its own category rather than doubling up
           inside Exterior — the one real aerial shot this yacht has lives
           here now (it was previously duplicated under Exterior > Water
           Views too, which just meant the same photo twice across tabs). */
        drone: [
          { key: 'aerial-overview', label: 'Aerial Overview', src: '/images/yacht-aerial.jpg', webp: '/images/yacht-aerial.webp', alt: 'Aerial view of Azure Horizon cruising turquoise water' },
          { key: 'departure-sequence', label: 'Departure Sequence', src: null, webp: null, alt: null },
          { key: 'anchored-cove', label: 'Anchored Cove', src: null, webp: null, alt: null },
          { key: 'golden-hour-aerial', label: 'Golden Hour Aerial', src: null, webp: null, alt: null }
        ]
      },
      /* Video & social content — none shot yet for any yacht, but the slots
         are defined so dropping in a URL + thumbnail is the only step
         needed later (see fleet-detail.js renderVideosPanel). */
      videos: {
        walkthrough: [
          { key: 'full-walkthrough', label: 'Full Walkthrough', platform: 'video', url: null, thumbnail: null, thumbnailWebp: null }
        ],
        reels: [
          { key: 'instagram-reel', label: 'Instagram Reel', platform: 'instagram', url: null, thumbnail: null, thumbnailWebp: null }
        ],
        tiktok: [
          { key: 'tiktok-video', label: 'TikTok Video', platform: 'tiktok', url: null, thumbnail: null, thumbnailWebp: null }
        ],
        tours360: [
          { key: 'virtual-tour', label: '360° Virtual Tour', platform: 'tour360', url: null, thumbnail: null, thumbnailWebp: null }
        ]
      },
      description: "Azure Horizon is the definition of effortless luxury on the water. Built for sun-soaked days on Biscayne Bay, her wide-open sun deck, plush bow lounge, and fully stocked bar make her the go-to choice for celebrations, day charters, and golden-hour cruises. A professional captain and crew handle every detail of the journey, so your only job is to enjoy it.",
      capacity: 12,
      length: '85 ft',
      cabins: 3,
      crew: 2,
      specs: {
        'Length': '85 ft',
        'Guests': '12',
        'Cabins': '3',
        'Crew': '2',
        'Beam': '19 ft'
      },
      features: ['Sun Deck', 'Jacuzzi', 'Full Bar'],
      amenities: ['Bluetooth sound system', 'Fresh water shower', 'Snorkel gear', 'Paddleboards', 'Bow lounge seating', 'Onboard chef available'],
      bookLabel: 'Azure Horizon — Motor Yacht'
    },
    {
      slug: 'midnight-regatta',
      type: 'yacht',
      name: 'Midnight Regatta',
      category: 'Motor Yacht',
      tagline: 'Miami’s skyline, from the water, after dark.',
      heroImage: '/images/yacht-marina-dusk.jpg',
      heroImageWebp: '/images/yacht-marina-dusk.webp',
      cardImage: '/images/yacht-marina-dusk.jpg',
      cardImageWebp: '/images/yacht-marina-dusk.webp',
      gallery: [
        { src: '/images/yacht-marina-dusk.jpg', webp: '/images/yacht-marina-dusk.webp', alt: 'Midnight Regatta docked at a Miami marina at dusk' },
        { src: '/images/yacht-aerial.jpg', webp: '/images/yacht-aerial.webp', alt: 'Midnight Regatta cruising open water' },
        { src: '/images/about-yacht-deck.jpg', webp: '/images/about-yacht-deck.webp', alt: 'Midnight Regatta deck lounge' }
      ],
      galleries: {
        exterior: [
          { key: 'bow', label: 'Bow', src: null, webp: null, alt: null },
          { key: 'stern', label: 'Stern', src: null, webp: null, alt: null },
          { key: 'side-profile', label: 'Side Profile', src: '/images/yacht-marina-dusk.jpg', webp: '/images/yacht-marina-dusk.webp', alt: 'Midnight Regatta docked at a Miami marina at dusk' },
          { key: 'flybridge', label: 'Flybridge', src: null, webp: null, alt: null },
          { key: 'water-views', label: 'Water Views', src: null, webp: null, alt: null }
        ],
        interior: [
          { key: 'main-salon', label: 'Main Salon', src: null, webp: null, alt: null },
          { key: 'dining-area', label: 'Dining Area', src: null, webp: null, alt: null },
          { key: 'master-cabin', label: 'Master Cabin', src: null, webp: null, alt: null },
          { key: 'guest-cabins', label: 'Guest Cabins', src: null, webp: null, alt: null },
          { key: 'bathrooms', label: 'Bathrooms', src: null, webp: null, alt: null },
          { key: 'galley', label: 'Galley', src: null, webp: null, alt: null },
          { key: 'helm', label: 'Helm', src: null, webp: null, alt: null }
        ],
        lifestyle: [
          { key: 'dining-setup', label: 'Dining Setup', src: null, webp: null, alt: null },
          { key: 'champagne-service', label: 'Champagne Service', src: '/images/about-yacht-deck.jpg', webp: '/images/about-yacht-deck.webp', alt: 'Champagne service aboard Midnight Regatta' },
          { key: 'guests-relaxing', label: 'Guests Relaxing', src: null, webp: null, alt: null },
          { key: 'water-toys', label: 'Water Toys', src: null, webp: null, alt: null },
          { key: 'swimming-platform', label: 'Swimming Platform', src: null, webp: null, alt: null },
          { key: 'sunset-cruise', label: 'Sunset Cruise', src: '/images/hero-yacht-miami.jpg', webp: '/images/hero-yacht-miami.webp', alt: 'Midnight Regatta at sunset on Biscayne Bay' },
          { key: 'night-lighting', label: 'Night Lighting', src: null, webp: null, alt: null }
        ],
        drone: [
          { key: 'aerial-overview', label: 'Aerial Overview', src: '/images/yacht-aerial.jpg', webp: '/images/yacht-aerial.webp', alt: 'Midnight Regatta cruising open water' },
          { key: 'departure-sequence', label: 'Departure Sequence', src: null, webp: null, alt: null },
          { key: 'anchored-cove', label: 'Anchored Cove', src: null, webp: null, alt: null },
          { key: 'golden-hour-aerial', label: 'Golden Hour Aerial', src: null, webp: null, alt: null }
        ]
      },
      videos: {
        walkthrough: [
          { key: 'full-walkthrough', label: 'Full Walkthrough', platform: 'video', url: null, thumbnail: null, thumbnailWebp: null }
        ],
        reels: [
          { key: 'instagram-reel', label: 'Instagram Reel', platform: 'instagram', url: null, thumbnail: null, thumbnailWebp: null }
        ],
        tiktok: [
          { key: 'tiktok-video', label: 'TikTok Video', platform: 'tiktok', url: null, thumbnail: null, thumbnailWebp: null }
        ],
        tours360: [
          { key: 'virtual-tour', label: '360° Virtual Tour', platform: 'tour360', url: null, thumbnail: null, thumbnailWebp: null }
        ]
      },
      description: "Midnight Regatta is built for evenings on the water — a sky lounge with skyline views, a private chef on request, and enough deck space to host in comfort. She's the vessel of choice for milestone celebrations, client entertaining, and sunset-into-nightfall charters across Biscayne Bay.",
      capacity: 16,
      length: '102 ft',
      cabins: 4,
      crew: 3,
      specs: {
        'Length': '102 ft',
        'Guests': '16',
        'Cabins': '4',
        'Crew': '3',
        'Beam': '22 ft'
      },
      features: ['Sky Lounge', 'Chef Onboard', 'Water Toys'],
      amenities: ['Onboard chef', 'Premium sound system', 'Jet ski tender', 'Climate-controlled salon', 'Formal dining area', 'Crew service staff'],
      bookLabel: 'Midnight Regatta — Motor Yacht'
    },
    {
      slug: 'coastal-mirage',
      type: 'yacht',
      name: 'Coastal Mirage',
      category: 'Sport Yacht',
      tagline: 'Nimble, playful, built for the day trip.',
      heroImage: '/images/about-yacht-deck.jpg',
      heroImageWebp: '/images/about-yacht-deck.webp',
      cardImage: null,
      cardImageWebp: null,
      gallery: [],
      galleries: {
        exterior: [
          { key: 'bow', label: 'Bow', src: null, webp: null, alt: null },
          { key: 'stern', label: 'Stern', src: null, webp: null, alt: null },
          { key: 'side-profile', label: 'Side Profile', src: '/images/yacht-marina-dusk.jpg', webp: '/images/yacht-marina-dusk.webp', alt: "Coastal Mirage's profile at the marina, dusk" },
          { key: 'flybridge', label: 'Flybridge', src: null, webp: null, alt: null },
          { key: 'water-views', label: 'Water Views', src: null, webp: null, alt: null }
        ],
        interior: [
          { key: 'main-salon', label: 'Main Salon', src: null, webp: null, alt: null },
          { key: 'dining-area', label: 'Dining Area', src: null, webp: null, alt: null },
          { key: 'master-cabin', label: 'Master Cabin', src: null, webp: null, alt: null },
          { key: 'guest-cabins', label: 'Guest Cabins', src: null, webp: null, alt: null },
          { key: 'bathrooms', label: 'Bathrooms', src: null, webp: null, alt: null },
          { key: 'galley', label: 'Galley', src: null, webp: null, alt: null },
          { key: 'helm', label: 'Helm', src: null, webp: null, alt: null }
        ],
        lifestyle: [
          { key: 'dining-setup', label: 'Dining Setup', src: null, webp: null, alt: null },
          { key: 'champagne-service', label: 'Champagne Service', src: '/images/about-yacht-deck.jpg', webp: '/images/about-yacht-deck.webp', alt: 'Champagne service aboard Coastal Mirage' },
          { key: 'guests-relaxing', label: 'Guests Relaxing', src: null, webp: null, alt: null },
          { key: 'water-toys', label: 'Water Toys', src: null, webp: null, alt: null },
          { key: 'swimming-platform', label: 'Swimming Platform', src: null, webp: null, alt: null },
          { key: 'sunset-cruise', label: 'Sunset Cruise', src: '/images/hero-yacht-miami.jpg', webp: '/images/hero-yacht-miami.webp', alt: 'Coastal Mirage at sunset on Biscayne Bay' },
          { key: 'night-lighting', label: 'Night Lighting', src: null, webp: null, alt: null }
        ],
        drone: [
          { key: 'aerial-overview', label: 'Aerial Overview', src: '/images/yacht-aerial.jpg', webp: '/images/yacht-aerial.webp', alt: 'Aerial view of Coastal Mirage cruising turquoise water' },
          { key: 'departure-sequence', label: 'Departure Sequence', src: null, webp: null, alt: null },
          { key: 'anchored-cove', label: 'Anchored Cove', src: null, webp: null, alt: null },
          { key: 'golden-hour-aerial', label: 'Golden Hour Aerial', src: null, webp: null, alt: null }
        ]
      },
      videos: {
        walkthrough: [
          { key: 'full-walkthrough', label: 'Full Walkthrough', platform: 'video', url: null, thumbnail: null, thumbnailWebp: null }
        ],
        reels: [
          { key: 'instagram-reel', label: 'Instagram Reel', platform: 'instagram', url: null, thumbnail: null, thumbnailWebp: null }
        ],
        tiktok: [
          { key: 'tiktok-video', label: 'TikTok Video', platform: 'tiktok', url: null, thumbnail: null, thumbnailWebp: null }
        ],
        tours360: [
          { key: 'virtual-tour', label: '360° Virtual Tour', platform: 'tour360', url: null, thumbnail: null, thumbnailWebp: null }
        ]
      },
      description: "Coastal Mirage is our nimblest vessel — ideal for smaller groups who want the full yacht experience without the scale. Her bow lounge and Bluetooth sound system make her a favorite for sandbar days, snorkeling trips, and relaxed afternoons on the bay.",
      capacity: 8,
      length: '62 ft',
      cabins: 2,
      crew: 2,
      specs: {
        'Length': '62 ft',
        'Guests': '8',
        'Cabins': '2',
        'Crew': '2',
        'Beam': '16 ft'
      },
      features: ['Bow Lounge', 'Bluetooth Sound', 'Snorkel Gear'],
      amenities: ['Bluetooth sound system', 'Snorkel gear', 'Bow lounge seating', 'Fresh water shower', 'Cooler & ice service'],
      bookLabel: 'Coastal Mirage — Sport Yacht'
    },
    {
      slug: 'lamborghini-huracan',
      type: 'car',
      name: 'Lamborghini Huracán',
      category: 'Super Sport',
      tagline: 'Unmistakable presence, unmistakable sound.',
      heroImage: null,
      heroImageWebp: null,
      cardImage: null,
      cardImageWebp: null,
      gallery: [],
      description: "The Huracán turns heads before it's even in motion. With a naturally aspirated V10 and a cabin built for two, it's the choice for a South Beach evening or a Design District arrival that needs no introduction.",
      seats: 2,
      hp: '602 HP',
      specs: {
        'Horsepower': '602 HP',
        'Seats': '2',
        '0–60 mph': '2.9s',
        'Top Speed': '202 mph',
        'Transmission': '7-speed dual-clutch'
      },
      features: [],
      amenities: ['Premium sound system', 'Launch control', 'Carbon-ceramic brakes', 'Sport-tuned suspension'],
      bookLabel: 'Lamborghini Huracán — Super Sport'
    },
    {
      slug: 'ferrari-488',
      type: 'car',
      name: 'Ferrari 488',
      category: 'Super Sport',
      tagline: 'A racing pedigree, tuned for the street.',
      heroImage: null,
      heroImageWebp: null,
      cardImage: null,
      cardImageWebp: null,
      gallery: [],
      description: "The 488 pairs a twin-turbo V8 with razor-sharp handling in a silhouette that's pure Ferrari. It's built for drivers who want the road-trip thrill of a supercar without sacrificing everyday composure.",
      seats: 2,
      hp: '661 HP',
      specs: {
        'Horsepower': '661 HP',
        'Seats': '2',
        '0–60 mph': '3.0s',
        'Top Speed': '205 mph',
        'Transmission': '7-speed dual-clutch'
      },
      features: [],
      amenities: ['Premium sound system', 'Launch control', 'Carbon-ceramic brakes', 'Sport-tuned suspension'],
      bookLabel: 'Ferrari 488 — Super Sport'
    },
    {
      slug: 'mclaren-720s',
      type: 'car',
      name: 'McLaren 720S',
      category: 'Hypercar',
      tagline: 'Formula-inspired engineering, street legal.',
      heroImage: null,
      heroImageWebp: null,
      cardImage: null,
      cardImageWebp: null,
      gallery: [],
      description: "Every line on the 720S serves a purpose — from its dihedral doors to its active aerodynamics. Built for drivers who want the closest thing to a race car with a license plate.",
      seats: 2,
      hp: '710 HP',
      specs: {
        'Horsepower': '710 HP',
        'Seats': '2',
        '0–60 mph': '2.8s',
        'Top Speed': '212 mph',
        'Transmission': '7-speed dual-clutch'
      },
      features: [],
      amenities: ['Premium sound system', 'Launch control', 'Carbon-ceramic brakes', 'Variable drift control'],
      bookLabel: 'McLaren 720S — Hypercar'
    },
    {
      slug: 'rolls-royce-ghost',
      type: 'car',
      name: 'Rolls-Royce Ghost',
      category: 'Ultra Luxury Sedan',
      tagline: 'The quietest way to make an entrance.',
      heroImage: null,
      heroImageWebp: null,
      cardImage: null,
      cardImageWebp: null,
      gallery: [],
      description: "The Ghost is built for arrivals, not commutes. A whisper-quiet cabin, coach doors, and effortless power make it the choice for weddings, executive travel, and evenings that call for understated presence.",
      seats: 4,
      hp: '563 HP',
      specs: {
        'Horsepower': '563 HP',
        'Seats': '4',
        '0–60 mph': '4.8s',
        'Top Speed': '155 mph',
        'Transmission': '8-speed automatic'
      },
      features: [],
      amenities: ['Starlight headliner', 'Coach doors', 'Premium sound system', 'Chauffeur available on request'],
      bookLabel: 'Rolls-Royce Ghost — Ultra Luxury Sedan'
    },
    {
      slug: 'bentley-continental-gt',
      type: 'car',
      name: 'Bentley Continental GT',
      category: 'Luxury Grand Tourer',
      tagline: 'Handcrafted comfort, effortless power.',
      heroImage: null,
      heroImageWebp: null,
      cardImage: null,
      cardImageWebp: null,
      gallery: [],
      description: "The Continental GT blends handcrafted interior detailing with genuine grand-touring performance. Equally at home on a coastal drive or parked outside a Design District dinner reservation.",
      seats: 4,
      hp: '542 HP',
      specs: {
        'Horsepower': '542 HP',
        'Seats': '4',
        '0–60 mph': '3.7s',
        'Top Speed': '198 mph',
        'Transmission': '8-speed dual-clutch'
      },
      features: [],
      amenities: ['Handcrafted leather interior', 'Premium sound system', 'Heated & ventilated seats', 'Adaptive suspension'],
      bookLabel: 'Bentley Continental GT — Luxury Grand Tourer'
    },
    {
      slug: 'porsche-911-turbo-s',
      type: 'car',
      name: 'Porsche 911 Turbo S',
      category: 'Sports Coupe',
      tagline: 'The benchmark, reset.',
      heroImage: null,
      heroImageWebp: null,
      cardImage: null,
      cardImageWebp: null,
      gallery: [],
      description: "The Turbo S is the 911 at its most complete — blistering acceleration, everyday usability, and a cabin refined enough for a business trip or a weekend away.",
      seats: 4,
      hp: '640 HP',
      specs: {
        'Horsepower': '640 HP',
        'Seats': '4',
        '0–60 mph': '2.6s',
        'Top Speed': '205 mph',
        'Transmission': '8-speed dual-clutch'
      },
      features: [],
      amenities: ['Sport Chrono package', 'Premium sound system', 'Adaptive suspension', 'Launch control'],
      bookLabel: 'Porsche 911 Turbo S — Sports Coupe'
    },
    {
      slug: 'mercedes-g-wagon',
      type: 'car',
      name: 'Mercedes-Benz G-Wagon',
      category: 'Luxury SUV',
      tagline: 'Commanding presence, everyday comfort.',
      heroImage: null,
      heroImageWebp: null,
      cardImage: null,
      cardImageWebp: null,
      gallery: [],
      description: "The G-Wagon delivers unmistakable road presence with a genuinely comfortable, tech-forward cabin. A favorite for group outings, airport arrivals, and anyone who wants a luxury SUV that stands out.",
      seats: 5,
      hp: '577 HP',
      specs: {
        'Horsepower': '577 HP',
        'Seats': '5',
        '0–60 mph': '4.4s',
        'Top Speed': '137 mph',
        'Transmission': '9-speed automatic'
      },
      features: [],
      amenities: ['Premium sound system', 'Heated & ventilated seats', 'Panoramic sunroof', 'All-wheel drive'],
      bookLabel: 'Mercedes-Benz G-Wagon — Luxury SUV'
    }
  ];

  function getFleetItem(slug) {
    for (var i = 0; i < FLEET_DATA.length; i++) {
      if (FLEET_DATA[i].slug === slug) return FLEET_DATA[i];
    }
    return null;
  }

  function getFleetByType(type) {
    return FLEET_DATA.filter(function (item) {
      return item.type === type;
    });
  }

  function getRelatedFleet(item, limit) {
    return FLEET_DATA.filter(function (other) {
      return other.type === item.type && other.slug !== item.slug;
    }).slice(0, limit || 3);
  }

  global.IconicFleet = {
    data: FLEET_DATA,
    getFleetItem: getFleetItem,
    getFleetByType: getFleetByType,
    getRelatedFleet: getRelatedFleet
  };

  /**
   * CMS migration path (see CLIENT_SETUP.md, "Future CMS Integration"):
   * every consumer of this module (fleet-render.js, fleet-detail.js,
   * main.js) reads FLEET_DATA synchronously through the functions above.
   * To swap this file for a real CMS/API later:
   *   1. Replace the FLEET_DATA array above with a fetch() call to your
   *      CMS/API that resolves to the same array shape (same field
   *      names — slug, type, name, category, specs, amenities, etc.).
   *   2. Populate FLEET_DATA once the fetch resolves, then call
   *      document.dispatchEvent(new CustomEvent('iconic:fleet-ready'))
   *      so page scripts know the data has arrived.
   *   3. Have fleet-render.js / fleet-detail.js's render calls run
   *      inside a document.addEventListener('iconic:fleet-ready', ...)
   *      instead of at the bottom of the script, as they do today.
   * No template HTML or CSS changes are required for this migration.
   */
})(window);
