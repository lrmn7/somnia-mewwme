import fs from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { ManifestInterface } from "../@types/Manifest.js";
const __dirname = dirname(fileURLToPath(import.meta.url));

export class ManifestService {
  get data(): ManifestInterface {
    const data = fs.readFileSync(join(__dirname, "..", "..", "package.json"), "utf-8");
    const jsonData = JSON.parse(data);
    const countPackage = Object.keys(jsonData.dependencies).length;
    const countDevPackage = Object.keys(jsonData.devDependencies).length;
    const result: ManifestInterface = {
      metadata: {
        bot: {
          version: jsonData.version,
          codename: jsonData.mewwme.codename,
          description: jsonData.description,
          email: jsonData.mewwme.email,
          website: jsonData.mewwme.website,
        },
        autofix: {
          version: jsonData.mewwme.autofix.version,
          codename: jsonData.mewwme.autofix.codename,
        },
      },
      package: {
        discordjs: jsonData.dependencies["discord.js"].substring(1),
        typescript: jsonData.devDependencies["typescript"].substring(1),
        globalAmount: countPackage,
        devAmount: countDevPackage,
        totalAmount: countDevPackage + countPackage,
      },
    };
    return result;
  }
}
