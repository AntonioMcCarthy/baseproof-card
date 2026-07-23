import { createClient, http } from "viem";
import type { EIP1193Provider } from "viem";
import { base } from "viem/chains";
import { cookieStorage, createConfig, createStorage } from "wagmi";
import { baseAccount } from "wagmi/connectors/baseAccount";
import { coinbaseWallet } from "wagmi/connectors/coinbaseWallet";
import { injected } from "wagmi/connectors/injected";
import { dataSuffix } from "@/lib/attribution";

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
  preference: { options: "all" }
});

export const baseAccountConnector = baseAccount({
  appName: "BaseProof Card",
  preference: { options: "all" }
});

export const walletButtons = [
  { id: "okx", label: "OKX Wallet", connector: okxConnector },
  { id: "metamask", label: "MetaMask", connector: metaMaskConnector },
  { id: "coinbase", label: "Coinbase Wallet", connector: coinbaseConnector }
] as const;

export const wagmiConfig = createConfig({
  chains: [base],
  connectors: [okxConnector, metaMaskConnector, coinbaseConnector, baseAccountConnector],
  client({ chain }) {
    return createClient({ chain, transport: http(), dataSuffix });
  },
  storage: createStorage({ storage: cookieStorage }),
  ssr: true
});
