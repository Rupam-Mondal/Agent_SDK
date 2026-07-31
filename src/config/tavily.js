import { tavily } from "@tavily/core";

const client = tavily({
  apiKey: process.env.TAVILY_API_KEY,
});

export async function webSearch(query) {
  try {

    console.log(query)
    const result = await client.search(query, {
      maxResults: 5,
    });

    if (!result.results?.length) {
      return "No relevant web results found.";
    }

    return result.results
      .map((item, index) =>
        `
Result ${index + 1}
Title: ${item.title}
URL: ${item.url}
Content: ${item.content}
`.trim(),
      )
      .join("\n\n----------------------------------------\n\n");
  } catch (error) {
    console.error("Web Search Error:", error);
    return "Failed to fetch web search results.";
  }
}
