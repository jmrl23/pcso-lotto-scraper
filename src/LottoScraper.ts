import puppeteer, { type Browser, type Page } from 'puppeteer-core';

export default class LottoScraper {
  private browser?: Browser;
  private page?: Page;

  constructor(
    private readonly browserExecPath: string = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    private readonly url: string = 'https://www.pcso.gov.ph/SearchLottoResult.aspx',
  ) {}

  public async init(): Promise<LottoScraper> {
    console.log('LottoScraper: Initializing.');

    this.browser = await puppeteer.launch({
      executablePath: this.browserExecPath,
      headless: true,
    });
    this.page = await this.browser.newPage();
    await this.page.goto(this.url, { waitUntil: 'networkidle2' });

    console.log('LottoScraper: Initialized.');

    return this;
  }

  public async getResults(payload: Payload): Promise<LottoResult[]> {
    const { filter, games, limit } = payload;
    await this.submitForm(payload.from, payload.to ?? new Date());

    // TODO: find a better alternative
    await new Promise((resolve) => setTimeout(resolve, 5000));
    await this.page?.waitForNetworkIdle({ concurrency: 2 });

    console.log('LottoScraper: Processing response.');

    try {
      await this.page?.waitForSelector('table', { timeout: 5000 });
    } catch (error) {
      console.log('LottoScraper: \x1b[31mAn error occurs, try again.\x1b[0m');
      return [];
    }

    console.log('LottoScraper: Raw data received.');
    console.log('LottoScraper: Parsing raw data.');

    const rows = ((await this.page?.$$('table > tbody > tr')) ?? []).slice(
      0,
      limit === undefined ? limit : limit + 1,
    );
    const results: LottoResult[] = [];
    for (const row of rows) {
      const cells = await row.$$('td');
      const jsHandles = await Promise.all(
        cells.map((cell) => cell.getProperty('textContent')),
      );
      const [game, combinations, date, jackpot, winners] = jsHandles.map(
        (handle) => handle.toString().substring(9).trim(),
      );
      if (!lottoGames.includes(game as LottoGame)) continue;
      if (games !== undefined && !games.includes(game as LottoGame)) continue;
      const result: LottoResult = {
        game: game as LottoGame,
        combinations: combinations.split('-').map((value) => parseInt(value)),
        date: new Date(date),
        jackpot: Number(jackpot.replace(/,/g, '')),
        winners: parseInt(winners ?? '0', 10),
      };
      if (filter && !filter(result)) continue;
      results.push(result);
    }

    console.log('LottoScraper: Success.');

    return results;
  }

  private async submitForm(from: Date, to: Date): Promise<void> {
    console.log('LottoScraper: Processing request.');

    await Promise.all([
      this.page?.select(
        'select[name="ctl00$ctl00$cphContainer$cpContent$ddlStartMonth"]',
        from.toLocaleString('en', { month: 'long' }),
      ),
      this.page?.select(
        'select[name="ctl00$ctl00$cphContainer$cpContent$ddlStartDate"]',
        from.getDate().toString(),
      ),
      this.page?.select(
        'select[name="ctl00$ctl00$cphContainer$cpContent$ddlStartYear"]',
        from.getFullYear().toString(),
      ),
      this.page?.select(
        'select[name="ctl00$ctl00$cphContainer$cpContent$ddlEndMonth"]',
        to.toLocaleString('en', { month: 'long' }),
      ),
      this.page?.select(
        'select[name="ctl00$ctl00$cphContainer$cpContent$ddlEndDay"]',
        to.getDate().toString(),
      ),
      this.page?.select(
        'select[name="ctl00$ctl00$cphContainer$cpContent$ddlEndYear"]',
        to.getFullYear().toString(),
      ),
    ]);

    await this.page?.click(
      'input[name="ctl00$ctl00$cphContainer$cpContent$btnSearch"]',
    );
  }

  public async exit(): Promise<void> {
    await this.browser?.close();
  }
}

export interface LottoResult {
  game: LottoGame;
  combinations: number[];
  date: Date;
  jackpot: number;
  winners: number;
}

interface DateRange {
  from: Date;
  to?: Date;
}

export interface Payload extends DateRange {
  games?: LottoGame[];
  filter?: (result: LottoResult) => boolean;
  limit?: number;
}

type LottoGame = (typeof lottoGames)[number];

const lottoGames = [
  'Ultra Lotto 6/58',
  'Grand Lotto 6/55',
  'Superlotto 6/49',
  'Megalotto 6/45',
  'Lotto 6/42',
  '6D Lotto',
  '4D Lotto',
  '3D Lotto 2PM',
  '3D Lotto 5PM',
  '3D Lotto 9PM',
  '2D Lotto 11AM',
  '2D Lotto 4PM',
  '2D Lotto 9PM',
] as const;
