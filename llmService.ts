import { Message, ToolCall, Tool, StreamChunk } from './types'
import { WebSearchService } from './webSearch'
import { apiConfig, APIRequestConfig, APIConfig } from "@/config";

// llmService.ts
export class LLMService {
    private controller: AbortController | null = null;
    private webSearchService: WebSearchService;
    private config: APIConfig;

    constructor(config: APIConfig = apiConfig) {
        this.webSearchService = new WebSearchService();
        this.config = config;
    }

    public async startInteractiveSession(): Promise<void> {
        const readline = require('readline').createInterface({
            input: process.stdin,
            output: process.stdout
        });

        console.log("\n=== Welcome to the AI Assistant ===");
        console.log("Settings:\n");
        console.log(`baseURL: ${this.config.baseUrl}`);
        console.dir(this.config.defaultRequestConfig, { depth: null, colors: true });
        console.log("\nType your questions and press Enter. Type 'exit' to quit.\n");

        while (true) {
            try {
                const prompt = await new Promise<string>((resolve) => {
                    readline.question('\nAsk anything: ', resolve);
                });

                if (prompt.toLowerCase() === 'exit') {
                    console.log('\nGoodbye!\n');
                    readline.close();
                    break;
                }

                console.log('\nAI Response:\n');

                if (this.controller) {
                    this.controller.abort();
                }

                this.controller = new AbortController();
                try {
                    await this.askLLM(prompt, this.controller.signal);
                    console.log('\n' + '─'.repeat(80) + '\n');
                } catch (error:any) {
                    if (error.name === 'AbortError') {
                        console.log('\nPrevious request cancelled.');
                    } else {
                        console.error('\nError:', error);
                    }
                }
            } catch (error) {
                console.error('\nSession error:', error);
            }
        }
    }

    private getTools(): Tool[] {
        return [{
            type: "function",
            function: {
                name: "webSearch",
                description: "Get real-time or current or up to date information from the internet.",
                parameters: {
                    type: "object",
                    properties: {
                        query: {
                            type: "string",
                            description: "A well constructed google search query.",
                        }
                    },
                    required: ["query"],
                },
            },
        }];
    }

    private initializeMessages(prompt: string): Message[] {
        const tools = this.getTools();
        return [
            {
                role: "system",
                content: `You are an advanced question answering assistant who excels at helping the user with any questions they may have. 
                    Try to answer accurately and correctly. The answer should be clear, easy to follow, and contain no errors.
            
                    Use the Tool ${tools[0].function.name} to ${tools[0].function.description}. Never assume the answer for questions that need up to date information.:
                    ${JSON.stringify(tools[0])}
            
                    Ensure that the FINAL OUTPUT is in GitHub markdown format and apply the following rules:
            
                    ### RULES TO FOLLOW
                    
                    - Required parameters MUST be specified.
                    - If there is no Tool Call available, answer the question like normal with your current knowledge and do not tell the user about Tool Calls.
                    - Provide sources and references if available especially when using Tools.
                    - For questions that require reasoning, problem-solving, or look like riddles, think use step-by-step reasoning to come up with an answer.
                    - For non-coding tasks, use the vocabulary of a sophomore college student in your writing.
                    - Responses should be more natural and conversational unless told otherwise.
                    - Any charts or diagrams should be displayed using mermaid js code blocks if applicable. Prefer using TD orientation.
                    - All math solutions and mathematical proofs must be output using LaTeX format delimited by '$' for inline math and '$$' for math blocks.
                    - Math solutions and mathematical proofs must show intermediate computations, definitions, and theorems used.
                    - If a user asks to solve a math question, show a step-by-step solution and include a note at the end with the following text (include the ">"):
            
                        > [!WARNING]
                        > AI is not very good at math computations.
                        > It helps to get the final value from a [calculator](https://www.symbolab.com/) and let the AI know what it is for more accurate answers.
                    
                    ### END OF RULES
                    `
            },
            {
                role: "user",
                content: prompt
            }
        ];
    }

