import { Agent } from "./agent.js";


const AIagent = await new Agent("gpt-4o-mini" , process.env.OPEN_AI_API_KEY)
                .liveDataQueryRun("who is current pm of India ?" , process.env.TAVILY_API_KEY)

console.log(AIagent);