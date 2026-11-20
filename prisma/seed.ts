// Sample data for local development. Every listing and agent here is fictional.
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/password";

const db = new PrismaClient();

const agents = [
  { key: "kombo", name: "Awa Jallow", agency: "Kombo Realty (sample)", phone: "+2203000001", verified: true },
  { key: "coast", name: "Lamin Ceesay", agency: "Atlantic Coast Homes (sample)", phone: "+2203000002", verified: true },
  { key: "brikama", name: "Fatou Sanneh", agency: "Brikama Land Partners (sample)", phone: "+2203000003", verified: false },
  { key: "owner", name: "Private seller (sample)", agency: null, phone: "+2203000004", verified: false },
];

type Seed = {
  title: string; purpose: "SALE" | "RENT"; type: string; region: string; area: string;
  priceGmd: number; rentPeriod?: string; bedrooms?: number; bathrooms?: number; plotSqm?: number;
  tenure?: string; lat: number; lng: number; trustLevel: number; featured?: boolean; agent: string;
  description: string;
};

const listings: Seed[] = [
  { title: "Fenced 500 sqm plot near Brikama highway", purpose: "SALE", type: "LAND", region: "West Coast", area: "Brikama", priceGmd: 650_000, plotSqm: 500, tenure: "LEASEHOLD", lat: 13.2745, lng: -16.6512, trustLevel: 4, featured: true, agent: "brikama", description: "Fenced plot with lease papers, 300 m from the main road. Electricity poles on the street. Survey and registry search completed." },
  { title: "Two plots side by side in Gunjur", purpose: "SALE", type: "LAND", region: "West Coast", area: "Gunjur", priceGmd: 900_000, plotSqm: 1000, tenure: "CUSTOMARY", lat: 13.1832, lng: -16.7571, trustLevel: 3, agent: "brikama", description: "Two adjoining 500 sqm plots, 10 minutes from Gunjur beach. Site visited and GPS boundary recorded; documents under review." },
  { title: "Beach-side plot in Sanyang", purpose: "SALE", type: "LAND", region: "West Coast", area: "Sanyang", priceGmd: 1_200_000, plotSqm: 600, tenure: "LEASEHOLD", lat: 13.2521, lng: -16.7802, trustLevel: 2, agent: "coast", description: "Plot 800 m from Sanyang beach, suitable for a guesthouse or holiday home. Lease papers checked." },
  { title: "Affordable plot in Busumbala", purpose: "SALE", type: "LAND", region: "West Coast", area: "Busumbala", priceGmd: 420_000, plotSqm: 400, tenure: "CUSTOMARY", lat: 13.3311, lng: -16.6688, trustLevel: 1, agent: "owner", description: "Quiet residential area, good for a first home. Seller ID checked; papers not yet reviewed." },
  { title: "Corner plot in Tanji with sea breeze", purpose: "SALE", type: "LAND", region: "West Coast", area: "Tanji", priceGmd: 780_000, plotSqm: 500, tenure: "LEASEHOLD", lat: 13.3502, lng: -16.7905, trustLevel: 3, agent: "kombo", description: "Corner plot near the Tanji fishing village road. Site verified with video tour available." },
  { title: "Large farm land in Farato", purpose: "SALE", type: "LAND", region: "West Coast", area: "Farato", priceGmd: 2_400_000, plotSqm: 5000, tenure: "CUSTOMARY", lat: 13.3015, lng: -16.6478, trustLevel: 0, agent: "owner", description: "Half-hectare of farm land with a well. Unverified listing: order a report before paying anything." },
  { title: "Plot in Kartong near the river", purpose: "SALE", type: "LAND", region: "West Coast", area: "Kartong", priceGmd: 550_000, plotSqm: 500, tenure: "CUSTOMARY", lat: 13.0905, lng: -16.7612, trustLevel: 2, agent: "brikama", description: "Peaceful plot close to Kartong village and the Allahein river." },
  { title: "Modern 4-bed house in Brusubi Phase 2", purpose: "SALE", type: "HOUSE", region: "West Coast", area: "Brusubi", priceGmd: 9_500_000, bedrooms: 4, bathrooms: 3, plotSqm: 600, tenure: "LEASEHOLD", lat: 13.4185, lng: -16.7331, trustLevel: 4, featured: true, agent: "kombo", description: "Detached house with en-suite master bedroom, solar panels, borehole and boys' quarters. Fully verified with lawyer registry search." },
  { title: "3-bed bungalow in Bijilo", purpose: "SALE", type: "HOUSE", region: "West Coast", area: "Bijilo", priceGmd: 6_200_000, bedrooms: 3, bathrooms: 2, plotSqm: 500, tenure: "LEASEHOLD", lat: 13.4212, lng: -16.7365, trustLevel: 3, agent: "coast", description: "Bungalow five minutes from Bijilo beach and the forest park. Garden and parking for two cars." },
  { title: "Family compound in Sukuta", purpose: "SALE", type: "COMPOUND", region: "West Coast", area: "Sukuta", priceGmd: 7_800_000, bedrooms: 7, bathrooms: 4, plotSqm: 900, tenure: "CUSTOMARY", lat: 13.4105, lng: -16.7083, trustLevel: 2, agent: "kombo", description: "Walled compound with a main house and two flats. Ideal for extended family or rental income." },
  { title: "Villa with pool at Cape Point", purpose: "SALE", type: "HOUSE", region: "Kanifing", area: "Cape Point", priceGmd: 22_000_000, bedrooms: 5, bathrooms: 5, plotSqm: 1200, tenure: "LEASEHOLD", lat: 13.4802, lng: -16.6708, trustLevel: 4, featured: true, agent: "coast", description: "Five-bedroom villa with pool, generator and sea views. Fully verified." },
  { title: "Starter house in Yundum", purpose: "SALE", type: "HOUSE", region: "West Coast", area: "Yundum", priceGmd: 2_900_000, bedrooms: 2, bathrooms: 1, plotSqm: 400, tenure: "CUSTOMARY", lat: 13.3402, lng: -16.6815, trustLevel: 1, agent: "owner", description: "Simple two-bedroom house near the airport road. Needs finishing work." },
  { title: "Shop unit on Kairaba Avenue", purpose: "SALE", type: "COMMERCIAL", region: "Kanifing", area: "Kerr Serign", priceGmd: 5_500_000, plotSqm: 120, tenure: "LEASEHOLD", lat: 13.4405, lng: -16.6982, trustLevel: 3, agent: "kombo", description: "Ground-floor shop on a busy stretch of Kairaba Avenue." },
  { title: "Furnished 2-bed apartment in Kololi", purpose: "RENT", type: "APARTMENT", region: "Kanifing", area: "Kololi", priceGmd: 38_000, rentPeriod: "MONTH", bedrooms: 2, bathrooms: 2, lat: 13.4495, lng: -16.7178, trustLevel: 3, featured: true, agent: "coast", description: "Air-conditioned apartment near the Senegambia strip, with security and backup power." },
  { title: "3-bed house to rent in Fajara", purpose: "RENT", type: "HOUSE", region: "Kanifing", area: "Fajara", priceGmd: 55_000, rentPeriod: "MONTH", bedrooms: 3, bathrooms: 2, lat: 13.4741, lng: -16.6902, trustLevel: 2, agent: "kombo", description: "Quiet street close to the golf club and embassies." },
  { title: "Room near UTG Brikama campus", purpose: "RENT", type: "APARTMENT", region: "West Coast", area: "Brikama", priceGmd: 4_500, rentPeriod: "MONTH", bedrooms: 1, bathrooms: 1, lat: 13.2701, lng: -16.6455, trustLevel: 1, agent: "brikama", description: "Student room with shared kitchen, walking distance to campus." },
  { title: "Office space in Serrekunda", purpose: "RENT", type: "COMMERCIAL", region: "Kanifing", area: "Serrekunda", priceGmd: 30_000, rentPeriod: "MONTH", plotSqm: 90, lat: 13.4382, lng: -16.6781, trustLevel: 2, agent: "kombo", description: "First-floor office suitable for 6-8 staff, near Westfield junction." },
  { title: "Beach apartment short let in Kololi", purpose: "RENT", type: "SHORT_LET", region: "Kanifing", area: "Kololi", priceGmd: 3_500, rentPeriod: "NIGHT", bedrooms: 1, bathrooms: 1, lat: 13.4521, lng: -16.7215, trustLevel: 3, agent: "coast", description: "Holiday apartment 3 minutes from the beach. Great for visiting family." },
  { title: "Family house to rent in Brusubi", purpose: "RENT", type: "HOUSE", region: "West Coast", area: "Brusubi", priceGmd: 45_000, rentPeriod: "MONTH", bedrooms: 4, bathrooms: 3, lat: 13.4161, lng: -16.7302, trustLevel: 3, agent: "kombo", description: "Spacious house with garden, close to the Brusubi turntable." },
  { title: "Townhouse in Banjul old town", purpose: "SALE", type: "HOUSE", region: "Banjul", area: "Banjul", priceGmd: 4_800_000, bedrooms: 3, bathrooms: 2, plotSqm: 250, tenure: "LEASEHOLD", lat: 13.4549, lng: -16.5781, trustLevel: 2, agent: "coast", description: "Colonial-era townhouse in need of renovation, near Albert Market." },
  { title: "Plot in Farafenni town", purpose: "SALE", type: "LAND", region: "North Bank", area: "Farafenni", priceGmd: 300_000, plotSqm: 500, tenure: "CUSTOMARY", lat: 13.5705, lng: -15.6021, trustLevel: 1, agent: "owner", description: "Residential plot near the Trans-Gambia highway." },
  { title: "Plot in Soma near the junction", purpose: "SALE", type: "LAND", region: "Lower River", area: "Soma", priceGmd: 250_000, plotSqm: 500, tenure: "CUSTOMARY", lat: 13.4412, lng: -15.5302, trustLevel: 0, agent: "owner", description: "Plot close to Soma junction. Unverified." },
  { title: "Estate plots in Tujereng (serviced)", purpose: "SALE", type: "LAND", region: "West Coast", area: "Tujereng", priceGmd: 850_000, plotSqm: 450, tenure: "LEASEHOLD", lat: 13.3011, lng: -16.7905, trustLevel: 3, featured: true, agent: "coast", description: "Serviced estate plots with road access, water and electricity planned. Payment plans available." },
  { title: "Apartment block in Bakau", purpose: "SALE", type: "APARTMENT", region: "Kanifing", area: "Bakau", priceGmd: 14_000_000, bedrooms: 8, bathrooms: 6, plotSqm: 700, tenure: "LEASEHOLD", lat: 13.4781, lng: -16.6801, trustLevel: 2, agent: "kombo", description: "Four 2-bed apartments, all currently rented. Good investment for diaspora buyers." },
];

