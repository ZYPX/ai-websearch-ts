import { LLMService } from "@/llmService";
import {APIConfig, apiConfig} from "@/config";


// custom config
const customConfig: APIConfig = {
    ...apiConfig,
    defaultRequestConfig: {
        ...apiConfig.defaultRequestConfig,
        model: "openai/gpt-4o-mini",
        temperature: 0.9
    }
};

const customService = new LLMService(customConfig);

// main.ts
async function main() {
    // Choose which service to use
    const llmService = new LLMService();
    // Or use custom config:
    // const llmService = new LLMService(customConfig);
    await llmService.startInteractiveSession();
}

main().catch(console.error);