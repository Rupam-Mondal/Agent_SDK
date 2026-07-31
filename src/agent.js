import OpenAI from 'openai';
import dotenv from 'dotenv';
import { liveDataPrompt, normalPrompt } from './config/Harnes.js';
import { webSearch } from './config/tavily.js';

dotenv.config();

const client = new OpenAI({
  apiKey: process.env.OPEN_AI_API_KEY,
});

export class Agent{
    model = ""
    instructions = ""
    loop = ""

    constructor(model){
        this.model = model;
    }

    setInstructions(instructions){
        this.instructions = instructions;
        return this;
    }

    // use this method for live data fetching

    async liveDataQueryRun(query){
        const webSearchResult = await webSearch(query);
        const interaction = await client.chat.completions.create({
            model:this.model,
            messages : [
                {
                    role:"system",
                    content : ` ${liveDataPrompt} and ${webSearchResult}
                    `
                },
                {
                    role:"user",
                    content:query
                }
            ]
        })

        const response = interaction.choices[0].message.content

        return response;
    }

    async run(){
        const interaction = await client.chat.completions.create({
            model:this.model,
            messages : [
                {
                    role: "system",
                    content:normalPrompt
                },
                {
                    role : "user",
                    content: this.instructions
                }
            ]
        })

        const response = interaction.choices[0].message.content

        return response;
    }
}