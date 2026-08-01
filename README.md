# Pilot AI SDK

Build OpenAI-powered agents with tools, web search, website analysis, and reasoning loops.

```bash
npm install pilot-ai-sdk
```

## Basic agent

```js
import { Agent } from "pilot-ai-sdk";

const model = "your-model-name";
const agent = new Agent(model, process.env.OPEN_AI_API_KEY);

const answer = await agent
  .setInstructions("Explain JavaScript promises in simple words.")
  .run();

console.log(answer);
```

## Agent methods

| Method | Use |
| --- | --- |
| `setInstructions(text)` | Set the prompt for `run()`. |
| `run()` | Get a normal AI response. |
| `liveDataQueryRun(query, tavilyKey)` | Search the web and answer from live results. |
| `setLoop(number)` | Set the number of reasoning steps. |
| `runLoop(query)` | Run step-by-step reasoning for a query. |
| `webScrap(url)` | Read a website and return an AI-generated analysis. |
| `addTools(...tools)` | Add tools to the agent. |
| `useTool(query)` | Let the agent select and use a tool. |

## Web search

Use a Tavily API key for live web results.

```js
import { Agent } from "pilot-ai-sdk";

const model = "your-model-name";
const agent = new Agent(model, process.env.OPEN_AI_API_KEY);

const answer = await agent.liveDataQueryRun(
  "What are the latest AI news?",
  process.env.TAVILY_API_KEY,
);

console.log(answer);
```

## Website analysis

```js
import { Agent } from "pilot-ai-sdk";

const model = "your-model-name";
const agent = new Agent(model, process.env.OPEN_AI_API_KEY);
const result = await agent.webScrap("https://example.com");

console.log(result);
```

## Reasoning loop

```js
import { Agent } from "pilot-ai-sdk";

const model = "your-model-name";
const agent = new Agent(model, process.env.OPEN_AI_API_KEY);

const result = await agent
  .setLoop(10)
  .runLoop("Create a simple plan to learn React in 30 days");

console.log(result);
```

## Add your own tools

The SDK does not provide built-in tools. The functions in its internal `tool.js`
file are only used for development/testing and should not be imported or relied
on by your application.

Pass your own tool object to `addTools()`. Every tool must follow this format:

```js
const myTool = {
  name: "toolName",
  description: "Explain clearly what this tool does and the inputs it needs.",

  async execute({ /* arguments selected by the agent */ }) {
    // Perform your application-specific work here.
    return { /* result */ };
  },
};
```

`name` and `description` help the agent choose the right tool. `execute` must
be an async function that accepts an arguments object and returns the tool
result.

For example:

```js
import { Agent } from "pilot-ai-sdk";

const model = "your-model-name";
const wordCounter = {
  name: "wordCounter",
  description: "Count words in a text.",
  async execute({ text }) {
    return { count: text.trim().split(/\s+/).filter(Boolean).length };
  },
};

const agent = new Agent(model, process.env.OPEN_AI_API_KEY);

const result = await agent
  .addTools(wordCounter)
  .useTool("Count words in: Pilot AI SDK is easy to use");

console.log(result);
```
