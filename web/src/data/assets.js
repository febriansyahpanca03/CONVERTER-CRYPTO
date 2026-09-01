/* ------------------------------------------------------------------ */
/*  Daftar aset yang didukung — sumber tunggal dipakai converter,      */
/*  quick command, ticker, dan coin selector.                          */
/* ------------------------------------------------------------------ */

export const COINS = {
  btc: { id: "bitcoin", name: "Bitcoin" },
  eth: { id: "ethereum", name: "Ethereum" },
  sol: { id: "solana", name: "Solana" },
  bnb: { id: "binancecoin", name: "BNB" },
  xrp: { id: "ripple", name: "XRP" },
  ada: { id: "cardano", name: "Cardano" },
  doge: { id: "dogecoin", name: "Dogecoin" },
  matic: { id: "matic-network", name: "Polygon" },
  dot: { id: "polkadot", name: "Polkadot" },
  avax: { id: "avalanche-2", name: "Avalanche" },
  link: { id: "chainlink", name: "Chainlink" },
  ltc: { id: "litecoin", name: "Litecoin" },
  trx: { id: "tron", name: "TRON" },
  atom: { id: "cosmos", name: "Cosmos" },
  near: { id: "near", name: "NEAR" },
  apt: { id: "aptos", name: "Aptos" },
  arb: { id: "arbitrum", name: "Arbitrum" },
  op: { id: "optimism", name: "Optimism" },
  ton: { id: "the-open-network", name: "Toncoin" },
  sui: { id: "sui", name: "Sui" },
  inj: { id: "injective-protocol", name: "Injective" },
  fil: { id: "filecoin", name: "Filecoin" },
  hbar: { id: "hedera-hashgraph", name: "Hedera" },
  algo: { id: "algorand", name: "Algorand" },
  vet: { id: "vechain", name: "VeChain" },
  xlm: { id: "stellar", name: "Stellar" },
  etc: { id: "ethereum-classic", name: "Ethereum Classic" },
  shib: { id: "shiba-inu", name: "Shiba Inu" },
  pepe: { id: "pepe", name: "Pepe" },
  uni: { id: "uniswap", name: "Uniswap" },
  aave: { id: "aave", name: "Aave" },
  usdt: { id: "tether", name: "Tether" },
  usdc: { id: "usd-coin", name: "USD Coin" },
  dai: { id: "dai", name: "Dai" },
  wbtc: { id: "wrapped-bitcoin", name: "Wrapped Bitcoin" },
  steth: { id: "staked-ether", name: "Lido Staked Ether" },
  cake: { id: "pancakeswap-token", name: "PancakeSwap" },
  rndr: { id: "render-token", name: "Render" },
  imx: { id: "immutable-x", name: "Immutable" },
  grt: { id: "the-graph", name: "The Graph" },
};

export const FIATS = {
  idr: "Rupiah",
  usd: "Dolar AS",
  eur: "Euro",
  sgd: "Dolar Singapura",
  jpy: "Yen",
  aud: "Dolar Australia",
  gbp: "Pound",
  myr: "Ringgit",
};

/* Aset yang ditampilkan di ticker market berjalan. */
export const TICKER_SYMS = [
  "btc", "eth", "sol", "bnb", "xrp", "ada", "doge",
  "dot", "avax", "link", "ltc", "trx", "ton", "sui",
];

export const isFiat = (sym) => Object.hasOwn(FIATS, sym);
export const isCoin = (sym) => Object.hasOwn(COINS, sym);
export const known = (sym) => isFiat(sym) || isCoin(sym);

export function labelOf(sym) {
  if (isCoin(sym)) return COINS[sym].name;
  if (isFiat(sym)) return FIATS[sym];
  return sym.toUpperCase();
}

export function coingeckoIdOf(sym) {
  return isCoin(sym) ? COINS[sym].id : null;
}

/* Daftar datar untuk pencarian di coin selector: kripto + fiat jadi satu. */
export const ASSET_LIST = [
  ...Object.entries(COINS).map(([symbol, c]) => ({
    symbol,
    name: c.name,
    id: c.id,
    kind: "crypto",
  })),
  ...Object.entries(FIATS).map(([symbol, name]) => ({
    symbol,
    name,
    id: null,
    kind: "fiat",
  })),
];
