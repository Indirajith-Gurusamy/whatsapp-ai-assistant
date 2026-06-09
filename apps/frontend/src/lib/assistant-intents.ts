import type { AssistantAction, AssistantChatMessage } from '@/lib/api';
import { parseUiTargetFromText } from '@/lib/ui-actions';

const AUTO_EXECUTE = new Set([
  'navigate',
  'open_lead',
  'open_customer',
  'open_user',
  'change_user_role',
  'refresh_page',
  'toggle_ai',
  'assign_lead',
  'update_lead_status',
  'send_message',
  'toggle_user_status',
  'verify_user',
  'delete_user',
  'logout',
  'create_user',
  'reset_user_password',
  'update_user_profile',
  'update_settings',
  'switch_ai_provider',
  'get_analytics',
  'create_task',
  'update_task',
  'delete_task',
  'create_customer',
  'bulk_delete_users',
  'bulk_delete_customers',
  'ui_action',
]);

const PAGE_RULES: { re: RegExp; path: string; label: string }[] = [
  { re: /user\s*management|usermanagement/i, path: '/admin/users', label: 'User Management' },
  { re: /ai\s+settings?|settings\s+ai/i, path: '/settings?tab=ai', label: 'AI Settings' },
  { re: /whatsapp\s+settings?|settings\s+whatsapp/i, path: '/settings?tab=whatsapp', label: 'WhatsApp Settings' },
  { re: /email\s+settings?|settings\s+email/i, path: '/settings?tab=email', label: 'Email Settings' },
  { re: /(?:knowledge\s+base|\bkb\b)/i, path: '/settings?tab=ai', label: 'Knowledge Base' },
  { re: /quick\s+replies?/i, path: '/settings?tab=ai', label: 'Quick Replies' },
  { re: /automation(?:\s+settings?)?|settings\s+automation/i, path: '/settings?tab=automation', label: 'Automation' },
  { re: /crm\s+settings?|settings\s+crm/i, path: '/settings?tab=crm', label: 'CRM Settings' },
  { re: /audit(?:\s+log)?|settings\s+audit/i, path: '/settings?tab=audit', label: 'Audit log' },
  {
    re: /(?<!(?:email|whatsapp|ai|crm|automation|audit)\s)(?:system\s+)?settings\b(?!\s+(?:email|whatsapp|ai|crm|automation|audit)\b)/i,
    path: '/settings',
    label: 'Settings',
  },
  { re: /\bdashboard\b/i, path: '/dashboard', label: 'Dashboard' },
  { re: /\b(?:leads?|conversations)\b/i, path: '/conversations', label: 'Leads' },
  { re: /\bmessages?\b/i, path: '/messages', label: 'Messages' },
  { re: /\bcustomers?\b/i, path: '/customers', label: 'Customers' },
  { re: /\btasks\b/i, path: '/tasks', label: 'Tasks' },
  { re: /\bprofile\b/i, path: '/profile', label: 'Profile' },
  { re: /active\s+sessions/i, path: '/settings/sessions', label: 'Active Sessions' },
];

function normalizeNavText(text: string): string {
  return text
    .toLowerCase()
    .replace(/usermanagement|user-management/g, 'user management')
    .replace(/dashbaord|dashbord|dashb\s*oard/g, 'dashboard');
}

export function wantsLogout(text: string): boolean {
  const t = text.toLowerCase();
  if (/\b(?:logout|log\s*out|sign\s*out|log\s*off|sign\s*off)\b/.test(t)) return true;
  const squish = t.replace(/[^a-z]/g, '');
  if (/logout|lkogout|logut|signout|logoff/.test(squish)) return true;
  if (/log[o0]?out/.test(squish)) return true;
  return false;
}

export function wantsRefresh(text: string): boolean {
  const t = text.toLowerCase();
  return /\b(refresh|reload)\b/.test(t) || /refre{1,2}sh|refrsh|rfresh/.test(t);
}

export function wantsAssignLead(text: string): boolean {
  return (
    /\bassign\b.*\b(?:to|lead)\b/i.test(text) || /\bassign\s+(?:this\s+)?lead\b/i.test(text)
  );
}

export function wantsCrmMutation(text: string): boolean {
  const t = text.toLowerCase();
  return (
    wantsAssignLead(t) ||
    /\b(?:update|set|mark)\b.*\b(?:status|as|to)\b/.test(t) ||
    /\bstatus\s+(?:to|as)\b/.test(t) ||
    /\brevert\b.*\bstatus\b/.test(t) ||
    /\b(?:send|reply)\b.*\b(?:message|to|:)\b/.test(t) ||
    /\b(?:turn|toggle|enable|disable)\b.*\bai\b/.test(t)
  );
}

