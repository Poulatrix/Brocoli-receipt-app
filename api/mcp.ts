import type { VercelRequest, VercelResponse } from '@vercel/node';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createBrocoliMcpServer, HouseholdMirrorData } from '../src/lib/mcpService.js';
import {
  extractBearerToken,
  authenticateMcpBearerToken,
  getServerSupabase,
  getMirrorRecord,
  saveMirrorRecord,
  hasMemberCompetence,
  getParisTodayISO,
} from '../src/lib/householdBackend.js';

function applyCorsHeaders(req: VercelRequest, res: VercelResponse) {
  const reqOrigin = typeof req.headers.origin === 'string' ? req.headers.origin : '';
  const forwardedHost = typeof req.headers['x-forwarded-host'] === 'string'
    ? req.headers['x-forwarded-host']
    : typeof req.headers.host === 'string'
    ? req.headers.host
    : '';
  const proto = typeof req.headers['x-forwarded-proto'] === 'string' ? req.headers['x-forwarded-proto'] : 'https';
  const expectedOrigin = forwardedHost ? `${proto}://${forwardedHost}` : '';

  const allowedOrigins = new Set(
    [
      process.env.APP_URL?.replace(/\/+$/, ''),
      process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '',
      process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '',
      expectedOrigin,
      'http://localhost:3000',
    ].filter(Boolean)
  );

  if (reqOrigin && allowedOrigins.has(reqOrigin)) {
    res.setHeader('Access-Control-Allow-Origin', reqOrigin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Mcp-Session-Id, Last-Event-ID');
  res.setHeader('Access-Control-Expose-Headers', 'Mcp-Session-Id');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  const rawToken = extractBearerToken(req.headers.authorization);
  const auth = rawToken ? await authenticateMcpBearerToken(rawToken) : null;

  if (!auth) {
    return res.status(401).json({
      jsonrpc: '2.0',
      error: {
        code: -32001,
        message: 'Jeton MCP manquant, invalide ou serveur MCP désactivé pour cette Maison.',
      },
      id: null,
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      jsonrpc: '2.0',
      error: {
        code: -32000,
        message: 'En environnement Serverless Vercel, utilisez POST /api/mcp (Streamable HTTP sans état).',
      },
      id: null,
    });
  }

  try {
    const { source, mirror } = await getMirrorRecord(auth.household.id);
    const workingMirror: HouseholdMirrorData = {
      recettes: [...mirror.recettes],
      planning: [...mirror.planning],
      courses: [...mirror.courses],
      pendingMutations: [...mirror.pendingMutations],
      lastSyncedAt: mirror.lastSyncedAt,
    };
    let mirrorDirty = false;

    const boundId = auth.secret.boundUserId || auth.household.createurUserId;
    const supabase = getServerSupabase();

    const server = createBrocoliMcpServer({
      householdId: auth.household.id,
      getHousehold: () => auth.household,
      getBoundMember: () =>
        auth.household.membres.find((m) => m.userId === boundId) ||
        auth.household.membres.find((m) => m.estCreateur) ||
        auth.household.membres[0],
      hasMemberCompetence,
      getParisTodayISO,
      supabase,
      getMirrorData: () => workingMirror,
      updateMirrorData: (_hid, updater) => {
        updater(workingMirror);
        workingMirror.lastSyncedAt = Date.now();
        mirrorDirty = true;
      },
      enqueuePendingMutation: (_hid, mutation) => {
        workingMirror.pendingMutations.push(mutation);
        mirrorDirty = true;
      },
      getWidgetMealsForMembers: () => ({}),
    });

    // Mode sans état compatible Vercel Serverless (chaque POST est autonome)
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });

    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);

    if (mirrorDirty) {
      await saveMirrorRecord(auth.household.id, workingMirror, source);
    }

    await transport.close().catch(() => {});
    await server.close().catch(() => {});
  } catch (err: any) {
    console.error('[Vercel /api/mcp] Error:', err);
    if (!res.headersSent) {
      return res.status(500).json({
        jsonrpc: '2.0',
        error: { code: -32603, message: err?.message || 'Erreur interne du serveur MCP.' },
        id: null,
      });
    }
  }
}
