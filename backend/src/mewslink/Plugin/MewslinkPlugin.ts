import { MewslinkPluginType } from "../Interface/Constants.js";
import { Mewslink } from "../Mewslink.js";

/** The interface class for another mewslink plugin, extend it to use */
export class MewslinkPlugin {
  /** Name function for getting plugin name */
  public name(): string {
    throw new Error("Plugin must implement name() and return a plguin name string");
  }

  /** Type function for diferent type of plugin */
  public type(): MewslinkPluginType {
    throw new Error('Plugin must implement type() and return "sourceResolver" or "default"');
  }

  /** Load function for make the plugin working */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public load(manager: Mewslink): void {
    throw new Error("Plugin must implement load()");
  }

  /** unload function for make the plugin stop working */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public unload(manager: Mewslink): void {
    throw new Error("Plugin must implement unload()");
  }
}
