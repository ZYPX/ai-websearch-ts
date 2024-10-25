import TurndownService from 'turndown';
import { defaultHeaders } from "@/config";

export class WebSearchService {
    async search(query: string): Promise<string[]> {
        const searchResults = await this.getSearchResults(query);
        if (!searchResults) return [];
        return this.getWebPages(searchResults);
    }

    private async getSearchResults(query: string): Promise<string[] | undefined> {
        try {
            const response = await fetch(`https://search.brave.com/search?q=${encodeURIComponent(query)}`, {
                method: "GET",
                headers: defaultHeaders,
            });
            const html = await response.text();
            const regex = /<div\s+class="[^"]*"\s+data-pos="\d+"\s+data-type="web".*?>\s*<a\s+(?![^>]*href="https:\/\/brave\.com\/brave-news")(?![^>]*href="[^"]*wikipedia\.org[^"]*")[^>]*href="([^"]*)"/g;
            const matches = html.matchAll(regex);
            const hrefValues = Array.from(matches, match => new URL(match[1]).toString());

            if (hrefValues.length === 0) {
                throw new Error("No search results found for query");
            }
            return hrefValues;
        } catch (e) {
            console.error(e);
            return undefined;
        }
    }

    private async getWebPages(links: string[]): Promise<string[]> {
        const webPages: string[] = [];
        let numPagesFetched = 0;

        for (const link of links) {
            if (numPagesFetched === 1) break;

            try {
                const response = await fetch(link, {
                    method: "GET",
                    headers: defaultHeaders,
                });

                if (response.ok) {
                    const html = await response.text();
                    const md = `### Start of content for ${link}\n\n${await this.convertToMarkdown(html)}\n\n### End`;
                    webPages.push(md);
                    numPagesFetched++;
                }
            } catch (error) {
                console.error(`Failed to fetch ${link}:`, error);
            }
        }
        return webPages;
    }

    private async convertToMarkdown(html: string): Promise<string> {
        const turndownService = new TurndownService();
        const elements = ["head", "footer", "style", "script", "header", "nav", "navbar"];
        const pattern = new RegExp(`<(${elements.join('|')})[^>]*>.*?</\\1>`, 'gis');
        let cleanedHTML = html.replace(pattern, '');
        const patternWhitespace = /\s\s+/g;
        let markdown = turndownService.turndown(cleanedHTML);
        markdown = markdown.replace(patternWhitespace, "\n");
        markdown = markdown.replace(/-{4,}/g, '');
        return markdown;
    }
}