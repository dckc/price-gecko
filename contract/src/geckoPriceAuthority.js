// @ts-check
import { AmountMath, makeIssuerKit, AssetKind } from '@agoric/ertp';
import { E, Far } from '@agoric/far';
import {
  makeNotifierFromAsyncIterable,
  makeNotifierKit,
  observeIteration,
} from '@agoric/notifier';
import { makePromiseKit } from '@agoric/promise-kit';
import { natSafeMath } from '@agoric/zoe/src/contractSupport/index.js';

const { details: X } = assert;
const { entries, fromEntries, keys } = Object;

/**
 * @param { Notifier<GeckoPrices> } ticker
 * @param { Brand } usdBrand usually RUN
 * @param { Record<string, Brand>} brandBySymbol
 * @param { Record<string, string>} idBySymbol
 * @param { ERef<TimerService> } timer
 * @returns {PriceAuthority}
 *
 * @typedef {Record<string, {usd: number}>} GeckoPrices
 */
export const makeGeckoPriceAuthority = (
  ticker,
  usdBrand,
  brandBySymbol,
  idBySymbol,
  timer,
) => {
  const quoteKit = makeIssuerKit('PriceGecko', AssetKind.SET);

  /** @type {GeckoPrices} */
  let prices;
  /** @type {bigint} */
  let timestamp;
  observeIteration(
    ticker,
    Far('priceObserver', {
      updateState: async (newPrices) => {
        timestamp = await E(timer).getCurrentTimestamp();
        prices = newPrices;
      },
    }),
  );

  /**
   * @param {Brand} brandIn
   * @param {Brand} brandOut
   */
  const assertBrands = (brandIn, brandOut) => {
    assert.equal(
      brandOut,
      usdBrand,
      X`brandOut must be ${usdBrand}, not ${brandOut}`,
    );
    const [symbol, _b] =
      entries(brandBySymbol).find(([_s, brand]) => brand === brandIn) ||
      assert.fail(X`unknown brand: ${brandIn}`);
    return symbol;
  };

  /** @param { string } symbol */
  const priceValue = (symbol) => {
    const id = idBySymbol[symbol];
    const priceInUSD = prices[id].usd;
    const priceInUSD6 = BigInt(Math.round(priceInUSD * 1_000_000));
    return priceInUSD6;
  };

  /**
   * @param {Amount} amountIn
   * @param {Brand} brandOut
   * @param {Timestamp} quoteTime
   * @returns {Promise<PriceQuote>}
   */
  const priceInQuote = async (amountIn, brandOut, quoteTime) => {
    const symbol = assertBrands(amountIn.brand, brandOut);
    while (!prices) {
      // eslint-disable-next-line no-await-in-loop
      await E(ticker).getUpdateSince();
    }
    const amountOut = AmountMath.make(usdBrand, priceValue(symbol));

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

  /**
   * @param {Brand} brandIn
   * @param {Amount} amountOut
   * @param {Timestamp} quoteTime
   * @returns {Promise<PriceQuote>}
   */
  const priceOutQuote = async (brandIn, amountOut, quoteTime) => {
    const symbol = assertBrands(brandIn, amountOut.brand);
    const valueOut = AmountMath.getValue(usdBrand, amountOut);
    const valueIn = natSafeMath.ceilDivide(valueOut, priceValue(symbol));
    return priceInQuote(
      AmountMath.make(brandIn, valueIn),
      amountOut.brand,
      quoteTime,
    );
  };

  async function* generateQuotes(amountIn, brandOut) {
    let record = await ticker.getUpdateSince();
    while (record.updateCount) {
      yield priceInQuote(amountIn, brandOut, timestamp);
      // eslint-disable-next-line no-await-in-loop
      record = await ticker.getUpdateSince(record.updateCount);
    }
  }

  return harden({
    getQuoteIssuer: () => quoteKit.issuer,
    getTimerService: () => timer,
    makeQuoteNotifier: (amountIn, brandOut) => {
      assertBrands(amountIn.brand, brandOut);
      return makeNotifierFromAsyncIterable(generateQuotes(amountIn, brandOut));
    },
    quoteAtTime: (deadline, amountIn, brandOut) => {
      assert.typeof(deadline, 'bigint');
      assertBrands(amountIn.brand, brandOut);
      const { promise, resolve } = makePromiseKit();
      E(timer).setWakeup(
        deadline,
        Far('wake handler', {
          wake: (time) => {
            return resolve(priceInQuote(amountIn, brandOut, time));
          },
        }),
      );
      return promise;
    },
    quoteGiven: async (amountIn, brandOut) => {
      return priceInQuote(amountIn, brandOut, timestamp);
    },
    quoteWanted: async (brandIn, amountOut) => {
      return priceOutQuote(brandIn, amountOut, timestamp);
    },
    quoteWhenGT: () => assert.fail('TODO'),
    quoteWhenGTE: () => assert.fail('TODO'),
    quoteWhenLT: () => assert.fail('TODO'),
    quoteWhenLTE: () => assert.fail('TODO'),
    mutableQuoteWhenGT: () => assert.fail('TODO'),
    mutableQuoteWhenGTE: () => assert.fail('TODO'),
    mutableQuoteWhenLT: () => assert.fail('TODO'),
    mutableQuoteWhenLTE: () => assert.fail('TODO'),
  });
};

/** @param { ContractFacet } zcf */
export const start = (zcf) => {
  const {
    idBySymbol,
    timer,
    brands: { RUN: runBrand },
  } = zcf.getTerms();

  const { notifier: ticker, updater } = makeNotifierKit();

  const brandBySymbol = fromEntries(
    keys(idBySymbol).map((symbol) => [symbol, makeIssuerKit(symbol).brand]),
  );

  const priceAuthority = makeGeckoPriceAuthority(
    ticker,
    runBrand,
    brandBySymbol,
    idBySymbol,
    timer,
  );

  const publicFacet = Far('public', {
    getPriceAuthority: () => priceAuthority,
    getBrands: () => brandBySymbol,
  });

  const creatorFacet = Far('creator', {
    getUpdater: () => updater,
  });

  return { publicFacet, creatorFacet };
};
