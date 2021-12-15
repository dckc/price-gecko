// @ts-check
import { AmountMath, makeIssuerKit, AssetKind } from '@agoric/ertp';
import { IBC_TOKENS } from './geckoClient.js';

const { details: X } = assert;
const { entries, fromEntries, values } = Object;

/** @param { ReturnType<import('./geckoClient.js').makeGeckoClient> } apiClient */
export const makeGeckoPriceAuthority = (apiClient) => {
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
  /** @type { Record<string, Brand> } */
  const ertpBrands = { usd: usdBrand, ...ibcBrands };

  return harden({
    getBrands: () => ertpBrands,
    /**
     * @param {Amount} given
     * @param {Brand} wantedBrand
     */
    quoteGiven: async (given, wantedBrand) => {
      assert(
        wantedBrand === usdBrand,
        X`we only support USD for wanted so far. not ${wantedBrand}`,
      );
      const [symbol, _b] =
        entries(ibcBrands).find(([_s, brand]) => brand === given.brand) ||
        assert.fail(X`unknown brand: ${given.brand}`);
      const id = idBySymbol[symbol];
      const prices = await apiClient.simple.token_price([id]);
      const priceInUSD = prices[id].usd;
      const priceInCents = BigInt(priceInUSD * 100);
      const quoteAmount = AmountMath.make(usdBrand, priceInCents);
      const quotePayment = '@@@TODO';
      return harden({ quoteAmount, quotePayment });
    },
  });
};
