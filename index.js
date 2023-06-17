const riotAPIKey = "";
const nightbotAccessToken = "";
const summonerName = "";
const region = "na1";
const nightbotClientID = "";

const nightbotEndpoint = `https://api.nightbot.tv/1/channel/send`;
const nightbotRedirectURI = "https://google.com";
const nightbotRedirectURLtoURI = encodeURIComponent(nightbotRedirectURI);
const scope = "channel_send";

const nightbotAuthURL = `https://api.nightbot.tv/oauth2/authorize?client_id=${nightbotClientID}&redirect_uri=${nightbotRedirectURLtoURI}&response_type=code&scope=${scope}`;

async function getSummonerId() {
  try {
    const response = await fetch(
      `https://${region}.api.riotgames.com/lol/summoner/v4/summoners/by-name/${summonerName}`,
      {
        headers: {
          "X-Riot-Token": riotAPIKey,
        },
      }
    );
    const data = await response.json();
    const summonerId = data.id;
    return summonerId;
  } catch (error) {
    console.error(`Error getting summoner ID: ${error}`);
    return null;
  }
}

async function checkGameStatus() {
  try {
    const summonerId = await getSummonerId();
    const riotEndpoint = `https://${region}.api.riotgames.com/lol/spectator/v4/active-games/by-summoner/${summonerId}?api_key=${riotAPIKey}`;
    const response = await fetch(riotEndpoint);
    const inGame = await getInGameStatus();
    if (response.status === 200 && !inGame) {
      await saveInGameStatus(true);
      console.log(`${summonerName} is in a game!`);
    } else if (response.status === 404 && inGame) {
      await saveInGameStatus(false);
      console.log(`${summonerName} is no longer in a game.`);
      await sendNightbotMessage();
    }
  } catch (error) {
    console.error(`Error checking game status: ${error}`);
  }
}

async function sendNightbotMessage() {
  try {
    const options = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${nightbotAccessToken}`,
      },
      body: '{"message":"!commercial 180"}',
    };
    const response = await fetch(nightbotEndpoint, options);
    const result = await response.json();
    const stringified = JSON.stringify(result);
    console.log(`Nightbot response: ${stringified}`);
  } catch (error) {
    console.error(`Error sending Nightbot message: ${error}`);
  }
}

async function getInGameStatus() {
  try {
    const inGame = await DATA.get("inGame");
    return inGame === "true";
  } catch (error) {
    console.error(`Error getting in-game status from KV store: ${error}`);
    return false;
  }
}

async function saveInGameStatus(inGame) {
  try {
    await DATA.put("inGame", inGame.toString());
    console.log(`Saved in-game status: ${inGame}`);
  } catch (error) {
    console.error(`Error saving in-game status to KV store: ${error}`);
  }
}

addEventListener("fetch", (event) => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  await checkGameStatus(); // Run the function immediately when the worker starts
  return new Response("The worker is running.", { status: 200 });
}

// Define the cron trigger to run the checkGameStatus function every two minutes
addEventListener("scheduled", (event) => {
  event.waitUntil(checkGameStatus());
});
