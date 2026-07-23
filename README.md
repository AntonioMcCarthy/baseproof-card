# BaseProof Card

BaseProof Card is a Base Mini App for minting repeatable ERC721 profile cards, updating an onchain identity profile, self-liking, self-confirming, and earning simple reward points.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Wagmi native config
- Viem
- Solidity ERC721 with OpenZeppelin

## Local Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Set these values before production deployment:

```bash
NEXT_PUBLIC_CONTRACT_ADDRESS=0xb6F11b8a3C558AC6482b23B83c1C5F8cF0F443c3
NEXT_PUBLIC_CHAIN_ID=8453
NEXT_PUBLIC_BUILDER_CODE=...
NEXT_PUBLIC_BASE_APP_ID=6a61c75c078f6baf9ef3047f
NEXT_PUBLIC_DATA_SUFFIX=0x...
```

## Contract

The contract source is at `contracts/BaseProofCard.sol`.

Compile:

```bash
npm run compile
```

ABI:

```bash
abi/BaseProofCard.json
```

Deploy to Base using your preferred deploy script or Hardhat Ignition/script after setting:

```bash
BASE_RPC_URL=https://mainnet.base.org
PRIVATE_KEY=...
```

Constructor arguments:

```solidity
initialBaseURI: <metadata base URI ending with />
```

The deployer wallet is automatically set as the contract owner.

## Attribution

Offchain attribution is hardcoded in `app/layout.tsx`:

```tsx
<meta name="base:app_id" content={appId} />
```

Onchain attribution is configured in `lib/wagmi.ts` through Viem `dataSuffix`, and all writes use the same Wagmi config.

## Deployment

Create a GitHub repository named `baseproof-card`, then:

```bash
git remote add origin <repo-url>
git push -u origin main
```

Deploy to Vercel with the same project name:

```bash
vercel login
vercel --prod --name baseproof-card
```

After base.dev verification, update `NEXT_PUBLIC_BASE_APP_ID` and `NEXT_PUBLIC_DATA_SUFFIX` in Vercel without changing the production URL.

## QA Checklist

- `npm run build`
- `npm run compile`
- Page source contains `base:app_id`
- UI shows only OKX Wallet, MetaMask, and Coinbase Wallet wallet buttons
- UI does not show Injected Wallet, WalletConnect, or Base App Wallet buttons
- Page does not visibly render full URLs or invite link text
- Mobile and desktop layouts have no horizontal overflow
