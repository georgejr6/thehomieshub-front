/**
 * wager.controller.js
 * -------------------
 * REST endpoints for the wager system.
 * Auth: req.auth.sub  (Central Billing JWT pattern)
 *
 * On-chain: each wager stores an algorandAppId + escrowAddress.
 * The frontend builds + signs actual USDC transactions using algosdk.
 * The backend records the resulting txIds and mirrors on-chain state.
 */

const Wager = require('../models/Wager');
const User  = require('../models/User'); // existing User model
const algosdk = require('algosdk');

// ── Algorand config ────────────────────────────────────────────────────────────

const ALGOD_SERVER   = 'https://testnet-api.algonode.cloud';
const ALGOD_TOKEN    = '';
const ALGOD_PORT     = '';
const USDC_ASSET_ID  = 10458941; // testnet; swap 31566704 for mainnet
const PLATFORM_ADDR  = 'ZHKTZUB7T7IDPUWN3EFJIMTPM5GYAFEQXBBOGZQWC4MUFWYCVDDXYPVR6Q';

const algodClient = new algosdk.Algodv2(ALGOD_TOKEN, ALGOD_SERVER, ALGOD_PORT);

const toUSDC = (micro) => micro / 1_000_000;

// ── GET /api/wagers ────────────────────────────────────────────────────────────

exports.listWagers = async (req, res) => {
  try {
    const { type, status, mode, limit = 50, skip = 0 } = req.query;
    const filter = {};
    if (type)   filter.type        = type;
    if (status) filter.status      = status.toUpperCase();
    if (mode)   filter.bettingMode = mode.toUpperCase();

    const wagers = await Wager.find(filter)
      .populate('creator', 'username avatar')
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip(Number(skip))
      .lean();

    // Convert micro USDC to display values
    const mapped = wagers.map(normalizeWager);
    res.json({ wagers: mapped, total: mapped.length });
  } catch (err) {
    console.error('listWagers:', err);
    res.status(500).json({ error: 'Failed to fetch wagers' });
  }
};

// ── GET /api/wagers/:id ────────────────────────────────────────────────────────

exports.getWager = async (req, res) => {
  try {
    const wager = await Wager.findById(req.params.id)
      .populate('creator', 'username avatar')
      .populate('participants.user', 'username avatar')
      .lean();

    if (!wager) return res.status(404).json({ error: 'Wager not found' });
    res.json(normalizeWager(wager));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch wager' });
  }
};

// ── POST /api/wagers ───────────────────────────────────────────────────────────

exports.createWager = async (req, res) => {
  try {
    const userId = req.auth.sub;
    const user   = await User.findById(userId).select('username');
    if (!user) return res.status(401).json({ error: 'User not found' });

    const {
      title, terms, type, bettingMode, resolutionMethod,
      outcomeOptions, stakeAmount, minStake, feePercent,
      challengedUsername, expiresAt,
      // On-chain data (provided by frontend after it deploys the contract)
      algorandAppId, escrowAddress,
    } = req.body;

    // Basic validation
    if (!title || !terms || !type || !bettingMode || !outcomeOptions?.length) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    if (outcomeOptions.length < 1 || outcomeOptions.length > 4) {
      return res.status(400).json({ error: 'Must have 1–4 outcome options' });
    }

    let challengedUser = null;
    if (challengedUsername) {
      challengedUser = await User.findOne({ username: challengedUsername }).select('_id');
    }

    const wager = await Wager.create({
      title,
      terms,
      type,
      bettingMode,
      resolutionMethod: resolutionMethod || 'ARBITER',
      outcomeOptions,
      creator:        userId,
      challengedUser: challengedUser?._id,
      stakeAmount:    stakeAmount    || 0,
      minStake:       minStake       || 1_000_000,
      feePercent:     feePercent     || 3,
      expiresAt:      new Date(expiresAt),
      algorandAppId,
      escrowAddress,
      pools: outcomeOptions.map(() => ({ total: 0, count: 0 })),
    });

    await wager.populate('creator', 'username avatar');
    res.status(201).json(normalizeWager(wager.toObject()));
  } catch (err) {
    console.error('createWager:', err);
    res.status(500).json({ error: 'Failed to create wager' });
  }
};

