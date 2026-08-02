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
  inputGuardrail = "";
  outputGuardrail = "";

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

  inputGuardrails(guardrails) {
    this.inputGuardrail = String(guardrails ?? "").trim();
    return this;
  }

  outPutGuardrails(guardrails) {
    this.outputGuardrail = String(guardrails ?? "").trim();
    return this;
  }

  getGuardrailInstructions() {
    if (!this.inputGuardrail && !this.outputGuardrail) {
      return "";
    }

    return `

Agent guardrails (these rules are mandatory):
${this.inputGuardrail ? `Input guardrails: ${this.inputGuardrail}` : ""}
${this.outputGuardrail ? `Output guardrails: ${this.outputGuardrail}` : ""}

Apply input guardrails when interpreting every user-provided value. Apply output
guardrails to your final response. If a request violates a guardrail, do not
fulfil the unsafe part; give a short, safe explanation instead.
`;
  }


  shouldStream(options = {}) {
    return options?.stream === true;
  }

  createTextCompletion(request, options = {}) {
    if (this.shouldStream(options)) {
      return this.streamTextCompletion(request);
    }

    return this.client.chat.completions
      .create({ ...request, stream: false })
      .then((completion) => completion.choices[0]?.message?.content ?? "");
  }

  async *streamTextCompletion(request) {
    const stream = await this.client.chat.completions.create({
      ...request,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices?.[0]?.delta?.content;
      if (content) {
        yield content;
      }
    }
  }

  liveDataQueryRun(query, tavilyKey, options = {}) {
    if (this.shouldStream(options)) {
      return this.liveDataQueryRunStream(query, tavilyKey);
    }

    return this.liveDataQueryRunResponse(query, tavilyKey);
  }

  async liveDataQueryRunResponse(query, tavilyKey) {
    const webSearchResult = await webSearch(query, tavilyKey);
    return this.createTextCompletion({
      model: this.model,
      messages: [
        {
          role: "system",
          content: ` ${liveDataPrompt} and ${webSearchResult}
                    ${this.getGuardrailInstructions()}
                    `,
        },
        {
          role: "user",
          content: query,
        },
      ],
    });
  }

  async *liveDataQueryRunStream(query, tavilyKey) {
    const webSearchResult = await webSearch(query, tavilyKey);

    yield* this.createTextCompletion(
      {
        model: this.model,
        messages: [
          {
            role: "system",
            content: ` ${liveDataPrompt} and ${webSearchResult}
                    ${this.getGuardrailInstructions()}
                    `,
          },
          {
            role: "user",
            content: query,
          },
        ],
      },
      { stream: true },
    );
  }

  setLoop(loop) {
    this.loop = loop;
    return this;
  }

  runLoop(query, options = {}) {
    if (this.shouldStream(options)) {
      return this.runLoopStream(query);
    }

    return this.runLoopResponse(query);
  }

  async runLoopResponse(query) {
    const loop = this.loop;

    if (!loop) {
      return {
        message:
          "Please mention the loop number. Pass the loop number through .loop(number)",
      };
    }

    const msg_db = [];

    msg_db.push({
      role: "system",
      content: `${LoopingPrompt} loop number given by user:- ${loop}
      ${this.getGuardrailInstructions()}`,
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
        stream: false,
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

      i += 1;
    }
  }

  async *runLoopStream(query) {
    const loop = this.loop;

    if (!loop) {
      yield JSON.stringify({
        message:
          "Please mention the loop number. Pass the loop number through .loop(number)",
      });
      return;
    }

    const msg_db = [
      {
        role: "system",
        content: `${LoopingPrompt} loop number given by user:- ${loop}
      ${this.getGuardrailInstructions()}`,
      },
      { role: "user", content: query },
    ];

    for (let i = 0; i < loop; i += 1) {
      let rawresult = "";
      for await (const chunk of this.createTextCompletion(
        {
          model: this.model,
          messages: msg_db,
          response_format: { type: "json_object" },
        },
        { stream: true },
      )) {
        rawresult += chunk;
        yield chunk;
      }

      const parsedResult = JSON.parse(rawresult);
      msg_db.push({ role: "assistant", content: rawresult });
      if (parsedResult.step === "Output") return;
    }
  }

  webScrap(websiteURL, options = {}) {
    if (this.shouldStream(options)) {
      return this.webScrapStream(websiteURL);
    }

    return this.webScrapResponse(websiteURL);
  }

  async webScrapResponse(websiteURL) {
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

      return this.createTextCompletion({
        model: this.model,
        messages: [
          {
            role: "system",
            content: `${websitePrompt}\n${this.getGuardrailInstructions()}`,
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
    } catch (error) {
      console.error("Website Scraper Error:", error);
      return `Website scraping failed: ${error.message}`;
    }
  }

  async *webScrapStream(websiteURL) {
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
      const dom = new JSDOM(html, { url: websiteURL });
      const article = new Readability(dom.window.document).parse();

      if (!article) {
        yield "Unable to extract readable content from this website.";
        return;
      }

      yield* this.createTextCompletion(
        {
          model: this.model,
          messages: [
            {
              role: "system",
              content: `${websitePrompt}\n${this.getGuardrailInstructions()}`,
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
        },
        { stream: true },
      );
    } catch (error) {
      console.error("Website Scraper Error:", error);
      yield `Website scraping failed: ${error.message}`;
    }
  }


  sendEmail(to, topic, context = "", options = {}) {
    if (this.shouldStream(options)) {
      return this.sendEmailStream(to, topic, context, options);
    }

    return this.sendEmailResponse(to, topic, context, options);
  }

  getEmailSettings(options) {
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

    return { smtp, from };
  }

  async deliverEmailDraft(email, to, options, smtp, from) {
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

  async sendEmailResponse(to, topic, context = "", options = {}) {
    if (typeof to !== "string" || !to.trim()) {
      throw new Error("A recipient email address is required.");
    }

    if (typeof topic !== "string" || !topic.trim()) {
      throw new Error("An email topic is required.");
    }

    const { smtp, from } = this.getEmailSettings(options);

    const emailDraft = await this.client.chat.completions.create({
      model: this.model,
      stream: false,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `${mailWritingPrompt}\n${this.getGuardrailInstructions()}`,
        },
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

    return this.deliverEmailDraft(email, to, options, smtp, from);
  }

  async *sendEmailStream(to, topic, context = "", options = {}) {
    if (typeof to !== "string" || !to.trim()) {
      throw new Error("A recipient email address is required.");
    }
    if (typeof topic !== "string" || !topic.trim()) {
      throw new Error("An email topic is required.");
    }

    const { smtp, from } = this.getEmailSettings(options);
    let rawDraft = "";
    yield* this.collectStream(
      this.createTextCompletion(
        {
          model: this.model,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content: `${mailWritingPrompt}\n${this.getGuardrailInstructions()}`,
            },
            {
              role: "user",
              content: `Topic: ${topic}\n\nAdditional context: ${context || "None"}`,
            },
          ],
        },
        { stream: true },
      ),
      (chunk) => {
        rawDraft += chunk;
      },
    );

    let email;
    try {
      email = JSON.parse(rawDraft);
    } catch {
      throw new Error("The model returned an invalid email draft. Please try again.");
    }

    // This last item lets streaming callers know whether the email was sent.
    yield JSON.stringify(await this.deliverEmailDraft(email, to, options, smtp, from));
  }

  async *collectStream(stream, onChunk) {
    for await (const chunk of stream) {
      onChunk(chunk);
      yield chunk;
    }
  }

  addTools(...tools) {
    this.tools.push(...tools);
    return this;
  }

  useTool(query, options = {}) {
    if (this.shouldStream(options)) {
      return this.useToolStream(query);
    }

    return this.useToolResponse(query);
  }

  async getToolResult(query) {
    const availableTools = this.tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      method: tool.execute
    }));

    const toolAnalysis = await this.client.chat.completions.create({
      model: this.model,
      stream: false,
      messages: [
        {
          role: "system",
          content: `
          ${toolAnalyse}
          avaiable tools : ${JSON.stringify(availableTools, null, 2)}
          ${this.getGuardrailInstructions()}
          `,
        },
        {
          role: "user",
          content: query,
        },
      ],
    });

    const analysis = toolAnalysis.choices[0].message.content;
    const parsedAnalysis = JSON.parse(analysis);
    const identifiedTool = parsedAnalysis.toolName;
    if (!identifiedTool) {
      return { directResponse: analysis };
    }

    let response = "";
    for (const tool of availableTools) {
      if (tool.name === identifiedTool) {
        response = await tool.method(parsedAnalysis.args);
      }
    }

    return { response };
  }

  toolResultRequest(query, response) {
    return {
      model: this.model,
      messages: [
        {
          role: "system",
          content: `
            ${toolOutputAnalysis}
            response :- ${JSON.stringify(response)}
            user query :- ${query}
            ${this.getGuardrailInstructions()}
          `,
        },
      ],
    };
  }

  async useToolResponse(query) {
    const result = await this.getToolResult(query);
    if (result.directResponse !== undefined) return result.directResponse;

    const finalResult = await this.client.chat.completions.create({
      ...this.toolResultRequest(query, result.response),
      stream: false,
    });

    return JSON.parse(finalResult.choices[0].message.content);
  }

  async *useToolStream(query) {
    const result = await this.getToolResult(query);
    if (result.directResponse !== undefined) {
      yield result.directResponse;
      return;
    }

    yield* this.createTextCompletion(
      this.toolResultRequest(query, result.response),
      { stream: true },
    );
  }

  run(options = {}) {
    return this.createTextCompletion({
      model: this.model,
      messages: [
        {
          role: "system",
          content: `${normalPrompt}\n${this.getGuardrailInstructions()}`,
        },
        {
          role: "user",
          content: this.instructions,
        },
      ],
    }, options);
  }
}
