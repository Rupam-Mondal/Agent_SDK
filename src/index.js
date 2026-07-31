import { Agent } from "./agent.js";


const AIagent = await new Agent("gpt-4o-mini").setInstructions("what is dotenv ?").setLoop(15).runLoop("give me a code how to send response to claude ? give me best approch to send request to claude");

console.log(AIagent);