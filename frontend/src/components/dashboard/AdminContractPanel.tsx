import { useState, useCallback } from "react";
import { useReadContract, useWriteContract, useAccount } from "wagmi";
import { formatEther, parseEther, type Address } from "viem";
import { toast } from "sonner";
import {
  PREMIUM_ADMIN_ABI,
  TREASURY_ABI,
  FACTORY_ADMIN_ABI,
  PREMIUM_CONTRACT_ADDRESS,
  TIPJAR_FACTORY_ADDRESS,
  TREASURY_CONTRACT_ADDRESS,
  somniaTestnet,
  truncateAddress,
  getExplorerTxUrl,
  getExplorerAddressUrl,
} from "@/lib/web3";
import { useWallet } from "@/hooks/useWallet";
import {
  FiDollarSign,
  FiBox,
  FiShield,
  FiSettings,
  FiArrowDownCircle,
  FiExternalLink,
  FiInfo,
  FiClock,
  FiAlertTriangle,
  FiRefreshCw,
} from "react-icons/fi";

// ─── Treasury Section ───
function TreasurySection() {
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const [withdrawTo, setWithdrawTo] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [isPending, setIsPending] = useState(false);

  const { data: treasuryBalance, refetch: refetchBalance } = useReadContract({
    address: TREASURY_CONTRACT_ADDRESS as Address,
    abi: TREASURY_ABI,
    functionName: "balance",
    chainId: somniaTestnet.id,
    query: { enabled: !!TREASURY_CONTRACT_ADDRESS },
  });

  const { data: treasuryAdmin } = useReadContract({
    address: TREASURY_CONTRACT_ADDRESS as Address,
    abi: TREASURY_ABI,
    functionName: "admin",
    chainId: somniaTestnet.id,
    query: { enabled: !!TREASURY_CONTRACT_ADDRESS },
  });

  const balanceFormatted = treasuryBalance
    ? parseFloat(formatEther(treasuryBalance as bigint)).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 6,
      })
    : "0";

  const isAdmin = address && treasuryAdmin
    ? address.toLowerCase() === (treasuryAdmin as string).toLowerCase()
    : false;

  const handleWithdraw = useCallback(async (all: boolean) => {
    if (!TREASURY_CONTRACT_ADDRESS) return;
    try {
      setIsPending(true);
      toast.loading(all ? "Withdrawing all funds..." : "Withdrawing...", { id: "treasury-withdraw" });

      let hash: string;
      if (all) {
        const target = withdrawTo || address;
        if (!target) {
          toast.error("Please enter a recipient address.", { id: "treasury-withdraw" });
          return;
        }
        hash = await writeContractAsync({
          address: TREASURY_CONTRACT_ADDRESS as Address,
          abi: TREASURY_ABI,
          functionName: "withdrawAll",
          args: [target as Address],
          chainId: somniaTestnet.id,
        } as any);
      } else {
        if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
          toast.error("Please enter a valid amount.", { id: "treasury-withdraw" });
          return;
        }
        const target = withdrawTo || address;
        if (!target) {
          toast.error("Please enter a recipient address.", { id: "treasury-withdraw" });
          return;
        }
        hash = await writeContractAsync({
          address: TREASURY_CONTRACT_ADDRESS as Address,
          abi: TREASURY_ABI,
          functionName: "withdraw",
          args: [target as Address, parseEther(withdrawAmount)],
          chainId: somniaTestnet.id,
        } as any);
      }

      toast.success(
        <span>
          Withdrawal successful!{" "}
          <a href={getExplorerTxUrl(hash)} target="_blank" rel="noopener noreferrer" className="underline">
            View tx
          </a>
        </span>,
        { id: "treasury-withdraw", duration: 8000 }
      );
      refetchBalance();
      setWithdrawAmount("");
    } catch (err: any) {
      if (err?.code === 4001 || err?.message?.includes("rejected")) {
        toast.error("Transaction rejected.", { id: "treasury-withdraw" });
      } else {
        toast.error(err?.shortMessage || "Withdrawal failed.", { id: "treasury-withdraw" });
      }
    } finally {
      setIsPending(false);
    }
  }, [writeContractAsync, withdrawTo, withdrawAmount, address, refetchBalance]);

  if (!TREASURY_CONTRACT_ADDRESS) {
    return (
      <InfoBox icon={<FiAlertTriangle />} color="yellow" title="Treasury Not Configured">
        Set <code className="text-xs bg-white/10 px-1.5 py-0.5 rounded">VITE_TREASURY_ADDRESS</code> in your .env file.
      </InfoBox>
    );
  }

  return (
    <SectionCard title="Treasury" icon={<FiBox />} color="emerald"
      badge={TREASURY_CONTRACT_ADDRESS}
      badgeUrl={getExplorerAddressUrl(TREASURY_CONTRACT_ADDRESS)}>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
        <StatCard label="Balance" value={`${balanceFormatted} STT`} color="emerald"
          action={<button onClick={() => refetchBalance()} className="text-white/30 hover:text-white/60 transition"><FiRefreshCw className="h-3.5 w-3.5" /></button>} />
        <StatCard label="Admin" value={treasuryAdmin ? truncateAddress(treasuryAdmin as string) : "..."} color="blue"
          action={treasuryAdmin ? <ExplorerLink url={getExplorerAddressUrl(treasuryAdmin as string)} /> : null} />
      </div>

      {isAdmin && (
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-white/40 mb-1">Recipient (leave empty = your wallet)</label>
            <input
              type="text" placeholder="0x..." value={withdrawTo} onChange={(e) => setWithdrawTo(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-white/[0.08] bg-white/[0.03] text-white text-sm placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-white/40 mb-1">Amount (STT)</label>
            <input
              type="number" step="any" min="0" placeholder="0.00" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-white/[0.08] bg-white/[0.03] text-white text-sm placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
            />
          </div>
          <div className="flex gap-2">
            <ActionButton onClick={() => handleWithdraw(false)} disabled={isPending || !withdrawAmount} color="emerald" icon={<FiArrowDownCircle />}>
              {isPending ? "Processing..." : "Withdraw Amount"}
            </ActionButton>
            <ActionButton onClick={() => handleWithdraw(true)} disabled={isPending} color="amber" icon={<FiArrowDownCircle />}>
              {isPending ? "Processing..." : "Withdraw All"}
            </ActionButton>
          </div>
        </div>
      )}

      {!isAdmin && address && (
        <InfoBox icon={<FiShield />} color="red" title="Not Admin">
          Connected wallet is not the treasury admin. Connect with the deployer wallet.
        </InfoBox>
      )}
    </SectionCard>
  );
}

// ─── Premium Contract Section ───
function PremiumSection() {
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const [isPending, setIsPending] = useState(false);

  // Form state
  const [planToUpdate, setPlanToUpdate] = useState("guild_basic");
  const [newPrice, setNewPrice] = useState("");
  const [newDuration, setNewDuration] = useState("");
  const [newPremiumTreasury, setNewPremiumTreasury] = useState("");
  const [newPremiumAdmin, setNewPremiumAdmin] = useState("");

  // Read current state
  const readOpts = { chainId: somniaTestnet.id, query: { enabled: !!PREMIUM_CONTRACT_ADDRESS } };
  const premAddr = PREMIUM_CONTRACT_ADDRESS as Address;

  const { data: premiumAdmin } = useReadContract({ address: premAddr, abi: PREMIUM_ADMIN_ABI, functionName: "admin", ...readOpts });
  const { data: premiumTreasury } = useReadContract({ address: premAddr, abi: PREMIUM_ADMIN_ABI, functionName: "treasury", ...readOpts });
  const { data: premiumDuration } = useReadContract({ address: premAddr, abi: PREMIUM_ADMIN_ABI, functionName: "premiumDuration", ...readOpts });
  const { data: basicPrice, refetch: rBasic } = useReadContract({ address: premAddr, abi: PREMIUM_ADMIN_ABI, functionName: "premiumGuildBasicPrice", ...readOpts });
  const { data: plusPrice, refetch: rPlus } = useReadContract({ address: premAddr, abi: PREMIUM_ADMIN_ABI, functionName: "premiumGuildPlusPrice", ...readOpts });
  const { data: proPrice, refetch: rPro } = useReadContract({ address: premAddr, abi: PREMIUM_ADMIN_ABI, functionName: "premiumGuildProPrice", ...readOpts });

  const isAdmin = address && premiumAdmin
    ? address.toLowerCase() === (premiumAdmin as string).toLowerCase()
    : false;

  const durationDays = premiumDuration ? Number(premiumDuration) / 86400 : 0;

  const refetchPrices = () => { rBasic(); rPlus(); rPro(); };

  const handleSetPrice = useCallback(async () => {
    if (!newPrice || parseFloat(newPrice) <= 0) { toast.error("Enter a valid price."); return; }
    try {
      setIsPending(true);
      toast.loading("Updating price...", { id: "premium-price" });
      const hash = await writeContractAsync({
        address: premAddr,
        abi: PREMIUM_ADMIN_ABI,
        functionName: "setPremiumPrice",
        args: [planToUpdate, parseEther(newPrice)],
        chainId: somniaTestnet.id,
      } as any);
      toast.success(<span>Price updated! <a href={getExplorerTxUrl(hash)} target="_blank" rel="noopener noreferrer" className="underline">View tx</a></span>, { id: "premium-price", duration: 8000 });
      refetchPrices();
      setNewPrice("");
    } catch (err: any) {
      if (err?.code === 4001) toast.error("Transaction rejected.", { id: "premium-price" });
      else toast.error(err?.shortMessage || "Failed to update price.", { id: "premium-price" });
    } finally { setIsPending(false); }
  }, [writeContractAsync, planToUpdate, newPrice, premAddr, refetchPrices]);

  const handleSetDuration = useCallback(async () => {
    const days = parseFloat(newDuration);
    if (!days || days <= 0) { toast.error("Enter a valid number of days."); return; }
    try {
      setIsPending(true);
      toast.loading("Updating duration...", { id: "premium-duration" });
      const seconds = BigInt(Math.floor(days * 86400));
      const hash = await writeContractAsync({
        address: premAddr,
        abi: PREMIUM_ADMIN_ABI,
        functionName: "setPremiumDuration",
        args: [seconds],
        chainId: somniaTestnet.id,
      } as any);
      toast.success(<span>Duration updated! <a href={getExplorerTxUrl(hash)} target="_blank" rel="noopener noreferrer" className="underline">View tx</a></span>, { id: "premium-duration", duration: 8000 });
      setNewDuration("");
    } catch (err: any) {
      if (err?.code === 4001) toast.error("Transaction rejected.", { id: "premium-duration" });
      else toast.error(err?.shortMessage || "Failed to update duration.", { id: "premium-duration" });
    } finally { setIsPending(false); }
  }, [writeContractAsync, newDuration, premAddr]);

  const handleSetTreasury = useCallback(async () => {
    if (!newPremiumTreasury || !/^0x[a-fA-F0-9]{40}$/.test(newPremiumTreasury)) { toast.error("Enter a valid address."); return; }
    try {
      setIsPending(true);
      toast.loading("Updating treasury...", { id: "premium-treasury" });
      const hash = await writeContractAsync({
        address: premAddr,
        abi: PREMIUM_ADMIN_ABI,
        functionName: "setTreasury",
        args: [newPremiumTreasury as Address],
        chainId: somniaTestnet.id,
      } as any);
      toast.success(<span>Treasury updated! <a href={getExplorerTxUrl(hash)} target="_blank" rel="noopener noreferrer" className="underline">View tx</a></span>, { id: "premium-treasury", duration: 8000 });
      setNewPremiumTreasury("");
    } catch (err: any) {
      if (err?.code === 4001) toast.error("Transaction rejected.", { id: "premium-treasury" });
      else toast.error(err?.shortMessage || "Failed.", { id: "premium-treasury" });
    } finally { setIsPending(false); }
  }, [writeContractAsync, newPremiumTreasury, premAddr]);

  const handleTransferAdmin = useCallback(async () => {
    if (!newPremiumAdmin || !/^0x[a-fA-F0-9]{40}$/.test(newPremiumAdmin)) { toast.error("Enter a valid address."); return; }
    try {
      setIsPending(true);
      toast.loading("Transferring admin...", { id: "premium-admin" });
      const hash = await writeContractAsync({
        address: premAddr,
        abi: PREMIUM_ADMIN_ABI,
        functionName: "transferAdmin",
        args: [newPremiumAdmin as Address],
        chainId: somniaTestnet.id,
      } as any);
      toast.success(<span>Admin transferred! <a href={getExplorerTxUrl(hash)} target="_blank" rel="noopener noreferrer" className="underline">View tx</a></span>, { id: "premium-admin", duration: 8000 });
      setNewPremiumAdmin("");
    } catch (err: any) {
      if (err?.code === 4001) toast.error("Transaction rejected.", { id: "premium-admin" });
      else toast.error(err?.shortMessage || "Failed.", { id: "premium-admin" });
    } finally { setIsPending(false); }
  }, [writeContractAsync, newPremiumAdmin, premAddr]);

  if (!PREMIUM_CONTRACT_ADDRESS) {
    return (
      <InfoBox icon={<FiAlertTriangle />} color="yellow" title="Premium Contract Not Configured">
        Set <code className="text-xs bg-white/10 px-1.5 py-0.5 rounded">VITE_PREMIUM_CONTRACT_ADDRESS</code> in your .env file.
      </InfoBox>
    );
  }

  return (
    <SectionCard title="Premium Contract" icon={<FiDollarSign />} color="pink"
      badge={PREMIUM_CONTRACT_ADDRESS}
      badgeUrl={getExplorerAddressUrl(PREMIUM_CONTRACT_ADDRESS)}>

      {/* Current state */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
        <StatCard label="Basic Price" value={basicPrice ? `${formatEther(basicPrice as bigint)} STT` : "..."} color="yellow" />
        <StatCard label="Plus Price" value={plusPrice ? `${formatEther(plusPrice as bigint)} STT` : "..."} color="purple" />
        <StatCard label="Pro Price" value={proPrice ? `${formatEther(proPrice as bigint)} STT` : "..."} color="emerald" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        <StatCard label="Duration" value={durationDays ? `${durationDays} days` : "..."} color="blue" icon={<FiClock className="h-3.5 w-3.5" />} />
        <StatCard label="Treasury" value={premiumTreasury ? truncateAddress(premiumTreasury as string) : "..."} color="emerald"
          action={premiumTreasury ? <ExplorerLink url={getExplorerAddressUrl(premiumTreasury as string)} /> : null} />
        <StatCard label="Admin" value={premiumAdmin ? truncateAddress(premiumAdmin as string) : "..."} color="blue"
          action={premiumAdmin ? <ExplorerLink url={getExplorerAddressUrl(premiumAdmin as string)} /> : null} />
      </div>

      {isAdmin && (
        <div className="space-y-4">
          {/* Set Price */}
          <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02]">
            <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <FiDollarSign className="h-4 w-4 text-pink-400" /> Update Price
            </h4>
            <div className="flex flex-col sm:flex-row gap-2">
              <select value={planToUpdate} onChange={(e) => setPlanToUpdate(e.target.value)}
                className="px-3 py-2 rounded-lg border border-white/[0.08] bg-white/[0.03] text-white text-sm focus:outline-none focus:ring-1 focus:ring-pink-500/30">
                <option value="guild_basic">Guild Basic</option>
                <option value="guild_plus">Guild Plus</option>
                <option value="guild_pro">Guild Pro</option>
              </select>
              <input type="number" step="any" min="0" placeholder="New price (STT)" value={newPrice} onChange={(e) => setNewPrice(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg border border-white/[0.08] bg-white/[0.03] text-white text-sm placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-pink-500/30" />
              <ActionButton onClick={handleSetPrice} disabled={isPending} color="pink">Set Price</ActionButton>
            </div>
          </div>

          {/* Set Duration */}
          <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02]">
            <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <FiClock className="h-4 w-4 text-blue-400" /> Update Duration
            </h4>
            <div className="flex gap-2">
              <input type="number" step="1" min="1" placeholder="Days" value={newDuration} onChange={(e) => setNewDuration(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg border border-white/[0.08] bg-white/[0.03] text-white text-sm placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-blue-500/30" />
              <ActionButton onClick={handleSetDuration} disabled={isPending} color="blue">Set Duration</ActionButton>
            </div>
          </div>

          {/* Set Treasury */}
          <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02]">
            <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <FiBox className="h-4 w-4 text-emerald-400" /> Update Treasury Address
            </h4>
            <div className="flex gap-2">
              <input type="text" placeholder="0x..." value={newPremiumTreasury} onChange={(e) => setNewPremiumTreasury(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg border border-white/[0.08] bg-white/[0.03] text-white text-sm placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-emerald-500/30" />
              <ActionButton onClick={handleSetTreasury} disabled={isPending} color="emerald">Update</ActionButton>
            </div>
          </div>

          {/* Transfer Admin */}
          <div className="p-4 rounded-xl border border-red-500/10 bg-red-500/[0.02]">
            <h4 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
              <FiShield className="h-4 w-4 text-red-400" /> Transfer Admin
              <span className="text-[10px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full font-bold">DANGER</span>
            </h4>
            <p className="text-xs text-white/40 mb-3">This will permanently transfer admin ownership. Make sure the new address is correct.</p>
            <div className="flex gap-2">
              <input type="text" placeholder="New admin 0x..." value={newPremiumAdmin} onChange={(e) => setNewPremiumAdmin(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg border border-red-500/10 bg-white/[0.03] text-white text-sm placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-red-500/30" />
              <ActionButton onClick={handleTransferAdmin} disabled={isPending} color="red">Transfer</ActionButton>
            </div>
          </div>
        </div>
      )}

      {!isAdmin && address && (
        <InfoBox icon={<FiShield />} color="red" title="Not Admin">
          Connected wallet is not the premium contract admin.
        </InfoBox>
      )}
    </SectionCard>
  );
}

// ─── Factory Section ───
function FactorySection() {
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const [isPending, setIsPending] = useState(false);
  const [newFactoryTreasury, setNewFactoryTreasury] = useState("");
  const [newFactoryAdmin, setNewFactoryAdmin] = useState("");

  const readOpts = { chainId: somniaTestnet.id, query: { enabled: !!TIPJAR_FACTORY_ADDRESS } };
  const factAddr = TIPJAR_FACTORY_ADDRESS as Address;

  const { data: factoryAdmin } = useReadContract({ address: factAddr, abi: FACTORY_ADMIN_ABI, functionName: "admin", ...readOpts });
  const { data: factoryTreasury } = useReadContract({ address: factAddr, abi: FACTORY_ADMIN_ABI, functionName: "treasury", ...readOpts });
  const { data: totalGuilds } = useReadContract({ address: factAddr, abi: FACTORY_ADMIN_ABI, functionName: "totalGuilds", ...readOpts });

  const isAdmin = address && factoryAdmin
    ? address.toLowerCase() === (factoryAdmin as string).toLowerCase()
    : false;

  const handleSetTreasury = useCallback(async () => {
    if (!newFactoryTreasury || !/^0x[a-fA-F0-9]{40}$/.test(newFactoryTreasury)) { toast.error("Enter a valid address."); return; }
    try {
      setIsPending(true);
      toast.loading("Updating factory treasury...", { id: "factory-treasury" });
      const hash = await writeContractAsync({
        address: factAddr,
        abi: FACTORY_ADMIN_ABI,
        functionName: "setTreasury",
        args: [newFactoryTreasury as Address],
        chainId: somniaTestnet.id,
      } as any);
      toast.success(<span>Factory treasury updated! <a href={getExplorerTxUrl(hash)} target="_blank" rel="noopener noreferrer" className="underline">View tx</a></span>, { id: "factory-treasury", duration: 8000 });
      setNewFactoryTreasury("");
    } catch (err: any) {
      if (err?.code === 4001) toast.error("Transaction rejected.", { id: "factory-treasury" });
      else toast.error(err?.shortMessage || "Failed.", { id: "factory-treasury" });
    } finally { setIsPending(false); }
  }, [writeContractAsync, newFactoryTreasury, factAddr]);

  const handleTransferAdmin = useCallback(async () => {
    if (!newFactoryAdmin || !/^0x[a-fA-F0-9]{40}$/.test(newFactoryAdmin)) { toast.error("Enter a valid address."); return; }
    try {
      setIsPending(true);
      toast.loading("Transferring factory admin...", { id: "factory-admin" });
      const hash = await writeContractAsync({
        address: factAddr,
        abi: FACTORY_ADMIN_ABI,
        functionName: "transferAdmin",
        args: [newFactoryAdmin as Address],
        chainId: somniaTestnet.id,
      } as any);
      toast.success(<span>Factory admin transferred! <a href={getExplorerTxUrl(hash)} target="_blank" rel="noopener noreferrer" className="underline">View tx</a></span>, { id: "factory-admin", duration: 8000 });
      setNewFactoryAdmin("");
    } catch (err: any) {
      if (err?.code === 4001) toast.error("Transaction rejected.", { id: "factory-admin" });
      else toast.error(err?.shortMessage || "Failed.", { id: "factory-admin" });
    } finally { setIsPending(false); }
  }, [writeContractAsync, newFactoryAdmin, factAddr]);

  if (!TIPJAR_FACTORY_ADDRESS) {
    return (
      <InfoBox icon={<FiAlertTriangle />} color="yellow" title="Factory Not Configured">
        Set <code className="text-xs bg-white/10 px-1.5 py-0.5 rounded">VITE_TIPJAR_FACTORY_ADDRESS</code> in your .env file.
      </InfoBox>
    );
  }

  return (
    <SectionCard title="Guild Factory" icon={<FiSettings />} color="violet"
      badge={TIPJAR_FACTORY_ADDRESS}
      badgeUrl={getExplorerAddressUrl(TIPJAR_FACTORY_ADDRESS)}>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        <StatCard label="Total Guilds" value={totalGuilds != null ? totalGuilds.toString() : "..."} color="violet" />
        <StatCard label="Treasury" value={factoryTreasury ? truncateAddress(factoryTreasury as string) : "..."} color="emerald"
          action={factoryTreasury ? <ExplorerLink url={getExplorerAddressUrl(factoryTreasury as string)} /> : null} />
        <StatCard label="Admin" value={factoryAdmin ? truncateAddress(factoryAdmin as string) : "..."} color="blue"
          action={factoryAdmin ? <ExplorerLink url={getExplorerAddressUrl(factoryAdmin as string)} /> : null} />
      </div>

      {isAdmin && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02]">
            <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <FiBox className="h-4 w-4 text-emerald-400" /> Update Treasury Address
            </h4>
            <p className="text-xs text-white/40 mb-2">New guild contracts will use this treasury for the 1.5% fee. Already deployed guilds are not affected.</p>
            <div className="flex gap-2">
              <input type="text" placeholder="0x..." value={newFactoryTreasury} onChange={(e) => setNewFactoryTreasury(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg border border-white/[0.08] bg-white/[0.03] text-white text-sm placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-violet-500/30" />
              <ActionButton onClick={handleSetTreasury} disabled={isPending} color="violet">Update</ActionButton>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-red-500/10 bg-red-500/[0.02]">
            <h4 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
              <FiShield className="h-4 w-4 text-red-400" /> Transfer Admin
              <span className="text-[10px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full font-bold">DANGER</span>
            </h4>
            <p className="text-xs text-white/40 mb-3">Permanently transfer factory admin ownership.</p>
            <div className="flex gap-2">
              <input type="text" placeholder="New admin 0x..." value={newFactoryAdmin} onChange={(e) => setNewFactoryAdmin(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg border border-red-500/10 bg-white/[0.03] text-white text-sm placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-red-500/30" />
              <ActionButton onClick={handleTransferAdmin} disabled={isPending} color="red">Transfer</ActionButton>
            </div>
          </div>
        </div>
      )}

      {!isAdmin && address && (
        <InfoBox icon={<FiShield />} color="red" title="Not Admin">
          Connected wallet is not the factory admin.
        </InfoBox>
      )}
    </SectionCard>
  );
}

// ═══════════════════════════════════════
//  Shared UI primitives
// ═══════════════════════════════════════

const colorMap: Record<string, string> = {
  pink: "border-pink-500/20 text-pink-400 bg-pink-500/10",
  emerald: "border-emerald-500/20 text-emerald-400 bg-emerald-500/10",
  blue: "border-blue-500/20 text-blue-400 bg-blue-500/10",
  violet: "border-violet-500/20 text-violet-400 bg-violet-500/10",
  yellow: "border-yellow-500/20 text-yellow-400 bg-yellow-500/10",
  red: "border-red-500/20 text-red-400 bg-red-500/10",
  amber: "border-amber-500/20 text-amber-400 bg-amber-500/10",
  purple: "border-purple-500/20 text-purple-400 bg-purple-500/10",
};

const btnColorMap: Record<string, string> = {
  pink: "bg-pink-500/20 text-pink-400 hover:bg-pink-500/30 border-pink-500/20",
  emerald: "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border-emerald-500/20",
  blue: "bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border-blue-500/20",
  violet: "bg-violet-500/20 text-violet-400 hover:bg-violet-500/30 border-violet-500/20",
  red: "bg-red-500/20 text-red-400 hover:bg-red-500/30 border-red-500/20",
  amber: "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border-amber-500/20",
};

function SectionCard({ title, icon, color, badge, badgeUrl, children }: {
  title: string; icon: React.ReactNode; color: string; badge?: string; badgeUrl?: string; children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${colorMap[color] || colorMap.blue}`}>
            {icon}
          </div>
          <h3 className="text-base font-bold text-white">{title}</h3>
        </div>
        {badge && (
          <a href={badgeUrl} target="_blank" rel="noopener noreferrer"
            className="font-mono text-[11px] text-white/30 hover:text-white/60 transition flex items-center gap-1">
            {truncateAddress(badge)} <FiExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function StatCard({ label, value, color, icon, action }: {
  label: string; value: string; color: string; icon?: React.ReactNode; action?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5">
      <div className="flex items-center justify-between mb-1">
        <p className="text-[10px] font-medium text-white/35 uppercase tracking-wider flex items-center gap-1">
          {icon} {label}
        </p>
        {action}
      </div>
      <p className={`text-sm font-bold ${colorMap[color]?.split(" ")[1] || "text-white"} truncate`}>{value}</p>
    </div>
  );
}

function ActionButton({ children, onClick, disabled, color, icon }: {
  children: React.ReactNode; onClick: () => void; disabled?: boolean; color: string; icon?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick} disabled={disabled}
      className={`flex items-center gap-1.5 px-4 py-2 rounded-lg border text-sm font-semibold transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed shrink-0 ${btnColorMap[color] || btnColorMap.blue}`}>
      {icon} {children}
    </button>
  );
}

function InfoBox({ icon, color, title, children }: {
  icon: React.ReactNode; color: string; title: string; children: React.ReactNode;
}) {
  return (
    <div className={`flex items-start gap-3 rounded-xl border p-4 ${colorMap[color] || colorMap.blue}`}>
      <div className="shrink-0 mt-0.5">{icon}</div>
      <div>
        <p className="text-sm font-semibold text-white mb-1">{title}</p>
        <p className="text-xs text-white/50 leading-relaxed">{children}</p>
      </div>
    </div>
  );
}

function ExplorerLink({ url }: { url: string }) {
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="text-white/30 hover:text-white/60 transition">
      <FiExternalLink className="h-3 w-3" />
    </a>
  );
}

// ═══════════════════════════════════════
//  Main Export
// ═══════════════════════════════════════

export default function AdminContractPanel() {
  const { isConnected } = useAccount();
  const { connectWallet, isCorrectChain, switchToSomnia } = useWallet();

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="h-16 w-16 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-center text-3xl">🔗</div>
        <p className="text-white/50 text-sm">Connect your deployer wallet to manage contracts.</p>
        <button onClick={connectWallet}
          className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 text-white font-semibold text-sm hover:from-pink-600 hover:to-rose-600 transition-all active:scale-[0.98]">
          Connect Wallet
        </button>
      </div>
    );
  }

  if (!isCorrectChain) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="h-16 w-16 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-3xl">⚠️</div>
        <p className="text-yellow-400 text-sm">Please switch to Somnia Testnet.</p>
        <button onClick={switchToSomnia}
          className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-500 text-white font-semibold text-sm hover:from-yellow-600 hover:to-amber-600 transition-all active:scale-[0.98]">
          Switch Network
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <div className="flex items-start gap-3 rounded-xl border border-blue-500/15 bg-blue-500/[0.05] p-4">
        <FiInfo className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-white mb-1">Contract Management</p>
          <p className="text-xs text-white/50 leading-relaxed">
            All actions below are onchain transactions using your connected wallet. Only the contract admin (deployer) can execute these.
            Fee platform (1.5%) bersifat constant dan tidak bisa diubah setelah deploy.
          </p>
        </div>
      </div>

      <TreasurySection />
      <PremiumSection />
      <FactorySection />
    </div>
  );
}
