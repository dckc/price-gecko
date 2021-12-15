// @ts-check

// https://www.coingecko.com/api/documentations/v3/swagger.json
export const API = {
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

export const IBC_TOKENS = [
  { id: 'akash-network', symbol: 'akt', name: 'Akash Network' },
  { id: 'band-protocol', symbol: 'band', name: 'Band Protocol' },
  { id: 'chainlink', symbol: 'link', name: 'Chainlink' },
  { id: 'cosmos', symbol: 'atom', name: 'Cosmos' },
  { id: 'crypto-com-chain', symbol: 'cro', name: 'Crypto.com Coin' },
  { id: 'osmosis', symbol: 'osmo', name: 'Osmosis' },
  { id: 'secret', symbol: 'scrt', name: 'Secret' },
  { id: 'terra-luna', symbol: 'luna', name: 'Terra' },
  { id: 'terrausd', symbol: 'ust', name: 'TerraUSD' },
];

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
    simple: {
      /**
       * @param { string[] } ids
       * @param { string[] } vs_currencies
       */
      token_price: (ids, vs_currencies = ['usd']) =>
        getText(
          `${base}/simple/price?ids=${ids.join(
            ',',
          )}&vs_currencies=${vs_currencies.join(',')}`,
        ).then(JSON.parse),
    },
  });
};
