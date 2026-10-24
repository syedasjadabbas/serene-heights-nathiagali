// Content for the inner pages, taken from the client's previous site: about, co-ownership, floor-plans,
// progress, blog, privacy-policy and contact-us.

export const about = {
  intro:
    'Serene Heights is redefining luxury resort living in the heart of the Galiyat: the first resort in Pakistan to blend modern comfort with breathtaking mountain views. It is not just an accommodation but a lifestyle destination, with world-class amenities and activities.',
  model:
    'With innovative financial models, Serene Heights is making real estate in Pakistan more liquid and more accessible: owners hold a share of a managed hotel, not just a building.',
  ceo: { name: 'Fahad Masud Lone', role: 'Chief Executive, Serene Heights · DM Consortium' },
  philosophy: [
    { title: 'Purpose-driven business', body: 'Fahad’s eight-plus years as an entrepreneur have centred on building businesses that create lasting, meaningful impact, not just short-term returns.' },
    { title: 'Transparent ownership', body: 'Serene Heights was built around a simple promise: zero maintenance charges, zero hidden costs. What you own is what you own, with nothing more to pay later.' },
    { title: 'Leadership & education', body: 'Through “The Art of Being a CEO”, Fahad shares the leadership, decision-making and scaling principles behind his own entrepreneurial journey.' },
  ],
  developer: 'DM Consortium manages Serene Heights as one hotel: bookings, housekeeping, maintenance and owner returns.',
}

export const smartUnitPage = {
  what:
    'Smart Property Unit is a way to invest in a premium Serene Heights apartment without buying the whole apartment. With standard units of 50 sq ft, you co-own a luxury apartment in one of Nathia Gali’s most sought-after developments. On completion the apartment is let by DM Consortium and rental income is distributed according to your units.',
  plan: [
    ['Unit size', '50 sq ft'],
    ['Unit value', 'PKR 2,250,000'],
    ['Down payment (30%)', 'PKR 675,000'],
    ['36 monthly installments', 'PKR 43,750'],
  ],
  // the client's own projection; shown with a disclaimer
  roi: [
    ['Investment amount', 'PKR 2,250,000'],
    ['Expected annual rental income', 'PKR 300,000'],
    ['Annual capital gain on investment', '5%'],
    ['Projected return', '13–15%'],
  ],
  steps: [
    ['Fill the booking form', 'Apply with a few personal and financial details.'],
    ['Choose a payment plan', 'An affordable down payment and easy monthly installments.'],
    ['Confirm ownership', 'Once payments are complete, your Smart Property Unit is secured.'],
    ['Managed by experts', 'DM Consortium takes care of rentals, maintenance and returns.'],
    ['Transferable units', 'Sell or transfer your ownership at any time.'],
  ],
  why: [
    ['Affordable investment', 'Own premium property in installments. Start small, grow smart.'],
    ['Simple process', 'Hassle-free, just like buying a full unit.'],
    ['Secure contracts', 'Every unit is protected by legal agreements.'],
    ['Legal compliance', 'Transactions are Shariah-compliant and legally secure.'],
    ['Standardised units', 'Fixed units of 50 sq ft, clear and fair.'],
  ],
}

export const floorPlans = [
  { title: 'Ground floor', note: 'Arrival and lobby', file: 'ground1.png' },
  { title: 'Ground floor', note: 'Layout', file: 'ground.png' },
  { title: '1st floor', note: '', file: '1st.png' },
  { title: '2nd floor', note: '', file: '2nd.png' },
  { title: '3rd floor', note: '', file: '3rd.png' },
  { title: '5th floor', note: '', file: '5th.png' },
  { title: '6th floor', note: '', file: '6th.png' },
  { title: '7th floor', note: '', file: '7th.png' },
  { title: '8th floor', note: '', file: '8th.png' },
].map((f) => {
  const name = f.file.replace(/\.png$/, '')
  return { ...f, thumb: `/media/plans/${name}-1080.webp`, full: `/media/plans/${name}.webp` }
})

// Site-visit videos on the client's YouTube channel, newest first, in the order the
// current progress page lists them.
/** Anchor for one site visit on the progress page, e.g. "update-april-2026". */
export const updateId = (date: string) => `update-${date.toLowerCase().replace(/\s+/g, '-')}`

