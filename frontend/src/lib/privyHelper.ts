/**
 * Standalone helper to get Privy embedded wallet provider + signer.
 * Use this in non-hook contexts (event handlers in class components, etc.).
 * For React components, prefer useEmbeddedWallet hook instead.
 */

// This is a workaround for accessing Privy wallet outside of React hooks.
// The actual wallet reference is set by the useEmbeddedWallet hook via setWalletRef.
let _walletRef: any = null;

export function setWalletRef(wallet: any) {
  _walletRef = wallet;
}

export async function getEmbeddedProviderAndSigner() {
  if (!_walletRef) {
    throw new Error("No embedded wallet available. Please connect your wallet first.");
  }

  const { SOMNIA_CHAIN_ID } = await import("@/lib/config");

  try {
    await _walletRef.switchChain(SOMNIA_CHAIN_ID);
  } catch {
    // already on chain
  }

  const eip1193Provider = await _walletRef.getEthereumProvider();
  const { BrowserProvider } = await import("ethers");
  const provider = new BrowserProvider(eip1193Provider);
  const signer = await provider.getSigner();

  return { provider, signer, address: _walletRef.address as string };
}