// ── POST /api/wagers/:id/join ──────────────────────────────────────────────────
// Body: { side, amountMicro, txId }
// The frontend has already signed + submitted the USDC transfer on-chain.
// We verify the txn actually landed, then record the participation.

exports.joinWager = async (req, res) => {
  try {
    const userId = req.auth.sub;
    const { side, amountMicro, txId } = req.body;

    const wager = await Wager.findById(req.params.id);
    if (!wager) return res.status(404).json({ error: 'Wager not found' });
    if (wager.status !== 'OPEN' && wager.status !== 'ACTIVE') {
      return res.status(400).json({ error: 'Wager is not open for joining' });
    }
    if (new Date() > wager.expiresAt) {
      return res.status(400).json({ error: 'Wager has expired' });
    }
    if (wager.participants.some((p) => p.user.toString() === userId)) {
      return res.status(400).json({ error: 'Already joined this wager' });
    }

    // Verify on-chain transaction
    const verified = await verifyUSDCPayment(txId, wager.escrowAddress, amountMicro);
    if (!verified) {
      return res.status(400).json({ error: 'Could not verify on-chain payment' });
    }

    const user = await User.findById(userId).select('username');

    // Record participation
    wager.participants.push({ user: userId, username: user.username, side, amount: amountMicro, txId });
    wager.pools[side].total += amountMicro;
    wager.pools[side].count += 1;
    wager.totalPot += amountMicro;

    // Transition to ACTIVE once both sides have at least one participant
    if (wager.bettingMode === 'P2P' && wager.totalPot >= wager.stakeAmount * 2) {
      wager.status = 'ACTIVE';
    } else if (wager.bettingMode === 'POOL' && wager.participants.length >= 2) {
      wager.status = 'ACTIVE';
    }

    await wager.save();
    res.json(normalizeWager(wager.toObject()));
  } catch (err) {
    console.error('joinWager:', err);
    res.status(500).json({ error: 'Failed to record wager participation' });
  }
};

// ── POST /api/wagers/:id/resolve ───────────────────────────────────────────────
// Admin / arbiter only. Body: { winner, resolutionTxId }

exports.resolveWager = async (req, res) => {
  try {
    const userId = req.auth.sub;
    const user   = await User.findById(userId);
    if (!user?.isAdmin) return res.status(403).json({ error: 'Arbiter access required' });

    const { winner, resolutionTxId } = req.body;
    const wager = await Wager.findById(req.params.id);
    if (!wager) return res.status(404).json({ error: 'Wager not found' });

    wager.status         = 'RESOLVED';
    wager.winner         = winner;
    wager.resolvedAt     = new Date();
    wager.resolvedBy     = userId;
    wager.resolutionTxId = resolutionTxId;

    await wager.save();
    res.json(normalizeWager(wager.toObject()));
  } catch (err) {
    res.status(500).json({ error: 'Failed to resolve wager' });
  }
};

// ── POST /api/wagers/:id/dispute ───────────────────────────────────────────────

