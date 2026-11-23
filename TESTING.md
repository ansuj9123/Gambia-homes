# Gambia Homes — manual test guide

Work through each part in order. Tick a box when the result matches **Expect**. If something doesn't match, write down the part and step number, what you did, and what you saw (a screenshot helps).

About 60–90 minutes for everything. Parts 1–5 take about 20 minutes if you want a quick check first.

---

## Part 0 — Get ready

- [ ] **0.1** In VS Code's terminal, in the `gambia-homes` folder, run `npm run dev`. Wait for "Ready".
- [ ] **0.2** Open http://localhost:3000 in your browser.
  **Expect:** the home page with "Buy property at home safely, from anywhere."
- [ ] **0.3** Find any 2–3 photos on your computer or phone (screenshots are fine). You'll upload them as listing photos and evidence.
- [ ] **0.4** You'll act as several different people. Use a **normal window** for one person and a **private/incognito window** (Ctrl+Shift+N in Chrome/Edge) for another, so you stay signed in as two people at once. Close the private window to sign that person out completely.

**Accounts you'll create while testing** (any made-up emails work; they're only stored on your computer):

| Who | How they sign in | Used in |
|---|---|---|
| Diaspora buyer | Email, e.g. `buyer1@example.com` | Parts 2–4, 9 |
| Local user | Phone code, e.g. `7001234` | Part 5 |
| New agent | Phone code, e.g. `7005555` | Parts 6–7 |
| Sample agent | Phone code with `3000001` (Kombo Realty, from the sample data) | Part 8 |
| Lawyer, field agent, surveyor | Email, e.g. `lawyer1@example.com` | Part 9 |
| Admin | Your admin email and password | Parts 6, 7, 9 |

Phone sign-in codes appear on screen in a yellow box, because no SMS provider is connected yet.

---

## Part 1 — Browsing as a visitor (signed out)

- [ ] **1.1** On the home page, check the currency box at the top right says **GBP**.
  **Expect:** featured listings show prices in £.
- [ ] **1.2** Change the currency to **GMD**, then reload the page.
  **Expect:** prices show in dalasi (D), and GMD stays selected after the reload. Switch back to GBP.
- [ ] **1.3** In the big search box choose **Buy**, area **Brikama**, type **Land / plot**, then **Search**.
  **Expect:** a results page titled "Land / plot for sale in Brikama" with matching plots.
- [ ] **1.4** Click **Clear**. In the filters, set **Max** price to **8000** (GBP) and type **Land / plot**, then **Search**.
  **Expect:** about 5 plots, all under £8,000.
- [ ] **1.5** Set **Verification** to "Site verified or better" and search.
  **Expect:** only listings with a green "Site verified" or "Fully verified" badge.
- [ ] **1.6** Click **Map** at the top right of the results.
  **Expect:** a map of The Gambia with dots. Click a dot: a popup shows the price and a "View property" link.
- [ ] **1.7** Open any listing.
  **Expect:** the price in £ with dalasi next to it, key facts, description, a "Verification checks" list with ticks for the checks done, a map, and agent details.
- [ ] **1.8** Click **Chat on WhatsApp**.
  **Expect:** WhatsApp (web or app) opens with a ready-written message that includes the listing link. Don't send it; the sample numbers aren't real.
- [ ] **1.9** Click **Buying from abroad** in the top menu.
  **Expect:** the 7 steps, report prices (£199 / £449) and scam warning signs.
- [ ] **1.10** On a listing, click the ♡ on its photo, then open **Saved** in the top menu.
  **Expect:** the listing is there, with a note that it's "saved on this device only".

## Part 2 — Diaspora buyer account

- [ ] **2.1** Click **Sign in**, then **Create an account**. On the **Email** tab, try the password `short`.
  **Expect:** a message asking for at least 8 characters.
- [ ] **2.2** Create the account properly: name, `buyer1@example.com`, a password, country "United Kingdom".
  **Expect:** you land on your Account page ("Hello, …"). The header shows your initial.
- [ ] **2.3** Open **Saved**.
  **Expect:** the listing you saved in step 1.10 has moved into your account ("Saved to your account, on every device").
- [ ] **2.4** On Account, scroll to **Profile**, change your country, click **Save profile**.
  **Expect:** "Profile saved."
- [ ] **2.5** In **Change password**, enter a wrong current password and a new one twice.
  **Expect:** "Your current password is wrong." Then do it properly; expect "Password changed."
