import OpenAI from "openai";
import dotenv from "dotenv";
import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";
import {
  liveDataPrompt,
  LoopingPrompt,
  normalPrompt,
  toolAnalyse,
  websitePrompt,
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

    const identifiedTool = toolAnalysis.choices[0].message.content.toolName;
    if(!identifiedTool) return toolAnalysis.choices[0].message.content;

    console.log(toolAnalysis.choices[0].message.content)

    // for(let i = 0 ; i < availableTools.length ; i++){
    //   if(availableTools[i].name === identifiedTool){
    //     availableTools
    //   }
    // }
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
