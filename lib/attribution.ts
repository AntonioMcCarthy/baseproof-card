import { Attribution } from "ox/erc8021";
import type { Hex } from "viem";
import { concatHex } from "viem";

export const builderCode = process.env.NEXT_PUBLIC_BUILDER_CODE || "bc_9cvdfpnw";

export const dataSuffix = Attribution.toDataSuffix({
  codes: [builderCode]
}) as Hex;

export function withDataSuffix(data: Hex) {
  return dataSuffix === "0x" ? data : concatHex([data, dataSuffix]);
}
