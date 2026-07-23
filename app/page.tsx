"use client";

import { BadgeCheck, CircleUserRound, Copy, Flame, Heart, IdCard, Loader2, LogOut, Sparkles, Wallet } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Address, encodeFunctionData, Hex, isAddress, zeroAddress } from "viem";
import { base } from "viem/chains";
import {
  useAccount,
  useConnect,
  useDisconnect,
  useReadContracts,
  useSendCalls,
  useSendTransaction,
  useSwitchChain,
  useWaitForTransactionReceipt,
} from "wagmi";
import { dataSuffix, withDataSuffix } from "@/lib/attribution";
import { baseProofCardAbi, baseProofCardAddress } from "@/lib/contracts";
import { walletButtons } from "@/lib/wagmi";

type Activity = {
  action: string;
  hash?: string;
  time: string;
};

const fallbackProfile = {
  nickname: "Proof Maker",
  bio: "Mint and update your onchain identity card.",
  avatarURI: ""
};

function shortAddress(address?: string) {
  return address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "Not connected";
}

function formatBig(value: unknown) {
  return typeof value === "bigint" ? value.toString() : "0";
}

function cleanInput(value: string, fallback: string) {
  return value.trim() || fallback;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message.split("\n")[0];
  return "Transaction failed.";
}

