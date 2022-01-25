// @ts-check
import '@agoric/install-ses';
import { E, Far } from '@agoric/far';
import { AmountMath, AssetKind, makeIssuerKit } from '@agoric/ertp';
import { makeGeckoClient, IBC_TOKENS } from '../contract/src/geckoClient.js';
import { makeGeckoPriceAuthority } from '../contract/src/geckoPriceAuthority.js';
import { makeNotifierKit } from '../contract/node_modules/@agoric/notifier/src/notifier.js';

const { fromEntries, values } = Object;

const testPriceAuthority = async ({ get, clock }) => {
  const apiClient = makeGeckoClient({ get });

  /** @type { TimerService } */
  const timer = Far('Timer', {
    getCurrentTimestamp: () => clock(),
    setWakeup: () => assert.fail('TODO'),
    removeWakeup: () => assert.fail('TODO'),
    delay: () => assert.fail('TODO'),
    makeNotifier: () => assert.fail('TODO'),
    makeRepeater: () => assert.fail('TODO'),
  });

  const { notifier: ticker, updater } = makeNotifierKit();

  const usdBrand = makeIssuerKit(
    'usd',
    AssetKind.NAT,
    harden({ decimalPlaces: 2 }),
  ).brand;

  const idBySymbol = fromEntries(
    values(IBC_TOKENS).map(({ id, symbol }) => [symbol, id]),
  );
  const ibcBrands = fromEntries(
    IBC_TOKENS.map((info) => [info.symbol, makeIssuerKit(info.symbol).brand]),
  );

  const pAuthority =  makeGeckoPriceAuthority(
    ticker,
    usdBrand,
    ibcBrands,
    idBySymbol,
    timer,
  );

  const prices = await apiClient.simple.token_price(values(idBySymbol));
  console.log({ prices });
  updater.updateState(prices);

  const atom500 = AmountMath.make(ibcBrands.atom, 500n);
  const quote = await E(pAuthority).quoteGiven(atom500, usdBrand);
  console.log(quote.quoteAmount.value);
  console.log(quote);
}

/** @param { ReturnType<makeGeckoClient> } client */
const lookupTokens = async (client) => {
    const coins = await client.coins.list();
    const targets = coins.filter((coin) =>
      [
        'atom',
        'link',
        'osmo',
        'luna',
        'ust',
        'band',
        'cro',
        'scrt',
        'akt',
      ].includes(coin.symbol),
    );
    return targets;
  };
  
  /** @param { ReturnType<makeGeckoClient> } client */
  const getPrices = async (client) => {
    const ids = IBC_TOKENS.map(({ id }) => id);
    const prices = await client.simple.token_price(ids);
    return prices;
  };
  
  const unsafeLookupTokens = async () => {
    const { get } = await import('https');
    const client = makeGeckoClient({ get });
    return lookupTokens(client);
  };
  
  const unsafeGetPrices = async () => {
    const { get } = await import('https');
    const client = makeGeckoClient({ get });
    return getPrices(client);
  };
  
// unsafeLookupTokens().then(console.log).catch(console.error);
unsafeGetPrices().then(console.log).catch(console.error);

(async () => {
  const https = await import('https'); // DANGER! AMBIENT AUTHORITY! TESTING ONLY!
  const clock = () => Date.now() / 1000;
  testPriceAuthority({ get: https.get, clock });
})();
