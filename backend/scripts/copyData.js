import fse from "fs-extra";

const { copySync } = fse;

const srcLangDir = "./src/languages/";
const destLangDir = "./dist/languages/";

try {
  // Copy language package from "src" directory
  copySync(srcLangDir, destLangDir, { overwrite: true });
  console.log('Copied language package from "src" directory successfully!');
} catch (err) {
  console.error(err);
}