export function wantsRoleChange(text: string): boolean {
  const t = text.toLowerCase();
  if (wantsRefresh(t) || wantsLogout(t)) return false;
  if (/\bfrom\s+admin\s+to\s+user\b/.test(t) || /\bfrom\s+user\s+to\s+admin\b/.test(t)) return true;
  if (/\b(revert|demote)\b.*\brole\b/.test(t)) return true;
  if (/\b(make|promote|set|change|turn|revert|demote)\b/.test(t) && /\b(admin|user)\b/.test(t)) return true;
  const squish = t.replace(/[^a-z0-9]/g, '').replace(/^mak(?!e)/, 'make');
  return /(?:make|promote|set|change|turn|revert|demote)\w{2,24}?(admin|user)$/.test(squish);
}

function isInformationalQuery(text: string): boolean {
  return /\b(how many|count|number of|total|find|list|show|who|what)\b/i.test(text);
}

const ACTION_VERBS =
  /\b(update|set|mark|assign|send|reply|toggle|turn|open|go|create|delete|reset|verify|disable|enable|switch|change|make|logout|refresh|promote|demote|revert|execute|name)\b/i;

const DESTRUCTIVE_ACTIONS = new Set([
  'delete_user',
  'bulk_delete_users',
  'bulk_delete_customers',
  'delete_task',
]);

function allowsDestructiveReplay(text: string): boolean {
  return /\b(delete|remove|confirm)\b/i.test(text);
}

function isInformationalOnly(text: string): boolean {
  if (wantsNavigation(text)) return false;
  if (!isInformationalQuery(text)) return false;
  return !ACTION_VERBS.test(text);
}

function actionHasRequiredFields(action: AssistantAction): boolean {
  switch (action.type) {
    case 'navigate':
      return !!action.path;
    case 'open_lead':
      return !!action.conversation_uuid;
    case 'open_customer':
      return !!action.customer_uuid;
    case 'open_user':
      return action.user_id != null;
    case 'toggle_ai':
      return !!action.conversation_uuid && action.enabled != null;
    case 'assign_lead':
      return !!action.conversation_uuid && !!action.user_email;
    case 'update_lead_status':
      return !!action.conversation_uuid && !!action.lead_status;
    case 'send_message':
      return !!action.conversation_uuid && !!action.message;
    case 'toggle_user_status':
      return action.user_id != null && action.active != null;
    case 'verify_user':
    case 'delete_user':
      return action.user_id != null;
    case 'ui_action':
      return !!(action.ui_target || action.target);
    case 'create_customer':
      return !!action.phone;
    case 'create_user':
      return !!action.email && !!action.password;
    case 'create_task':
      return !!(action.task_title || action.title);
    case 'update_task':
      return !!action.task_uuid;
    case 'delete_task':
      return !!action.task_uuid;
    case 'reset_user_password':
      return action.user_id != null;
    case 'update_user_profile':
      return action.user_id != null;
    case 'update_settings':
      return (
        !!(action.settings_category || action.category) &&
        !!(action.settings || action.settings_json)
      );
    case 'switch_ai_provider':
      return !!action.provider_id;
    case 'bulk_delete_users':
      return Array.isArray(action.user_ids) && action.user_ids.length > 0;
    case 'bulk_delete_customers':
      return Array.isArray(action.customer_uuids) && action.customer_uuids.length > 0;
    case 'change_user_role':
      return (
        action.user_id != null &&
        !!action.role &&
        ['USER', 'ADMIN'].includes(String(action.role).toUpperCase())
      );
    default:
      return true;
  }
}

export function isAffirmation(text: string): boolean {
  const t = text.trim();
  if (
    /^(yes|yeah|yep|yup|ok|okay|sure|do it|go|go ahead|please|correct|just go|go there)\.?$/i.test(
      t,
    )
  ) {
    return true;
  }
  return /\b(?:just\s+go|go\s+there|do\s+it\s+now)\b/i.test(t);
}

export function wantsNavigation(text: string): boolean {
  if (wantsCrmMutation(text)) return false;
  const t = normalizeNavText(text);
  if (/\b(this page|that page|current page|here)\b/.test(t)) return true;
  if (/\b(go|goto|got to|open|take me|navigate|bring me|show me|view|see|then|just go)\b/.test(t)) {
    return PAGE_RULES.some((r) => r.re.test(t));
  }
  return PAGE_RULES.some((r) => r.re.test(t));
}

