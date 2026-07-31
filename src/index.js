import { Agent } from "./agent.js";


const AIagent = await new Agent("gpt-4o-mini").setInstructions("what is dotenv ?").liveDataQueryRun("who is the current pm of India ?");

console.log(AIagent);