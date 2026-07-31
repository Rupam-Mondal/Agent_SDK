import OpenAI from 'openai';
import dotenv from 'dotenv';
import { liveDataPrompt, LoopingPrompt, normalPrompt } from './config/Harnes.js';
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

    setLoop(loop){
        this.loop = loop;
        return this;
    }

 

    async runLoop(query){
        const loop = this.loop;

        if(!loop){
            return {
                message: "Please mention the loop number. Pass the loop number through .loop(number)"
            }
        }

        const msg_db = [];

        msg_db.push({
            role: "user",
            content : `${LoopingPrompt} loop number given by user:- ${loop}`
        });
        msg_db.push({
            role: "user",
            content: query
        });     

        let i = 0;
        while(i < loop){
            const interaction = await client.chat.completions.create({
                model: this.model,
                messages: msg_db,
                response_format: {
                    type: "json_object",
                },
            })

            const rawresult = interaction.choices[0].message.content;
            const parsedResult = JSON.parse(rawresult);

            msg_db.push({
                role: "assistant",
                content: rawresult,
            });

            console.log(`${parsedResult.step} : ${parsedResult.text}`);

            const step = parsedResult.step;
            const text = parsedResult.text;

            if (parsedResult.step == "Output"){
                return {
                    step,
                    text
                }
            }
        }
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