const slug = (t: string, i: number) =>
  `${t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}-${i + 1}`;

async function main() {
  await db.savedProperty.deleteMany();
  await db.savedSearch.deleteMany();
  await db.otpCode.deleteMany();
  await db.scamReport.deleteMany();
  await db.verificationOrder.deleteMany();
  await db.enquiry.deleteMany();
  await db.property.deleteMany();
  await db.agent.deleteMany();
  await db.account.deleteMany();
  await db.session.deleteMany();
  await db.user.deleteMany();

  // Local admin account for /admin. Credentials come from .env (development only).
  const adminEmail = (process.env.ADMIN_EMAIL ?? "admin@gambiahomes.test").toLowerCase();
  await db.user.create({
    data: {
      name: "Admin",
      email: adminEmail,
      role: "ADMIN",
      passwordHash: await hashPassword(process.env.ADMIN_PASSWORD ?? "change-me-dev-only"),
    },
  });

  const ids: Record<string, string> = {};
  for (const a of agents) {
    const { key, ...data } = a;
    ids[key] = (await db.agent.create({ data })).id;
  }

  for (const [i, l] of listings.entries()) {
    const { agent, ...data } = l;
    await db.property.create({
      data: { ...data, slug: slug(l.title, i), status: "LIVE", sample: true, agentId: ids[agent] },
    });
  }
  console.log(`Seeded ${agents.length} agents, ${listings.length} listings and admin ${adminEmail}.`);
}

main().finally(() => db.$disconnect());
