// @ts-check
import { AmountMath, makeIssuerKit, AssetKind } from '@agoric/ertp';
import { E } from '@agoric/far';
import { IBC_TOKENS } from './geckoClient.js';

const { details: X } = assert;
const { entries, fromEntries, values } = Object;

/**
 * @param { ReturnType<import('./geckoClient.js').makeGeckoClient> } apiClient
 * @param { ERef<TimerService> } timer
 */
export const makeGeckoPriceAuthority = (apiClient, timer) => {
  const quoteKit = makeIssuerKit('PriceGecko', AssetKind.SET);
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

  /**
   * @param {Amount} amountIn
   * @param {Brand} brandOut
   * @param {Timestamp} quoteTime
   * @returns {Promise<PriceQuote>}
   */
  const priceInQuote = async (amountIn, brandOut, quoteTime) => {
    assert(
      brandOut === usdBrand,
      X`we only support USD for wanted so far. not ${brandOut}`,
    );
    const [symbol, _b] =
      entries(ibcBrands).find(([_s, brand]) => brand === amountIn.brand) ||
      assert.fail(X`unknown brand: ${amountIn.brand}`);
    const id = idBySymbol[symbol];
    const prices = await apiClient.simple.token_price([id]);
    const priceInUSD = prices[id].usd;
    const priceInCents = BigInt(Math.round(priceInUSD * 100));
    const amountOut = AmountMath.make(usdBrand, priceInCents);

    const quoteAmount = AmountMath.make(
      quoteKit.brand,
      harden([
        {
          amountIn,
          amountOut,
          timer,
          timestamp: quoteTime,
        },
      ]),
    );
    const quote = harden({
      quotePayment: E(quoteKit.mint).mintPayment(quoteAmount),
      quoteAmount,
    });
    return quote;
  };

  return harden({
    getBrands: () => ertpBrands,
    /**
     * @param {Amount} amountIn
     * @param {Brand} brandOut
     */
    quoteGiven: async (amountIn, brandOut) => {
      const timestamp = await E(timer).getCurrentTimestamp();
      return priceInQuote(amountIn, brandOut, timestamp);
    },
    getQuoteIssuer: () => assert.fail('TODO'),
  });
};
