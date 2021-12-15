// @ts-check
import '@agoric/install-ses';
import { makeGeckoClient, IBC_TOKENS } from '../contract/src/geckoClient.js';

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
  
  unsafeLookupTokens().then(console.log).catch(console.error);
  unsafeGetPrices().then(console.log).catch(console.error);
