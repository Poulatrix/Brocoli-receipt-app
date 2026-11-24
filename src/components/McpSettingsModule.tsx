import React, { useState, useMemo } from 'react';
import {
  Terminal,
  Copy,
  Check,
  RefreshCw,
  ShieldCheck,
  ShieldAlert,
  KeyRound,
  Power,
  Play,
  Loader2,
  CheckCircle2,
  AlertCircle,
  UserCheck,
  Link2
} from 'lucide-react';
import { useStore } from '../store';
import { DEFAULT_ROLE_COMPETENCES, HouseholdCompetenceKey, HouseholdMember } from '../types';

function resolveMemberCompetence(member: HouseholdMember | undefined, key: HouseholdCompetenceKey): boolean {
  if (!member) return false;
  if (member.estCreateur || member.role === 'chef') return true;
  if (member.competences && member.competences[key] !== undefined) {
    return Boolean(member.competences[key]);
  }
  const role = member.role || 'cuisinier';
  return Boolean((DEFAULT_ROLE_COMPETENCES[role] || DEFAULT_ROLE_COMPETENCES.cuisinier)[key] ?? true);
}

function parseMcpHttpResponse(rawText: string, contentType: string | null): any {
  if (contentType && contentType.includes('text/event-stream')) {
    const lines = rawText.split(/\r?\n/);
    for (const line of lines) {
      if (line.startsWith('data:')) {
        const jsonPart = line.slice(5).trim();
        if (jsonPart) {
          try {
            return JSON.parse(jsonPart);
          } catch {}
        }
      }
    }
  }
  return JSON.parse(rawText);
}

