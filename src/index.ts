import { routeSimulation } from "./simulations";

const ALLOWED_ORIGINS = ['https://duel.tools', 'https://staging.duel.tools'];

function getCorsHeaders(request: Request): Record<string, string> {
    const origin = request.headers.get('Origin');
    const headers: Record<string, string> = {
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (origin && ALLOWED_ORIGINS.includes(origin)) {
        headers['Access-Control-Allow-Origin'] = origin;
    }

    return headers;
}

export interface Env {
    DB: D1Database;
}

export default {
    async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
        let response: Response;

        try {
            const url = new URL(request.url);
            if (url.pathname === '/api/simulations') {
                response = await routeSimulation(env, request);
            } else {
                response = new Response('Not Found', { status: 404 });
            }
        } catch (error: unknown) {
            console.error('Error processing request:', error);
            response = new Response(
                JSON.stringify({ message: error instanceof Error ? error.message : 'Internal Server Error' }),
                {
                    status: 500,
                    headers: { 'Content-Type': 'application/json' }
                }
            );
        }

        // Add CORS headers to the response
        const corsHeaders = getCorsHeaders(request);
        Object.entries(corsHeaders).forEach(([key, value]) => {
            response.headers.set(key, value);
        });

        return response;
    }
};