export const TOKEN_CONFIG = {
  name: "Aurion OS",
  symbol: "AURION",
  logoMark: "Ω", // Omega Sign branding configuration
  decimals: 9,
  initialSupply: 1000000000, // 1 Billion Tokens
  bondingCurve: {
    platform: "pump.fun",
    targetCapSol: 85, // Target standard cap to migrate liquidity
    feeBasisPoints: 100,
  },
  metadata: {
    description: "Autonomous Multi-Agent Layer 1 System Engine powered by Aurion Core Brain Matrix.",
    extensions: {
      website: "http://localhost:3001",
      twitter: "@AurionOS",
      telegram: "t.me/AurionOSCore"
    }
  }
};
