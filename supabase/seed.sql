-- ============================================================================
-- Seed data — the real fleet, imported from js/fleet-data.js
--
-- This is not invented content: every field below is copied verbatim from
-- the FLEET_DATA array already live on the public site today. It exists
-- so the Fleet Manager (Phase 6.2 Part 2) has real rows to list, search,
-- filter, edit, duplicate, and delete against, instead of an empty table.
--
-- `published` is false for every row, exactly like fleet_items' column
-- default — importing this data changes nothing about what the public
-- site shows (it still reads js/fleet-data.js, unchanged, per Phase 6.2
-- Part 2's explicit "do not migrate the public website yet" scope).
--
-- `starting_price` / `deposit_amount` are left null for every row on
-- purpose: this site's stated policy (see CLIENT_SETUP.md and the
-- booking form's own copy) is "pricing available upon request — every
-- reservation is quoted personally." There is no real fixed number to
-- import, so none is fabricated here.
--
-- Safe to re-run: every insert is keyed on the same unique `slug` values
-- fleet-data.js already uses, with `on conflict (slug) do nothing`.
-- ============================================================================

insert into fleet_items (slug, type, name, category, tagline, description, capacity, specs, features, amenities, book_label, sort_order)
values
  (
    'azure-horizon', 'yacht', 'Azure Horizon', 'Motor Yacht',
    'Sun-soaked open water, effortless sophistication.',
    'Azure Horizon is the definition of effortless luxury on the water. Built for sun-soaked days on Biscayne Bay, her wide-open sun deck, plush bow lounge, and fully stocked bar make her the go-to choice for celebrations, day charters, and golden-hour cruises. A professional captain and crew handle every detail of the journey, so your only job is to enjoy it.',
    12,
    '{"Length": "85 ft", "Guests": "12", "Cabins": "3", "Crew": "2", "Beam": "19 ft"}'::jsonb,
    array['Sun Deck', 'Jacuzzi', 'Full Bar'],
    array['Bluetooth sound system', 'Fresh water shower', 'Snorkel gear', 'Paddleboards', 'Bow lounge seating', 'Onboard chef available'],
    'Azure Horizon — Motor Yacht', 0
  ),
  (
    'midnight-regatta', 'yacht', 'Midnight Regatta', 'Motor Yacht',
    'Miami''s skyline, from the water, after dark.',
    'Midnight Regatta is built for evenings on the water — a sky lounge with skyline views, a private chef on request, and enough deck space to host in comfort. She''s the vessel of choice for milestone celebrations, client entertaining, and sunset-into-nightfall charters across Biscayne Bay.',
    16,
    '{"Length": "102 ft", "Guests": "16", "Cabins": "4", "Crew": "3", "Beam": "22 ft"}'::jsonb,
    array['Sky Lounge', 'Chef Onboard', 'Water Toys'],
    array['Onboard chef', 'Premium sound system', 'Jet ski tender', 'Climate-controlled salon', 'Formal dining area', 'Crew service staff'],
    'Midnight Regatta — Motor Yacht', 1
  ),
  (
    'coastal-mirage', 'yacht', 'Coastal Mirage', 'Sport Yacht',
    'Nimble, playful, built for the day trip.',
    'Coastal Mirage is our nimblest vessel — ideal for smaller groups who want the full yacht experience without the scale. Her bow lounge and Bluetooth sound system make her a favorite for sandbar days, snorkeling trips, and relaxed afternoons on the bay.',
    8,
    '{"Length": "62 ft", "Guests": "8", "Cabins": "2", "Crew": "2", "Beam": "16 ft"}'::jsonb,
    array['Bow Lounge', 'Bluetooth Sound', 'Snorkel Gear'],
    array['Bluetooth sound system', 'Snorkel gear', 'Bow lounge seating', 'Fresh water shower', 'Cooler & ice service'],
    'Coastal Mirage — Sport Yacht', 2
  ),
  (
    'lamborghini-huracan', 'car', 'Lamborghini Huracán', 'Super Sport',
    'Unmistakable presence, unmistakable sound.',
    'The Huracán turns heads before it''s even in motion. With a naturally aspirated V10 and a cabin built for two, it''s the choice for a South Beach evening or a Design District arrival that needs no introduction.',
    2,
    '{"Horsepower": "602 HP", "Seats": "2", "0–60 mph": "2.9s", "Top Speed": "202 mph", "Transmission": "7-speed dual-clutch"}'::jsonb,
    array[]::text[],
    array['Premium sound system', 'Launch control', 'Carbon-ceramic brakes', 'Sport-tuned suspension'],
    'Lamborghini Huracán — Super Sport', 3
  ),
  (
    'ferrari-488', 'car', 'Ferrari 488', 'Super Sport',
    'A racing pedigree, tuned for the street.',
    'The 488 pairs a twin-turbo V8 with razor-sharp handling in a silhouette that''s pure Ferrari. It''s built for drivers who want the road-trip thrill of a supercar without sacrificing everyday composure.',
    2,
    '{"Horsepower": "661 HP", "Seats": "2", "0–60 mph": "3.0s", "Top Speed": "205 mph", "Transmission": "7-speed dual-clutch"}'::jsonb,
    array[]::text[],
    array['Premium sound system', 'Launch control', 'Carbon-ceramic brakes', 'Sport-tuned suspension'],
    'Ferrari 488 — Super Sport', 4
  ),
  (
    'mclaren-720s', 'car', 'McLaren 720S', 'Hypercar',
    'Formula-inspired engineering, street legal.',
    'Every line on the 720S serves a purpose — from its dihedral doors to its active aerodynamics. Built for drivers who want the closest thing to a race car with a license plate.',
    2,
    '{"Horsepower": "710 HP", "Seats": "2", "0–60 mph": "2.8s", "Top Speed": "212 mph", "Transmission": "7-speed dual-clutch"}'::jsonb,
    array[]::text[],
    array['Premium sound system', 'Launch control', 'Carbon-ceramic brakes', 'Variable drift control'],
    'McLaren 720S — Hypercar', 5
  ),
  (
    'rolls-royce-ghost', 'car', 'Rolls-Royce Ghost', 'Ultra Luxury Sedan',
    'The quietest way to make an entrance.',
    'The Ghost is built for arrivals, not commutes. A whisper-quiet cabin, coach doors, and effortless power make it the choice for weddings, executive travel, and evenings that call for understated presence.',
    4,
    '{"Horsepower": "563 HP", "Seats": "4", "0–60 mph": "4.8s", "Top Speed": "155 mph", "Transmission": "8-speed automatic"}'::jsonb,
    array[]::text[],
    array['Starlight headliner', 'Coach doors', 'Premium sound system', 'Chauffeur available on request'],
    'Rolls-Royce Ghost — Ultra Luxury Sedan', 6
  ),
  (
    'bentley-continental-gt', 'car', 'Bentley Continental GT', 'Luxury Grand Tourer',
    'Handcrafted comfort, effortless power.',
    'The Continental GT blends handcrafted interior detailing with genuine grand-touring performance. Equally at home on a coastal drive or parked outside a Design District dinner reservation.',
    4,
    '{"Horsepower": "542 HP", "Seats": "4", "0–60 mph": "3.7s", "Top Speed": "198 mph", "Transmission": "8-speed dual-clutch"}'::jsonb,
    array[]::text[],
    array['Handcrafted leather interior', 'Premium sound system', 'Heated & ventilated seats', 'Adaptive suspension'],
    'Bentley Continental GT — Luxury Grand Tourer', 7
  ),
  (
    'porsche-911-turbo-s', 'car', 'Porsche 911 Turbo S', 'Sports Coupe',
    'The benchmark, reset.',
    'The Turbo S is the 911 at its most complete — blistering acceleration, everyday usability, and a cabin refined enough for a business trip or a weekend away.',
    4,
    '{"Horsepower": "640 HP", "Seats": "4", "0–60 mph": "2.6s", "Top Speed": "205 mph", "Transmission": "8-speed dual-clutch"}'::jsonb,
    array[]::text[],
    array['Sport Chrono package', 'Premium sound system', 'Adaptive suspension', 'Launch control'],
    'Porsche 911 Turbo S — Sports Coupe', 8
  ),
  (
    'mercedes-g-wagon', 'car', 'Mercedes-Benz G-Wagon', 'Luxury SUV',
    'Commanding presence, everyday comfort.',
    'The G-Wagon delivers unmistakable road presence with a genuinely comfortable, tech-forward cabin. A favorite for group outings, airport arrivals, and anyone who wants a luxury SUV that stands out.',
    5,
    '{"Horsepower": "577 HP", "Seats": "5", "0–60 mph": "4.4s", "Top Speed": "137 mph", "Transmission": "9-speed automatic"}'::jsonb,
    array[]::text[],
    array['Premium sound system', 'Heated & ventilated seats', 'Panoramic sunroof', 'All-wheel drive'],
    'Mercedes-Benz G-Wagon — Luxury SUV', 9
  )
on conflict (slug) do nothing;
