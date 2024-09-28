import { Env } from './index';

interface PostData {
    id: string;
    user_id: string;
    env_id: string;
    data: unknown;
    result: number;
    summary: string;
}

export async function generateDataHash(data: unknown): Promise<string> {
    const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(data)));
    return Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

export function validateSimulationData(data: unknown): asserts data is PostData {
    if (typeof data !== 'object' || data === null) {
        throw new Error('Invalid data structure');
    }

    const requiredFields: (keyof PostData)[] = ['id', 'user_id', 'env_id', 'data', 'result', 'summary'];
    for (const field of requiredFields) {
        if (!(field in data)) {
            throw new Error(`Missing required field: ${field}`);
        }
    }

    const typedData = data as PostData;
    if (typeof typedData.id !== 'string' || typeof typedData.user_id !== 'string' || typeof typedData.env_id !== 'string') {
        throw new Error('sim_id, user_id, and env_id must be strings');
    }
    if (typeof typedData.result !== 'number') {
        throw new Error('result must be a number');
    }
}

async function handleSimulationPost(env: Env, data: unknown): Promise<Response> {
    try {
        validateSimulationData(data);
        
        const dataHash = await generateDataHash(data.data);
        
        await env.DB.prepare(`
            INSERT INTO simulations (id, user_id, env_id, data_hash, data, result, summary, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `).bind(
            data.id,
            data.user_id,
            data.env_id,
            dataHash,
            data.data,
            data.result,
            data.summary
        ).run();
        
        return new Response(JSON.stringify({
            message: 'Simulation inserted successfully',
            id: data.id,
            data_hash: dataHash
        }), {
            status: 201,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Error inserting simulation:', error);
        return new Response(JSON.stringify({ message: error instanceof Error ? error.message : 'Unknown error' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

async function handleSimulationGet(env: Env, request: Request): Promise<Response> {
    async function getById(simulationId: string): Promise<Response> {
        const result = await env.DB.prepare(
            'SELECT * FROM simulations WHERE id = ?'
        ).bind(simulationId).first();
        if (!result) {
            return new Response(JSON.stringify({ message: 'Simulation not found' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        return new Response(JSON.stringify(result), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        const url = new URL(request.url);
        if (url.searchParams.has('id')) {
            const simulationId = url.searchParams.get('id');
            if (simulationId === null) {
                throw new Error('Invalid simulation ID');
            }
            return await getById(simulationId);
        } else {
            return new Response(JSON.stringify({ message: 'Query not valid' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    } catch (error) {
        console.error('Error retrieving simulation:', error);
        return new Response(JSON.stringify({ message: 'Error retrieving simulation' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

export async function routeSimulation(env: Env, request: Request): Promise<Response> {
    if (request.method === 'POST') {
        const data = await request.json();
        return await handleSimulationPost(env, data);
    } else if (request.method === 'GET') {
        return await handleSimulationGet(env, request);
    }
    return new Response('Method Not Allowed', { status: 405 });
}