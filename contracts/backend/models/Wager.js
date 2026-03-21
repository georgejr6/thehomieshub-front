const mongoose = require('mongoose');

const ParticipantSchema = new mongoose.Schema({
  user:          { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  username:      String,
  side:          { type: Number, required: true },    // outcome index
  amount:        { type: Number, required: true },    // micro USDC
  txId:          String,                              // Algorand txn ID of their stake
  claimed:       { type: Boolean, default: false },
  claimTxId:     String,
}, { _id: false });

const PoolSchema = new mongoose.Schema({
  total: { type: Number, default: 0 },               // micro USDC
  count: { type: Number, default: 0 },
}, { _id: false });

const WagerSchema = new mongoose.Schema({
  // Core metadata
  title:            { type: String, required: true, maxlength: 200 },
  terms:            { type: String, required: true, maxlength: 1000 },
  type:             { type: String, enum: ['CONTENT_BATTLE', 'SOCIAL', 'EVENT', 'DUEL'], required: true },
  bettingMode:      { type: String, enum: ['P2P', 'POOL'], required: true },
  resolutionMethod: { type: String, enum: ['MUTUAL', 'ARBITER', 'VOTE'], default: 'ARBITER' },
  outcomeOptions:   [{ type: String, maxlength: 100 }],

  // Participants
  creator:          { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  challengedUser:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // P2P optional
  participants:     [ParticipantSchema],
  pools:            [PoolSchema],   // one entry per outcome

  // Financials (micro USDC)
  totalPot:         { type: Number, default: 0 },
  stakeAmount:      { type: Number, default: 0 },    // P2P: fixed stake
  minStake:         { type: Number, default: 1000000 }, // POOL: min entry ($1.00)
  feePercent:       { type: Number, default: 3, min: 1, max: 10 },

  // Algorand on-chain data
  algorandAppId:    { type: Number },               // deployed application ID
  escrowAddress:    { type: String },               // app's escrow address

  // Status + resolution
  status:           { type: String, enum: ['OPEN', 'ACTIVE', 'RESOLVED', 'EXPIRED', 'DISPUTED'], default: 'OPEN' },
  winner:           { type: Number },               // winning outcome index
  resolvedAt:       Date,
  resolvedBy:       { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  resolutionTxId:   String,

  // Voting (VOTE resolution method)
  votes:            [{
    user:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    side:  Number,
  }],

  expiresAt:        { type: Date, required: true },
}, {
  timestamps: true,
  toJSON:     { virtuals: true },
  toObject:   { virtuals: true },
});

// Virtual: populate creator username in list views
WagerSchema.virtual('creatorInfo', {
  ref:         'User',
  localField:  'creator',
  foreignField: '_id',
  justOne:     true,
});

// Index for fast list queries
WagerSchema.index({ status: 1, expiresAt: 1 });
WagerSchema.index({ creator: 1 });
WagerSchema.index({ type: 1, status: 1 });

module.exports = mongoose.model('Wager', WagerSchema);
