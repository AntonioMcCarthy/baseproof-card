import { createClient, http } from "viem";
import type { EIP1193Provider } from "viem";
import { base } from "viem/chains";
import { createConfig } from "wagmi";
import { coinbaseWallet } from "wagmi/connectors/coinbaseWallet";
import { injected } from "wagmi/connectors/injected";

const envSuffix = process.env.NEXT_PUBLIC_DATA_SUFFIX;
export const dataSuffix = (envSuffix && /^0x[0-9a-fA-F]*$/.test(envSuffix) ? envSuffix : "0x") as `0x${string}`;

export const okxConnector = injected({
  target() {
    return {
      id: "okx",
      name: "OKX Wallet",
      provider(window) {
        const w = window as typeof window & {
          okxwallet?: unknown;
          ethereum?: { providers?: Array<Record<string, unknown>> } & Record<string, unknown>;
        };
        return (w.okxwallet ?? w.ethereum?.providers?.find((provider) => provider.isOkxWallet) ?? w.ethereum) as EIP1193Provider | undefined;
      }
    };
  }
});

export const metaMaskConnector = injected({
  target() {
    return {
      id: "metaMask",
      name: "MetaMask",
      provider(window) {
        const w = window as typeof window & {
          ethereum?: { providers?: Array<Record<string, unknown>> } & Record<string, unknown>;
        };
        return (w.ethereum?.providers?.find((provider) => provider.isMetaMask) ?? w.ethereum) as EIP1193Provider | undefined;
      }
    };
  }
});

export const coinbaseConnector = coinbaseWallet({
  appName: "BaseProof Card",
  preference: "eoaOnly"
});

export const walletButtons = [
  { id: "okx", label: "OKX Wallet", connector: okxConnector },
  { id: "metamask", label: "MetaMask", connector: metaMaskConnector },
  { id: "coinbase", label: "Coinbase Wallet", connector: coinbaseConnector }
] as const;

export const wagmiConfig = createConfig({
  chains: [base],
  connectors: [okxConnector, metaMaskConnector, coinbaseConnector],
  client({ chain }) {
    return createClient({ chain, transport: http(), dataSuffix });
  },
  ssr: true
});
