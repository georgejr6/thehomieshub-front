/**
 * wager.routes.js
 * ---------------
 * Mount in your Express app:
 *   const wagerRoutes = require('./routes/wager.routes');
 *   app.use('/api/wagers', wagerRoutes);
 *
 * All routes except GET (list + detail) require JWT auth middleware.
 */

const express    = require('express');
const router     = express.Router();
const ctrl       = require('../controllers/wager.controller');

// Auth middleware — replace with your actual middleware import
// e.g. const auth = require('../middleware/auth');
const auth = require('../middleware/auth');  // Central Billing JWT

// ── Public (read-only) ────────────────────────────────────────────────────────
router.get('/',    ctrl.listWagers);
router.get('/:id', ctrl.getWager);

// ── Authenticated ─────────────────────────────────────────────────────────────
router.post('/',                     auth, ctrl.createWager);
router.post('/:id/join',             auth, ctrl.joinWager);
router.post('/:id/dispute',          auth, ctrl.disputeWager);
router.post('/:id/vote',             auth, ctrl.castVote);
router.get( '/:id/claim-params',     auth, ctrl.getClaimParams);
router.post('/:id/claim-confirm',    auth, ctrl.confirmClaim);

// ── Admin / Arbiter ───────────────────────────────────────────────────────────
router.post('/:id/resolve',          auth, ctrl.resolveWager);

module.exports = router;
