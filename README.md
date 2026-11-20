# Gambia Homes (working name)

A verified property marketplace for The Gambia, built for Gambians abroad and at home.
This is the first slice of the MVP described in the blueprint.

## Run it locally

Needs Node.js 20.10 or newer.

```bash
npm install
cp .env.example .env      # local dev settings
npm run db:reset          # create the SQLite database, sample listings and a local admin account
npm run dev               # http://localhost:3000
```

Set your own `AUTH_SECRET` in `.env` (`npx auth secret` generates one).

Admin area: http://localhost:3000/admin. Sign in with the `ADMIN_EMAIL` / `ADMIN_PASSWORD` account from `.env` (created by the seed). Change both before deploying anywhere.

To change the admin password: sign in and use **Account → Change password**, or edit `ADMIN_EMAIL` / `ADMIN_PASSWORD` in `.env` and run `npm run admin:password` (keeps all other data; also restores access if you're locked out).

## Card payments (Stripe)

Verification reports are paid by card through Stripe Checkout. Payments are off until keys are set.

1. Create a Stripe account and copy the **test** secret key (`sk_test_...`) into `STRIPE_SECRET_KEY` in `.env`.
   The app refuses live keys outside production.
2. Install the [Stripe CLI](https://docs.stripe.com/stripe-cli) and run
   `stripe listen --forward-to localhost:3000/api/stripe/webhook`. Put the `whsec_...` it prints in `STRIPE_WEBHOOK_SECRET`.
3. Restart `npm run dev`, order a report on any listing, and pay with Stripe's test card `4242 4242 4242 4242`
   (any future date, any CVC).

How it works: the order creates a `Payment` row and a Checkout Session. When Stripe confirms payment (webhook, or the
success page as a fallback), the payment is marked `PAID` and the order moves to `IN_PROGRESS`. Refunds made in the Stripe
Dashboard are recorded as `REFUNDED` through the webhook. Unpaid orders can be paid later from the account page.

`npm run test:webhook` sends signed fake events to the running dev server and checks the results, without a Stripe account
(set any `whsec_` value in `STRIPE_WEBHOOK_SECRET` first).

## What works now

| Area | Features |
| --- | --- |
| Search | Buy/rent, type, region and area, price in GBP/USD/EUR/GMD, bedrooms, plot size, minimum trust level, sorting, list or map view (OpenStreetMap) |
| Listing page | Price in chosen currency plus dalasi, key facts, trust badge and checklist of verification steps, map, WhatsApp click-to-chat, message, video-viewing request, verification report order, scam report |
| Diaspora | Prices default to GBP and remember the visitor's currency; "Buying from abroad" guide; scam warning signs |
| Local users | Dalasi pricing, rentals, student rooms, short lets |
| Listers | "List a property" form with optional GPS from the phone; submissions go to review |
| Operations | `/admin`: approve or reject listings, set trust level 0–4, feature listings, track verification orders, read enquiries and scam reports |
| Accounts | Sign up and sign in with email and password, or with a 6-digit code sent to a phone (any country; Gambian numbers can skip +220). Google and Apple buttons appear when their keys are in `.env`. |
| Account page | Verification reports and their status, saved properties, saved searches with email/WhatsApp alert choices, messages sent, profile, change password |
| Saved | Signed in: saved to the account on every device. Signed out: saved on the device, then moved into the account at sign-in |
| Payments | Stripe Checkout for verification reports (GBP; any card currency), pay-later from the account page, payment status in admin, refunds recorded |
| Photos | Upload on the listing form, in admin and in the agent portal; reorder and choose a cover; gallery on listing pages. Photos are shrunk in the browser, then resized to WebP on the server with all metadata (including GPS) removed. Stored in `storage/` locally |
| Agent portal | `/agent`: listings with status and lead counts, edit details and photos, mark as sold/let or withdraw, leads inbox with WhatsApp/email reply and New/Contacted/Closed status. Agents get access by signing in with a code to the phone number on their listings, or by listing while signed in |
| Notifications | New enquiry → alert to the agent (email + WhatsApp) and a receipt to the buyer. All messages appear in Admin → Messages sent. Emails send when `SMTP_URL` is set; WhatsApp is recorded only until the WhatsApp Business Platform is connected |
| Roles | `USER`, `AGENT`, `ADMIN`; only admins can open `/admin` |

All listings, agents and phone numbers in the seed data are fictional.

## Project layout

```
prisma/schema.prisma      data model (User, Account, OtpCode, SavedProperty, SavedSearch, Agent, Property, ...)
src/auth.ts               Auth.js config: password, phone code, Google, Apple
src/lib/otp.ts            phone sign-in codes (rate-limited, hashed, 10-minute expiry)
src/lib/photos.ts         photo processing (sharp), ordering and cover
src/lib/storage.ts        file storage (local disk; swap for cloud storage)
src/lib/notify.ts         email/WhatsApp notifications and the message outbox
src/app/agent/            agent portal
prisma/seed.ts            sample data
src/app/                  pages and server actions (actions.ts)
src/components/           UI components
src/lib/constants.ts      regions, areas, trust levels, currencies, report prices
src/lib/search.ts         search filters -> database query
```

## Not built yet (next steps)

1. Connect an SMS/WhatsApp provider for sign-in codes (in development the code is shown on screen and logged; in production sending fails until a provider is added in `src/lib/otp.ts`).
2. Send saved-search alerts by email and WhatsApp; password reset and email verification.
3. Move photo storage to cloud storage (S3, Azure Blob or R2) for production: replace the three functions in `src/lib/storage.ts`. Video uploads.
4. Wave/Afrimoney mobile money for local payments; Stripe for featured listings and agent plans.
5. Connect the WhatsApp Business Platform (needs Meta business verification and approved message templates) in `src/lib/notify.ts`.
6. Agent subscriptions and featured-listing payments; agent profile pages with reviews.
7. Move to PostgreSQL + PostGIS; deploy to Azure or AWS behind a CDN.
8. Duplicate-photo and duplicate-phone detection.

## Notes

- Currency rates in `src/lib/constants.ts` are approximate placeholders; use a live rate feed before taking payments.
- Tailwind is pinned to 4.1.13 because newer versions need Node 20.19+.