- [ ] **2.6** Click **Sign out**, then sign in again with the **new** password.
  **Expect:** you're back on your account. The old password no longer works.

## Part 3 — Saving searches

- [ ] **3.1** Signed in as the buyer, search for land under £8,000 (as in step 1.4), then click **Save search**.
  **Expect:** "✓ Saved. Manage alerts".
- [ ] **3.2** Go to **Account → Saved searches**.
  **Expect:** "Land / plot for sale in The Gambia · up to £8,000". Untick Email, tick WhatsApp, click **Update**; the choice is kept. Click the search name; it reopens the same results.
- [ ] **3.3** Click **Delete** on the saved search.
  **Expect:** it disappears.

## Part 4 — Contacting an agent

- [ ] **4.1** Still signed in as the buyer, open the listing **"Corner plot in Tanji with sea breeze"**.
  **Expect:** on the right, the **Message** tab already has your name and email filled in.
- [ ] **4.2** Add a phone number (e.g. `+44 7700 900123`) and click **Send message**.
  **Expect:** "Message sent. The agent will reply by email or WhatsApp."
- [ ] **4.3** Open the **Video viewing** tab, fill it in and send.
  **Expect:** "Request sent…"
- [ ] **4.4** Open the **Report** tab, type a reason (e.g. "Test report, please ignore"), click **Report listing**.
  **Expect:** "Thank you. Our team will review this listing within 24 hours."
- [ ] **4.5** Go to **Account → Your messages and viewing requests**.
  **Expect:** both requests are listed.

## Part 5 — Local user with phone sign-in

Use a **private window** for this part.

- [ ] **5.1** Go to **Sign in → Phone / WhatsApp**. Type `123`, click **Send code**.
  **Expect:** a message asking for a valid number with country code.
- [ ] **5.2** Type `7001234` (a Gambian number without +220) and click **Send code**.
  **Expect:** "We sent a 6-digit code to +220 ••• 234" and a yellow box showing the code.
- [ ] **5.3** Type a wrong code, e.g. `000000`, and click **Verify and continue**.
  **Expect:** "That code is wrong or has expired."
- [ ] **5.4** Type the real code and your name, and continue.
  **Expect:** you're signed in and on the Account page, showing `+2207001234`.
- [ ] **5.5** Click **Send code** again straight away on another sign-in attempt (sign out first).
  **Expect:** "Please wait a minute before asking for another code."
- [ ] **5.6** Switch the currency to **GMD** and open **Rent** in the menu.
  **Expect:** rentals priced in dalasi per month or per night, including the student room in Brikama.

Close the private window when done.

## Part 6 — Listing a property (new agent)

Use a **private window** for this part.

- [ ] **6.1** Sign in by phone with `7005555` and a name.
- [ ] **6.2** Click **List a property**.
  **Expect:** your name and phone are already filled in at the bottom.
- [ ] **6.3** Fill in: For **Sale**, type **Land / plot**, a title (8+ characters), a description (20+ characters), area **Gunjur**, a price in dalasi (e.g. `500000`), plot size `500`.
- [ ] **6.4** Under **Photos**, click **Add photos** and choose 2–3 photos.
  **Expect:** thumbnails appear; the first is marked **Cover**. Use **→** to move one, then **Make cover** on another. Remove one with **✕**.
- [ ] **6.5** Click **Submit for review**.
  **Expect:** "Thank you. Your listing is under review…"
- [ ] **6.6** Look at the header.
  **Expect:** a new **Agent portal** link. Click it.
  **Expect:** your new listing shows as **In review**, with your photo count.
