const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI(process.env.API_KEY);
const axios = require("axios");
const pdfParse = require('pdf-parse');

const textOnly = async (prompt) => {
  // For text-only input, use the gemini-pro model
  const model = genAI.getGenerativeModel({ model: "gemini-pro" });
  const result = await model.generateContent(prompt);
  return result.response.text();
};

const multimodal = async (imageBinary) => {
  // For text-and-image input (multimodal), use the gemini-pro-vision model
  const model = genAI.getGenerativeModel({ model: "gemini-pro-vision" });
  const prompt = "ช่วยบรรยายภาพนี้ให้หน่อย";
  const mimeType = "image/png";

  // Convert image binary to a GoogleGenerativeAI.Part object.
  const imageParts = [
    {
      inlineData: {
        data: Buffer.from(imageBinary, "binary").toString("base64"),
        mimeType
      }
    }
  ];

  const result = await model.generateContent([prompt, ...imageParts]);
  const text = result.response.text();
  return text;
};

const chat = async (prompt) => {
  const response = await axios.get("https://drive.google.com/uc?export=download&id=16gtmf-tOOHj9EHqW7EB0SIXAIN7bI5vN");
  let information = await response.data;
  information = JSON.stringify(information);

  // For text-only input, use the gemini-pro model
  const model = genAI.getGenerativeModel({ model: "gemini-pro" });
  const chat = model.startChat({
    history: [
      {
        role: "user",
        parts: [{ text: "สวัสดีจ้า" }],
      },
      {
        role: "model",
        parts: 
            [{ text: "Answer the question using the text below. Respond with only the text provided.\nQuestion: " +
            prompt +
            "\nText: " +
            information, }]
      },
    ]
  });

  const result = await chat.sendMessage(prompt);
  return result.response.text();
};

const fetchAndProcessFile = async (fileUrl) => {
  try {
    // Convert Google Drive "view" links to download links
    if (fileUrl.includes('drive.google.com/file/d/')) {
      const fileId = fileUrl.split('/d/')[1].split('/')[0];  // Extract file ID
      fileUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
      console.log(`Converted Google Drive link to: ${fileUrl}`);
    }

    // Fetch file from the provided URL
    const response = await axios({
      method: 'get',
      url: fileUrl,
      responseType: 'arraybuffer'  // Get the file as binary data
    });

    if (response.status !== 200) {
      console.error(`Failed to fetch file from URL: ${fileUrl} - Status: ${response.status}`);
      throw new Error(`Failed to fetch file - HTTP Status: ${response.status}`);
    }

    const fileBinary = response.data;

    // Process the file if it's a PDF
    const data = await pdfParse(fileBinary);
    const jsonData = {
      content: data.text,
      numPages: data.numpages,
      info: data.info,
    };

    return jsonData;
  } catch (error) {
    console.error("Error fetching or processing the file:", error.message || error);
    throw new Error("Failed to fetch or process the file.");
  }
};

let storedFileData = null;

const chatWithFileLinks = async (fileUrls, prompt) => {
  try {
    // Step 1: Fetch and process each file from the URLs
    const processedFiles = await Promise.all(fileUrls.map(async (fileUrl) => {
      return await fetchAndProcessFile(fileUrl);
    }));

    // Step 2: Combine the processed file data into a single JSON object
    const combinedData = {
      files: processedFiles,
    };

    // Store the file content for follow-up questions
    storedFileData = combinedData;

    // Convert the combined data to a string for AI input
    const information = JSON.stringify(combinedData, null, 2);

    // Step 3: Use the extracted data in the chat AI model
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const chat = model.startChat({
      history: [
        {
          role: "user",
          parts: [{ text: "Hello, please analyze the following files." }],
        },
        {
          role: "model",
          parts: [
            {
              text:
                "Answer the question using the content of the files below.\nQuestion: " +
                prompt +
                "\nFile Data: " +
                information,
            },
          ],
        },
      ],
    });

    // Step 4: Send the prompt to the AI and return the response
    const result = await chat.sendMessage(prompt);
    return result.response.text();
  } catch (error) {
    console.error("Error in chatWithFileLinks:", error);
    throw new Error("Failed to process the file links.");
  }
};

const followUpChat = async (prompt) => {
  if (!storedFileData) {
    throw new Error("No file data available. Please send a file first.");
  }

  try {
    // Convert the stored file data back to a string for AI input
    const information = JSON.stringify(storedFileData, null, 2);

    // Use the stored file data for follow-up questions
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const chat = model.startChat({
      history: [
        {
          role: "user",
          parts: [{ text: "Please continue the conversation based on the previous file." }],
        },
        {
          role: "model",
          parts: [
            {
              text:
                "Answer the follow-up question using the content of the previous files.\nQuestion: " +
                prompt +
                "\nPrevious File Data: " +
                information,
            },
          ],
        },
      ],
    });

    // Send the follow-up question to the AI and return the response
    const result = await chat.sendMessage(prompt);
    return result.response.text();
  } catch (error) {
    console.error("Error in followUpChat:", error);
    throw new Error("Failed to process the follow-up question.");
  }
};



module.exports = { textOnly, multimodal, chat, chatWithFileLinks, followUpChat };