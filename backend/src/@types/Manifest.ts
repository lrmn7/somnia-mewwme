export interface ManifestInterface {
  metadata: {
    bot: {
      version: string;
      codename: string;
      description: string;
      email: string;
      website: string;
    };
    autofix: {
      version: string;
      codename: string;
    };
  };
  package: {
    discordjs: string;
    devAmount: number;
    globalAmount: number;
    totalAmount: number;
    typescript: string;
  };
}
