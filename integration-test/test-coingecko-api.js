// @ts-check
import '@agoric/install-ses';
import { E } from '@agoric/far';
import { AmountMath, makeIssuerKit, AssetKind } from '@agoric/ertp';
import { makeGeckoClient, IBC_TOKENS } from '../contract/src/geckoClient.js';
import { makeGeckoPriceAuthority } from '../contract/src/geckoPriceAuthority.js';

const testPriceAuthority = async ({ get }) => {
  const apiClient = makeGeckoClient({ get });
  const pAuthority = makeGeckoPriceAuthority(apiClient);
  const { atom: atomBrand, usd: usdBrand } = await E(pAuthority).getBrands();
  const atom500 = AmountMath.make(atomBrand, 500n);
  const quote = await E(pAuthority).quoteGiven(atom500, usdBrand);
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
// unsafeGetPrices().then(console.log).catch(console.error);

(async () => {
  const https = await import('https'); // DANGER! AMBIENT AUTHORITY! TESTING ONLY!
  testPriceAuthority({ get: https.get });
})();