- [ ] **6.7** Search for the listing on the public site.
  **Expect:** it does **not** appear yet (it's waiting for review).

Keep this private window open for Part 7.

## Part 7 — Admin review, then the agent portal

In your **normal window**, sign out of the buyer account and sign in as **admin**.

- [ ] **7.1** Click **Admin** in the header.
  **Expect:** the **Pending listings** tab shows the new Gunjur listing with a red counter.
- [ ] **7.2** Click **Photos & details** on that listing.
  **Expect:** the photos you uploaded, in the order you set. Upload one more photo here.
- [ ] **7.3** Set status **LIVE**, trust level **1 · Lister verified**, tick **Featured**, click **Save**.
- [ ] **7.4** Open the public listing (search Gunjur, or **View public page**).
  **Expect:** the photo gallery with arrows and thumbnails, a "Lister ID" badge, and the "Featured" tag on its card.
- [ ] **7.5** Back in the **private window** (the new agent), open **Agent portal**.
  **Expect:** the listing now shows **Live**.
- [ ] **7.6** Click **Edit**. Change only the **price**, click **Save changes**.
  **Expect:** "Saved." It stays live.
- [ ] **7.7** Now change the **title** and save.
  **Expect:** "…the listing is back in review…" and the status shows **In review**. (Admin would need to approve it again.)
- [ ] **7.8** In **Availability**, click **Withdraw**.
  **Expect:** status **Withdrawn**, and the editing fields are greyed out. Click **Relist (goes to review)**.
- [ ] **7.9** In the admin window, check **Admin → Scam reports** and **Admin → Enquiries**.
  **Expect:** the report and both enquiries from Part 4.
- [ ] **7.10** Open **Admin → Messages sent**.
  **Expect:** for each enquiry, a **WHATSAPP NEW_LEAD** to the agent and an **EMAIL ENQUIRY_RECEIPT** to the buyer, all marked **LOGGED** (recorded, not sent, because no email/WhatsApp provider is connected). Click one to read the text.

Close the private window.

## Part 8 — An existing agent claims their listings

Use a **private window**.

- [ ] **8.1** Sign in by phone with `3000001`.
  **Expect:** you're signed in, and the header shows **Agent portal**.
- [ ] **8.2** Open **Agent portal**.
  **Expect:** "Kombo Realty (sample)" with 8 listings. This shows how real agents get access: sign in with the number on their listings.
- [ ] **8.3** Open the **Leads** tab.
  **Expect:** the message and video request from Part 4 (the Tanji plot is Kombo's), with **WhatsApp** and **Email** reply buttons.
- [ ] **8.4** Set one lead to **Contacted**, click **Update**.
  **Expect:** the "New leads" counter goes down.
- [ ] **8.5** Edit one of Kombo's listings and upload a photo.
  **Expect:** it appears on the public listing straight away.
- [ ] **8.6** In the address bar, go to http://localhost:3000/admin.
  **Expect:** "404 This page could not be found" (agents can't open admin).

Close the private window.

## Part 9 — A full verification report

This is the main paid product. Stripe isn't connected yet, so you'll mark the order as paid by hand.

**9a. Buyer orders a report** (normal window, signed in as `buyer1@example.com`)

- [ ] **9.1** Open the Tanji plot listing → **Verify** tab. Choose **Full report with survey · £449**, click **Request verification report**.
  **Expect:** "…We'll email you a secure payment link…"
- [ ] **9.2** Go to **Account → Verification reports**.
  **Expect:** the order with status "Awaiting payment".

**9b. Create the team.** Each person needs an account first. In a **private window**, create three email accounts one after another (sign out between each): `lawyer1@example.com`, `field1@example.com`, `survey1@example.com`. Close the private window.

**9c. Admin sets up the case** (normal window: sign out of the buyer, sign in as admin)

- [ ] **9.3** **Admin → Team**: enter `lawyer1@example.com`, choose **Partner lawyer**, click **Set role**. Repeat for `field1@example.com` (**Field agent**) and `survey1@example.com` (**Surveyor**).
  **Expect:** "… is now Partner lawyer" (and so on). All three appear in the table.
- [ ] **9.4** **Admin → Verification orders**: on the buyer's order, change the dropdown to **Paid, checks in progress** and click **Save**. (This stands in for the Stripe payment.)
- [ ] **9.5** Click **Open case →**. In **Team**, choose the lawyer, field agent and surveyor, pick a due date, click **Save assignments**.
  **Expect:** "Assignments saved…"
- [ ] **9.6** Scroll down to **Publish the report**, choose **Verified**, write a summary, and click **Generate PDF and send to buyer**.
  **Expect:** it refuses: "The registry search isn't complete yet." (Good: it won't publish an incomplete report.)

**9d. Partners do their checks** (private window, one person at a time; sign out between each)

- [ ] **9.7** Sign in as `lawyer1@example.com`.
  **Expect:** a **Work** link in the header. Click it: the Tanji case is listed with "Registry search".
- [ ] **9.8** Open the case. Tick **This stage is complete** and **Save** without filling anything in.
  **Expect:** "Choose a result and write your findings…"
- [ ] **9.9** Choose **Clear**, write findings, tick complete, **Save**.
  **Expect:** "Saved and marked complete." Upload a PDF or photo under **Files** with a caption.
- [ ] **9.10** Check that the lawyer can only edit the Registry search section. The other sections are greyed out or hidden.
- [ ] **9.11** Sign out, sign in as `field1@example.com` → **Work** → the case. Write observations, upload 1–2 photos, tick complete, **Save**.
- [ ] **9.12** Sign out, sign in as `survey1@example.com` → **Work** → the case. In GPS points, type `51.5, -0.12, London` and save.
  **Expect:** an error asking for a point inside The Gambia.
- [ ] **9.13** Replace it with four points, one per line, for example:
  ```
  13.350400, -16.790700, NE corner
  13.350400, -16.790300, SE corner
  13.350000, -16.790300, SW corner
  13.350000, -16.790700, NW corner
  ```
  Add survey notes, tick complete, **Save**.
  **Expect:** saved. The map at the top shows the points.
- [ ] **9.14** Still as the surveyor, go to http://localhost:3000/admin.
  **Expect:** 404.

Close the private window.

**9e. Admin publishes** (normal window, admin)

- [ ] **9.15** Reopen the case.
  **Expect:** all three stage boxes are green with ✓, and the uploaded files are visible.
- [ ] **9.16** In **Publish the report**: outcome **Verified**, raise trust level to **4 · Fully verified**, write a summary of at least 30 characters, click **Generate PDF and send to buyer**.
  **Expect:** the page shows "Report published… This case is closed." Click **Download published PDF** and open it.
  **Expect:** a 1–2 page report with the outcome, property details, all three checks with names and dates, the GPS points, the site photos and the limitations section.
- [ ] **9.17** Open the Tanji listing on the public site.
  **Expect:** the badge now says **Fully verified**.
- [ ] **9.18** **Admin → Messages sent**.
  **Expect:** an **EMAIL REPORT_READY** to the buyer (LOGGED). Open it; it contains a private download link.
- [ ] **9.19** Copy that link into a **private window** (signed out) and open it.
  **Expect:** the PDF downloads. Change one letter of the link and try again; **Expect:** "Not found".

**9f. Buyer gets the report**

- [ ] **9.20** Sign out, sign in as `buyer1@example.com` → **Account**.
  **Expect:** the order shows "Report ready" and a **Download report (PDF)** button that works.

## Part 10 — On your phone (optional)

- [ ] **10.1** Same Wi-Fi: stop the server, run `npm run dev:lan`, open http://192.168.1.72:3000 on your phone. (Wi-Fi must be set to **Private** in Windows; see the README if your address has changed.)
  **Expect:** the site works. Try search, the map and the photo gallery.
- [ ] **10.2** Anywhere: with `npm run dev` running, open a second terminal and run `npm run tunnel`. Open the `https://….trycloudflare.com` address on your phone using **mobile data**.
  **Expect:** the site works. Phone sign-in shows **no** code on screen (the code only appears in your terminal). Press Ctrl+C to close the link when done.
- [ ] **10.3** On the tunnel link, go to **List a property** and tap **Use my current location** while outside.
  **Expect:** "Location added."

## Part 11 — Quick safety checks

- [ ] **11.1** Signed out, go to http://localhost:3000/admin.
  **Expect:** you're sent to the sign-in page.
- [ ] **11.2** Signed out, go to http://localhost:3000/agent.
  **Expect:** sent to sign-in.
- [ ] **11.3** Signed in as the buyer, go to http://localhost:3000/work.
  **Expect:** 404.

## Part 12 — Comparing properties (S10)

- [ ] **12.1** Open **Land** in the top menu. Every card has a small **+ Compare** button. Click it on 2 plots.
  **Expect:** the buttons change to **✓ Comparing**, and a bar appears at the bottom: "2 of 4 properties selected to compare".
- [ ] **12.2** Click **+ Compare** on 3 more plots (5 in total).
  **Expect:** the 5th is refused with "You can compare up to 4 properties. Remove one first."
- [ ] **12.3** Open a listing page.
  **Expect:** a **+ Compare** button next to **Save** (or **✓ Comparing** if it's already in your list), and the bar is still at the bottom.
- [ ] **12.4** Click **Compare now** in the bar.
  **Expect:** a side-by-side table with photos, price (in your currency plus dalasi), price per sqm, plot size, tenure, trust level, the checks done, who listed it and when. **Green** cells mark the best value in each row (lowest price, lowest price per sqm, largest plot, most verified).
- [ ] **12.5** Switch the currency at the top to **GMD**, then **USD**.
  **Expect:** all prices in the table change; the green highlights stay on the same properties.
- [ ] **12.6** Click **Remove** under one property.
  **Expect:** that column disappears and the web address updates.
- [ ] **12.7** Click **Copy link**, open a **private window**, and paste the link.
  **Expect:** the same comparison appears, even though that window has nothing saved. This is how a buyer shares a shortlist with family.
- [ ] **12.8** Click **Share on WhatsApp**.
  **Expect:** WhatsApp opens with a message containing the comparison link (don't send it unless you want to).
- [ ] **12.9** Add a **rental** (from **Rent**) to a comparison with houses for sale, then open the comparison.
  **Expect:** a yellow note that prices aren't ranked because sales and rentals are mixed, and no green on the price rows.
- [ ] **12.10** Compare only plots of land.
  **Expect:** there are no Bedrooms/Bathrooms rows (rows empty for every property are hidden).
- [ ] **12.11** Click **Order verification** under a property.
  **Expect:** the listing opens with the **Verify** tab already selected.
- [ ] **12.12** On your phone (or a narrow browser window), open a comparison.
  **Expect:** "Swipe the table sideways…" hint; the row labels stay on the left while you swipe through the properties.
- [ ] **12.13** Click **Clear** in the bottom bar.
  **Expect:** the bar disappears and all buttons go back to **+ Compare**.

## Part 13 — Drawing a search area on the map (S9)

- [ ] **13.1** Open **Land** in the top menu and click **✏️ Draw an area** (next to Save search).
  **Expect:** the map opens with a dark box saying "Tap the map to mark the corners of your area (0 so far, at least 3)", plus **Undo**, **Cancel** and **Finish** (Finish is greyed out).
- [ ] **13.2** Click 4 points on the map around the coast (Banjul down to Kartong), leaving out Farafenni and Soma further inland.
  **Expect:** a dotted green outline joins the points; the box shows the number of corners and the size in km².
- [ ] **13.3** Click **Undo**.
  **Expect:** the last corner disappears and the count goes down by one. Add it back.
- [ ] **13.4** Click **Finish** (or click the first, larger corner).
  **Expect:** the page reloads with the heading "… in your drawn area", the size in km² under it, a dashed blue outline on the map, and only listings inside it (Farafenni and Soma are gone).
- [ ] **13.5** Click **List**.
  **Expect:** the same listings as cards, with a blue note "Showing only listings inside the area you drew", plus **See it on the map** and **Clear area** links.
- [ ] **13.6** In the filters, set **Max** price to `7000` and click **Search**.
  **Expect:** fewer results, and the drawn area is still applied (the filters show "Filtering inside your drawn area").
- [ ] **13.7** Go back to **Map**, click **✏️ Redraw area** on the map, click two points, then **Cancel**.
  **Expect:** your original area comes back unchanged.
- [ ] **13.8** Copy the web address, open it in a **private window**.
  **Expect:** the same drawn-area search, so it can be bookmarked or sent to someone.
- [ ] **13.9** Sign in as a buyer, draw an area, click **Save search**, then open **Account → Saved searches**.
  **Expect:** the search is listed as "… in your drawn area" with "drawn area of about … km²"; clicking it reopens the area.
- [ ] **13.10** Draw a tiny area in the sea or somewhere with no listings and finish.
  **Expect:** a yellow note "No listings inside this area yet…", and the map still shows so you can redraw.
- [ ] **13.11** Click **✕ Clear area**.
  **Expect:** the outline disappears, results go back to everywhere, and your other filters are kept.
- [ ] **13.12** On your phone (or a narrow window), open **Land → Draw an area**.
  **Expect:** the map appears straight away above the filters; tapping the map adds corners.

---

## What isn't testable yet

| Feature | Why |
|---|---|
| Real card payment | Needs Stripe test keys in `.env` (see README) |
| Emails and WhatsApp messages actually arriving | Needs an email provider and the WhatsApp Business Platform. Until then, check Admin → Messages sent |
| Phone codes by SMS | Needs an SMS/WhatsApp provider. Codes show on screen locally |
| Google / Apple sign-in | Needs their keys |
| Password reset, saved-search alerts sending | Not built yet (see BACKLOG.md) |

## Reset the test data

To start again with only the sample listings: stop the server and run `npm run db:reset`. This **deletes all accounts, orders and listings you created** and recreates the admin from `.env`. Then run `npm run admin:password` if you had changed the admin password and want it back to the `.env` value. Uploaded files in the `storage` folder can be deleted by hand.
