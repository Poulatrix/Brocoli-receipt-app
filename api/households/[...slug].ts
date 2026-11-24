import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  MissingSchemaError,
  extractBearerToken,
  verifyCallerIdentity,
  getOrCreateMyHousehold,
  joinHouseholdByCode,
  updateHouseholdSettings,
  updateHouseholdMemberRecord,
  removeHouseholdMemberRecord,
  leaveHouseholdRecord,
  regenerateHouseholdInviteCode,
  configureHouseholdMcp,
  getHouseholdMcpStatus,
  syncHouseholdMirror,
  ackHouseholdMirror,
} from '../../src/lib/householdBackend';

function getActionPath(req: VercelRequest): string {
  const url = new URL(req.url || '/', 'https://localhost');
  const fromPath = url.pathname.replace(/^\/api\/households\/?/, '').replace(/\/+$/, '');
  if (fromPath) return fromPath;
  const slug = req.query.slug;
  if (Array.isArray(slug)) return slug.join('/');
  return typeof slug === 'string' ? slug : '';
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const action = getActionPath(req);
  const userJwt = extractBearerToken(req.headers.authorization);

  try {
    if (action === 'my' && req.method === 'GET') {
      const userId = typeof req.query.userId === 'string' ? req.query.userId.trim() : '';
      const email = typeof req.query.email === 'string' ? req.query.email.trim() : '';
      if (!userId) {
        return res.status(400).json({ success: false, error: 'Identifiant utilisateur requis.' });
      }
      const identityOk = await verifyCallerIdentity(userJwt, userId);
      if (!identityOk) {
        return res.status(401).json({ success: false, error: 'Identité utilisateur non vérifiée.' });
      }
      const household = await getOrCreateMyHousehold(userId, email, userJwt);
      return res.status(200).json({ success: true, household });
    }

    if (action === 'join' && req.method === 'POST') {
      const { code, userId, email, nom, role } = req.body || {};
      const identityOk = await verifyCallerIdentity(userJwt, String(userId || ''));
      if (!identityOk) {
        return res.status(401).json({ success: false, error: 'Identité utilisateur non vérifiée.' });
      }
      const result = await joinHouseholdByCode({ code, userId, email, nom, role }, userJwt);
      return res.status(result.status).json(result.body);
    }

    if (action === 'update' && req.method === 'POST') {
      const { householdId, userId, nom, roleCompetencesPreset } = req.body || {};
      const identityOk = await verifyCallerIdentity(userJwt, String(userId || ''));
      if (!identityOk) {
        return res.status(401).json({ success: false, error: 'Identité utilisateur non vérifiée.' });
      }
      const result = await updateHouseholdSettings({ householdId, userId, nom, roleCompetencesPreset }, userJwt);
      return res.status(result.status).json(result.body);
    }

    if (action === 'member/update' && req.method === 'POST') {
      const { householdId, userId, targetMemberId, role, competences, nom, avatar } = req.body || {};
      const identityOk = await verifyCallerIdentity(userJwt, String(userId || ''));
      if (!identityOk) {
        return res.status(401).json({ success: false, error: 'Identité utilisateur non vérifiée.' });
      }
      const result = await updateHouseholdMemberRecord(
        { householdId, userId, targetMemberId, role, competences, nom, avatar },
        userJwt
      );
      return res.status(result.status).json(result.body);
    }

    if (action === 'member/remove' && req.method === 'POST') {
      const { householdId, userId, targetMemberId } = req.body || {};
      const identityOk = await verifyCallerIdentity(userJwt, String(userId || ''));
      if (!identityOk) {
        return res.status(401).json({ success: false, error: 'Identité utilisateur non vérifiée.' });
      }
      const result = await removeHouseholdMemberRecord({ householdId, userId, targetMemberId }, userJwt);
      return res.status(result.status).json(result.body);
    }

    if (action === 'leave' && req.method === 'POST') {
      const { householdId, userId } = req.body || {};
      const identityOk = await verifyCallerIdentity(userJwt, String(userId || ''));
      if (!identityOk) {
        return res.status(401).json({ success: false, error: 'Identité utilisateur non vérifiée.' });
      }
      const result = await leaveHouseholdRecord({ householdId, userId }, userJwt);
      return res.status(result.status).json(result.body);
    }

    if (action === 'regenerate-code' && req.method === 'POST') {
      const { householdId, userId } = req.body || {};
      const identityOk = await verifyCallerIdentity(userJwt, String(userId || ''));
      if (!identityOk) {
        return res.status(401).json({ success: false, error: 'Identité utilisateur non vérifiée.' });
      }
      const result = await regenerateHouseholdInviteCode({ householdId, userId }, userJwt);
      return res.status(result.status).json(result.body);
    }

    if (action === 'mcp/configure' && req.method === 'POST') {
      const { householdId, userId, enabled, boundUserId, regenerateToken } = req.body || {};
      const identityOk = await verifyCallerIdentity(userJwt, String(userId || ''));
      if (!identityOk) {
        return res.status(401).json({ success: false, error: 'Identité utilisateur non vérifiée.' });
      }
      const result = await configureHouseholdMcp(
        { householdId, userId, enabled, boundUserId, regenerateToken },
        userJwt
      );
      return res.status(result.status).json(result.body);
    }

    if (action === 'mcp/status' && req.method === 'GET') {
      const householdId = typeof req.query.householdId === 'string' ? req.query.householdId.trim() : '';
      const result = await getHouseholdMcpStatus(householdId, 0, userJwt);
      return res.status(result.status).json(result.body);
    }

    if (action === 'mcp/sync' && req.method === 'POST') {
      const { householdId, userId, recettes, planning, courses } = req.body || {};
      const identityOk = await verifyCallerIdentity(userJwt, String(userId || ''));
      if (!identityOk) {
        return res.status(401).json({ success: false, error: 'Identité utilisateur non vérifiée.' });
      }
      const result = await syncHouseholdMirror({ householdId, userId, recettes, planning, courses }, userJwt);
      return res.status(result.status).json(result.body);
    }

    if (action === 'mcp/ack' && req.method === 'POST') {
      const { householdId, userId, mutationIds } = req.body || {};
      const identityOk = await verifyCallerIdentity(userJwt, String(userId || ''));
      if (!identityOk) {
        return res.status(401).json({ success: false, error: 'Identité utilisateur non vérifiée.' });
      }
      const result = await ackHouseholdMirror({ householdId, userId, mutationIds }, userJwt);
      return res.status(result.status).json(result.body);
    }

    return res.status(404).json({ success: false, error: `Endpoint /api/households/${action} introuvable.` });
  } catch (err: any) {
    if (err instanceof MissingSchemaError || err?.needsSetup) {
      return res.status(503).json({
        success: false,
        needsSetup: true,
        error: err.message,
      });
    }
    console.error(`[Vercel /api/households/${action}] Error:`, err);
    return res.status(500).json({ success: false, error: err?.message || 'Erreur serveur.' });
  }
}
