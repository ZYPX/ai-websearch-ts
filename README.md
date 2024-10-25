# Project: LLM Service Example

This project demonstrates a barebones tool for interacting with real-time data on the web using an AI service from [OpenRouter](https://openrouter.ai/). The tool is designed to fetch data, with configurable parameters for making API requests, and allows for interrupting an AI response by asking another question mid-generation.

## Features:
- Simple, extendable setup to interact with the OpenRouter AI API
- Customizable API request parameters including model, temperature, token limits, and more
- Utilizes Brave Search to gather relevant information based on search queries
- Interrupt generation flow by asking another question while the AI is responding

## Code Overview:

### `main.ts`
The `main.ts` file initializes the AI service and starts an interactive session, allowing you to communicate with the LLM using default or custom configurations.

```typescript
import { LLMService } from "@/llmService";
import { APIConfig, apiConfig } from "@/config";

// Custom configuration
const customConfig: APIConfig = {
    ...apiConfig,
    defaultRequestConfig: {
        ...apiConfig.defaultRequestConfig,
        model: "openai/gpt-4o-mini",
        temperature: 0.9
    }
};

const customService = new LLMService(customConfig);

// main function
async function main() {
    const llmService = new LLMService();  // Default service
    // Or use custom config
    // const llmService = new LLMService(customConfig);
    await llmService.startInteractiveSession();
}

main().catch(console.error);
```

### `config.ts`
This file contains the API configuration, defining the request parameters such as model type, temperature, and headers required for making API requests to OpenRouter.
```typescript
import { Headers as headers } from "./types";
import * as process from "node:process";

// Types for API request configuration
export interface APIRequestConfig {
    model: string;
    temperature: number;
    stream: boolean;
    tool_choice: "auto" | "none" | null;
    max_tokens?: number;
    top_p?: number;
    frequency_penalty?: number;
    presence_penalty?: number;
}

export interface APIConfig {
    baseUrl: string;
    defaultRequestConfig: APIRequestConfig;
    headers: Headers;
}

// Default headers
export const defaultHeaders: headers = {
    "accept": "text/html,application/xhtml+xml,application/xml",
    "accept-language": "en-US,en;q=0.9",
    "priority": "u=0, i",
    "sec-ch-ua": "\"Not)A;Brand\";v=\"99\", \"Google Chrome\";v=\"127\", \"Chromium\";v=\"127\"",
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": "\"Windows\"",
    "sec-fetch-dest": "document",
    "sec-fetch-mode": "navigate",
    "sec-fetch-site": "none",
    "sec-fetch-user": "?1",
    "upgrade-insecure-requests": "1",
    "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
};

// API headers including authorization
export const apiHeaders = new Headers({
    "Authorization": `Bearer ${process.env.OR_KEY}`,
    "Content-Type": "application/json",
    "User-Agent": defaultHeaders["user-agent"]
});

// Default API configuration
export const apiConfig: APIConfig = {
    baseUrl: "https://openrouter.ai/api/v1/chat/completions",
    defaultRequestConfig: {
        model: "openai/gpt-4o-mini",
        temperature: 1,
        stream: true,
        tool_choice: "auto",
        max_tokens: 4096,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0
    },
    headers: apiHeaders
};
```

### Setup Instructions:
1. Clone the repository.
2. Install dependencies using npm install or yarn.
3. Add your OpenRouter API key to the environment `.env` variables as `OR_KEY`.
4. Run the main.ts file using tsx or ts-node by entering `npm run start` in the terminal.

### Usage:
You can modify the API request parameters in config.ts and interact with the AI service through the main.ts file. The interactive session allows real-time communication with the AI model, where you can ask questions or interrupt responses with new queries.

# MIT License