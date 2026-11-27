import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Browser, startSite, type Site } from "./harness";
import { text } from "./harness";

let site: Site;
beforeAll(async () => { site = await startSite(); }, 60000);
afterAll(async () => { await site?.stop(); });


const PUBLIC_PAGES: [string, RegExp][] = [
  ["/", /Instant Wins/],
  ["/competitions", /All Competitions/],
  ["/competitions?type=draw", /Live Draws 3/],
  ["/competitions?q=bush", /Bush Bucks/],
  ["/competitions/bush-bucks-jungle-trial", /Instant Wins/],
  ["/competitions/lush-snow-fairy-wonderland", /How the draw works/],
  ["/instant-winners", /Instant Winners/],
  ["/winners", /Draw Results/],
  ["/entry-lists", /Entry Lists/],
  ["/entry-lists/lush-snow-fairy-wonderland", /\d+% sold/],
  ["/entry-lists/bush-bucks-jungle-trial", /Won Bug Bite/],
  ["/competitions/bush-bucks-jungle-trial/winning-numbers", /Winning Numbers[\s\S]*prizes won[\s\S]*#\d+/],
  ["/competitions/bush-bucks-jungle-trial/winning-numbers?show=won", /Emmie A\./],
  ["/how-it-works", /How It Works/],
  ["/faq", /Frequently Asked Questions/],
  ["/contact", /Get In Touch/],
  ["/free-entry", /Free Postal Entry/],
  ["/legal/terms", /Terms &(amp;)? Conditions/],
  ["/menu", /All Competitions/],
  ["/join", /Join Easy Peasy/],
  ["/login", /Welcome Back/],
  ["/forgot-password", /Reset Password/],
  ["/basket", /Your Basket/],
  ["/demo/claw_machine", /Try Claw Machine/],
];

const NO_FOOTER = new Set(["/menu", "/join", "/login", "/forgot-password"]);

describe("every public page renders", () => {
  for (const [path, expected] of PUBLIC_PAGES) {
    it(`${path}`, async () => {
      const b = new Browser(site.origin);
      const { res, html } = await b.page(path);
      expect(res.status, html.slice(0, 400)).toBe(200);
      const t = text(html);
      expect(t).toMatch(expected);
      expect(t).not.toMatch(/\bundefined\b|\bNaN\b|\[object Object\]/);
      expect(html).toContain('<html lang="en-GB">');
      if (!NO_FOOTER.has(path)) expect(html).toContain("Easy Peasy Prizes Ltd"); // company details in the footer
    });
  }
});

describe("site-wide rules", () => {
  it("unknown pages and competitions are a 404 page", async () => {
    const b = new Browser(site.origin);
    expect((await b.page("/nope")).res.status).toBe(404);
    expect((await b.page("/competitions/not-a-real-comp")).res.status).toBe(404);
    expect((await b.page("/demo/not_a_game")).res.status).toBe(404);
  });
  it("sends security headers and loads nothing from other companies", async () => {
    const b = new Browser(site.origin);
    const { res, html } = await b.page("/");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(res.headers.get("x-frame-options")).toBe("DENY");
    expect(res.headers.get("referrer-policy")).toBe("strict-origin-when-cross-origin");
    expect(html).not.toMatch(/fonts\.googleapis|googletagmanager|facebook\.net/);
    expect(html).toMatch(/noindex/); // search indexing stays off until launch
  });
  it("a returning player who taps Buy while signed out can log in from the top of the join page", async () => {
    const next = "/checkout?buy=c-cash:10";
    const { html } = await new Browser(site.origin).page(`/join?next=${encodeURIComponent(next)}`);
    const notice = html.match(/data-testid="join-from-buy"[\s\S]*?<\/div>/)?.[0] ?? "";
    expect(notice).toContain("Your tickets are saved");
    expect(notice).toContain(`/login?next=${encodeURIComponent(next).replace(/&/g, "&amp;")}`);
  });
  it("How It Works never promises a ticket count", async () => {
    const t = text((await new Browser(site.origin).page("/how-it-works")).html);
    expect(t).not.toMatch(/how many tickets there are|tickets left|max(imum)? entries/i);
    expect(t).toContain("how much has sold");
  });
  it("members-only pages send visitors to log in and come back", async () => {
    const b = new Browser(site.origin);
    for (const p of ["/account", "/account/wallet", "/account/tickets", "/account/safer-play", "/account/settings", "/checkout", "/order/EP-1234", "/payment/failed?order=EP-1234", "/payment/cancelled?order=EP-1234"]) {
      const res = await b.get(p);
      expect(res.status, p).toBe(302);
      expect(res.headers.get("location")).toBe(`/login?next=${encodeURIComponent(p)}`);
    }
  });
  it("the home page shows the featured comp, live countdown, every instant win and the live draws", async () => {
    const { html } = await new Browser(site.origin).page("/");
    expect(html).toContain("data-countdown=");
    expect(html).toContain("Bush Bucks – Jungle Trial");
    // Easy Peasy's layout (Nov 2026): next draws, one Competitions grid with the old site's four filters,
    // How It Works, the admin's own figures, and recent winners.
    expect(html).toMatch(/<h2 class="h2">Competitions<\/h2>/);
    expect(html).toContain('aria-label="Filter competitions"');
    expect(text(html)).toMatch(/Ending Soon\s*Instant Wins\s*Live Draws\s*All/);
    expect(html).toMatch(/class="ep-draw"/); // the next draws strip
    expect(text(html)).toMatch(/£3,558,960/); // paid out, from Admin → Settings (mock), in the top bar and the stats band
    expect(text(html)).toMatch(/Proudly supporting\s*Fleming Family Foundations/);
    expect(text(html)).toMatch(/Recent Winners[\s\S]*Emmie A\.[\s\S]*£0\.50 site credit/);
  });
  it("competition cards show price, wins, highlight, time left and % sold, but not the ticket counts", async () => {
    const { html } = await new Browser(site.origin).page("/competitions");
    const t = text(html);
    expect(t).toMatch(/25p/);
    expect(t).toMatch(/Win up to £/);
    expect(t).toMatch(/per entry/);
    expect(t).toMatch(/\d+d \d+h/);
    expect(t).toMatch(/2% sold/);
    expect(t).not.toMatch(/\d ?left|tickets in total|max entries/i); // counts are on the competition page only (owner, 22 Nov 2026)
    expect(t).toMatch(/Buy 10 Get 15 Free/); // a live draw card names its Our Pick bundle
    expect(html).toContain("data-ends=");
    // Every card carries its solid type pill (Easy Peasy's CompetitionPill), and no limit per person anywhere.
    expect(html).toContain('<span class="pill pill-live">Live Draw</span>');
    expect(html).toContain('<span class="pill pill-iw">Instant Win</span>');
    expect(t).not.toMatch(/per person/i);
    // A competition with no per-person limit doesn't mention one.
    expect(text((await new Browser(site.origin).page("/competitions/bush-bucks-jungle-trial")).html)).not.toMatch(/per person/i);
  });
  it("a prize boost shows on the card, the page and the winning numbers (owner, 23 Nov 2026)", async () => {
    const cards = (await new Browser(site.origin).page("/competitions")).html;
    expect(cards).toContain('data-testid="boost-badge"');
    expect(text(cards)).toMatch(/Prize Boost[\s\S]*£2,600 extra instant wins added/);
    expect(cards).not.toContain("🔥"); // no emoji in the UI
    const { html } = await new Browser(site.origin).page("/competitions/demis-diamond-dosh");
    const t = text(html);
    expect(html).toContain('data-testid="boost-banner"');
    expect(t).toMatch(/of 2,716 instant prizes left/); // boosted prizes count in the total
    expect(t).toMatch(/Prize Boost – £2,600 extra instant wins added: 200 more prizes since \d+ \w{3}/);
    expect(t).toMatch(/Mega Gem\s*Added \d+ \w{3}/);
    expect(t).toMatch(/Renamed prizes: Gem Fiver \(Gem Bonus in the fair play record\)\./);
    expect(t).toMatch(/How they were added[\s\S]*Verity, added 200 instant prizes[\s\S]*round 23456789/);
    // At the bottom, under the prize list, not at the top of the page.
    expect(html.indexOf('data-testid="boost-banner"')).toBeGreaterThan(html.indexOf("Mega Gem"));
    expect(html.indexOf('data-testid="boost-banner"')).toBeGreaterThan(html.indexOf("Per ticket"));
    const wn = (await new Browser(site.origin).page("/competitions/demis-diamond-dosh/winning-numbers?prize=Mega+Gem")).html;
    expect(wn).toContain('data-testid="added-label"');
    // Games without a boost show none of it.
    expect((await new Browser(site.origin).page("/competitions/bush-bucks-jungle-trial")).html).not.toContain("boost-banner");
  });
  it("the competition page: prize cards, one information box, no demo link", async () => {
    const { html } = await new Browser(site.origin).page("/competitions/bush-bucks-jungle-trial");
    const t = text(html);
    expect(html).not.toContain("Try The Game Free");
    expect(html).toContain('data-testid="more-information"');
    // Competition Details as the old site: one open section, then How the draw works, limits, postal entry and terms.
    expect(t).toMatch(/Competition Details[\s\S]*How the draw works[\s\S]*Entry limits[\s\S]*Free postal entry[\s\S]*Terms & conditions/);
    expect(t).toMatch(/Instant prizes left to win/);
    expect(t).toMatch(/Left to win/);
    expect(t).toMatch(/of 1,500 found/);
    expect(html).toContain("/competitions/bush-bucks-jungle-trial/winning-numbers?prize=Bug+Bite");
    expect(html).toContain('href="/free-entry"'); // the free postal route stays visible
    const one = text((await new Browser(site.origin).page("/competitions/bush-bucks-jungle-trial/winning-numbers?prize=Bug+Bite")).html);
    expect(one).toContain("Show every prize");
    expect(one).not.toContain("King of the Jungle");
  });
  it("game demos can be framed by this site only, and ?embed=1 is just the game", async () => {
    const b = new Browser(site.origin);
    const demo = await b.page("/demo/slots?skin=christmas&embed=1");
    expect(demo.res.headers.get("x-frame-options")).toBe("SAMEORIGIN");
    expect(demo.html).not.toContain('class="hd"'); // no header
    expect(demo.html).not.toContain("Easy Peasy Prizes Ltd"); // no footer
    expect((await b.page("/demo/slots")).html).toContain("Easy Peasy Prizes Ltd");
    expect((await b.page("/")).res.headers.get("x-frame-options")).toBe("DENY");
  });
  it("a live draw's page shows its bundles, Our Pick first choice, and its ticket counts", async () => {
    const { html } = await new Browser(site.origin).page("/competitions/lush-snow-fairy-wonderland");
    const t = text(html);
    expect(t).toMatch(/Buy 10 Get 15 FREE!/);
    expect(t).toMatch(/Our Pick/);
    expect(t).toMatch(/25 tickets for £5\.90/);
    expect(t).toMatch(/Save £8\.85/);
    expect(t).toMatch(/Bundle and free tickets are entered into the draw exactly like paid tickets/);
    expect(t).toMatch(/8% sold/);
    expect(t).toMatch(/Max 50,000 tickets · 4,000 sold · 46,000 left · Max 100 per person/); // quiet line under the bar
    expect(t).toMatch(/Max 100 per person/); // and in the ticket picker
    expect(html).toContain("Or choose your own amount"); // a typed amount, even with bundles
  });
  it("the competition page renders the ticket picker on the server", async () => {
    const { html } = await new Browser(site.origin).page("/competitions/bush-bucks-jungle-trial");
    expect(html).toContain('data-testid="ticket-picker"');
    expect(html).toContain("Or choose your own amount");
    expect(html).toContain("£2.50"); // 10 tickets × 25p preselected
    expect(html).toMatch(/Seed fingerprint/);
  });
});
