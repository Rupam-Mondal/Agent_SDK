import { Agent } from "./agent.js";
import { calculator, getWeather } from "./config/tool.js";
import { handOff } from "./handoff.js";

// const agent = await new Agent("gpt-4o-mini" , process.env.OPEN_AI_API_KEY)
//                     .addTools(getWeather , calculator).useTool("my name is Rupam. Guess my gender")

// console.log(agent);

const handOffresponse = new handOff();

handOffresponse.addHandOff(

    {
        provider: "openai",
        model: "gpt-4o-mini",
        apiKey: process.env.OPEN_AI_API_KEY,
        systemInstructions: "you are expert at giving tech related answers"
    },

    {
        provider: "openai",
        model: "gpt-4o-mini",
        apiKey: process.env.OPEN_AI_API_KEY,
        systemInstructions: "you are expert at giving code related demos"
    },

);

const answer = await handOffresponse.run(
    "what is axios?`"
);

console.log(answer);