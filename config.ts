import { Headers as headers } from "./types";
import 'dotenv/config';

const OPEN_ROUTER_KEY = process.env.OR_KEY;
// Types for the configuration
export interface APIRequestConfig {
    model: string;
    temperature: number;
    stream: boolean;
    tool_choice: "auto" | "none" | null;
    // Add other optional parameters
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

export const apiHeaders = new Headers({
    "Authorization": `Bearer ${OPEN_ROUTER_KEY}`,
    "Content-Type": "application/json",
    "User-Agent": defaultHeaders["user-agent"]
});

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