    private async askLLM(prompt: string, signal: AbortSignal): Promise<void> {

        const tools = this.getTools();
        const msgs: Message[] = this.initializeMessages(prompt);

        try {
            const response = await this.makeAPIRequest(msgs, tools, signal);

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`API request failed: ${response.status} ${errorText}`);
            }

            const toolCall = await this.processStreamResponse(response, signal);

            if (toolCall.id !== "") {
                console.log("Tool call detected, handling...");
                await this.handleToolCall(msgs, toolCall, signal);
            }
        } catch (error: any) {
            if (error.name === 'AbortError') {
                throw error;
            }
            console.error("Error in askLLM:", error);
            throw error;
        }
    }

    private async makeAPIRequest(msgs: Message[], tools: Tool[], signal: AbortSignal) {
        const body: APIRequestConfig & { messages: Message[], tools?: Tool[] } = {
            ...this.config.defaultRequestConfig,
            messages: msgs,
            tools: tools.length > 0 ? tools : undefined,
        };

        return await fetch(this.config.baseUrl, {
            method: "POST",
            headers: this.config.headers,
            signal,
            body: JSON.stringify(body)
        });
    }

    private async processStreamResponse(response: Response, signal: AbortSignal): Promise<ToolCall> {
        if (!response.body) {
            throw new Error("Response body is null");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let toolCall: ToolCall = {
            id: "",
            type: "function",
            function: {
                name: "webSearch",
                arguments: ""
            }
        };

        try {
            let buffer = '';
            while (true) {
                if (signal.aborted) {
                    throw new Error('AbortError');
                }

                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                buffer += chunk;

                // Process complete lines
                const lines = buffer.split('\n');
                buffer = lines.pop() || ''; // Keep the incomplete line in the buffer

                for (const line of lines) {
                    toolCall = this.processChunk(line, toolCall);
                }
            }

            // Process any remaining data
            if (buffer) {
                toolCall = this.processChunk(buffer, toolCall);
            }
        } catch (error) {
            console.error("Error processing stream:", error);
            throw error;
        } finally {
            reader.releaseLock();
        }

        return toolCall;
    }

    private processChunk(line: string, toolCall: ToolCall): ToolCall {
        try {
            if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                const jsonString = line.slice(6);

                const chunkJSON: StreamChunk = JSON.parse(jsonString);

                if (chunkJSON.choices?.[0]?.delta?.content) {
                    process.stdout.write(chunkJSON.choices[0].delta.content);
                }

                if (chunkJSON.choices?.[0]?.delta?.tool_calls?.[0]) {
                    const currentCall = chunkJSON.choices[0].delta.tool_calls[0];
                    if (currentCall.id) {
                        toolCall.id = currentCall.id;
                        toolCall.function.name = currentCall.function.name;
                    }
                    toolCall.function.arguments += currentCall.function.arguments || '';
                }
            }
        } catch (e) {
            console.error("Error processing chunk:", e);
        }
        return toolCall;
    }

    private async handleToolCall(msgs: Message[], toolCall: ToolCall, signal: AbortSignal): Promise<void> {
        try {
            const searchQuery = JSON.parse(toolCall.function.arguments);
            console.log('\nSearching the web for more information...\n');

            const webContent = await this.webSearchService.search(searchQuery.query);

            msgs.push({
                role: "assistant",
                content: null,
                tool_calls: [toolCall]
            });

            msgs.push({
                role: "tool",
                name: toolCall.function.name,
                tool_call_id: toolCall.id,
                content: webContent.join("\n\n")
            });

            const response = await this.makeAPIRequest(msgs, [], signal);

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Follow-up API request failed: ${response.status} ${errorText}`);
            }

            await this.processStreamResponse(response, signal);
        } catch (error) {
            console.error('\nError during web search:', error);
            throw error;
        }
    }
}