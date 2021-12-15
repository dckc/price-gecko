// @ts-check
import 'ses';

lockdown();

// https://www.coingecko.com/api/documentations/v3/swagger.json
const API = {
  swagger: '2.0',
  info: {
    description: '',
    version: '3.0.0',
    title: 'CoinGecko API V3',
  },
  host: 'api.coingecko.com',
  basePath: '/api/v3',
  schemes: ['https'],
  // ...
};

/**
 * @param {{
 *   get: typeof import('https').get,
 * }} io
 */
export const makeGeckoClient = ({ get }) => {
  const base = `${API.schemes[0]}://${API.host}${API.basePath}`;

  /** @param { string } url */
  const getText = (url) =>
    new Promise((resolve, reject) => {
      const req = get(url, { method: 'GET' }, (response) => {
        let str = '';
        // console.log('Response is ' + response.statusCode);
        response.on('data', (chunk) => {
          str += chunk;
        });
        response.on('end', () => resolve(str));
      });
      req.end();
      req.on('error', reject);
    });

  return harden({
    coins: {
      list: () => getText(`${base}/coins/list`).then(JSON.parse),
    },
  });
};

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

const unsafeLookupTokens = async () => {
  const { get } = await import('https');
  const client = makeGeckoClient({ get });
  return lookupTokens(client);
};

unsafeLookupTokens().then(console.log).catch(console.error);
