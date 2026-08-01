import { Agent } from "./agent.js";


const emailAgent = new Agent("gpt-4o-mini", process.env.OPEN_AI_API_KEY);

await emailAgent.sendEmail("dipankar7111@gmail.com", "Leave Application", "Write a formal leave application for two days due to illness.")
