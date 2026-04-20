#!/usr/bin/env node
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { createMcpExpressApp } from '@modelcontextprotocol/sdk/server/express.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import type { Request, Response } from 'express';
import { createMcpServer } from '../mcp/server.js';
import { requireRemoteApiKey } from './auth.js';
import { createRemoteFileConfig, getRequestBaseUrl, openOutputFile } from './http-files.js';

const DEFAULT_PORT = 3000;
const HOST = '0.0.0.0';
const MCP_PATH = '/mcp';

type TransportEntry = {
  transport: StreamableHTTPServerTransport;
};

const transports = new Map<string, TransportEntry>();

export async function runRemoteServer(): Promise<void> {
  const app = createMcpExpressApp({ host: HOST });
  app.set('trust proxy', true);
  app.get('/health', (_req, res) => res.json({ status: 'ok' }));
  app.get('/files/:fileName', requireRemoteApiKey, async (req, res) => {
    try {
      const fileName = req.params.fileName;
      if (typeof fileName !== 'string') {
        res.status(400).json({ error: 'Missing file name' });
        return;
      }

      const config = createRemoteFileConfig(getRequestBaseUrl(req));
      const file = await openOutputFile(fileName, config);
      res.setHeader('content-type', 'application/pdf');
      res.setHeader('content-length', String(file.size));
      file.stream.pipe(res);
    } catch (error) {
      res.status(404).json({ error: formatError(error) });
    }
  });

  app.post(MCP_PATH, requireRemoteApiKey, handleMcpPost);
  app.get(MCP_PATH, requireRemoteApiKey, handleMcpSessionRequest);
  app.delete(MCP_PATH, requireRemoteApiKey, handleMcpSessionRequest);

  app.listen(getPort(), HOST, () => {
    console.log(`PDF watermark remote MCP server listening on ${HOST}:${getPort()}`);
  });
}

async function handleMcpPost(req: Request, res: Response): Promise<void> {
  try {
    const sessionId = getSessionId(req);
    const existing = sessionId ? transports.get(sessionId) : undefined;

    if (existing) {
      await existing.transport.handleRequest(req, res, req.body);
      return;
    }

    if (!sessionId && isInitializeRequest(req.body)) {
      await createSession(req, res);
      return;
    }

    res.status(400).json({ error: 'Bad Request: missing or invalid MCP session' });
  } catch (error) {
    sendServerError(res, error);
  }
}

async function handleMcpSessionRequest(req: Request, res: Response): Promise<void> {
  try {
    const sessionId = getSessionId(req);
    const existing = sessionId ? transports.get(sessionId) : undefined;

    if (!existing) {
      res.status(400).send('Invalid or missing MCP session ID');
      return;
    }

    await existing.transport.handleRequest(req, res);
  } catch (error) {
    sendServerError(res, error);
  }
}

async function createSession(req: Request, res: Response): Promise<void> {
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
    onsessioninitialized: (sessionId) => {
      transports.set(sessionId, { transport });
    }
  });
  const server = createMcpServer({
    remote: {
      baseUrl: getRequestBaseUrl(req)
    }
  });

  transport.onclose = () => {
    const sessionId = transport.sessionId;
    if (sessionId) {
      transports.delete(sessionId);
    }
  };

  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
}

function getSessionId(req: { headers: Record<string, unknown> }): string | undefined {
  const header = req.headers['mcp-session-id'];
  return typeof header === 'string' ? header : undefined;
}

function getPort(): number {
  return Number(process.env.PORT ?? DEFAULT_PORT);
}

function sendServerError(res: Response, error: unknown): void {
  if (!res.headersSent) {
    res.status(500).json({ error: formatError(error) });
  }
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  await runRemoteServer();
}
