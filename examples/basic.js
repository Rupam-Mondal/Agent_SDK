import { Agent } from "../src/index.js";


const AIagent = await new Agent("gpt-4o-mini" , process.env.OPEN_AI_API_KEY)
                .webScrap("https://www.daydreamcapolinea.com/");

console.log(AIagent);