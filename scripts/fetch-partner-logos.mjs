import { mkdir, writeFile } from 'node:fs/promises'
import { extname, join } from 'node:path'

const outputDir = new URL('../architecture/images/partners/', import.meta.url)

const logos = [
  ['iseatz', 'iSeatz', 'iseatz.com'],
  ['expedia-group', 'Expedia Group', 'expediagroup.com', ['https://cdn.simpleicons.org/expedia']],
  ['agoda', 'Agoda', 'agoda.com'],
  ['cartrawler', 'CarTrawler', 'cartrawler.com'],
  ['spotnana', 'Spotnana', 'spotnana.com'],
  ['sabre', 'Sabre', 'sabre.com'],
  ['amadeus', 'Amadeus', 'amadeus.com'],
  ['vervotech', 'Vervotech', 'vervotech.com'],
  ['derbysoft', 'DerbySoft', 'derbysoft.com'],
  ['getyourguide', 'GetYourGuide', 'getyourguide.com'],
  ['apple', 'Apple', 'apple.com', ['https://cdn.simpleicons.org/apple']],
  ['arrivia', 'Arrivia', 'arrivia.com'],
  [
    'bookingpal',
    'BookingPal',
    'bookingpal.com',
    ['https://bookingpal.com/wp-content/themes/bookingpal-theme/assets/images/bookingpal-logo-179px.png.webp'],
  ],
  ['airbnb', 'Airbnb', 'airbnb.com', ['https://cdn.simpleicons.org/airbnb']],
]

function extensionFromContentType(contentType) {
  if (contentType?.includes('svg')) return '.svg'
  if (contentType?.includes('png')) return '.png'
  if (contentType?.includes('jpeg') || contentType?.includes('jpg')) return '.jpg'
  if (contentType?.includes('webp')) return '.webp'
  return '.png'
}

await mkdir(outputDir, { recursive: true })

const manifest = []

async function fetchLogo(url, company) {
  const response = await fetch(url, {
    headers: {
      accept: 'image/avif,image/webp,image/svg+xml,image/png,image/*;q=0.8,*/*;q=0.5',
      'user-agent': 'tr-architecture-logo-fetcher/1.0',
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch ${company} from ${url}: ${response.status} ${response.statusText}`)
  }
  return response
}

for (const [slug, company, domain, explicitSources = []] of logos) {
  const sources = [
    ...explicitSources,
    `https://logo.clearbit.com/${domain}?size=512`,
    `https://www.google.com/s2/favicons?domain=${domain}&sz=256`,
  ]
  let response
  let source

  for (const candidate of sources) {
    try {
      response = await fetchLogo(candidate, company)
      source = candidate
      break
    } catch (error) {
      console.warn(`${company}: ${error.message}`)
    }
  }

  if (!response || !source) {
    throw new Error(`No logo source succeeded for ${company}`)
  }

  const contentType = response.headers.get('content-type') ?? ''
  const ext = extname(new URL(response.url).pathname) || extensionFromContentType(contentType)
  const filename = `${slug}${ext}`
  const bytes = new Uint8Array(await response.arrayBuffer())
  await writeFile(join(outputDir.pathname, filename), bytes)
  manifest.push({ company, domain, source, file: `partners/${filename}` })
  console.log(`${company}: ${filename}`)
}

await writeFile(
  join(outputDir.pathname, 'manifest.json'),
  `${JSON.stringify({ generatedBy: 'scripts/fetch-partner-logos.mjs', logos: manifest }, null, 2)}\n`,
)
