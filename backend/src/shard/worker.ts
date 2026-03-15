import { Manager } from "../manager.js";
import { ConfigDataService } from "../services/ConfigDataService.js";

const configData = new ConfigDataService().data;
const client = new Manager(configData, configData.features.MESSAGE_CONTENT.enable);

(async () => {
  await client.login(configData.bot.TOKEN);
})();
