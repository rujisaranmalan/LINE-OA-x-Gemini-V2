const { onRequest } = require("firebase-functions/v2/https");
const line = require("./utils/line");
const gemini = require("./utils/gemini");

exports.webhook = onRequest(async (req, res) => {
  if (req.method === "POST") {
    const events = req.body.events;
    for (const event of events) {
      switch (event.type) {
        case "message":
          // Handle text messages
          if (event.message.type === "text") {
            const userMessage = event.message.text.trim();
    
            // If the message starts with a link (to process files)
            if (userMessage.startsWith("http://") || userMessage.startsWith("https://")) {
              const fileUrls = userMessage.split(',').map(url => url.trim());
              const response = await gemini.chatWithFileLinks(fileUrls, "Analyze these files.");
              await line.reply(event.replyToken, [{ type: "text", text: response }]);
            } else {
              // For follow-up questions
              try {
                const response = await gemini.followUpChat(userMessage);
                await line.reply(event.replyToken, [{ type: "text", text: response }]);
              } catch (error) {
                await line.reply(event.replyToken, [{ type: "text", text: error.message }]);
              }
            }
            return res.end();
          }
          
          // Handle image messages 
          if (event.message.type === "image") {
            const imageBinary = await line.getImageBinary(event.message.id);
            const msg = await gemini.multimodal(imageBinary);
            await line.reply(event.replyToken, [{ type: "text", text: msg }]);
            return res.end();
          }

          //Handle file messages
          if (event.message.type === "file") {
            const fileBinary = await line.getFileBinary(event.message.id);
            const msg = await gemini.chatFile(fileBinary);
            await line.reply(event.replyToken, [{ type: "text", text: msg }]);
            return res.end();
          }

        break;
      }
    }
  }
  res.send(req.method);
});