export function isCommandIntent(text: string): boolean {
  const t = text.toLowerCase();
  if (wantsLogout(t) || wantsRefresh(t) || wantsRoleChange(t) || wantsNavigation(t)) return true;
  if (isAffirmation(t)) return true;
  if (isInformationalOnly(t)) return false;
  return ACTION_VERBS.test(t) || /\b(this page|here|sign out)\b/i.test(t);
}

function dedupeSettingsNavActions(actions: AssistantAction[]): AssistantAction[] {
  const hasTab = actions.some((a) => a.path?.startsWith('/settings?tab='));
  if (!hasTab) return actions;
  return actions.filter((a) => a.path !== '/settings');
}

/** All pages mentioned in the message, in order of appearance. */
export function inferAllNavigateActions(text: string, pathname?: string): AssistantAction[] {
  if (wantsLogout(text) || wantsCrmMutation(text)) return [];
  const t = normalizeNavText(text);
  if (/\b(this page|that page|current page|here)\b/.test(t) && pathname) {
    return [{ type: 'navigate', path: pathname, label: 'Open this page' }];
  }
  const hits: { index: number; path: string; label: string }[] = [];
  for (const rule of PAGE_RULES) {
    const re = new RegExp(rule.re.source, 'gi');
    let match: RegExpExecArray | null;
    while ((match = re.exec(t)) !== null) {
      hits.push({ index: match.index, path: rule.path, label: rule.label });
    }
  }
  hits.sort((a, b) => a.index - b.index);
  const seen = new Set<string>();
  const actions: AssistantAction[] = [];
  for (const hit of hits) {
    if (seen.has(hit.path)) continue;
    seen.add(hit.path);
    actions.push({ type: 'navigate', path: hit.path, label: `Open ${hit.label}` });
  }
  if (actions.length > 0) return dedupeSettingsNavActions(actions);
  if (wantsNavigation(text)) return [];
  return [];
}

const EXPLICIT_PATH_RE =
  /\/(?:dashboard|admin\/users(?:\/\d+)?|settings(?:\/sessions)?(?:\?[^\s)>]+)?|conversations|messages|customers(?:\/[^\s)>]+)?|tasks|profile)/gi;

const ACTION_TYPE_IN_JSON_RE =
  /"type"\s*:\s*"(navigate|open_lead|toggle_ai|open_customer|change_user_role|refresh_page|assign_lead|update_lead_status|send_message|toggle_user_status|verify_user|delete_user|open_user|logout|create_user|reset_user_password|update_user_profile|update_settings|switch_ai_provider|get_analytics|create_task|update_task|delete_task|create_customer|bulk_delete_users|bulk_delete_customers|ui_action)"/i;

function extractBalancedJsonActionChunks(text: string): string[] {
  const chunks: string[] = [];
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (ch !== '{' && ch !== '[') {
      i += 1;
      continue;
    }
    const start = i;
    const opener = ch;
    const closer = opener === '{' ? '}' : ']';
    let depth = 1;
    i += 1;
    let inString = false;
    let escape = false;
    while (i < text.length && depth > 0) {
      const c = text[i];
      if (inString) {
        if (escape) escape = false;
        else if (c === '\\') escape = true;
        else if (c === '"') inString = false;
      } else if (c === '"') inString = true;
      else if (c === opener) depth += 1;
      else if (c === closer) depth -= 1;
      i += 1;
    }
    if (depth === 0) {
      const chunk = text.slice(start, i);
      if (ACTION_TYPE_IN_JSON_RE.test(chunk)) chunks.push(chunk);
    }
  }
  return chunks;
}

function parseActionJson(raw: string): AssistantAction[] {
  try {
    const data = JSON.parse(raw) as unknown;
    const items = Array.isArray(data)
      ? data
      : data && typeof data === 'object' && 'actions' in data
        ? (data as { actions: unknown }).actions
        : [data];
    if (!Array.isArray(items)) return [];
    return items.filter(
      (item): item is AssistantAction =>
        !!item &&
        typeof item === 'object' &&
        actionHasRequiredFields(item as AssistantAction),
    );
  } catch {
    return [];
  }
}

