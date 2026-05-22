/**
 * GLOBAL_PDA + FEE_CONFIG_PDA shim
 * Copied from pump-sdk/src/pda.ts at compile time
 * to avoid resolving a TypeScript path at runtime.
 */

const { PublicKey, PublicKeyInitData } = require('@solana/web3.js');
const { PUMP_PROGRAM_ID } = require('@pump-fun/pump-sdk/dist/index.js');

/**
 * Derive the global PDA the same way pump-sdk does it:
 *   pumpPda([Buffer.from("global")])
 * → findProgramAddressSync(["global"], PUMP_PROGRAM_ID)
 */
function pumpPda(seeds) {
  return PublicKey.findProgramAddressSync(seeds, PUMP_PROGRAM_ID);
}

exports.GLOBAL_PDA              = pumpPda([Buffer.from('global')])[0];
exports.FEE_CONFIG_PDA          = pumpPda([Buffer.from('fee_config')])[0];
exports.AMM_GLOBAL_PDA          = pumpPda([Buffer.from('amm_global')])[0];
