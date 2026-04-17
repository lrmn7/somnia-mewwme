import { useState, useCallback } from "react";
import { useWriteContract, useAccount, useReadContract, useSendTransaction } from "wagmi";
import { readContract, waitForTransactionReceipt } from "@wagmi/core";
import { parseEther, formatEther, decodeEventLog, encodeFunctionData, createPublicClient, http, type Address } from "viem";
import { toast } from "sonner";
import { api } from "@/lib/api";
import {
  FACTORY_ABI,
  PREMIUM_ABI,
  PREMIUM_CONTRACT_ADDRESS,
  GUILD_TIP_ABI,
  PREMIUM_PLANS,
  somniaTestnet,
  wagmiConfig,
  getExplorerTxUrl,
} from "@/lib/web3";

// ── useTip: Send a donation to a MewwmeGuildTip contract ──
export function useTip(contractAddress: string | undefined) {
  const [isPending, setIsPending] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const { writeContractAsync } = useWriteContract();
  const { address: walletAddress } = useAccount();

  const sendTip = useCallback(
    async (amount: string, message: string, guildId: string) => {
      if (!contractAddress) {
        toast.error("No contract address for this guild.");
        return null;
      }

      try {
        setIsPending(true);
        toast.loading("Sending donation...", { id: "tip-tx" });

        const hash = await writeContractAsync({
          address: contractAddress as Address,
          abi: GUILD_TIP_ABI,
          functionName: "donate",
          args: [message],
          value: parseEther(amount),
          chainId: somniaTestnet.id,
        } as any);

        setTxHash(hash);
        toast.loading("Waiting for confirmation...", { id: "tip-tx" });

        // Record tip in backend cache
        try {
          await api.post(`/api/community/guild/${guildId}/tip`, {
            senderAddress: walletAddress || "",
            amount,
            message,
            txHash: hash,
          });
        } catch {
          // Non-critical - tip is already on-chain
        }

        toast.success(
          <span>
            Donation sent! <a href={getExplorerTxUrl(hash)} target="_blank" rel="noopener noreferrer" className="underline">View tx</a>
          </span>,
          { id: "tip-tx", duration: 8000 }
        );

        return hash;
      } catch (err: any) {
        if (err?.code === 4001 || err?.message?.includes("rejected")) {
          toast.error("Transaction rejected.", { id: "tip-tx" });
        } else {
          toast.error(err?.shortMessage || "Failed to send donation.", { id: "tip-tx" });
        }
        return null;
      } finally {
        setIsPending(false);
      }
    },
    [contractAddress, writeContractAsync, walletAddress]
  );

  return { sendTip, isPending, txHash };
}

// ── useClaimTips: Claim funds from a MewwmeGuildTip contract ──
export function useClaimTips(contractAddress: string | undefined) {
  const [isPending, setIsPending] = useState(false);
  const { writeContractAsync } = useWriteContract();

  // Read claimable balance
  const { data: claimableBalance, refetch: refetchBalance } = useReadContract({
    address: contractAddress as Address,
    abi: GUILD_TIP_ABI,
    functionName: "getBalance",
    chainId: somniaTestnet.id,
    query: { enabled: !!contractAddress },
  });

  const claimTips = useCallback(async () => {
    if (!contractAddress) {
      toast.error("No contract address.");
      return null;
    }

    try {
      setIsPending(true);
      toast.loading("Claiming funds...", { id: "claim-tx" });

      const hash = await writeContractAsync({
        address: contractAddress as Address,
        abi: GUILD_TIP_ABI,
        functionName: "claim",
        chainId: somniaTestnet.id,
      } as any);

      toast.success(
        <span>
          Funds claimed! <a href={getExplorerTxUrl(hash)} target="_blank" rel="noopener noreferrer" className="underline">View tx</a>
        </span>,
        { id: "claim-tx", duration: 8000 }
      );

      refetchBalance();
      return hash;
    } catch (err: any) {
      if (err?.code === 4001 || err?.message?.includes("rejected")) {
        toast.error("Transaction rejected.", { id: "claim-tx" });
      } else {
        toast.error(err?.shortMessage || "Failed to claim funds.", { id: "claim-tx" });
      }
      return null;
    } finally {
      setIsPending(false);
    }
  }, [contractAddress, writeContractAsync, refetchBalance]);

  return {
    claimTips,
    isPending,
    claimableBalance: claimableBalance ? formatEther(claimableBalance as bigint) : "0",
    refetchBalance,
  };
}

