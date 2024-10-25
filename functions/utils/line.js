const axios = require("axios");

const LINE_HEADER = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${process.env.CHANNEL_ACCESS_TOKEN}`
};

// Function to get image binary data from LINE API
const getImageBinary = async (messageId) => {
  const originalImage = await axios({
    method: "get",
    headers: LINE_HEADER,
    url: `https://api-data.line.me/v2/bot/message/${messageId}/content`,
    responseType: "arraybuffer"
  });
  return originalImage.data;
};

// New function to get video binary data from LINE API
const getVideoBinary = async (messageId) => {
  const videoData = await axios({
    method: "get",
    headers: LINE_HEADER,
    url: `https://api-data.line.me/v2/bot/message/${messageId}/content`,
    responseType: "arraybuffer"
  });
  return videoData.data;
};

// New function to get file binary data from LINE API
const getFileBinary = async (messageId) => {
  const fileData = await axios({
    method: "get",
    headers: LINE_HEADER,
    url: `https://api-data.line.me/v2/bot/message/${messageId}/content`,
    responseType: "arraybuffer"
  });
  return fileData.data;
};

// Function to reply to a message with a payload
const reply = (token, payload) => {
  return axios({
    method: "post",
    url: "https://api.line.me/v2/bot/message/reply",
    headers: LINE_HEADER,
    data: { replyToken: token, messages: payload }
  });
};

module.exports = { getImageBinary, getVideoBinary, getFileBinary, reply };
