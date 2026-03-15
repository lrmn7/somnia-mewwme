import { Manager } from "../../manager.js";
import axios from "axios";
import cron from "node-cron";
import { TextChannel, EmbedBuilder, AttachmentBuilder } from "discord.js";
export class CatAndQuotes {
  client: Manager;

  constructor(client: Manager) {
    this.client = client;
    this.execute();
  }

  async execute() {
    try {
      const getRandomCatAttachmentBuilder = async () => {
        try {
          const response = await axios.get("https://api.thecatapi.com/v1/images/search");
          const catImageUrl = response.data[0].url;
          const attachment = new AttachmentBuilder(catImageUrl, {
            name: "mews.png",
          });
          return attachment;
        } catch (error) {
          this.client.logger.warn(CatAndQuotes.name, "Error fetching cat image");
          return null;
        }
      };

      const getQuoteFromAPI = async () => {
        try {
          const response = await axios.get("https://api.api-ninjas.com/v1/quotes", {
            headers: {
              "X-Api-Key": this.client.config.utilities.CatAndQuotes.ApiKey,
            },
          });

          if (response.data && response.data.length > 0) {
            return response.data[0];
          } else {
            throw new Error("Quote not found");
          }
        } catch (error) {
          this.client.logger.error(CatAndQuotes.name, "Request quotes failed");
          return null;
        }
      };

      const executeRandomCatAndQuote = async () => {
        const catChannel = await this.client.channels.fetch(
          this.client.config.utilities.CatAndQuotes.CatChannelId
        );
        const quoteChannel = await this.client.channels.fetch(
          this.client.config.utilities.CatAndQuotes.QuoteChannelId
        );

        if (!catChannel || !quoteChannel) {
          this.client.logger.error(CatAndQuotes.name, "One or both of the channels not found");
          return;
        }

        try {
          const attachment = await getRandomCatAttachmentBuilder();
          const quoteInfo = await getQuoteFromAPI();

          // Kirim gambar kucing jika tersedia
          if (attachment) {
            const catEmbed = new EmbedBuilder()
              .setColor(this.client.color_main)
              .setDescription("Here's a cute cat for you!")
              .setImage(`attachment://${attachment.name}`)
              .setFooter({
                text: "Cute and Cuddly: Meow Your Way to Happiness",
              });

            await (catChannel as TextChannel).send({
              embeds: [catEmbed],
              files: [attachment],
            });
          }

          // Kirim kutipan jika tersedia
          if (quoteInfo) {
            const { quote, author, category } = quoteInfo;

            const quoteEmbed = new EmbedBuilder()
              .setTitle("Quote Off The Wall")
              .setColor(this.client.color_main)
              .setDescription(`❝**${quote} • By ${author}**❞`)
              .setFooter({ text: `Category: ${category.toUpperCase()}` });

            await (quoteChannel as TextChannel).send({ embeds: [quoteEmbed] });
          }
        } catch (error) {
          this.client.logger.error(CatAndQuotes.name, "Failed sending cat or quote message");
        }
      };

      cron.schedule(
        "0 0 12,0 * * *",
        async () => {
          await executeRandomCatAndQuote();
        },
        {
          timezone: "Asia/Jakarta",
        }
      );
    } catch (error) {
      this.client.logger.warn(CatAndQuotes.name, "Error executing random events:");
    }
  }
}
