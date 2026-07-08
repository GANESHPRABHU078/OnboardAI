import ZAI from 'z-ai-web-dev-sdk';
import fs from 'fs';
import path from 'path';

export async function getZAI(): Promise<ZAI> {
  // Install a fetch interceptor to strip the unsupported 'thinking' parameter from outgoing requests
  // This allows compatibility with strict APIs (like Google Gemini or Groq) that return a 400 error on unrecognized parameters.
  if (!(globalThis as any).__zai_fetch_interceptor_installed__) {
    (globalThis as any).__zai_fetch_interceptor_installed__ = true;
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async function (input: RequestInfo | URL, init?: RequestInit) {
      let finalInput = input;
      if (typeof finalInput === 'string') {
        // Clean up double slashes (e.g., "openai//chat" -> "openai/chat") but keep the "https://" prefix intact.
        finalInput = finalInput.replace(/([^:]\/)\/+/g, '$1');
        
        // Force the Google Gemini OpenAI-compatible path to use /v1beta/openai
        if (finalInput.includes('generativelanguage.googleapis.com')) {
          try {
            const urlObj = new URL(finalInput);
            // Replace /v1/openai, /v1beta/openai, /v1, or /v1beta at the start of the path
            let path = urlObj.pathname;
            path = path.replace(/^\/(v1beta\/openai|v1\/openai|v1beta|v1)/, '');
            urlObj.pathname = '/v1beta/openai' + path;
            finalInput = urlObj.toString();
          } catch {
            // Fallback to regex if parsing fails
            finalInput = finalInput.replace(/generativelanguage\.googleapis\.com\/(v1beta|v1)(\/openai)?/, 'generativelanguage.googleapis.com/v1beta/openai');
          }
        }
      }

      if (init && init.body && typeof init.body === 'string') {
        try {
          const bodyObj = JSON.parse(init.body);
          if (bodyObj && typeof bodyObj === 'object') {
            delete bodyObj.thinking;
            init.body = JSON.stringify(bodyObj);
          }
        } catch {
          // Ignore parsing errors
        }
      }
      try {
        const response = await originalFetch.call(this, finalInput, init);
        if (!response.ok) {
          const clonedRes = response.clone();
          const errBody = await clonedRes.text().catch(() => '');
          throw new Error(`[URL: ${finalInput}] API request failed with status ${response.status}: ${errBody}`);
        }
        return response;
      } catch (err: any) {
        if (err.message && err.message.includes('[URL:')) {
          throw err;
        }
        throw new Error(`[URL: ${finalInput}] ${err.message || err}`);
      }
    };
  }

  const localConfigPath = path.join(process.cwd(), '.z-ai-config');
  const homeDir = process.env.HOME || process.env.USERPROFILE || '';
  const homeConfigPath = path.join(homeDir, '.z-ai-config');
  const etcConfigPath = '/etc/.z-ai-config';

  const hasConfig = 
    fs.existsSync(localConfigPath) || 
    (homeDir && fs.existsSync(homeConfigPath)) || 
    fs.existsSync(etcConfigPath);

  if (hasConfig) {
    try {
      console.log('Found .z-ai-config on disk. Initializing ZAI using standard create().');
      return await ZAI.create();
    } catch (err) {
      console.error('Failed to initialize ZAI using ZAI.create() despite config existing:', err);
    }
  }

  // Fallback: build config from environment variables and initialize directly
  const apiKey = process.env.ZAI_API_KEY || process.env.OPENAI_API_KEY || '';
  const baseUrl = process.env.ZAI_BASE_URL || process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';

  if (!apiKey) {
    console.warn('WARNING: Neither ZAI_API_KEY nor OPENAI_API_KEY environment variables are defined. ZAI operations might fail.');
    throw new Error('ZAI_API_KEY is not defined. Please configure ZAI_API_KEY or OPENAI_API_KEY in your environment variables.');
  }

  const config = {
    baseUrl,
    apiKey,
  };

  // Instantiate ZAI directly to bypass loadConfig file check
  return new ZAI(config);
}
