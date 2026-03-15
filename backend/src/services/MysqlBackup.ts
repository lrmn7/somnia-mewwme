import { Manager } from "../manager.js";
import mysqldumpModule from "mysqldump";
import cron from "node-cron";

const mysqldump = mysqldumpModule.default;

export default class MysqlBackupService {
  async execute(client: Manager) {
    cron.schedule(
      client.config.features.DATABASE.MYSQLBACKUP.Schedule,
      async () => {
        if (!client.config.features.DATABASE.MYSQLBACKUP.ChannelId) return;

        const { host, port, user, password, database } = client.config.features.DATABASE.config;
        const formatDate = (date) => {
          const day = String(date.getDate()).padStart(2, "0");
          const month = String(date.getMonth() + 1).padStart(2, "0");
          const year = date.getFullYear();
          return `${day}-${month}-${year}`;
        };

        const timestamp = formatDate(new Date());
        const backupFileName = `${database}-${timestamp}.sql`;

        const dump = await mysqldump({
          connection: {
            host,
            port,
            user,
            password,
            database,
          },
        });

        if (!dump || !dump.dump) {
          client.logger.warn(
            MysqlBackupService.name,
            "Dump is empty or invalid, backup will not be sent."
          );
          return;
        }

        const channel = await client.channels
          .fetch(client.config.features.DATABASE.MYSQLBACKUP.ChannelId)
          .catch(() => undefined);

        if (channel && channel.isTextBased()) {
          await channel.send({
            content: `Here is the latest backup for the database \`${database}\` at \`${timestamp}\`:`,
            files: [
              {
                attachment: Buffer.from(dump.dump.schema + dump.dump.data),
                name: backupFileName,
              },
            ],
          });
          client.logger.info(
            MysqlBackupService.name,
            `Backup file ${backupFileName} has been sent to the Discord channel.`
          );
        } else {
          client.logger.warn(
            MysqlBackupService.name,
            "Invalid channel ID or the channel is not a text channel."
          );
        }
      },
      {
        timezone: client.config.features.DATABASE.MYSQLBACKUP.Timezone,
      }
    );
  }
}
