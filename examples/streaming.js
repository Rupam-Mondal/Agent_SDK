import "dotenv/config";
import { Agent } from "../src/index.js";

const apiKey = process.env.OPENAI_API_KEY ?? process.env.OPEN_AI_API_KEY;

if (!apiKey) {
  throw new Error("Set OPENAI_API_KEY (or OPEN_AI_API_KEY) in your .env file.");
}

const agent = new Agent("gpt-4o-mini", apiKey).setInstructions(
  "Explain why streaming responses are useful in two short sentences.",
);

// With stream: false (or no options), use: const answer = await agent.run();
// With stream: true, the method returns an async iterable of text chunks.
for await (const chunk of agent.run({ stream: true })) {
  process.stdout.write(chunk);
}

process.stdout.write("\n");