export default function Home() {
  const { address, isConnected, chainId } = useAccount();
  const { connect, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChainAsync } = useSwitchChain();
  const { sendCallsAsync, isPending: isSendingCalls } = useSendCalls();
  const { sendTransactionAsync, data: hash, isPending: isSendingTransaction } = useSendTransaction();
  const receipt = useWaitForTransactionReceipt({ hash });

  const [nickname, setNickname] = useState(fallbackProfile.nickname);
  const [bio, setBio] = useState(fallbackProfile.bio);
  const [avatarURI, setAvatarURI] = useState("");
  const [cardId, setCardId] = useState("1");
  const [message, setMessage] = useState("Ready on Base.");
  const [activities, setActivities] = useState<Activity[]>([]);

  const referrer = useMemo<Address>(() => {
    if (typeof window === "undefined") return zeroAddress;
    const value = new URLSearchParams(window.location.search).get("ref");
    return value && isAddress(value) ? value : zeroAddress;
  }, []);

  const selectedTokenId = useMemo(() => {
    const parsed = BigInt(Math.max(1, Number.parseInt(cardId || "1", 10) || 1));
    return parsed;
  }, [cardId]);

  const reads = useReadContracts({
    allowFailure: true,
    query: { enabled: isConnected && baseProofCardAddress !== zeroAddress },
    contracts: [
      {
        address: baseProofCardAddress,
        abi: baseProofCardAbi,
        functionName: "getProfile",
        args: [address ?? zeroAddress]
      },
      {
        address: baseProofCardAddress,
        abi: baseProofCardAbi,
        functionName: "getTokenStats",
        args: [selectedTokenId]
      },
      {
        address: baseProofCardAddress,
        abi: baseProofCardAbi,
        functionName: "totalSupply"
      }
    ]
  });

  const profileResult = reads.data?.[0].result;
  const statsResult = reads.data?.[1].result;
  const totalSupply = reads.data?.[2].result;

  const profile = Array.isArray(profileResult)
    ? {
        nickname: profileResult[0] || fallbackProfile.nickname,
        bio: profileResult[1] || fallbackProfile.bio,
        avatarURI: profileResult[2] || "",
        cards: profileResult[3],
        points: profileResult[4]
      }
    : { ...fallbackProfile, cards: 0n, points: 0n };

  const tokenStats = Array.isArray(statsResult)
    ? { likes: statsResult[0], confirms: statsResult[1] }
    : { likes: 0n, confirms: 0n };

  useEffect(() => {
    const saved = localStorage.getItem("baseproof-activity");
    if (saved) setActivities(JSON.parse(saved));
  }, []);

  useEffect(() => {
    if (typeof totalSupply === "bigint" && totalSupply > 0n && cardId === "1") {
      setCardId(totalSupply.toString());
    }
  }, [totalSupply, cardId]);

  useEffect(() => {
    if (receipt.isSuccess) {
      setMessage("Transaction confirmed.");
      reads.refetch();
    }
    if (receipt.isError) setMessage(getErrorMessage(receipt.error));
  }, [receipt.isSuccess, receipt.isError, receipt.error, reads]);

  function remember(action: string, txHash?: string) {
    const next = [{ action, hash: txHash, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }, ...activities].slice(0, 6);
    setActivities(next);
    localStorage.setItem("baseproof-activity", JSON.stringify(next));
  }

  async function ensureReady() {
    if (!isConnected) {
      setMessage("Connect a wallet first.");
      return false;
    }
    if (baseProofCardAddress === zeroAddress) {
      setMessage("Add NEXT_PUBLIC_CONTRACT_ADDRESS after deploying the contract.");
      return false;
    }
    if (chainId !== base.id) await switchChainAsync({ chainId: base.id });
    return true;
  }

  async function sendAttributedCall(callData: Hex) {
    try {
      const result = await sendCallsAsync({
        account: address,
        chainId: base.id,
        calls: [{ to: baseProofCardAddress, data: callData }],
        capabilities: { dataSuffix: { value: dataSuffix } },
        experimental_fallback: true
      });

      return result.id as `0x${string}`;
    } catch {
      return sendTransactionAsync({
        account: address,
        chainId: base.id,
        to: baseProofCardAddress,
        data: withDataSuffix(callData)
      });
    }
  }

  async function runAction(action: string, callData: Hex) {
    if (!(await ensureReady())) return;
    try {
      setMessage(`${action} is waiting for wallet approval.`);
      const txHash = await sendAttributedCall(callData);
      remember(action, txHash);
      setMessage(`${action} submitted.`);
    } catch (error) {
      setMessage(getErrorMessage(error));
    }
  }

  const mintData = () =>
    encodeFunctionData({
      abi: baseProofCardAbi,
      functionName: "mint",
      args: [cleanInput(nickname, fallbackProfile.nickname), bio.trim(), avatarURI.trim(), referrer]
    });
  const updateData = () =>
    encodeFunctionData({
      abi: baseProofCardAbi,
      functionName: "updateProfile",
      args: [selectedTokenId, cleanInput(nickname, fallbackProfile.nickname), bio.trim(), avatarURI.trim(), referrer]
    });
  const likeData = () =>
    encodeFunctionData({
      abi: baseProofCardAbi,
      functionName: "like",
      args: [selectedTokenId, referrer]
    });
  const confirmData = () =>
    encodeFunctionData({
      abi: baseProofCardAbi,
      functionName: "confirm",
      args: [selectedTokenId, referrer]
    });

  const busy = isSendingCalls || isSendingTransaction || receipt.isLoading;
  const profileName = isConnected ? profile.nickname : fallbackProfile.nickname;
  const profileBio = isConnected ? profile.bio : fallbackProfile.bio;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1160px] flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-2xl border-[3px] border-black bg-[var(--orange)] shadow-[4px_4px_0_#17120d]">
            <IdCard size={24} />
          </div>
          <span className="text-xl font-black tracking-normal">BaseProof Card</span>
        </div>
        <nav className="flex w-full rounded-full border-[3px] border-black bg-white p-1 shadow-[4px_4px_0_#17120d] sm:w-auto">
          {["Home", "Card", "Rewards"].map((item, index) => (
            <a
              className={`flex-1 rounded-full px-4 py-2 text-center text-sm font-black ${index === 0 ? "bg-black text-white" : "text-black hover:bg-[#ffe2ba]"}`}
              href={index === 0 ? "#home" : index === 1 ? "#card" : "#rewards"}
              key={item}
            >
              {item}
            </a>
          ))}
        </nav>
      </header>

      <section id="home" className="hard-card relative overflow-hidden bg-[var(--paper)] p-5 sm:p-8">
        <div className="grid items-center gap-7 lg:grid-cols-[1fr_390px]">
          <div className="relative z-10">
            <span className="inline-flex rounded-full border-[3px] border-black bg-[var(--yellow)] px-4 py-1 text-xs font-black uppercase">
              LIVE ON BASE
            </span>
            <h1 className="mt-5 max-w-[680px] text-5xl font-black leading-[0.95] tracking-normal sm:text-7xl">BaseProof Card</h1>
            <p className="mt-4 max-w-xl text-lg font-bold">Mint and update your onchain identity card.</p>
            <button
              className="hard-button mt-6 inline-flex min-h-12 items-center justify-center gap-2 bg-[var(--orange)] px-7 py-3 text-base font-black"
              disabled={busy}
              onClick={() =>
                isConnected
                  ? runAction("Mint", mintData())
                  : setMessage("Connect a wallet first.")
              }
            >
              {busy ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
              {isConnected ? "Mint Card" : "Connect Wallet"}
            </button>
          </div>

          <div className="relative z-10 min-h-[230px] sm:min-h-[260px]" aria-hidden="true">
            {[
              ["Identity Card", "ONCHAIN ID", "bg-[var(--yellow)]", "rotate-[-7deg] translate-x-3 translate-y-8"],
              ["Self Like", "PROFILE POWER", "bg-[var(--orange)]", "rotate-[5deg] translate-x-12 translate-y-2"],
              ["Confirm Proof", "NEXT ACTION", "bg-[var(--mint)]", "rotate-[-2deg] translate-x-24 translate-y-24"]
            ].map(([title, label, color, position]) => (
              <div className={`hard-card absolute h-36 w-52 ${color} ${position} p-4`} key={title}>
                <p className="text-xs font-black uppercase">{label}</p>
                <p className="mt-6 text-2xl font-black leading-none">{title}</p>
                <div className="mt-4 h-3 w-24 rounded-full border-2 border-black bg-white" />
              </div>
            ))}
          </div>
        </div>
        <div className="stripe absolute inset-x-0 bottom-0 h-8 border-t-[3px] border-black" />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Panel id="wallet" eyebrow="CONNECT" title="Wallet">
          <div className="grid gap-3">
            {walletButtons.map(({ id, label, connector }) => (
              <button
                className="hard-button flex min-h-12 items-center justify-center gap-2 bg-white px-5 py-3 font-black"
                disabled={isConnecting || busy}
                key={id}
                onClick={() => connect({ connector, chainId: base.id })}
              >
                <Wallet size={18} />
                {label}
              </button>
            ))}
          </div>
          <div className="mt-4 flex flex-col gap-3 rounded-2xl border-[3px] border-black bg-[#fff5e5] p-4 sm:flex-row sm:items-center sm:justify-between">
            <span className="break-all text-sm font-black">{shortAddress(address)}</span>
            <button className="hard-button inline-flex items-center justify-center gap-2 bg-white px-4 py-2 text-sm font-black" disabled={!isConnected} onClick={() => disconnect()}>
              <LogOut size={16} />
              Disconnect
            </button>
          </div>
        </Panel>

        <Panel id="rewards" eyebrow="PROFILE POWER" title="Profile Stats">
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Cards Minted" value={formatBig(profile.cards)} />
            <Stat label="Reward Points" value={formatBig(profile.points)} />
            <Stat label="Likes" value={formatBig(tokenStats.likes)} />
            <Stat label="Confirms" value={formatBig(tokenStats.confirms)} />
          </div>
        </Panel>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Panel id="card" eyebrow="ONCHAIN ID" title="Edit Profile">
          <div className="grid gap-4">
            <input className="field" maxLength={64} onChange={(event) => setNickname(event.target.value)} placeholder="Nickname" value={nickname} />
            <textarea className="field min-h-28 resize-none" maxLength={280} onChange={(event) => setBio(event.target.value)} placeholder="Bio" value={bio} />
            <input className="field" maxLength={300} onChange={(event) => setAvatarURI(event.target.value)} placeholder="avatarURI" value={avatarURI} />
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                className="hard-button min-h-12 bg-[var(--orange)] px-5 py-3 font-black"
                disabled={!isConnected || busy}
                onClick={() =>
                  runAction("Mint", mintData())
                }
              >
                Mint Card
              </button>
              <button
                className="hard-button min-h-12 bg-white px-5 py-3 font-black"
                disabled={!isConnected || busy}
                onClick={() =>
                  runAction("Update", updateData())
                }
              >
                Update Profile
              </button>
            </div>
          </div>
        </Panel>

        <Panel eyebrow="NEXT ACTION" title="Actions">
          <label className="grid gap-2 text-sm font-black uppercase">
            Card ID
            <input className="field" inputMode="numeric" onChange={(event) => setCardId(event.target.value.replace(/\D/g, "") || "1")} value={cardId} />
          </label>
          <div className="mt-4 grid gap-3">
            <button
              className="hard-button flex min-h-12 items-center justify-center gap-2 bg-white px-5 py-3 font-black"
              disabled={!isConnected || busy}
              onClick={() =>
                runAction("Like", likeData())
              }
            >
              <Heart size={18} />
              Like Card
            </button>
            <button
              className="hard-button flex min-h-12 items-center justify-center gap-2 bg-white px-5 py-3 font-black"
              disabled={!isConnected || busy}
              onClick={() =>
                runAction("Confirm", confirmData())
              }
            >
              <BadgeCheck size={18} />
              Confirm Card
            </button>
            <button
              className="hard-button flex min-h-12 items-center justify-center gap-2 bg-[var(--yellow)] px-5 py-3 font-black"
              onClick={async () => {
                if (!address) {
                  setMessage("Connect a wallet first.");
                  return;
                }
                await navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}?ref=${address}`);
                setMessage("Invite link copied.");
              }}
            >
              <Copy size={18} />
              Copy Invite Link
            </button>
          </div>
        </Panel>
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <Panel eyebrow="PROFILE CARD" title="Your Card">
          <div className="rounded-[16px] border-[3px] border-black bg-[var(--mint)] p-5 shadow-[4px_4px_0_#17120d]">
            <div className="flex items-start gap-4">
              <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-2xl border-[3px] border-black bg-white">
                {profile.avatarURI ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img alt="" className="h-full w-full object-cover" src={profile.avatarURI} />
                ) : (
                  <CircleUserRound size={34} />
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-2xl font-black">{profileName}</p>
                <p className="mt-1 line-clamp-3 text-sm font-bold">{profileBio}</p>
              </div>
            </div>
            <div className="mt-5 flex items-center justify-between rounded-full border-[3px] border-black bg-white px-4 py-2 text-sm font-black">
              <span>Card #{cardId}</span>
              <span>{shortAddress(address)}</span>
            </div>
          </div>
        </Panel>

        <Panel eyebrow="RECENT MOVES" title="Recent Activity">
          <div className="grid gap-3">
            {activities.length ? (
              activities.map((activity, index) => (
                <div className="flex items-center justify-between rounded-2xl border-[3px] border-black bg-white px-4 py-3" key={`${activity.action}-${activity.time}-${index}`}>
                  <span className="flex items-center gap-2 font-black">
                    <Flame size={17} />
                    {activity.action}
                  </span>
                  <span className="text-sm font-bold">{activity.time}</span>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border-[3px] border-black bg-white px-4 py-3 font-bold">No recent activity yet.</div>
            )}
          </div>
          <div className="mt-4 rounded-2xl border-[3px] border-black bg-[#fff5e5] px-4 py-3 text-sm font-black">{message}</div>
        </Panel>
      </section>
    </main>
  );
}

function Panel({ children, eyebrow, id, title }: { children: React.ReactNode; eyebrow: string; id?: string; title: string }) {
  return (
    <section className="hard-card bg-[var(--paper)] p-5" id={id}>
      <p className="text-xs font-black uppercase">{eyebrow}</p>
      <h2 className="mb-4 mt-1 text-2xl font-black tracking-normal">{title}</h2>
      {children}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[16px] border-[3px] border-black bg-white p-4">
      <p className="text-xs font-black uppercase">{label}</p>
      <p className="mt-2 text-4xl font-black leading-none">{value}</p>
    </div>
  );
}
