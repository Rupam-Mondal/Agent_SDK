import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenAI } from "@google/genai";
import { handOffagentPrompt } from "./config/Harnes.js";

export class OpenAIHandOff{
    model = ""
    client = null
    apiKey = ""
    systemInstructions = ""

    constructor(apiKey , model , systemInstructions){
        this.apiKey = apiKey
        this.model = model
        this.systemInstructions = systemInstructions
        this.client = new OpenAI({
            apiKey: this.apiKey,
        });
    }

    async run(query){
        const response = await this.client.chat.completions.create({
            model:this.model,
            messages :[
                {
                    role:"system",
                    content:`
                    ${handOffagentPrompt}
                    user instruction :- 
                    ${this.systemInstructions}`
                },
                {
                   role:"user",
                   content:query 
                }
            ]
        })

        return response.choices[0].message.content;
    }
}

export class ClaudeHandOff {
    model = "";
    client = null;
    apiKey = "";
    systemInstructions = "";

    constructor(apiKey, model, systemInstructions) {
        this.apiKey = apiKey;
        this.model = model;
        this.systemInstructions = systemInstructions;

        this.client = new Anthropic({
            apiKey: this.apiKey,
        });
    }

    async run(query) {
        const response = await this.client.messages.create({
            model: this.model,
            system: `${handOffagentPrompt} . user instruction :- ${this.systemInstructions}`,
            max_tokens: 4096,
            messages: [
                {
                    role: "user",
                    content: query,
                },
            ],
        });

        return response.content[0].text;
    }
}

export class GeminiHandOff {
    model = "";
    client = null;
    apiKey = "";
    systemInstructions = "";

    constructor(apiKey, model, systemInstructions) {
        this.apiKey = apiKey;
        this.model = model;
        this.systemInstructions = systemInstructions;

        this.client = new GoogleGenAI({
            apiKey: this.apiKey,
        });
    }

    async run(query) {
        const response = await this.client.models.generateContent({
            model: this.model,
            contents: `${handOffagentPrompt}
                    user instruction :- 
                    ${this.systemInstructions} \n\nUser Query:\n${query}`,
        });

        return response.text;
    }
}

