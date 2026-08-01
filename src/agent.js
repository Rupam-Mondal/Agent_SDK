import OpenAI from "openai";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";
import {
  liveDataPrompt,
  LoopingPrompt,
  normalPrompt,
  toolAnalyse,
  toolOutputAnalysis,
  websitePrompt,
  mailWritingPrompt,
} from "./config/Harnes.js";
import { webSearch } from "./config/tavily.js";

dotenv.config();

export class Agent {
  client = null;
  model = "";
  instructions = "";
  loop = "";
  apiKey = "";
  tools = [];

  constructor(model, apiKey) {
    this.model = model;
    this.apiKey = apiKey;
    this.client = new OpenAI({
      apiKey: this.apiKey,
    });
  }

  setInstructions(instructions) {
    this.instructions = instructions;
    return this;
  }

  async liveDataQueryRun(query, tavilyKey) {
    const webSearchResult = await webSearch(query, tavilyKey);
    const interaction = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: "system",
          content: ` ${liveDataPrompt} and ${webSearchResult}
                    `,
        },
        {
          role: "user",
          content: query,
        },
      ],
    });

    const response = interaction.choices[0].message.content;

    return response;
  }

  setLoop(loop) {
    this.loop = loop;
    return this;
  }

  async runLoop(query) {
    const loop = this.loop;

    if (!loop) {
      return {
        message:
          "Please mention the loop number. Pass the loop number through .loop(number)",
      };
    }

    const msg_db = [];

    msg_db.push({
      role: "user",
      content: `${LoopingPrompt} loop number given by user:- ${loop}`,
    });
    msg_db.push({
      role: "user",
      content: query,
    });

    let i = 0;
    while (i < loop) {
      const interaction = await this.client.chat.completions.create({
        model: this.model,
        messages: msg_db,
        response_format: {
          type: "json_object",
        },
      });

      const rawresult = interaction.choices[0].message.content;
      const parsedResult = JSON.parse(rawresult);

      msg_db.push({
        role: "assistant",
        content: rawresult,
      });

      console.log(`${parsedResult.step} : ${parsedResult.text}`);

      const step = parsedResult.step;
      const text = parsedResult.text;

      if (parsedResult.step == "Output") {
        return {
          step,
          text,
        };
      }
    }
  }

  async webScrap(websiteURL) {
    try {
      new URL(websiteURL);

      const response = await fetch(websiteURL, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AgentSDK/1.0",
        },
      });

      if (!response.ok) {
        throw new Error(
          `Failed to fetch website (${response.status} ${response.statusText})`,
        );
      }

      const html = await response.text();

      const dom = new JSDOM(html, {
        url: websiteURL,
      });

      const article = new Readability(dom.window.document).parse();

      if (!article) {
        return "Unable to extract readable content from this website.";
      }

      const interaction = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: "system",
            content: websitePrompt,
          },
          {
            role: "user",
            content: `
Website URL:
${websiteURL}

Website Title:
${article.title}

Website Description:
${article.excerpt ?? "No description"}

Website Content:
${article.textContent.slice(0, 120000)}
                    `.trim(),
          },
        ],
      });

      return interaction.choices[0].message.content;
    } catch (error) {
      console.error("Website Scraper Error:", error);
      return `Website scraping failed: ${error.message}`;
    }
  }


  async sendEmail(to, topic, context = "", options = {}) {
    if (typeof to !== "string" || !to.trim()) {
      throw new Error("A recipient email address is required.");
    }

    if (typeof topic !== "string" || !topic.trim()) {
      throw new Error("An email topic is required.");
    }

    const smtp = options.smtp ?? {
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    };
    const from = options.from ?? process.env.MAIL_FROM ?? process.env.SMTP_USER;

    if (!from) {
      throw new Error(
        "Email sender is not configured. Set MAIL_FROM or SMTP_USER in your environment.",
      );
    }

    const emailDraft = await this.client.chat.completions.create({
      model: this.model,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: mailWritingPrompt },
        {
          role: "user",
          content: `Topic: ${topic}\n\nAdditional context: ${context || "None"}`,
        },
      ],
    });

    let email;
    try {
      email = JSON.parse(emailDraft.choices[0].message.content);
    } catch {
      throw new Error("The model returned an invalid email draft. Please try again.");
    }

    if (!email.subject || !email.text || !email.html) {
      throw new Error("The model returned an incomplete email draft. Please try again.");
    }

    const attachments = options.attachments ?? options.files ?? [];
    if (!Array.isArray(attachments)) {
      throw new Error("Email attachments must be an array.");
    }

    const draft = {
      to: to.trim(),
      from,
      subject: String(email.subject).replace(/[\r\n]+/g, " ").trim(),
      text: String(email.text).trim(),
      html: String(email.html).trim(),
      attachments,
    };

    if (options.preview === true) {
      return { sent: false, preview: true, ...draft };
    }

    if (!smtp.host || !smtp.auth?.user || !smtp.auth?.pass) {
      throw new Error(
        "SMTP is not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS in your environment.",
      );
    }

    const transporter = nodemailer.createTransport(smtp);
    const result = await transporter.sendMail(draft);

    return {
      sent: true,
      messageId: result.messageId,
      accepted: result.accepted,
      rejected: result.rejected,
      subject: draft.subject,
      to: draft.to,
      attachmentCount: attachments.length,
    };
  }

  addTools(...tools) {
    this.tools.push(...tools);
    return this;
  }

  async useTool(query) {
    const availableTools = this.tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      method: tool.execute
    }));

    const toolAnalysis = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: "system",
          content: `
          ${toolAnalyse}
          avaiable tools : ${JSON.stringify(availableTools, null, 2)}
          `,
        },
        {
          role: "user",
          content: query,
        },
      ],
    });

    const identifiedTool = JSON.parse(toolAnalysis.choices[0].message.content).toolName;
    if(!identifiedTool) return toolAnalysis.choices[0].message.content;


    let args = JSON.parse(toolAnalysis.choices[0].message.content).args



    let response = ""

    for(let i = 0 ; i < availableTools.length ; i++){
      if(availableTools[i].name === identifiedTool){
        response = await availableTools[i].method(args)
      }
    }

    const finalResult = await await this.client.chat.completions.create({
      model : this.model,
      messages :[
        {
          role:"system",
          content:`
            ${toolOutputAnalysis}
            response :- ${JSON.stringify(response)}
            user query :- ${query}
          `
        }
      ]
    })

    return JSON.parse(finalResult.choices[0].message.content);
  }

  async run() {
    const interaction = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: "system",
          content: normalPrompt,
        },
        {
          role: "user",
          content: this.instructions,
        },
      ],
    });

    const response = interaction.choices[0].message.content;

    return response;
  }
}
