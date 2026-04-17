export interface WalletBinding {
  walletAddress: string;
  nonce: string;
  signature: string;
  createdAt: number;
  walletBoundAt: number;
  walletChangeAvailableAt: number;
}