export const progress = [
  { date: 'April 2026', video: 'lxc9yQty3BA' },
  { date: 'December 2025', video: 'HIewLGoRr2g' },
  { date: 'September 2025', video: '_b7QhNjmldk' },
  { date: 'April 2025', video: 'zih0inhf1hM' },
  { date: 'July 2024', video: '_RjucM01Vp8' },
  { date: 'February 2024', video: 'J_EAtfLGICw' },
  { date: 'November 2023', video: 'YbcwSm0l4Es' },
  { date: 'July 2023', video: 'deh7Edv0cFM' },
  { date: 'October 2022', video: '_ArGeucKghA' },
  { date: 'December 2021', video: '-j6c51b2Dis' },
]

type Post = { slug: string; title: string; category: string; date: string; excerpt: string; image?: string }
const posts: Post[] = [
  { slug: 'serene-heights-site-visit-checklist', title: 'What to Check During a Serene Heights Site Visit', category: 'Project Due Diligence', date: 'October 11, 2026', excerpt: 'Planning a Serene Heights site visit? This checklist covers construction progress, questions to ask, documents to request, and how to get maximum value from the trip.', image: 'jpg' },
  { slug: 'furnished-hotel-apartment-inclusions', title: 'What Is Included in a Furnished Hotel Apartment? A Buyer’s Guide to Finish, Furniture and Handover Scope', category: 'Unit Specifications', date: 'October 9, 2026', excerpt: 'What does “fully furnished hotel apartment” actually mean? Finish specifications, furniture, appliances, handover scope and the difference between illustrations and contractual inclusions.', image: 'jpg' },
  { slug: 'compare-hotel-apartment-payment-schedules', title: 'How to Compare Two Hotel Apartment Payment Schedules: A Framework for Buyers', category: 'Payment Literacy', date: 'October 6, 2026', excerpt: 'Two payment plans can look similar on paper but cost very differently in total. Compare total consideration, instalments, charges, default terms and cancellation.', image: 'jpg' },
  { slug: 'hotel-apartment-vs-holiday-home-pakistan', title: 'Hotel Apartment vs Holiday Home: Which Ownership Model Fits Your Use Case?', category: 'Ownership Guide', date: 'September 26, 2026', excerpt: 'Compare ownership control, rental income, management, personal use and resale to find which model fits your situation.', image: 'jpg' },
  { slug: 'hotel-apartment-ownership-in-pakistan', title: 'Hotel Apartment Ownership in Pakistan: How Owner Stays, Rental Income and Management Actually Work', category: 'Investment', date: 'September 14, 2026', excerpt: 'How managed hotel-apartment ownership works in Pakistan: owner stays, rental income distribution, management responsibilities, and what to ask before you buy.', image: 'jpg' },
  { slug: 'buying-holiday-home-in-nathia-gali', title: 'Buying a Holiday Home in Nathia Gali: Balancing Family Use and Rental Income', category: 'Investment', date: 'September 12, 2026', excerpt: 'Layout choices, peak-season owner rules, financial planning and what to confirm before you buy.', image: 'jpg' },
  { slug: 'ayubia-national-park-from-nathia-gali-guide', title: 'Ayubia National Park from Nathia Gali: 2026 Visitor Guide', category: 'Travel Guide', date: 'September 9, 2026', excerpt: 'The Pipeline Track, chairlift, wildlife, trails, entry fees, timings and the best things to do.', image: 'jpg' },
  { slug: 'nathia-gali-in-spring-march-april-may-guide', title: 'Nathia Gali in Spring: March, April and May Guide (2026)', category: 'Travel Guide', date: 'September 7, 2026', excerpt: 'Spring is Nathia Gali’s most beautiful and least crowded season: wildflowers, trails, weather and why spring visitors come back.', image: 'jpg' },
  { slug: 'how-to-spend-48-hours-in-nathiagali', title: 'How to Spend 48 Hours in Nathia Gali: Realistic Weekend Itinerary', category: 'Travel Guide', date: 'August 31, 2026', excerpt: 'A realistic 48-hour itinerary with actual timings, named spots, and contingency plans for rain.', image: 'jpg' },
  { slug: 'nathia-gali-first-time-visitors-guide', title: 'What Nobody Tells You About Visiting Nathia Gali for the First Time', category: 'Travel Guide', date: 'August 30, 2026', excerpt: 'The traffic, the altitude, the bazaar reality, which trails are worth it, and how to actually plan the trip.', image: 'jpg' },
  { slug: 'nathia-gali-vs-abbottabad-living-investment', title: 'Nathia Gali vs Abbottabad: Mountain Living and Investment Comparison', category: 'Investment', date: 'August 26, 2026', excerpt: 'Altitude, lifestyle, real estate returns, infrastructure, accessibility, and which suits mountain living versus weekend investment.', image: 'jpg' },
  { slug: 'nathia-gali-with-elderly-guide', title: 'Nathia Gali with Elderly: How to Plan a Comfortable Visit (2026)', category: 'Travel Guide', date: 'August 25, 2026', excerpt: 'Altitude preparation, accommodation requirements, suitable activities, and how Serene Heights makes it manageable.', image: 'jpg' },
  { slug: 'nathia-gali-vs-murree-vs-kalam', title: 'Nathia Gali vs Murree vs Kalam for Visitors and Investors (2026)', category: 'Travel Guide', date: 'August 24, 2026', excerpt: 'Altitude, accessibility, infrastructure, rental yields, crowd levels and who each suits best.', image: 'jpg' },
  { slug: 'snowfall-in-nathia-gali', title: 'Snowfall in Nathia Gali 2026-27: Complete Guide', category: 'Travel Guide', date: 'August 18, 2026', excerpt: 'When snow starts, peak snowfall months, road conditions, what to pack, and safety tips for mountain travel.', image: 'jpg' },
  { slug: 'nathia-gali-december-month-guide', title: 'Nathia Gali in December: What to Expect in the Winter Season', category: 'Travel Guide', date: 'August 13, 2026', excerpt: 'The weather, when snowfall starts, what is open, and how December compares to January and November.', image: 'jpg' },
  { slug: 'galiyat-mountain-property-outperforming-city-real-estate', title: 'Why Galiyat Mountain Property Is Outperforming City Real Estate in Pakistan (2026)', category: 'Investment', date: 'August 12, 2026', excerpt: 'Why mountain property is drawing investors, how the tourism rental model works, and what to know before buying.', image: 'jpg' },
  { slug: 'islamabad-to-nathia-gali-travel-guide-2026', title: 'Complete Travel Guide: Islamabad to Nathia Gali 2026', category: 'Travel Guide', date: 'August 8, 2026', excerpt: 'Best routes, driving distance, time, tips for each season, what to pack, and what to expect on arrival.', image: 'jpg' },
  { slug: 'hotel-apartment-cost-nathia-gali-2026', title: 'How Much Does a Hotel Apartment Cost in Nathia Gali? (2026 Guide)', category: 'Travel Guide', date: 'August 7, 2026', excerpt: 'Nightly rates by category, weekend vs weekday costs, what is included, and how Serene Heights compares to standard hotels.', image: 'jpg' },
  { slug: 'nathia-gali-for-families-guide', title: 'Nathia Gali for Families: Kids’ Activities & Family Vacation Planning', category: 'Travel Guide', date: 'July 28, 2026', excerpt: 'Outdoor exploration for children and a slower mountain pace for parents: how to plan a family trip that works.', image: 'png' },
  { slug: 'nathia-gali-remote-workers-digital-nomads-workation-guide', title: 'Nathia Gali for Remote Workers & Digital Nomads: Your Workation Guide', category: 'Travel Guide', date: 'July 27, 2026', excerpt: 'Reliable connectivity, a cooler climate, and a cost of living that stretches freelance income further.', image: 'png' },
  { slug: 'how-to-get-to-nathia-gali-complete-driving-guide', title: 'How to Get to Nathia Gali: Guide from Islamabad & Lahore', category: 'Travel Guide', date: 'July 26, 2026', excerpt: 'Routes, road conditions and travel timing, before you even arrive.', image: 'png' },
  { slug: 'maximize-rental-income-from-nathia-gali-property', title: 'How to Maximize Rental Income from Your Nathia Gali Property Investment', category: 'Investment', date: 'July 13, 2026', excerpt: 'Five strategies to increase occupancy, optimise pricing, and improve returns.' },
  { slug: 'is-serene-heights-nathiagali-worth-investment', title: 'Is Serene Heights Nathia Gali Worth the Investment?', category: 'Investment', date: 'July 12, 2026', excerpt: 'Financial metrics, specific advantages, realistic limitations, and a framework to decide whether it fits your situation.' },
  { slug: 'nathia-gali-weather-seasons-climate-guide', title: 'Nathia Gali Weather & Seasons for Investors and Visitors', category: 'Travel & Investment Guide', date: 'July 11, 2026', excerpt: 'Year-round temperatures, rainfall, seasonal activities, tourism demand, and occupancy patterns.' },
  { slug: 'nathia-gali-for-couples', title: 'Nathia Gali for Couples: Memories With Your Partner in Nature', category: 'Travel Guide', date: 'June 19, 2026', excerpt: 'Pine trees, cold mornings, and a proper mountain view from a room with actual heating.', image: 'png' },
  { slug: 'nathia-gali-vs-murree', title: 'Nathia Gali vs Murree: An Honest Look at Both Hill Stations', category: 'Travel Guide', date: 'June 19, 2026', excerpt: 'Both are about two hours from Islamabad, with pine forests and cold nights. Here is how they differ.', image: 'png' },
  { slug: 'best-time-to-visit-nathia-gali', title: 'Best Time to Visit Nathia Gali (By Month, By Season, By What You Want)', category: 'Travel Guide', date: 'June 14, 2026', excerpt: 'For comfortable weather and open trails, go in April, May or October. For snowfall, January is your month.', image: 'png' },
  { slug: 'things-to-do-in-nathia-gali', title: 'Things to Do in Nathia Gali: Hikes, Landmarks, and Activities', category: 'Travel Guide', date: 'June 14, 2026', excerpt: 'From Miranjani and Mukshpuri to colonial landmarks, wildlife and adventure activities.', image: 'png' },
  { slug: 'hotel-apartment-vs-plot-investment-pakistan', title: 'Hotel Apartment vs Plot Investment in Pakistan: Which Gives Better Returns?', category: 'Investment', date: 'June 9, 2026', excerpt: 'Buy a plot and wait for appreciation, or buy a hotel apartment and earn rental income from day one?' },
  { slug: 'nathia-gali-real-estate-investment', title: 'Investing in Nathia Gali Real Estate: What You Need to Know Before You Buy', category: 'Investment', date: 'June 9, 2026', excerpt: 'Tourism demand, managed rental operations and long-term appreciation at 7,906 ft, 80 km from Islamabad.' },
]
// posts without their own cover use the project renders
const fallbackCovers = ['/media/ridge-960.webp', '/media/pines-960.webp', '/media/terraces-960.webp', '/media/rooftop-960.webp', '/media/sunrise-960.webp']
export const blogPosts = posts.map((p, i) => ({
  ...p,
  cover: p.image ? `/media/blog/${p.slug}-640.webp` : fallbackCovers[i % fallbackCovers.length],
  hero: p.image ? `/media/blog/${p.slug}.webp` : fallbackCovers[i % fallbackCovers.length].replace('-960', ''),
  url: `/blog/${p.slug}`,
}))

