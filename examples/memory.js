import "dotenv/config";
import { Agent } from "../src/index.js";

const apiKey = process.env.OPENAI_API_KEY ?? process.env.OPEN_AI_API_KEY;

if (!apiKey) {
  throw new Error("Set OPENAI_API_KEY (or OPEN_AI_API_KEY) in your .env file.");
}

const memoryFile = "agent-memory-demo.txt";
const agent = new Agent("gpt-4o-mini", apiKey);

agent.setInstructions(
  "My name is Asha. I am planning a seven-day trip to Japan in October.",
);
const firstAnswer = await agent.run({
  memory: true,
  memoryFile,
});

console.log("First response:\n", firstAnswer);

agent.setInstructions("What country and trip length did I mention?");
const secondAnswer = await agent.run({
  memory: true,
  memoryFile,
});

console.log("\nResponse using saved memory:\n", secondAnswer);
console.log(`\nMemory was saved in ${memoryFile} in the current working directory.`);
