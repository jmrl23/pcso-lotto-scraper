import LottoScraper, { type Payload } from './LottoScraper';

async function main() {
  const lottoScrapper = await new LottoScraper().init();
  const payload: Payload = {
    from: new Date('March 01 2024'),
    games: [
      'Grand Lotto 6/55',
      'Lotto 6/42',
      'Megalotto 6/45',
      'Superlotto 6/49',
      'Ultra Lotto 6/58',
    ],
    filter: (result) => result.winners > 0,
  };
  const results = await lottoScrapper.getResults(payload);

  console.table(
    results.map((result) => {
      const data: Record<string, unknown> = { ...result };
      data.combinations = result.combinations.join('-');
      data.date = result.date.toLocaleDateString('en');
      data.jackpot = '₱' + result.jackpot.toLocaleString('en');
      return data;
    }),
  );
  await lottoScrapper.exit();
  process.exit();
}

console.clear();
void main();
