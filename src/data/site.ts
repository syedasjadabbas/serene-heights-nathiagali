// All copy and figures come from the client's previous site
// (the former /nathiagali pages): home, about, amenities,
// payment-plan and co-ownership pages.

export const contact = {
  uan: '042-111-111-744',
  mobile: '+92 300 8497999',
  whatsapp: '+92 321 4979447',
  email: 'info@sereneheightsnathiagali.com',
  social: [
    { label: 'Instagram', href: 'https://www.instagram.com/sereneheightshotelsandresorts/' },
    { label: 'Facebook', href: 'https://www.facebook.com/sereneheightshotelsandresorts' },
    { label: 'LinkedIn', href: 'https://www.linkedin.com/company/serene-heights-hotel-resort' },
    { label: 'YouTube', href: 'https://youtube.com/@sereneheightsnathiagali5573' },
  ],
}

export const figures = [
  { value: 7906, suffix: 'ft', label: 'Altitude' },
  { value: 30, suffix: '+', label: 'Kanals of land' },
  { value: 3, suffix: '', label: 'Towers' },
  { value: 150, suffix: '+', label: 'Apartments' },
  { value: 50, suffix: '+', label: 'Amenities' },
  { value: 15, suffix: '+', label: 'Resort activities' },
]

export const seasons = {
  winter: {
    months: 'December – March',
    title: 'Snow on the pines, warmth inside.',
    body: 'A heated infinity pool, sauna and jacuzzi, and a rooftop restaurant looking over the snow. Nathia Gali goes quiet in winter, and Serene Heights stays open through it.',
    img: '/media/winter-side.webp',
  },
  summer: {
    months: 'April – November',
    title: 'Cool air when the plains are at 45°.',
    body: 'Hiking trails, the zipline and rock climbing, archery and mini golf through the day, and the telescope on the roof once the sky clears at night.',
    img: '/media/valley-tower.webp',
  },
}

export const residences = [
  { name: 'One bedroom', note: 'Hotel apartment · fully furnished' },
  { name: 'Two bedroom', note: 'Hotel apartment · fully furnished' },
  { name: 'Three bedroom', note: 'Hotel apartment · fully furnished' },
  { name: 'Smart Property Unit', note: 'Co-own from 50 sq ft' },
]

export const amenityGroups = [
  {
    name: 'Water & wellness', img: '/media/pool-aerial.webp',
    items: [
      ['Heated infinity pool', 'Valley views, open all year, lifeguard on duty'],
      ['Sauna & jacuzzi', 'With dedicated massage therapy rooms'],
      ['Fitness gym', 'Cardio and strength equipment'],
      ['Pool lounge', 'Loungers and complimentary towel service'],
    ],
  },
  {
    name: 'Adventure', img: '/media/pines.webp',
    items: [
      ['Zipline', 'Through the resort grounds, fully supervised'],
      ['Rock climbing', 'Outdoor wall for every skill level'],
      ['Archery range', 'Equipment and coaching provided'],
      ['Air-gun shooting range', 'Trained supervision'],
      ['18-hole mini golf', 'Set into the landscaping'],
    ],
  },
  {
    name: 'The rooftop table', img: '/media/rooftop.webp',
    items: [
      ['Rooftop restaurant', 'By Coffee, Tea & Company. Breakfast, lunch and dinner at 7,906 ft'],
      ['Room service', 'From the same kitchen, to your apartment'],
    ],
  },
  {
    name: 'After dark', img: '/media/ridge.webp',
    items: [
      ['Refractor telescope', 'Stargazing above the cloud line, away from city light'],
      ['Lit pathways', 'Street lighting across the grounds'],
    ],
  },
  {
    name: 'Everyday ease', img: '/media/approach.webp',
    items: [
      ['24/7 power backup', 'Generators tested and maintained'],
      ['Dedicated parking floor', 'Covered, out of the weather'],
      ['Business centre', 'High-speed Wi-Fi, printing, meeting space'],
      ['Mosque', 'On site'],
      ['24/7 CCTV & security', 'Common areas and perimeter'],
      ['Staff residence floor', 'For household and hotel staff'],
    ],
  },
] as const

export const pricing = {
  perSqft: 40000,
  bookingShare: 0.3,
  months: 36,
}

export const ownerBenefits = [
  'Zero maintenance fees, with operating costs covered by the hotel',
  '28 nights a year to stay free',
  'Profit share from hotel revenue, paid quarterly',
  'Extended-stay discount for owners and family',
]

export const smartUnit = {
  sqft: 50,
  value: 2250000,
  down: 675000,
  monthly: 43750,
}

export const route = [
  { dist: '80 km', place: 'Islamabad', time: '2 hr drive' },
  { dist: '35 km', place: 'Abbottabad city centre', time: '50 min' },
  { dist: '5 km', place: 'Nathia Gali main bazaar', time: '10 min' },
  { dist: '3 km', place: 'Hotel Elites', time: '6 min' },
  { dist: '1.5 km', place: 'Main Nathia Gali road', time: '3 min' },
  { dist: '50 m', place: 'PAF Airbase · Serene Heights', time: 'You have arrived' },
]

// dusk-graded renders (scripts/dusk_grade.py); rooftop and sunrise are already evening/dawn light
export const gallery = [
  { src: '/media/snow-tower-dusk.webp', title: 'First snow on the tower', tag: 'Winter' },
  { src: '/media/arrival-snow-dusk.webp', title: 'The drive after snowfall', tag: 'Arrival' },
  { src: '/media/pool-aerial-dusk.webp', title: 'Glasshouse and infinity pool', tag: 'Rooftop' },
  { src: '/media/ridge-dusk.webp', title: 'Above the cloud line', tag: 'Ridge' },
  { src: '/media/terraces-dusk.webp', title: 'Balconies on every floor', tag: 'Residences' },
  { src: '/media/pines-dusk.webp', title: 'In the pines', tag: 'Summer' },
  { src: '/media/rooftop.webp', title: 'The rooftop at sunset', tag: 'Evening' },
  { src: '/media/sunrise.webp', title: 'The view at first light', tag: 'Galiyat' },
]

export const updates = ['April 2026', 'December 2025', 'September 2025', 'April 2025', 'July 2024']
