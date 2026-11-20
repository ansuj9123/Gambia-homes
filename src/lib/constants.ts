export const PURPOSES = [
  { value: "SALE", label: "Buy" },
  { value: "RENT", label: "Rent" },
] as const;

export const TYPES = [
  { value: "LAND", label: "Land / plot" },
  { value: "HOUSE", label: "House" },
  { value: "COMPOUND", label: "Compound" },
  { value: "APARTMENT", label: "Apartment" },
  { value: "COMMERCIAL", label: "Commercial" },
  { value: "SHORT_LET", label: "Short let" },
] as const;

export const TENURES = [
  { value: "LEASEHOLD", label: "Leasehold" },
  { value: "CUSTOMARY", label: "Customary (transfer)" },
  { value: "UNKNOWN", label: "Not stated" },
] as const;

// Administrative regions with popular areas inside them.
export const REGIONS: Record<string, string[]> = {
  Banjul: ["Banjul"],
  Kanifing: ["Kololi", "Bakau", "Fajara", "Cape Point", "Serrekunda", "Kerr Serign", "Kanifing"],
  "West Coast": [
    "Brusubi", "Bijilo", "Sukuta", "Brikama", "Busumbala", "Yundum", "Farato",
    "Tanji", "Tujereng", "Sanyang", "Gunjur", "Kartong",
  ],
  "North Bank": ["Farafenni", "Barra"],
  "Lower River": ["Soma", "Mansakonko"],
  "Central River": ["Janjanbureh", "Bansang"],
  "Upper River": ["Basse"],
};

export const ALL_AREAS = Object.values(REGIONS).flat().sort();

// Approximate area centres, used when a lister doesn't share an exact GPS point.
export const AREA_COORDS: Record<string, [number, number]> = {
  Banjul: [13.4549, -16.5790],
  Kololi: [13.4490, -16.7190],
  Bakau: [13.4780, -16.6810],
  Fajara: [13.4740, -16.6900],
  "Cape Point": [13.4800, -16.6710],
  Serrekunda: [13.4380, -16.6780],
  "Kerr Serign": [13.4400, -16.7000],
  Kanifing: [13.4500, -16.6700],
  Brusubi: [13.4180, -16.7330],
  Bijilo: [13.4210, -16.7360],
  Sukuta: [13.4100, -16.7080],
  Brikama: [13.2740, -16.6510],
  Busumbala: [13.3310, -16.6690],
  Yundum: [13.3400, -16.6810],
  Farato: [13.3010, -16.6480],
  Tanji: [13.3500, -16.7900],
  Tujereng: [13.3010, -16.7900],
  Sanyang: [13.2520, -16.7800],
  Gunjur: [13.1830, -16.7570],
  Kartong: [13.0900, -16.7610],
  Farafenni: [13.5700, -15.6020],
  Barra: [13.4830, -16.5450],
  Soma: [13.4410, -15.5300],
  Mansakonko: [13.4430, -15.5390],
  Janjanbureh: [13.5350, -14.7660],
  Bansang: [13.4340, -14.6560],
  Basse: [13.3100, -14.2140],
};

export const regionForArea = (area: string) =>
  Object.entries(REGIONS).find(([, areas]) => areas.includes(area))?.[0];

export const TRUST_LEVELS = [
  { level: 0, label: "Unverified", short: "Unverified", detail: "Only the lister's phone number has been confirmed." },
  { level: 1, label: "Lister verified", short: "Lister ID", detail: "The lister's national ID or passport, and business registration for agencies, have been checked." },
  { level: 2, label: "Documents checked", short: "Docs checked", detail: "Lease, transfer or sale papers reviewed by our team; the seller's name matches their ID." },
  { level: 3, label: "Site verified", short: "Site verified", detail: "A field agent visited, took geotagged photos and video, and recorded GPS boundary points." },
  { level: 4, label: "Fully verified", short: "Fully verified", detail: "Lawyer-led registry search, alkalo and neighbour confirmation, and survey matching the papers." },
] as const;

export const VERIFICATION_PRODUCTS = [
  { value: "BASIC", label: "Basic report", priceGbp: 199, detail: "Document review and registry search by a partner lawyer." },
  { value: "FULL", label: "Full report with survey", priceGbp: 449, detail: "Adds a GPS boundary survey, site video and alkalo/neighbour confirmation." },
] as const;

// Approximate dalasi per unit of foreign currency. Replace with a live rate feed
// before taking payments; shown to users as approximate.
export const CURRENCIES = {
  GMD: { symbol: "D", perUnitGmd: 1, label: "Dalasi" },
  GBP: { symbol: "£", perUnitGmd: 95, label: "Pound" },
  USD: { symbol: "$", perUnitGmd: 72, label: "US dollar" },
  EUR: { symbol: "€", perUnitGmd: 82, label: "Euro" },
} as const;

export type Currency = keyof typeof CURRENCIES;
export const CURRENCY_CODES = Object.keys(CURRENCIES) as Currency[];

export const labelFor = (list: readonly { value: string; label: string }[], value?: string | null) =>
  list.find((x) => x.value === value)?.label ?? value ?? "";
