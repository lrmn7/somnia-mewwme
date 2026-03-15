import axios from "axios";

const ACCESS_TOKEN = " "; 

if (!ACCESS_TOKEN) {
  console.log("❌ access token is missing!");
  console.log("please fill in your creator access token inside the ACCESS_TOKEN variable.");
  console.log("example: const ACCESS_TOKEN = \"your_token_here\";");
  process.exit(1);
}

async function getMyCampaign() {
  try {
    console.log("connecting to patreon...");
    const response = await axios.get("https://www.patreon.com/api/oauth2/v2/campaigns", {
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
      },
    });

    const data = response.data.data;

    if (data.length === 0) {
      console.log("❌ this token is valid, but this account does not have any patreon campaign/page.");
      console.log("solution: you may have used the wrong account when creating the app in the developer portal.");
      console.log("make sure you are logged in with the creator account that owns the patreon page.");
    } else {
      console.log("✅ success! campaign(s) found:");
      data.forEach((campaign) => {
        console.log("-------------------------------------------");
        console.log("📛 campaign name: (check it on the website)");
        console.log(`🆔 correct campaign id: ${campaign.id}`); // <--- this is what you need
        console.log("-------------------------------------------");
        console.log(`use campaign id ${campaign.id} in your config.yml file!`);
      });
    }
  } catch (error) {
    console.error("❌ error:", error.response ? error.response.data : error.message);
  }
}

getMyCampaign();