function parseActionsFromAssistantText(content: string): AssistantAction[] {
  const actions: AssistantAction[] = [];
  const blockRe = /```actions\s*([\s\S]*?)```/gi;
  let blockMatch: RegExpExecArray | null;
  while ((blockMatch = blockRe.exec(content)) !== null) {
    actions.push(...parseActionJson(blockMatch[1].trim()));
  }
  for (const chunk of extractBalancedJsonActionChunks(content)) {
    actions.push(...parseActionJson(chunk));
  }
  const seen = new Set<string>();
  return actions.filter((a) => {
    const key = JSON.stringify(a);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

type HistoryEntry = AssistantChatMessage & {
  actions?: AssistantAction[];
  pendingActions?: AssistantAction[];
};

function pendingNavFromAssistantText(content: string): AssistantAction[] {
  const seen = new Set<string>();
  const actions: AssistantAction[] = [];
  let match: RegExpExecArray | null;
  const re = new RegExp(EXPLICIT_PATH_RE.source, 'gi');
  while ((match = re.exec(content)) !== null) {
    const path = match[0];
    if (seen.has(path)) continue;
    seen.add(path);
    const label = inferAllNavigateActions(path).find((a) => a.path === path)?.label ?? `Open ${path}`;
    actions.push({ type: 'navigate', path, label });
  }
  if (actions.length > 0) return dedupeSettingsNavActions(actions);
  return inferAllNavigateActions(content);
}

function pendingActionsFromHistory(
  messages: HistoryEntry[],
  text: string,
): AssistantAction[] {
  const allowDestructive = allowsDestructiveReplay(text);
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.role !== 'assistant') continue;
    const stored = msg.pendingActions ?? msg.actions;
    if (stored && stored.length > 0) {
      return stored.filter(
        (a) =>
          AUTO_EXECUTE.has(a.type) &&
          actionHasRequiredFields(a) &&
          (allowDestructive || !DESTRUCTIVE_ACTIONS.has(a.type)),
      );
    }
    const fromText = parseActionsFromAssistantText(msg.content);
    if (fromText.length > 0) return fromText;
    const navOnly = pendingNavFromAssistantText(msg.content);
    if (navOnly.length > 0) return navOnly;
  }
  return [];
}

export function resolveClientActions(
  text: string,
  serverActions: AssistantAction[],
  pathname?: string,
  history?: HistoryEntry[],
): AssistantAction[] {
  if (wantsLogout(text)) {
    return [{ type: 'logout', label: 'Sign out' }];
  }
  if (wantsRefresh(text)) {
    return [{ type: 'refresh_page', label: 'Refresh page' }];
  }
  if (wantsRoleChange(text)) {
    const roleAction = serverActions.find(
      (a) => a.type === 'change_user_role' && a.user_id != null,
    );
    if (roleAction) return [roleAction];
  }

  if (isAffirmation(text) && history && history.length > 0) {
    const pending = pendingActionsFromHistory(history, text);
    if (pending.length > 0) return pending;
  }

  const crmActions = serverActions.filter(
    (a) =>
      ['assign_lead', 'update_lead_status', 'send_message', 'toggle_ai'].includes(a.type) &&
      actionHasRequiredFields(a),
  );
  if (crmActions.length > 0 && wantsCrmMutation(text)) {
    return crmActions;
  }

  const commandLike =
    wantsNavigation(text) || isCommandIntent(text) || ACTION_VERBS.test(text);

  // Tab/page navigation beats generic UI targets (e.g. "open settings ai" ≠ gear icon).
  const clientNav = inferAllNavigateActions(text, pathname);
  if (clientNav.length > 0 && wantsNavigation(text)) {
    return clientNav;
  }

  const uiTarget = parseUiTargetFromText(text);
  if (uiTarget === 'profile_logout') {
    return [{ type: 'logout', label: 'Sign out' }];
  }
  if (uiTarget) {
    return [{ type: 'ui_action', ui_target: uiTarget, label: `UI: ${uiTarget}` }];
  }

  const serverNav = dedupeSettingsNavActions(
    serverActions.filter((a) => a.type === 'navigate' && actionHasRequiredFields(a)),
  );
  if (serverNav.length > 0 && commandLike) {
    return serverNav;
  }

  if (serverNav.length > 0) {
    return serverNav;
  }

  const executable = serverActions.filter(
    (a) => AUTO_EXECUTE.has(a.type) && actionHasRequiredFields(a),
  );
  if (executable.length > 0 && !isInformationalOnly(text)) {
    return executable;
  }
  return [];
}

export function isAutoExecuteAction(action: AssistantAction): boolean {
  return AUTO_EXECUTE.has(action.type);
}
