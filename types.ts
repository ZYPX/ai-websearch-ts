export interface Headers {
    [key: string]: string;
}

export interface ToolFunction {
    name: string;
    description: string;
    parameters: {
        type: string;
        properties: {
            [key: string]: {
                type: string;
                description: string;
            };
        };
        required: string[];
    };
}

export interface Tool {
    type: string;
    function: ToolFunction;
}

export interface Message {
    role: string;
    content: string | null;
    tool_calls?: ToolCall[];
    name?: string;
    tool_call_id?: string;
}

export interface ToolCall {
    id: string;
    type: string;
    function: {
        name: string;
        arguments: string;
    };
}

export interface StreamChunk {
    choices: {
        delta: {
            content?: string;
            tool_calls?: ToolCall[];
        };
    }[];
}