// ── useCreateGuildContract: Deploy a new MewwmeGuildTip via factory ──
// DEEP DEBUG MODE — logs everything to console and shows real errors
export function useCreateGuildContract(factoryAddress: string | undefined) {
  const [isPending, setIsPending] = useState(false);
  const [debugInfo, setDebugInfo] = useState<Record<string, unknown> | null>(null);
  const { sendTransactionAsync } = useSendTransaction();
  const { address: walletAddress, chainId } = useAccount();

  const createContract = useCallback(
    async (guildId: string, ownerAddress: string): Promise<{ hash: string; contractAddress: string } | null> => {
      const debug: Record<string, unknown> = {
        timestamp: new Date().toISOString(),
        walletAddress,
        chainId,
        expectedChainId: somniaTestnet.id,
        factoryAddress,
        guildId,
        ownerAddress,
      };

      console.log("═══════════════════════════════════════════════");
      console.log("🔍 [CreateGuild] DEEP DEBUG START");
      console.log("═══════════════════════════════════════════════");

      // ─── STEP 1: Validate all parameters ───
      console.log("[CreateGuild] Step 1: Parameter validation");
      console.log("  walletAddress:", walletAddress);
      console.log("  chainId:", chainId);
      console.log("  expectedChainId:", somniaTestnet.id);
      console.log("  factoryAddress:", factoryAddress);
      console.log("  guildId:", guildId);
      console.log("  ownerAddress:", ownerAddress);

      if (!walletAddress) {
        const msg = "ABORT: walletAddress is null/undefined. Wallet not connected.";
        console.error("[CreateGuild]", msg);
        debug.error = msg;
        setDebugInfo(debug);
        toast.error(msg, { id: "create-contract-tx", duration: 15000 });
        return null;
      }

      if (!factoryAddress) {
        const msg = "ABORT: factoryAddress is empty. Set VITE_TIPJAR_FACTORY_ADDRESS in .env.";
        console.error("[CreateGuild]", msg);
        debug.error = msg;
        setDebugInfo(debug);
        toast.error(msg, { id: "create-contract-tx", duration: 15000 });
        return null;
      }

      if (!guildId || guildId.trim().length === 0) {
        const msg = "ABORT: guildId is empty.";
        console.error("[CreateGuild]", msg);
        debug.error = msg;
        setDebugInfo(debug);
        toast.error(msg, { id: "create-contract-tx", duration: 15000 });
        return null;
      }

      if (!ownerAddress || ownerAddress === "0x0000000000000000000000000000000000000000") {
        const msg = `ABORT: ownerAddress is invalid (${ownerAddress}).`;
        console.error("[CreateGuild]", msg);
        debug.error = msg;
        setDebugInfo(debug);
        toast.error(msg, { id: "create-contract-tx", duration: 15000 });
        return null;
      }

      if (chainId !== somniaTestnet.id) {
        const msg = `ABORT: Wrong chain. Connected to ${chainId}, need ${somniaTestnet.id} (Somnia Testnet).`;
        console.error("[CreateGuild]", msg);
        debug.error = msg;
        setDebugInfo(debug);
        toast.error(msg, { id: "create-contract-tx", duration: 15000 });
        return null;
      }

      try {
        setIsPending(true);

        // ─── STEP 2: Verify factory contract is alive ───
        console.log("[CreateGuild] Step 2: Verify factory contract is alive...");
        toast.loading("Verifying factory contract...", { id: "create-contract-tx" });

        let factoryTreasury: string | null = null;
        let factoryAdmin: string | null = null;
        let factoryTotalGuilds: bigint | null = null;

        try {
          factoryTreasury = (await readContract(wagmiConfig, {
            address: factoryAddress as Address,
            abi: FACTORY_ABI,
            functionName: "treasury",
            chainId: somniaTestnet.id,
          })) as string;
          console.log("[CreateGuild]   factory.treasury() =", factoryTreasury);
          debug.factoryTreasury = factoryTreasury;
        } catch (e: any) {
          console.error("[CreateGuild]   factory.treasury() FAILED:", e.message || e);
          debug.factoryTreasuryError = e.message || String(e);
        }

        try {
          factoryAdmin = (await readContract(wagmiConfig, {
            address: factoryAddress as Address,
            abi: FACTORY_ABI,
            functionName: "admin",
            chainId: somniaTestnet.id,
          })) as string;
          console.log("[CreateGuild]   factory.admin() =", factoryAdmin);
          debug.factoryAdmin = factoryAdmin;
        } catch (e: any) {
          console.error("[CreateGuild]   factory.admin() FAILED:", e.message || e);
          debug.factoryAdminError = e.message || String(e);
        }

        try {
          factoryTotalGuilds = (await readContract(wagmiConfig, {
            address: factoryAddress as Address,
            abi: FACTORY_ABI,
            functionName: "totalGuilds",
            chainId: somniaTestnet.id,
          })) as bigint;
          console.log("[CreateGuild]   factory.totalGuilds() =", factoryTotalGuilds.toString());
          debug.factoryTotalGuilds = factoryTotalGuilds.toString();
        } catch (e: any) {
          console.error("[CreateGuild]   factory.totalGuilds() FAILED:", e.message || e);
          debug.factoryTotalGuildsError = e.message || String(e);
        }

        // If ALL read calls failed, the contract doesn't exist or ABI is wrong
        if (!factoryTreasury && !factoryAdmin && factoryTotalGuilds === null) {
          const msg =
            "ABORT: Factory contract at " + factoryAddress + " does not respond to ANY read calls. " +
            "Either the address is wrong, the contract is not deployed on Somnia Testnet (chainId " + somniaTestnet.id + "), " +
            "or the ABI does not match the deployed contract.";
          console.error("[CreateGuild]", msg);
          debug.error = msg;
          setDebugInfo(debug);
          toast.error(msg, { id: "create-contract-tx", duration: 20000 });
          return null;
        }

        // Validate treasury is not zero address
        if (factoryTreasury === "0x0000000000000000000000000000000000000000") {
          const msg = "ABORT: Factory treasury is zero address. Contract was deployed incorrectly.";
          console.error("[CreateGuild]", msg);
          debug.error = msg;
          setDebugInfo(debug);
          toast.error(msg, { id: "create-contract-tx", duration: 15000 });
          return null;
        }

        // ─── STEP 3: Check if guild already exists ───
        console.log("[CreateGuild] Step 3: Check if guild already exists...");
        toast.loading("Checking existing contracts...", { id: "create-contract-tx" });

        try {
          const existing = await readContract(wagmiConfig, {
            address: factoryAddress as Address,
            abi: FACTORY_ABI,
            functionName: "getGuild",
            args: [guildId],
            chainId: somniaTestnet.id,
          });
          console.log("[CreateGuild]   getGuild('" + guildId + "') =", existing);
          debug.existingGuild = existing;

          if (existing && existing !== "0x0000000000000000000000000000000000000000") {
            console.log("[CreateGuild]   Guild already exists! Address:", existing);
            toast.success("Guild contract already exists on-chain: " + existing, { id: "create-contract-tx" });
            setDebugInfo(debug);
            return { hash: "", contractAddress: existing as string };
          }
        } catch (e: any) {
          console.warn("[CreateGuild]   getGuild() failed (may be ok):", e.message || e);
          debug.getGuildError = e.message || String(e);
        }

        // ─── STEP 4: Encode function data ───
        console.log("[CreateGuild] Step 4: Encode function data...");
        const txData = encodeFunctionData({
          abi: FACTORY_ABI,
          functionName: "createGuild",
          args: [guildId, ownerAddress as Address],
        });
        console.log("[CreateGuild]   Encoded data:", txData);
        console.log("[CreateGuild]   Data length:", txData.length, "chars");
        debug.encodedData = txData;
        debug.encodedDataLength = txData.length;

        // ─── STEP 5: Try eth_call simulation (will likely fail on Somnia for CREATE ops) ───
        console.log("[CreateGuild] Step 5: Attempt eth_call simulation...");
        try {
          const simResult = await readContract(wagmiConfig, {
            address: factoryAddress as Address,
            abi: FACTORY_ABI,
            functionName: "createGuild",
            args: [guildId, ownerAddress as Address],
            chainId: somniaTestnet.id,
            account: walletAddress,
          } as any);
          console.log("[CreateGuild]   Simulation SUCCESS! Result:", simResult);
          debug.simulationResult = String(simResult);
        } catch (simErr: any) {
          console.warn("[CreateGuild]   Simulation failed (expected on Somnia for CREATE ops):");
          console.warn("    code:", simErr?.code);
          console.warn("    message:", simErr?.message);
          console.warn("    shortMessage:", simErr?.shortMessage);
          console.warn("    data:", simErr?.data);
          console.warn("    cause:", simErr?.cause);
          console.warn("    details:", simErr?.details);
          console.warn("    Full error object:", simErr);
          debug.simulationError = {
            code: simErr?.code,
            message: simErr?.message,
            shortMessage: simErr?.shortMessage,
            data: simErr?.data,
            details: simErr?.details,
          };

          // Check if this is a REAL revert (not just "can't simulate CREATE")
          const errMsg = (simErr?.message || simErr?.shortMessage || "").toLowerCase();
          const isCreateSimError = errMsg.includes("create") || errMsg.includes("opcode") || errMsg.includes("internal");
          const isRevert = errMsg.includes("revert") || errMsg.includes("require");

          if (isRevert && !isCreateSimError) {
            // This is a REAL revert reason - the contract WILL fail
            const revertMsg =
              simErr?.shortMessage || simErr?.message || "Unknown revert reason";
            const msg = "ABORT: Simulation shows contract WILL REVERT: " + revertMsg;
            console.error("[CreateGuild]", msg);
            debug.error = msg;
            setDebugInfo(debug);
            toast.error(msg, { id: "create-contract-tx", duration: 20000 });
            return null;
          }
          console.log("[CreateGuild]   Simulation failure is expected (Somnia CREATE opcode limitation). Proceeding...");
        }

        // ─── STEP 6: Try gas estimation ───
        console.log("[CreateGuild] Step 6: Attempt gas estimation...");
        let estimatedGas: bigint | null = null;
        try {
          const publicClientForGas = createPublicClient({
            chain: somniaTestnet,
            transport: http("https://dream-rpc.somnia.network"),
          });
          estimatedGas = await publicClientForGas.estimateGas({
            account: walletAddress as Address,
            to: factoryAddress as Address,
            data: txData as `0x${string}`,
          });
          console.log("[CreateGuild]   Estimated gas:", estimatedGas.toString());
          debug.estimatedGas = estimatedGas.toString();
        } catch (gasErr: any) {
          console.warn("[CreateGuild]   Gas estimation failed:");
          console.warn("    code:", gasErr?.code);
          console.warn("    message:", gasErr?.message);
          console.warn("    shortMessage:", gasErr?.shortMessage);
          console.warn("    data:", gasErr?.data);
          console.warn("    details:", gasErr?.details);
          debug.gasEstimationError = {
            code: gasErr?.code,
            message: gasErr?.message,
            shortMessage: gasErr?.shortMessage,
            data: gasErr?.data,
            details: gasErr?.details,
          };
          console.log("[CreateGuild]   Will use hardcoded gas: 5_000_000");
        }

        // ─── STEP 7: Check wallet balance ───
        console.log("[CreateGuild] Step 7: Check wallet balance...");
        try {
          const publicClientForBal = createPublicClient({
            chain: somniaTestnet,
            transport: http("https://dream-rpc.somnia.network"),
          });
          const balance = await publicClientForBal.getBalance({ address: walletAddress as Address });
          console.log("[CreateGuild]   Wallet balance:", balance.toString(), "wei =", formatEther(balance), "STT");
          debug.walletBalance = formatEther(balance);
          debug.walletBalanceWei = balance.toString();

          if (balance === 0n) {
            const msg = "ABORT: Wallet has 0 STT. Cannot pay gas fees.";
            console.error("[CreateGuild]", msg);
            debug.error = msg;
            setDebugInfo(debug);
            toast.error(msg, { id: "create-contract-tx", duration: 15000 });
            return null;
          }
        } catch (balErr: any) {
          console.warn("[CreateGuild]   Balance check failed:", balErr?.message);
          debug.balanceError = balErr?.message;
        }

        // ─── STEP 8: Send transaction ───
        const gasToUse = estimatedGas ? (estimatedGas * 120n / 100n) : 5_000_000n; // +20% buffer or fallback
        console.log("[CreateGuild] Step 8: Sending transaction...");
        console.log("  to:", factoryAddress);
        console.log("  data:", txData.slice(0, 10) + "...");
        console.log("  gas:", gasToUse.toString());
        console.log("  chainId:", somniaTestnet.id);
        debug.gasUsed = gasToUse.toString();

        toast.loading("Confirm in wallet...", { id: "create-contract-tx" });

        let hash: `0x${string}`;
        try {
          hash = await sendTransactionAsync({
            to: factoryAddress as Address,
            data: txData as `0x${string}`,
            chainId: somniaTestnet.id,
            gas: gasToUse,
          });
        } catch (sendErr: any) {
          // ─── FULL ERROR CAPTURE ───
          console.error("═══════════════════════════════════════════════");
          console.error("❌ [CreateGuild] sendTransaction FAILED");
          console.error("═══════════════════════════════════════════════");
          console.error("  error.code:", sendErr?.code);
          console.error("  error.name:", sendErr?.name);
          console.error("  error.message:", sendErr?.message);
          console.error("  error.shortMessage:", sendErr?.shortMessage);
          console.error("  error.data:", sendErr?.data);
          console.error("  error.cause:", sendErr?.cause);
          console.error("  error.details:", sendErr?.details);
          console.error("  error.metaMessages:", sendErr?.metaMessages);
          console.error("  error.walk:", typeof sendErr?.walk === "function" ? "available" : "not available");
          console.error("  FULL ERROR:", sendErr);

          // Try to extract revert reason
          let revertReason = "";
          if (typeof sendErr?.walk === "function") {
            const inner = sendErr.walk((e: any) => e?.data);
            if (inner?.data) {
              revertReason = inner.data;
              console.error("  REVERT DATA:", revertReason);
            }
          }

          debug.sendError = {
            code: sendErr?.code,
            name: sendErr?.name,
            message: sendErr?.message,
            shortMessage: sendErr?.shortMessage,
            data: sendErr?.data,
            details: sendErr?.details,
            revertReason,
          };
          setDebugInfo(debug);

          if (sendErr?.code === 4001 || sendErr?.message?.includes("rejected") || sendErr?.message?.includes("denied")) {
            toast.error("Transaction rejected by user.", { id: "create-contract-tx" });
          } else {
            const displayMsg = revertReason
              ? `TX REVERT: ${revertReason}`
              : sendErr?.shortMessage || sendErr?.message || "Unknown error";
            toast.error("createGuild FAILED: " + displayMsg, { id: "create-contract-tx", duration: 30000 });
          }
          return null;
        }

        console.log("[CreateGuild]   TX sent! Hash:", hash);
        debug.txHash = hash;
        toast.loading("TX sent: " + hash + " — waiting for confirmation...", { id: "create-contract-tx" });

        // ─── STEP 9: Wait for receipt ───
        console.log("[CreateGuild] Step 9: Waiting for receipt...");
        let receipt;
        try {
          receipt = await waitForTransactionReceipt(wagmiConfig, {
            hash,
            chainId: somniaTestnet.id,
          });
          console.log("[CreateGuild]   Receipt received!");
          console.log("    status:", receipt.status);
          console.log("    gasUsed:", receipt.gasUsed?.toString());
          console.log("    blockNumber:", receipt.blockNumber?.toString());
          console.log("    logs count:", receipt.logs?.length);
          debug.receiptStatus = receipt.status;
          debug.receiptGasUsed = receipt.gasUsed?.toString();
          debug.receiptBlockNumber = receipt.blockNumber?.toString();
          debug.receiptLogsCount = receipt.logs?.length;
        } catch (receiptErr: any) {
          console.error("[CreateGuild]   waitForReceipt FAILED:", receiptErr);
          debug.receiptError = receiptErr?.message || String(receiptErr);
          setDebugInfo(debug);
          toast.error("TX sent but receipt failed: " + (receiptErr?.message || "unknown"), {
            id: "create-contract-tx",
            duration: 20000,
          });
          return { hash, contractAddress: "" };
        }

        // Check if TX reverted on-chain
        if (receipt.status === "reverted") {
          const msg = "TX REVERTED on-chain! Hash: " + hash + " — Check explorer for revert reason.";
          console.error("[CreateGuild]", msg);
          debug.error = msg;
          setDebugInfo(debug);
          toast.error(msg, { id: "create-contract-tx", duration: 30000 });
          return null;
        }

        // ─── STEP 10: Decode event logs ───
        console.log("[CreateGuild] Step 10: Decoding event logs...");
        let contractAddress = "";
        for (const log of receipt.logs) {
          console.log("[CreateGuild]   Log:", {
            address: log.address,
            topics: log.topics,
            data: log.data,
          });
          try {
            const decoded = decodeEventLog({
              abi: FACTORY_ABI,
              data: log.data,
              topics: log.topics,
            });
            console.log("[CreateGuild]   Decoded event:", decoded.eventName, decoded.args);
            if (decoded.eventName === "GuildCreated") {
              contractAddress = (decoded.args as any).guildAddress;
              console.log("[CreateGuild]   GuildCreated address:", contractAddress);
              break;
            }
          } catch {
            // Not our event
          }
        }

        // Fallback: read from factory
        if (!contractAddress) {
          console.log("[CreateGuild]   No GuildCreated event found, trying getGuild fallback...");
          try {
            const addr = await readContract(wagmiConfig, {
              address: factoryAddress as Address,
              abi: FACTORY_ABI,
              functionName: "getGuild",
              args: [guildId],
              chainId: somniaTestnet.id,
            });
            if (addr && addr !== "0x0000000000000000000000000000000000000000") {
              contractAddress = addr as string;
              console.log("[CreateGuild]   getGuild fallback:", contractAddress);
            }
          } catch (e: any) {
            console.error("[CreateGuild]   getGuild fallback FAILED:", e?.message);
          }
        }

        debug.contractAddress = contractAddress;
        setDebugInfo(debug);

        if (!contractAddress) {
          toast.error("TX confirmed (success) but could not resolve guild contract address.", {
            id: "create-contract-tx",
            duration: 15000,
          });
          return { hash, contractAddress: "" };
        }

        console.log("═══════════════════════════════════════════════");
        console.log("✅ [CreateGuild] SUCCESS!");
        console.log("   TX Hash:", hash);
        console.log("   Guild Contract:", contractAddress);
        console.log("═══════════════════════════════════════════════");

        toast.success(
          <span>
            Contract created! <a href={getExplorerTxUrl(hash)} target="_blank" rel="noopener noreferrer" className="underline">View tx</a>
          </span>,
          { id: "create-contract-tx", duration: 8000 }
        );

        return { hash, contractAddress };
      } catch (err: any) {
        // ─── CATCH-ALL ERROR ───
        console.error("═══════════════════════════════════════════════");
        console.error("❌ [CreateGuild] UNEXPECTED ERROR");
        console.error("═══════════════════════════════════════════════");
        console.error("  error.code:", err?.code);
        console.error("  error.name:", err?.name);
        console.error("  error.message:", err?.message);
        console.error("  error.shortMessage:", err?.shortMessage);
        console.error("  error.data:", err?.data);
        console.error("  error.cause:", err?.cause);
        console.error("  error.details:", err?.details);
        console.error("  FULL ERROR:", err);

        debug.unexpectedError = {
          code: err?.code,
          name: err?.name,
          message: err?.message,
          shortMessage: err?.shortMessage,
          data: err?.data,
          details: err?.details,
        };
        setDebugInfo(debug);

        toast.error("Unexpected error: " + (err?.shortMessage || err?.message || "unknown"), {
          id: "create-contract-tx",
          duration: 20000,
        });
        return null;
      } finally {
        setIsPending(false);
      }
    },
    [factoryAddress, sendTransactionAsync, walletAddress, chainId]
  );

  return { createContract, isPending, debugInfo };
}

