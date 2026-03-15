import { metadata } from "./metadata.js";
import Library from "./Library/index.js";
import Plugin from "./Plugin/index.js";

// Export main class
export * from "./Mewslink.js";
// Export player class
export * from "./Player/MewslinkPlayer.js";
export * from "./Player/MewslinkQueue.js";
export * from "./Player/MewslinkTrack.js";
// Export node class
export * from "./Node/MewslinkNode.js";
export * from "./Node/MewslinkRest.js";
export * from "./Node/MewslinkPlayerEvents.js";
// Export manager class
export * from "./Manager/MewslinkNodeManager.js";
export * from "./Manager/MewslinkPlayerManager.js";
//// Export library class
export * from "./Library/AbstractLibrary.js";
export { Library };
//Export interface
export * from "./Interface/Connection.js";
export * from "./Interface/Constants.js";
export * from "./Interface/Manager.js";
export * from "./Interface/Node.js";
export * from "./Interface/Player.js";
export * from "./Interface/Rest.js";
export * from "./Interface/Track.js";
// Export plugin
export * from "./Plugin/MewslinkPlugin.js";
export * from "./Plugin/SourceMewslinkPlugin.js";
export { Plugin };
// Export driver
export * from "./Drivers/AbstractDriver.js";
export * from "./Drivers/Lavalink3.js";
export * from "./Drivers/Lavalink4.js";
export * from "./Drivers/Nodelink2.js";
// Export utilities
export * from "./Utilities/MewslinkDatabase.js";
export * from "./Utilities/MewslinkWebsocket.js";
// Export metadata
export * from "./metadata.js";
export const version = metadata.version;