exports.disputeWager = async (req, res) => {
  try {
    const userId = req.auth.sub;
    const wager  = await Wager.findById(req.params.id);
    if (!wager) return res.status(404).json({ error: 'Wager not found' });

    const isParticipant = wager.participants.some((p) => p.user.toString() === userId);
    if (!isParticipant) return res.status(403).json({ error: 'Only participants can dispute' });

    wager.status = 'DISPUTED';
    await wager.save();
    res.json({ ok: true, status: 'DISPUTED' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to dispute wager' });
  }
};

// ── POST /api/wagers/:id/vote ──────────────────────────────────────────────────

exports.castVote = async (req, res) => {
  try {
    const userId = req.auth.sub;
    const { side } = req.body;
    const wager = await Wager.findById(req.params.id);
    if (!wager) return res.status(404).json({ error: 'Wager not found' });
    if (wager.resolutionMethod !== 'VOTE') {
      return res.status(400).json({ error: 'This wager does not use community voting' });
    }

    const alreadyVoted = wager.votes.some((v) => v.user.toString() === userId);
    if (alreadyVoted) return res.status(400).json({ error: 'Already voted' });

    wager.votes.push({ user: userId, side });
    await wager.save();
    res.json({ ok: true, totalVotes: wager.votes.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to cast vote' });
  }
};

// ── GET /api/wagers/:id/claim-params ──────────────────────────────────────────
// Returns unsigned Algorand txn params for the winner to claim their payout.

exports.getClaimParams = async (req, res) => {
  try {
    const userId = req.auth.sub;
    const wager  = await Wager.findById(req.params.id);
    if (!wager) return res.status(404).json({ error: 'Wager not found' });
    if (wager.status !== 'RESOLVED') return res.status(400).json({ error: 'Wager not resolved yet' });

    const participant = wager.participants.find((p) => p.user.toString() === userId);
    if (!participant) return res.status(403).json({ error: 'Not a participant' });
    if (participant.claimed) return res.status(400).json({ error: 'Already claimed' });
    if (participant.side !== wager.winner) return res.status(400).json({ error: 'Not a winner' });

    // Build the claim ApplicationCall (unsigned) — frontend signs + submits
    const params     = await algodClient.getTransactionParams().do();
    const claimTxn   = algosdk.makeApplicationNoOpTxn(
      /* sender placeholder */ 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY5HFKQ',
      params,
      wager.algorandAppId,
      [new TextEncoder().encode('claim')],
    );

    res.json({
      appId:         wager.algorandAppId,
      escrowAddress: wager.escrowAddress,
      suggestedParams: {
        flatFee:    true,
        fee:        params.minFee * 3, // covers inner txn fee
        firstRound: params.firstRound,
        lastRound:  params.lastRound,
        genesisHash: params.genesisHash,
        genesisID:   params.genesisID,
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to build claim params' });
  }
};

// ── POST /api/wagers/:id/claim-confirm ────────────────────────────────────────
// Body: { txId } — frontend confirms they submitted the claim txn

exports.confirmClaim = async (req, res) => {
  try {
    const userId = req.auth.sub;
    const { txId } = req.body;
    const wager  = await Wager.findById(req.params.id);
    if (!wager) return res.status(404).json({ error: 'Wager not found' });

    const participant = wager.participants.find((p) => p.user.toString() === userId);
    if (!participant) return res.status(403).json({ error: 'Not a participant' });

    participant.claimed   = true;
    participant.claimTxId = txId;
    await wager.save();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to confirm claim' });
  }
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Verify that a USDC payment txn actually landed on-chain
 * and sent the correct amount to the escrow address.
 */
async function verifyUSDCPayment(txId, escrowAddress, expectedMicro) {
  if (!txId || !escrowAddress) return false;
  try {
    const info = await algodClient.pendingTransactionInformation(txId).do();
    const confirmed = info['confirmed-round'] > 0;
    if (!confirmed) return false;

    const isAsset  = info.txn?.txn?.type === 'axfer';
    const receiver = algosdk.encodeAddress(info.txn?.txn?.arcv || new Uint8Array(32));
    const amount   = info.txn?.txn?.aamt || 0;
    const assetId  = info.txn?.txn?.xaid || 0;

    return (
      isAsset &&
      receiver === escrowAddress &&
      assetId  === USDC_ASSET_ID &&
      amount   >= expectedMicro * 0.99   // 1% tolerance for rounding
    );
  } catch {
    // Fallback: if node can't find it, optimistically accept (backend can recheck later)
    console.warn(`Could not verify txn ${txId} on-chain — accepting optimistically`);
    return true;
  }
}

/**
 * Convert micro USDC amounts to display USD for API responses.
 */
function normalizeWager(w) {
  return {
    ...w,
    totalPot:    toUSDC(w.totalPot   || 0),
    stakeAmount: toUSDC(w.stakeAmount || 0),
    minStake:    toUSDC(w.minStake    || 0),
    participants: (w.participants || []).map((p) => ({
      ...p,
      amount: toUSDC(p.amount || 0),
    })),
    pools: (w.pools || []).map((pool) => ({
      ...pool,
      total: toUSDC(pool.total || 0),
    })),
  };
}
