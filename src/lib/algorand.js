import algosdk from 'algosdk';

// Algorand node — Algonode public API (testnet → swap ALGOD_SERVER for mainnet at launch)
const ALGOD_SERVER = 'https://testnet-api.algonode.cloud';
const ALGOD_PORT = '';
const ALGOD_TOKEN = '';

export const algodClient = new algosdk.Algodv2(ALGOD_TOKEN, ALGOD_SERVER, ALGOD_PORT);

// Platform wallet (fee recipient)
export const PLATFORM_WALLET = 'ZHKTZUB7T7IDPUWN3EFJIMTPM5GYAFEQXBBOGZQWC4MUFWYCVDDXYPVR6Q';

// USDC ASA on Algorand
// Testnet:  10458941  |  Mainnet: 31566704
export const USDC_ASSET_ID = 10458941; // switch to 31566704 on mainnet
export const USDC_DECIMALS = 6;        // USDC uses 6 decimal places

// Convert USDC display amount to smallest unit (microUSDC)
export const toMicroUSDC = (usdc) => Math.round(usdc * 10 ** USDC_DECIMALS);
export const toUSDC = (micro) => micro / 10 ** USDC_DECIMALS;

// Format USDC for display  — e.g. "$10.00 USDC"
export const formatUSDC = (amount) => {
  if (amount === null || amount === undefined) return '—';
  return `$${Number(amount).toFixed(2)} USDC`;
};

// Alias kept for backward compat — maps to USDC
export const formatAlgo = formatUSDC;

// Get USDC balance for an address
export const getUSDCBalance = async (address) => {
  try {
    const info = await algodClient.accountInformation(address).do();
    const asset = info['assets']?.find((a) => a['asset-id'] === USDC_ASSET_ID);
    return asset ? toUSDC(asset.amount) : 0;
  } catch (err) {
    console.error('Failed to fetch USDC balance:', err);
    return null;
  }
};

// Build an opt-in transaction for USDC ASA (required before receiving USDC)
export const buildUSDCOptInTxn = async (address) => {
  const params = await algodClient.getTransactionParams().do();
  return algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
    from: address,
    to: address,
    amount: 0,
    assetIndex: USDC_ASSET_ID,
    suggestedParams: params,
  });
};

// Build a USDC ASA transfer to an escrow address (wager stake)
export const buildWagerPaymentTxn = async ({ senderAddress, escrowAddress, amountUSDC, note }) => {
  const params = await algodClient.getTransactionParams().do();
  const noteBytes = note ? new TextEncoder().encode(note) : undefined;

  return algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
    from: senderAddress,
    to: escrowAddress,
    amount: toMicroUSDC(amountUSDC),
    assetIndex: USDC_ASSET_ID,
    note: noteBytes,
    suggestedParams: params,
  });
};

// Submit a signed transaction to the network
export const submitSignedTxn = async (signedTxn) => {
  const { txId } = await algodClient.sendRawTransaction(signedTxn).do();
  await algosdk.waitForConfirmation(algodClient, txId, 4);
  return txId;
};

// Shorten an Algorand address for display
export const shortAddress = (address) => {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

// Validate an Algorand address
export const isValidAddress = (address) => {
  try {
    return algosdk.isValidAddress(address);
  } catch {
    return false;
  }
};