export const offices = [
  { label: 'Project', name: 'Serene Heights', address: '1.5 km, Kala Bagh Air Base Road, Nathia Gali, Khyber Pakhtunkhwa' },
  { label: 'Head office', name: 'DM Consortium', address: 'H. No. 71 C3, Gulberg III, Park View Lane, Lahore' },
]
export const mapsLink = 'https://www.google.com/maps/search/?api=1&query=34.0745,73.379'

export const privacy = {
  updated: 'May 8, 2026',
  sections: [
    { h: 'Overview', p: ['Serene Heights Nathia Gali is committed to protecting your privacy. This policy explains how we collect, use, and safeguard your information when you visit our website or submit an enquiry for our resort and real estate offerings.'] },
    { h: 'Information we collect', p: ['We collect information to respond to your requests and improve the Serene Heights experience. This may include:'], list: ['Contact details such as name, email, phone number, and city.', 'Enquiry details like your interest area and preferences.', 'Basic usage data such as browser type, pages viewed, and device information.'] },
    { h: 'How we use your information', list: ['Respond to enquiries and provide requested information.', 'Share updates about Serene Heights developments and offerings.', 'Improve website content, layout, and user experience.', 'Comply with legal obligations and protect our rights.'] },
    { h: 'Information sharing', p: ['We do not sell your personal information. We may share data with trusted service providers who assist with website operations and communications, or when required by law.'] },
    { h: 'Cookies and analytics', p: ['We use cookies and analytics tools to understand website usage and improve performance. Analytics cookies are only set if you accept them in the cookie notice, and you can change your choice at any time from the footer. You can also adjust your browser settings to manage cookies, but some features may not function properly without them.'] },
    { h: 'Data retention and security', p: ['We retain your information only as long as necessary for the purposes outlined here. We use reasonable administrative and technical safeguards to protect your data, but no system is completely secure.'] },
    { h: 'Your choices', p: ['You may request access, corrections, or deletion of your personal information by contacting us. We will respond within a reasonable timeframe.'] },
    { h: 'Contact us', p: ['If you have questions about this Privacy Policy, please contact us by phone on 042-111-111-744 or +92 300 8497999, or by email at info@sereneheightsnathiagali.com.', 'We may update this policy from time to time. Any changes will be posted on this page with an updated date.'] },
  ] as { h: string; p?: string[]; list?: string[] }[],
}
