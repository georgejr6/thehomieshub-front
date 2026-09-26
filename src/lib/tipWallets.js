// Crypto wallets that receive tips (Tip button → Crypto tab). Public receive
// addresses only. A wallet with an empty address is hidden.
// Algorand = the Mwosa creator wallet, opted into USDC (ASA 31566704).

const ALGO_ADDRESS = 'ZHKTZUB7T7IDPUWN3EFJIMTPM5GYAFEQXBBOGZQWC4MUFWYCVDDXYPVR6Q';
const BTC_ADDRESS = 'bc1q8x8y5qzu83frzjwjdn7efavs9a0w596l29he8t'; // bech32 checksum verified 2026-09-26
const ETH_ADDRESS = '0x89a7Aa3876bf1deBc380F2EbB600E1DF76f2f7Ab'; // EIP-55 checksum verified 2026-09-26

export const TIP_WALLETS = [
  {
    id: 'usdc-algo',
    label: 'USDC',
    network: 'Algorand',
    address: ALGO_ADDRESS,
    // Pera / Defly open this with the USDC asset preselected.
    uri: `algorand://${ALGO_ADDRESS}?asset=31566704`,
    note: 'Send USDC on the Algorand network only.',
  },
  {
    id: 'algo',
    label: 'ALGO',
    network: 'Algorand',
    address: ALGO_ADDRESS,
    uri: `algorand://${ALGO_ADDRESS}`,
    note: 'Send ALGO on the Algorand network only.',
  },
  {
    id: 'btc',
    label: 'BTC',
    network: 'Bitcoin',
    address: BTC_ADDRESS,
    uri: `bitcoin:${BTC_ADDRESS}`,
    note: 'Send BTC on the Bitcoin network only.',
  },
  {
    id: 'eth',
    label: 'ETH',
    network: 'Ethereum',
    address: ETH_ADDRESS,
    uri: `ethereum:${ETH_ADDRESS}`,
    note: 'Send ETH on Ethereum mainnet only.',
  },
].filter((w) => w.address);