export function McpSettingsModule() {
  const { household, getCurrentMember, configureMcp, syncMcpMirror } = useStore();
  const currentMember = getCurrentMember();

  const isChef = Boolean(
    currentMember?.estCreateur ||
    currentMember?.role === 'chef' ||
    currentMember?.competences?.gerer_maison
  );

  const mcpConfig = household?.mcpConfig;
  const isEnabled = Boolean(mcpConfig?.enabled);
  const boundUserId = mcpConfig?.boundUserId || household?.createurUserId || currentMember?.userId || '';
  const boundMember = useMemo(
    () => household?.membres.find(m => m.userId === boundUserId) || household?.membres[0],
    [household?.membres, boundUserId]
  );

  const [transportMode, setTransportMode] = useState<'http' | 'sse'>('http');
  const [freshToken, setFreshToken] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<'toggle' | 'rotate' | 'member' | 'test' | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [copiedField, setCopiedField] = useState<'url' | 'token' | 'config' | null>(null);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    message: string;
    tools?: string[];
  } | null>(null);

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const httpEndpoint = `${origin}/api/mcp`;
  const sseEndpoint = `${origin}/api/mcp/sse`;
  const activeEndpoint = transportMode === 'http' ? httpEndpoint : sseEndpoint;

  const displayedTokenForConfig = freshToken || '<VOTRE_JETON_MCP>';

  const clientJsonConfig = useMemo(() => {
    return JSON.stringify(
      {
        mcpServers: {
          brocoli: {
            url: activeEndpoint,
            transport: transportMode === 'http' ? 'streamable-http' : 'sse',
            headers: {
              Authorization: `Bearer ${displayedTokenForConfig}`,
            },
          },
        },
      },
      null,
      2
    );
  }, [activeEndpoint, transportMode, displayedTokenForConfig]);

  if (!household) {
    return (
      <section className="p-6 bg-[#FAF8F4] rounded-3xl border border-stone-200/90 space-y-4">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 bg-emerald-700 text-white rounded-2xl flex items-center justify-center shrink-0">
            <Terminal size={21} />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-slate-900 text-base">Connecteur MCP (Model Context Protocol)</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Connectez un assistant compatible MCP via Streamable HTTP (<code className="font-mono">/api/mcp</code>) pour consulter les repas de la semaine, lire/compléter la liste de courses et suggérer des plats.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-2.5 p-3.5 bg-white border border-stone-200 rounded-2xl text-xs text-slate-600">
          <AlertCircle size={15} className="text-amber-600 shrink-0 mt-0.5" />
          <span>
            Initialisez ou reconnectez votre Maison Familiale ci-dessus pour activer le serveur MCP et générer son jeton Bearer.
          </span>
        </div>
      </section>
    );
  }

  const handleCopy = (value: string, field: 'url' | 'token' | 'config') => {
    navigator.clipboard.writeText(value);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleToggleMcp = async () => {
    if (!isChef) return;
    setBusyAction('toggle');
    setFeedback(null);
    setTestResult(null);
    const res = await configureMcp({ enabled: !isEnabled });
    if (res.success) {
      if (res.token) setFreshToken(res.token);
      setFeedback({
        type: 'success',
        message: !isEnabled
          ? 'Serveur MCP activé pour votre Maison.'
          : 'Serveur MCP mis en pause. Les sessions actives ont été fermées.',
      });
    } else {
      setFeedback({ type: 'error', message: res.error || 'Échec de mise à jour.' });
    }
    setBusyAction(null);
  };

  const handleRotateToken = async () => {
    if (!isChef) return;
    setBusyAction('rotate');
    setFeedback(null);
    setTestResult(null);
    const res = await configureMcp({ enabled: true, regenerateToken: true });
    if (res.success && res.token) {
      setFreshToken(res.token);
      setFeedback({
        type: 'success',
        message: 'Nouveau jeton généré. Copiez-le maintenant : il ne sera plus réaffiché en clair après actualisation.',
      });
    } else {
      setFeedback({ type: 'error', message: res.error || 'Impossible de régénérer le jeton.' });
    }
    setBusyAction(null);
  };

  const handleChangeBoundMember = async (nextUserId: string) => {
    if (!isChef || !nextUserId) return;
    setBusyAction('member');
    setFeedback(null);
    const res = await configureMcp({ boundUserId: nextUserId });
    if (res.success) {
      setFeedback({
        type: 'success',
        message: 'Profil de la matrice appliqué aux appels MCP.',
      });
    } else {
      setFeedback({ type: 'error', message: res.error || 'Impossible de changer le membre associé.' });
    }
    setBusyAction(null);
  };

  const handleTestEndpoint = async () => {
    setBusyAction('test');
    setTestResult(null);
    try {
      await syncMcpMirror();

      if (freshToken && isEnabled) {
        const initRes = await fetch('/api/mcp', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json, text/event-stream',
            Authorization: `Bearer ${freshToken}`,
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'initialize',
            params: {
              protocolVersion: '2025-03-26',
              capabilities: {},
              clientInfo: { name: 'brocoli-diagnostic', version: '1.0.0' },
            },
          }),
        });

        const sessionId = initRes.headers.get('mcp-session-id');
        if (!initRes.ok) {
          throw new Error(`Statut HTTP ${initRes.status}`);
        }

        const toolsRes = await fetch('/api/mcp', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json, text/event-stream',
            Authorization: `Bearer ${freshToken}`,
            ...(sessionId ? { 'Mcp-Session-Id': sessionId } : {}),
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 2,
            method: 'tools/list',
            params: {},
          }),
        });

        const rawToolsText = await toolsRes.text();
        const parsedTools = parseMcpHttpResponse(rawToolsText, toolsRes.headers.get('content-type'));
        const toolNames = Array.isArray(parsedTools?.result?.tools)
          ? parsedTools.result.tools.map((t: any) => t.name)
          : [];

        if (sessionId) {
          fetch('/api/mcp', {
            method: 'DELETE',
            headers: {
              Authorization: `Bearer ${freshToken}`,
              'Mcp-Session-Id': sessionId,
            },
          }).catch(() => {});
        }

        setTestResult({
          ok: true,
          message: `Handshake Streamable HTTP réussi (${toolNames.length} outils MCP exposés).`,
          tools: toolNames,
        });
      } else {
        const statusRes = await fetch(`/api/households/mcp/status?householdId=${encodeURIComponent(household.id)}`);
        const statusData = await statusRes.json();
        if (!statusRes.ok || !statusData.success) {
          throw new Error('Impossible de joindre le point de statut MCP.');
        }
        setTestResult({
          ok: Boolean(statusData.enabled),
          message: statusData.enabled
            ? `Serveur MCP prêt (${statusData.activeSessions} session(s) active(s)). Régénérez un jeton si vous voulez tester le handshake complet depuis cette fenêtre.`
            : 'Le serveur MCP est actuellement désactivé pour cette Maison.',
        });
      }
    } catch (err: any) {
      setTestResult({
        ok: false,
        message: `Échec du test MCP : ${err?.message || 'Erreur réseau'}`,
      });
    } finally {
      setBusyAction(null);
    }
  };

  const canReadMeals = resolveMemberCompetence(boundMember, 'voir_recettes');
  const canReadList =
    resolveMemberCompetence(boundMember, 'voir_recettes') ||
    resolveMemberCompetence(boundMember, 'gerer_courses') ||
    resolveMemberCompetence(boundMember, 'cocher_courses');
  const canAddShopping = resolveMemberCompetence(boundMember, 'gerer_courses');
  const canCheckShopping = resolveMemberCompetence(boundMember, 'cocher_courses');
  const canSuggestMeals = resolveMemberCompetence(boundMember, 'suggerer_repas');

  const toolMatrix = [
    {
      tool: 'get_weekly_meals',
      label: 'Consulter les repas de la semaine',
      rule: 'voir_recettes',
      allowed: canReadMeals,
    },
    {
      tool: 'get_shopping_list',
      label: 'Lire la liste de courses',
      rule: 'voir_recettes / courses',
      allowed: canReadList,
    },
    {
      tool: 'add_shopping_items & toggle_shopping_item',
      label: 'Compléter et cocher la liste de courses',
      rule: 'gerer_courses / cocher_courses',
      allowed: canAddShopping || canCheckShopping,
      partialDetail:
        canAddShopping && !canCheckShopping
          ? 'Ajout autorisé · Cochage restreint'
          : !canAddShopping && canCheckShopping
          ? 'Cochage autorisé · Ajout restreint'
          : undefined,
    },
    {
      tool: 'suggest_meal',
      label: 'Suggérer un plat (boîte à suggestions)',
      rule: 'suggerer_repas',
      allowed: canSuggestMeals,
    },
  ];

  return (
    <section className="p-6 bg-[#FAF8F4] rounded-3xl border border-stone-200/90 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-stone-200/80">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 bg-emerald-700 text-white rounded-2xl flex items-center justify-center shrink-0">
            <Terminal size={21} />
          </div>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h3 className="font-bold text-slate-900 text-base">Connecteur MCP (Model Context Protocol)</h3>
              <span
                className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                  isEnabled ? 'text-emerald-700' : 'text-slate-500'
                }`}
              >
                {isEnabled ? <ShieldCheck size={14} /> : <ShieldAlert size={14} />}
                <span>{isEnabled ? 'Serveur actif' : 'Serveur désactivé'}</span>
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Connectez un assistant compatible MCP via HTTP ou SSE pour consulter le planning hebdomadaire, lire/compléter les courses et déposer des suggestions de plats.
            </p>
          </div>
        </div>

        {isChef && (
          <button
            onClick={handleToggleMcp}
            disabled={busyAction !== null}
            className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap shrink-0 disabled:opacity-50 ${
              isEnabled
                ? 'bg-white border border-stone-300 text-slate-700 hover:bg-stone-100'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            }`}
          >
            {busyAction === 'toggle' ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Power size={15} />
            )}
            <span>{isEnabled ? 'Mettre en pause' : 'Activer le serveur MCP'}</span>
          </button>
        )}
      </div>

      {!isChef && (
        <div className="flex items-start gap-2.5 p-3.5 bg-white border border-stone-200 rounded-2xl text-xs text-slate-600">
          <AlertCircle size={15} className="text-amber-600 shrink-0 mt-0.5" />
          <span>Seul le Chef de maison peut activer le serveur MCP ou générer un jeton d'accès.</span>
        </div>
      )}

      {feedback && (
        <div
          className={`flex items-start gap-2.5 p-3.5 rounded-2xl border text-xs font-medium ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Bound Member & Competence Matrix Enforcement */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
            <UserCheck size={15} className="text-emerald-700" />
            <span>Profil appliqué par la matrice de compétences</span>
          </div>

          <select
            aria-label="Profil membre associé au serveur MCP"
            disabled={!isChef || busyAction !== null}
            value={boundUserId}
            onChange={(e) => handleChangeBoundMember(e.target.value)}
            className="bg-white border border-stone-300 text-slate-800 text-xs font-semibold rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-600 disabled:opacity-60"
          >
            {household.membres.map(m => (
              <option key={m.id} value={m.userId}>
                {m.avatar} {m.nom} ({m.role === 'chef' ? 'Chef' : m.role === 'cuisinier' ? 'Cuisinier' : m.role === 'commis' ? 'Commis' : m.role === 'enfant' ? 'Gourmand' : 'Personnalisé'})
              </option>
            ))}
          </select>
        </div>

        <div className="bg-white border border-stone-200 rounded-2xl divide-y divide-stone-100">
          {toolMatrix.map(row => (
            <div key={row.tool} className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 px-4 py-3 text-xs">
              <div>
                <p className="font-semibold text-slate-900">{row.label}</p>
                <p className="text-[11px] font-mono text-slate-500">
                  {row.tool} · {row.rule}
                </p>
              </div>
              <span
                className={`text-[11px] font-bold whitespace-nowrap shrink-0 ${
                  row.allowed ? 'text-emerald-700' : 'text-amber-700'
                }`}
              >
                {row.partialDetail || (row.allowed ? 'Autorisé' : 'Restreint par la matrice')}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Transport Endpoint & Token */}
      <div className="space-y-4 pt-2 border-t border-stone-200/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
            <Link2 size={15} className="text-emerald-700" />
            <span>Points d'accès MCP et authentification</span>
          </div>

          <div className="inline-flex bg-stone-200/70 p-1 rounded-xl self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setTransportMode('http')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap shrink-0 ${
                transportMode === 'http'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Streamable HTTP
            </button>
            <button
              type="button"
              onClick={() => setTransportMode('sse')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap shrink-0 ${
                transportMode === 'sse'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              SSE (Legacy)
            </button>
          </div>
        </div>

        {/* Endpoint URL */}
        <div className="space-y-1.5">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600">
            {transportMode === 'http' ? 'URL Streamable HTTP (/api/mcp)' : 'URL flux SSE (/api/mcp/sse)'}
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={activeEndpoint}
              className="w-full bg-white border border-stone-200 text-slate-800 text-xs rounded-xl px-3.5 py-2.5 font-mono tabular-nums focus:outline-none select-all"
            />
            <button
              type="button"
              onClick={() => handleCopy(activeEndpoint, 'url')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-white hover:bg-stone-50 text-slate-800 border border-stone-200 rounded-xl text-xs font-bold whitespace-nowrap shrink-0"
            >
              {copiedField === 'url' ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
              <span>{copiedField === 'url' ? 'Copié' : 'Copier'}</span>
            </button>
          </div>
          {transportMode === 'sse' && (
            <p className="text-[11px] text-slate-500 font-mono">
              Endpoint POST messages : {origin}/api/mcp/messages
            </p>
          )}
        </div>

        {/* Bearer Token */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600">
              Jeton Bearer de la Maison
            </label>
            {isChef && (
              <button
                type="button"
                onClick={handleRotateToken}
                disabled={busyAction !== null}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 disabled:opacity-50 whitespace-nowrap shrink-0"
              >
                <RefreshCw size={13} className={busyAction === 'rotate' ? 'animate-spin' : ''} />
                <span>{mcpConfig?.tokenPreview ? 'Régénérer le jeton' : 'Générer un jeton'}</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <KeyRound size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                readOnly
                value={
                  freshToken
                    ? freshToken
                    : mcpConfig?.tokenPreview
                    ? `${mcpConfig.tokenPreview} (haché côté serveur — régénérez pour afficher)`
                    : 'Aucun jeton généré — activez le serveur MCP'
                }
                className="w-full bg-white border border-stone-200 text-slate-800 text-xs rounded-xl pl-9 pr-3.5 py-2.5 font-mono tabular-nums focus:outline-none select-all"
              />
            </div>

            {freshToken && (
              <button
                type="button"
                onClick={() => handleCopy(freshToken, 'token')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold whitespace-nowrap shrink-0"
              >
                {copiedField === 'token' ? <Check size={14} /> : <Copy size={14} />}
                <span>{copiedField === 'token' ? 'Copié' : 'Copier'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Client JSON Snippet */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600">
              Configuration client MCP (JSON)
            </label>
            <button
              type="button"
              onClick={() => handleCopy(clientJsonConfig, 'config')}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-emerald-700 whitespace-nowrap shrink-0"
            >
              {copiedField === 'config' ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
              <span>{copiedField === 'config' ? 'Config copiée' : 'Copier JSON'}</span>
            </button>
          </div>
          <pre className="bg-stone-900 text-stone-100 rounded-2xl p-4 text-[11px] font-mono tabular-nums overflow-x-auto leading-relaxed">
            {clientJsonConfig}
          </pre>
        </div>

        {/* Test action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <button
            type="button"
            onClick={handleTestEndpoint}
            disabled={busyAction !== null}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-stone-50 text-slate-800 border border-stone-300 rounded-xl text-xs font-bold transition-colors whitespace-nowrap shrink-0 disabled:opacity-50"
          >
            {busyAction === 'test' ? (
              <Loader2 size={14} className="animate-spin text-emerald-600" />
            ) : (
              <Play size={14} className="text-emerald-600" />
            )}
            <span>Tester le serveur MCP</span>
          </button>

          {testResult && (
            <div
              className={`text-xs font-medium flex-1 ${
                testResult.ok ? 'text-emerald-800' : 'text-rose-700'
              }`}
            >
              <p>{testResult.message}</p>
              {testResult.tools && testResult.tools.length > 0 && (
                <p className="font-mono text-[11px] text-slate-600 mt-0.5">
                  Outils détectés : {testResult.tools.join(', ')}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
