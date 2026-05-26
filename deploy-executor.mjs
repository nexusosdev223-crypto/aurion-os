import { Connection, Keypair, Transaction, SystemProgram, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

const connection = new Connection('http://127.0.0.1:8899', 'confirmed');
const agentWallet = Keypair.generate();

async function executeLaunch() {
    console.log('🚀 Initializing Local Agent:', agentWallet.publicKey.toString());
    
    try {
        console.log('💰 Requesting Local Airdrop...');
        const sig = await connection.requestAirdrop(agentWallet.publicKey, 5 * LAMPORTS_PER_SOL);
        await connection.confirmTransaction(sig);
        console.log('✅ Local Wallet Funded!');

        // Wait 2 seconds to ensure the state is committed locally
        await new Promise(resolve => setTimeout(resolve, 2000));

    } catch (e) {
        console.error('⚠️ Airdrop failed:', e);
        return;
    }

    console.log('⚡ Attempting Transaction...');
    const tx = new Transaction().add(SystemProgram.transfer({ 
        fromPubkey: agentWallet.publicKey, 
        toPubkey: new PublicKey('6EF8rrecthR5Dkzon8YargZgwMdzD2dCGzV2R3Q1q9N'), 
        lamports: 50000000 // Increased to 0.05 SOL to cover rent exemption
    }));
    
    const signature = await connection.sendTransaction(tx, [agentWallet]);
    console.log('🎉 Success! Signature:', signature);
}

executeLaunch();
