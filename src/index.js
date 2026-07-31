import { Agent } from "./agent.js";
import { calculator, getWeather } from "./config/tool.js";

const agent = await new Agent("gpt-4o-mini" , process.env.OPEN_AI_API_KEY)
                    .addTools(getWeather , calculator).useTool("what is the weather of Kolkata?")

console.log(agent);