// ── usePurchasePremium: Buy premium via MewwmePremium contract ──
export function usePurchasePremium() {
  const [isPending, setIsPending] = useState(false);
  const { writeContractAsync } = useWriteContract();

  const purchasePremium = useCallback(
    async (discordUserId: string, planKey: keyof typeof PREMIUM_PLANS) => {
      if (!PREMIUM_CONTRACT_ADDRESS) {
        toast.error("Premium contract address not configured. Set PREMIUM_CONTRACT_ADDRESS in web3.ts.");
        return null;
      }

      const plan = PREMIUM_PLANS[planKey];
      if (!plan) {
        toast.error("Invalid plan selected.");
        return null;
      }

      try {
        setIsPending(true);
        toast.loading(`Verifying plan on contract...`, { id: "premium-tx" });

        // Pre-flight: read plan price from on-chain contract
        let onChainPrice: bigint;
        try {
          onChainPrice = (await readContract(wagmiConfig, {
            address: PREMIUM_CONTRACT_ADDRESS as Address,
            abi: PREMIUM_ABI,
            functionName: "getPlanPrice",
            args: [planKey],
            chainId: somniaTestnet.id,
          } as any)) as bigint;
        } catch (readErr: any) {
          console.error("[PurchasePremium] getPlanPrice read failed:", readErr);
          toast.error(
            `Premium contract does not respond to getPlanPrice("${planKey}"). ` +
            `Redeploy MewwmePremium.sol and update PREMIUM_CONTRACT_ADDRESS in web3.ts.`,
            { id: "premium-tx", duration: 12000 }
          );
          return null;
        }

        const expectedPrice = BigInt(plan.priceWei);
        if (onChainPrice === 0n) {
          toast.error(
            `Contract returned price=0 for plan "${planKey}". The deployed contract may be outdated.`,
            { id: "premium-tx", duration: 12000 }
          );
          return null;
        }

        // Use on-chain price to guarantee msg.value matches the contract
        const valueToPay = onChainPrice > expectedPrice ? onChainPrice : expectedPrice;

        toast.loading(`Purchasing ${plan.name} premium...`, { id: "premium-tx" });

        const hash = await writeContractAsync({
          address: PREMIUM_CONTRACT_ADDRESS as Address,
          abi: PREMIUM_ABI,
          functionName: "purchasePremium",
          args: [discordUserId, planKey],
          value: valueToPay,
          chainId: somniaTestnet.id,
        } as any);

        toast.loading("Waiting for confirmation...", { id: "premium-tx" });

        // Activate premium in backend
        try {
          await api.post("/api/premium/web3/activate", {
            txHash: hash,
            plan: planKey,
            amount: plan.price,
          });
        } catch (activateErr: any) {
          console.error("[PurchasePremium] Backend activate failed:", activateErr);
          const errMsg = activateErr?.response?.data?.error || "Failed to sync premium to backend.";
          toast.error(errMsg, { id: "premium-activate-err", duration: 10000 });
        }

        toast.success(
          <span>
            {plan.name} Premium activated! <a href={getExplorerTxUrl(hash)} target="_blank" rel="noopener noreferrer" className="underline">View tx</a>
          </span>,
          { id: "premium-tx", duration: 8000 }
        );

        return hash;
      } catch (err: any) {
        console.error("[PurchasePremium] Full error:", err);
        if (err?.code === 4001 || err?.message?.includes("rejected")) {
          toast.error("Transaction rejected.", { id: "premium-tx" });
        } else {
          const reason =
            err?.cause?.reason ||
            err?.cause?.shortMessage ||
            err?.shortMessage ||
            err?.message?.match(/reason:\s*(.+?)(?:\n|$)/)?.[1] ||
            "Failed to purchase premium.";
          toast.error(reason, { id: "premium-tx", duration: 10000 });
        }
        return null;
      } finally {
        setIsPending(false);
      }
    },
    [writeContractAsync]
  );

  return { purchasePremium, isPending };
}
