import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const workflowPath = path.join(repoRoot, 'n8n', 'workflows', 'chatwoot-crm-whatsapp-telegram-bridge.json');
const repoDbPaths = [
  path.join(repoRoot, 'n8n', '.n8n', 'database.sqlite'),
  path.join(repoRoot, 'n8n', '.n8n', '.n8n', 'database.sqlite'),
];
const workflowName = 'CRM - Chatwoot WhatsApp Telegram Bridge';

function randomId(prefix) {
  return `${prefix}-${crypto.randomBytes(4).toString('hex')}`;
}

function assignment(name, value, type = 'string') {
  return {
    id: randomId(name),
    name,
    value,
    type,
  };
}

function manualTrigger(id, position, name = 'Manual Trigger') {
  return {
    parameters: {},
    id,
    name,
    type: 'n8n-nodes-base.manualTrigger',
    typeVersion: 1,
    position,
  };
}

function webhook(id, position, name, routePath, httpMethod = 'POST') {
  return {
    parameters: {
      httpMethod,
      path: routePath,
      responseMode: 'responseNode',
      options: {},
    },
    id,
    name,
    webhookId: id,
    type: 'n8n-nodes-base.webhook',
    typeVersion: 2.1,
    position,
  };
}

function codeNode(id, position, name, jsCode, mode = 'runOnceForAllItems') {
  return {
    parameters: {
      mode,
      jsCode,
    },
    id,
    name,
    type: 'n8n-nodes-base.code',
    typeVersion: 2,
    position,
  };
}

function switchNode(id, position, name, outputExpression, numberOutputs = 2) {
  return {
    parameters: {
      mode: 'expression',
      numberOutputs,
      output: outputExpression,
    },
    id,
    name,
    type: 'n8n-nodes-base.switch',
    typeVersion: 3.4,
    position,
  };
}

function mergeNode(id, position, name, numberInputs = 2) {
  return {
    parameters: {
      mode: 'append',
      numberInputs,
    },
    id,
    name,
    type: 'n8n-nodes-base.merge',
    typeVersion: 3.2,
    position,
  };
}

function respondToWebhook(
  id,
  position,
  name = 'Respond to Webhook',
  respondWith = 'firstIncomingItem',
  responseBody = undefined
) {
  const parameters = {
    respondWith,
  };

  if (typeof responseBody !== 'undefined') {
    parameters.responseBody = responseBody;
  }

  return {
    parameters,
    id,
    name,
    type: 'n8n-nodes-base.respondToWebhook',
    typeVersion: 1.5,
    position,
  };
}

function setAssignments(id, position, name, assignments) {
  return {
    parameters: {
      assignments: {
        assignments,
      },
      includeOtherFields: true,
    },
    id,
    name,
    type: 'n8n-nodes-base.set',
    typeVersion: 3.4,
    position,
  };
}

function workflowBase(name, nodes, connections, description, active = true) {
  return {
    name,
    nodes,
    connections,
    pinData: {},
    settings: {
      executionOrder: 'v1',
    },
    staticData: null,
    meta: {
      templateCredsSetupCompleted: true,
      chatwootBridge: true,
      freeOnly: false,
    },
    active,
    description,
  };
}

function buildCrmWorkflow() {
  const nodes = [
    webhook('chatwoot-webhook', [220, 140], 'Chatwoot Events', 'crm/chatwoot/events'),
    webhook('whatsapp-verify', [220, 280], 'WhatsApp Verify', 'crm/whatsapp/inbound', 'GET'),
    webhook('whatsapp-webhook', [220, 420], 'WhatsApp Inbound', 'crm/whatsapp/inbound'),
    webhook('telegram-webhook', [220, 560], 'Telegram Inbound', 'crm/telegram/inbound'),
    manualTrigger('manual-bridge', [220, 700], 'Manual Trigger'),
    codeNode(
      'sample-bridge-event',
      [500, 700],
      'Sample Bridge Event',
      `return [
  {
    json: {
      event: 'message_created',
      source: 'manual',
      inbox: { name: 'WhatsApp Bridge' },
      conversation: {
        id: 'cw-7821',
        channel: 'Channel::Api',
        contact_inbox: { source_id: '5491100001111' },
      },
      contact: {
        name: 'Lucia Gomez',
        phone_number: '+5491100001111',
      },
      message_type: 'outgoing',
      private: false,
      content: 'Hola Lucia, te escribimos desde Chatwoot para continuar tu consulta.',
      assignee: { name: 'Equipo CRM' },
    },
  },
];`
    ),
    codeNode(
      'normalize-bridge-event',
      [780, 460],
      'Normalize Bridge Event',
      `const input = items[0]?.json ?? {};
const payload = input.body && typeof input.body === 'object' ? input.body : input;
const headers = input.headers && typeof input.headers === 'object' ? input.headers : {};
const query = input.query && typeof input.query === 'object' ? input.query : {};
const executionSource = input.body ? 'webhook' : 'manual';
const whatsappValue = payload.entry?.[0]?.changes?.[0]?.value ?? {};
const whatsappMessage = whatsappValue.messages?.[0] ?? null;
const whatsappStatus = whatsappValue.statuses?.[0] ?? null;
const telegramMessage = payload.message ?? payload.edited_message ?? null;
const isTelegram = Number.isInteger(payload.update_id) && Boolean(telegramMessage);
const isWhatsApp = Boolean(whatsappMessage) || Boolean(whatsappStatus);
const isChatwoot = !isTelegram && !isWhatsApp;
let sourceSystem = 'chatwoot';
let channel = '';
let action = 'ignore-event';
let direction = 'internal';
let eventName = typeof payload.event === 'string' ? payload.event : 'message_created';
let conversationId = '';
let externalId = '';
let externalMessageId = '';
let contactName = '';
let assignedAgent = '';
let messageText = '';
if (isWhatsApp) {
  sourceSystem = 'whatsapp';
  channel = 'whatsapp';
  action = whatsappStatus ? 'sync-status' : 'upsert-chatwoot-message';
  direction = whatsappStatus ? 'status' : 'incoming';
  eventName = whatsappStatus ? 'delivery-status' : 'message_received';
  conversationId = String(whatsappStatus?.conversation?.id ?? whatsappMessage?.from ?? '');
  externalId = String(whatsappStatus?.recipient_id ?? whatsappMessage?.from ?? '');
  externalMessageId = String(whatsappStatus?.id ?? whatsappMessage?.id ?? '');
  contactName = String(whatsappValue.contacts?.[0]?.profile?.name ?? 'Contacto WhatsApp');
  assignedAgent = 'Chatwoot';
  messageText = String(
    whatsappStatus?.status ??
      whatsappMessage?.text?.body ??
      whatsappMessage?.button?.text ??
      whatsappMessage?.interactive?.button_reply?.title ??
      ''
  );
} else if (isTelegram) {
  sourceSystem = 'telegram';
  channel = 'telegram';
  action = 'upsert-chatwoot-message';
  direction = 'incoming';
  eventName = 'message_received';
  conversationId = String(telegramMessage?.chat?.id ?? '');
  externalId = String(telegramMessage?.chat?.id ?? '');
  externalMessageId = String(telegramMessage?.message_id ?? '');
  const firstName = String(telegramMessage?.from?.first_name ?? '');
  const lastName = String(telegramMessage?.from?.last_name ?? '');
  contactName = [firstName, lastName].filter(Boolean).join(' ') || 'Contacto Telegram';
  assignedAgent = 'Chatwoot';
  messageText = String(telegramMessage?.text ?? telegramMessage?.caption ?? '');
} else if (isChatwoot) {
  sourceSystem = 'chatwoot';
  const inboxName = String(
    payload.inbox?.name ??
      payload.conversation?.meta?.sender?.channel ??
      payload.conversation?.channel ??
      payload.channel ??
      ''
  ).toLowerCase();
  channel = inboxName.includes('telegram')
    ? 'telegram'
    : inboxName.includes('whatsapp')
      ? 'whatsapp'
      : String(payload.channel ?? '').toLowerCase();
  direction = payload.message_type === 'incoming' ? 'incoming' : 'outgoing';
  action =
    payload.private === true || direction === 'incoming' || !String(payload.content ?? '').trim()
      ? 'ignore-event'
      : 'send-channel-message';
  eventName = String(payload.event ?? 'message_created');
  conversationId = String(payload.conversation?.id ?? payload.id ?? '');
  externalId = String(
    payload.conversation?.contact_inbox?.source_id ??
      payload.contact?.phone_number ??
      payload.contact?.identifier ??
      ''
  );
  externalMessageId = String(payload.id ?? payload.message?.id ?? '');
  contactName = String(payload.contact?.name ?? payload.conversation?.meta?.sender?.name ?? 'Contacto CRM');
  assignedAgent = String(payload.assignee?.name ?? payload.meta?.assignee?.name ?? 'Equipo CRM');
  messageText = String(payload.content ?? payload.message?.content ?? payload.body ?? payload.text ?? '').trim();
}
return [
  {
    json: {
      requestId: payload.requestId ?? 'crm-' + Date.now(),
      source: String(payload.source ?? executionSource),
      executionSource,
      sourceSystem,
      channel,
      action,
      direction,
      eventName,
      conversationId,
      externalId,
      externalMessageId,
      contactName,
      assignedAgent,
      messageText,
      crm: 'chatwoot',
      bridge: 'chatwoot-whatsapp-telegram',
      headers,
      query,
      rawPayload: payload,
    },
  },
];`
    ),
    setAssignments('load-bridge-config', [1060, 460], 'Load Runtime Config', [
      assignment('chatwootBaseUrl', "={{$env.CHATWOOT_BASE_URL || ''}}"),
      assignment('chatwootAccountId', "={{$env.CHATWOOT_ACCOUNT_ID || ''}}"),
      assignment('chatwootApiToken', "={{$env.CHATWOOT_API_TOKEN || ''}}"),
      assignment(
        'chatwootInboxIdWhatsapp',
        "={{$env.CHATWOOT_API_INBOX_ID_WHATSAPP || $env.CHATWOOT_INBOX_ID_WHATSAPP || ''}}"
      ),
      assignment(
        'chatwootInboxIdTelegram',
        "={{$env.CHATWOOT_API_INBOX_ID_TELEGRAM || $env.CHATWOOT_INBOX_ID_TELEGRAM || ''}}"
      ),
      assignment('whatsappAccessToken', "={{$env.WHATSAPP_ACCESS_TOKEN || ''}}"),
      assignment('whatsappPhoneNumberId', "={{$env.WHATSAPP_PHONE_NUMBER_ID || ''}}"),
      assignment('whatsappVerifyToken', "={{$env.WHATSAPP_VERIFY_TOKEN || ''}}"),
      assignment('telegramBotToken', "={{$env.TELEGRAM_BOT_TOKEN || ''}}"),
      assignment('telegramWebhookSecret', "={{$env.TELEGRAM_WEBHOOK_SECRET || ''}}"),
    ]),
    codeNode(
      'validate-bridge-config',
      [1340, 460],
      'Validate Bridge Config',
      `const clean = (value) => String(value ?? '').trim();
const channel = clean($json.channel).toLowerCase();
const action = clean($json.action);
const errors = [];
const targetInboxId = Number(
  channel === 'telegram' ? clean($json.chatwootInboxIdTelegram) : clean($json.chatwootInboxIdWhatsapp)
);
const externalId = clean($json.externalId);
const messageText = clean($json.messageText);
const telegramSecret = clean($json.telegramWebhookSecret);
const telegramHeader = clean(
  $json.headers?.['x-telegram-bot-api-secret-token'] ??
    $json.headers?.['X-Telegram-Bot-Api-Secret-Token']
);
if (!channel && action === 'send-channel-message') {
  errors.push('No pude inferir si la conversacion de Chatwoot corresponde a WhatsApp o Telegram.');
}
if ($json.sourceSystem === 'telegram' && telegramSecret && telegramSecret !== telegramHeader) {
  errors.push('El secret token de Telegram no coincide con TELEGRAM_WEBHOOK_SECRET.');
}
if (action === 'upsert-chatwoot-message' || action === 'sync-status') {
  if (!clean($json.chatwootBaseUrl)) errors.push('Falta CHATWOOT_BASE_URL.');
  if (!clean($json.chatwootAccountId)) errors.push('Falta CHATWOOT_ACCOUNT_ID.');
  if (!clean($json.chatwootApiToken)) errors.push('Falta CHATWOOT_API_TOKEN.');
  if (!targetInboxId) {
    errors.push(
      channel === 'telegram'
        ? 'Falta CHATWOOT_API_INBOX_ID_TELEGRAM o CHATWOOT_INBOX_ID_TELEGRAM.'
        : 'Falta CHATWOOT_API_INBOX_ID_WHATSAPP o CHATWOOT_INBOX_ID_WHATSAPP.'
    );
  }
}
if (action === 'send-channel-message') {
  if (channel === 'telegram' && !clean($json.telegramBotToken)) {
    errors.push('Falta TELEGRAM_BOT_TOKEN.');
  }
  if (channel === 'whatsapp') {
    if (!clean($json.whatsappAccessToken)) errors.push('Falta WHATSAPP_ACCESS_TOKEN.');
    if (!clean($json.whatsappPhoneNumberId)) errors.push('Falta WHATSAPP_PHONE_NUMBER_ID.');
  }
}
if ((action === 'upsert-chatwoot-message' || action === 'send-channel-message') && !messageText) {
  errors.push('Falta el contenido del mensaje para ejecutar el bridge real.');
}
if ((action === 'upsert-chatwoot-message' || action === 'send-channel-message' || action === 'sync-status') && !externalId) {
  errors.push('Falta el externalId del contacto/canal.');
}
return {
  json: {
    ...$json,
    channel,
    action,
    targetInboxId: Number.isFinite(targetInboxId) && targetInboxId > 0 ? targetInboxId : null,
    identifierKey: channel && externalId ? channel + ':' + externalId : '',
    valid: errors.length === 0,
    configErrors: errors,
  },
};`,
      'runOnceForEachItem'
    ),
    switchNode(
      'route-bridge-action',
      [1620, 460],
      'Route Bridge Action',
      "={{!$json.valid ? 4 : $json.action === 'send-channel-message' ? 1 : $json.action === 'sync-status' ? 2 : $json.action === 'ignore-event' ? 3 : 0}}",
      5
    ),
    codeNode(
      'run-chatwoot-upsert',
      [1900, 180],
      'Run Chatwoot Upsert',
      `const clean = (value) => String(value ?? '').trim();
const baseUrl = clean($json.chatwootBaseUrl).replace(/\\/+$/, '');
const accountId = clean($json.chatwootAccountId);
const apiToken = clean($json.chatwootApiToken);
const channel = clean($json.channel) || 'whatsapp';
const externalId = clean($json.externalId);
const identifierKey = clean($json.identifierKey) || channel + ':' + externalId;
const targetInboxId = Number($json.targetInboxId ?? 0);
const messageText = clean($json.messageText);
const contactName = clean($json.contactName) || (channel === 'telegram' ? 'Contacto Telegram' : 'Contacto WhatsApp');
const request = async (method, endpoint, body) =>
  this.helpers.httpRequest({
    method,
    url: baseUrl + endpoint,
    headers: {
      'Content-Type': 'application/json',
      api_access_token: apiToken,
    },
    body,
    json: true,
    timeout: 60000,
  });
const matchContact = (candidate) => {
  const candidateIdentifier = clean(candidate?.identifier ?? candidate?.contact_inboxes?.[0]?.source_id);
  const candidatePhone = clean(candidate?.phone_number);
  return (
    candidateIdentifier === identifierKey ||
    candidateIdentifier === externalId ||
    candidatePhone === externalId ||
    candidatePhone.replace(/[^0-9]/g, '') === externalId.replace(/[^0-9]/g, '')
  );
};
try {
  let contact = null;
  const searchTerms = [...new Set([identifierKey, externalId, externalId.replace(/[^0-9]/g, '')].filter(Boolean))];
  for (const term of searchTerms) {
    const searchResult = await request('GET', '/api/v1/accounts/' + accountId + '/contacts/search?q=' + encodeURIComponent(term));
    const payload = Array.isArray(searchResult?.payload) ? searchResult.payload : Array.isArray(searchResult) ? searchResult : [];
    contact = payload.find(matchContact) ?? payload[0] ?? null;
    if (contact) break;
  }
  let contactId = Number(contact?.id ?? 0);
  if (!contactId) {
    const created = await request('POST', '/api/v1/accounts/' + accountId + '/contacts', {
      inbox_id: targetInboxId,
      name: contactName,
      phone_number: channel === 'whatsapp' ? externalId : undefined,
      identifier: identifierKey,
      custom_attributes: {
        bridge: 'n8n-chatwoot',
        bridge_channel: channel,
        external_id: externalId,
      },
    });
    const createdPayload = created?.payload ?? created;
    contact = createdPayload?.contact ?? createdPayload;
    contactId = Number(contact?.id ?? createdPayload?.id ?? 0);
  }
  if (!contactId) {
    throw new Error('Chatwoot no devolvio un contact_id usable.');
  }
  const inboxResult = await request(
    'GET',
    '/api/v1/accounts/' + accountId + '/contacts/' + contactId + '/contactable_inboxes'
  );
  const inboxes = Array.isArray(inboxResult?.payload) ? inboxResult.payload : [];
  const hasInbox = inboxes.some((entry) => Number(entry?.inbox?.id ?? entry?.inbox_id ?? 0) === targetInboxId);
  if (!hasInbox) {
    await request('POST', '/api/v1/accounts/' + accountId + '/contacts/' + contactId + '/contact_inboxes', {
      inbox_id: targetInboxId,
      source_id: externalId,
    });
  }
  const conversationsResult = await request(
    'GET',
    '/api/v1/accounts/' + accountId + '/contacts/' + contactId + '/conversations'
  );
  const conversations = Array.isArray(conversationsResult?.payload) ? conversationsResult.payload : [];
  let conversation =
    conversations
      .filter((entry) => Number(entry?.inbox_id ?? 0) === targetInboxId)
      .sort(
        (left, right) =>
          Number(right?.last_activity_at ?? right?.updated_at ?? 0) -
          Number(left?.last_activity_at ?? left?.updated_at ?? 0)
      )[0] ?? null;
  let createdConversation = false;
  if (!conversation) {
    conversation = await request('POST', '/api/v1/accounts/' + accountId + '/conversations', {
      source_id: externalId,
      inbox_id: targetInboxId,
      contact_id: contactId,
      status: 'open',
      message: {
        content: messageText,
      },
    });
    createdConversation = true;
  }
  const conversationId = Number(conversation?.id ?? conversation?.payload?.id ?? 0);
  let messageId = '';
  if (!createdConversation) {
    const createdMessage = await request(
      'POST',
      '/api/v1/accounts/' + accountId + '/conversations/' + conversationId + '/messages',
      {
        content: messageText,
        message_type: 'incoming',
        private: false,
        content_type: 'text',
      }
    );
    messageId = clean(createdMessage?.id ?? createdMessage?.payload?.id ?? '');
  }
  return {
    json: {
      ...$json,
      ok: true,
      status: 'ok',
      contactId,
      conversationId,
      externalMessageId: clean($json.externalMessageId) || messageId,
      bridgeSummary: 'Mensaje entrante sincronizado en Chatwoot para ' + channel + '.',
      clientReadyOutput: {
        crm: 'Chatwoot',
        channel,
        deliverable: 'conversacion sincronizada',
        firstAction: createdConversation
          ? 'Se abrio una conversacion nueva en Chatwoot con el primer mensaje.'
          : 'Se reutilizo la conversacion existente y se agrego el mensaje entrante.',
      },
      operations: [
        'contact_id=' + contactId,
        'conversation_id=' + conversationId,
        createdConversation ? 'conversation_created=true' : 'message_appended=true',
      ],
      nextSteps: [
        'Verificar la conversacion en Chatwoot y confirmar el owner.',
        'Responder desde Chatwoot para validar el loop saliente por ' + channel + '.',
      ],
      errors: [],
    },
  };
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  return {
    json: {
      ...$json,
      ok: false,
      status: 'error',
      bridgeSummary: 'No pude sincronizar el inbound real en Chatwoot.',
      clientReadyOutput: {
        crm: 'Chatwoot',
        channel,
        deliverable: 'error operativo',
        firstAction: 'Revisar credenciales y endpoint de Chatwoot.',
      },
      operations: [],
      nextSteps: ['Corregir credenciales o permisos de Chatwoot y relanzar el webhook.'],
      errors: [message],
    },
  };
}`,
      'runOnceForEachItem'
    ),
    codeNode(
      'send-channel-message',
      [1900, 340],
      'Send Channel Message',
      `const clean = (value) => String(value ?? '').trim();
const channel = clean($json.channel);
const externalId = clean($json.externalId);
const messageText = clean($json.messageText);
try {
  let response = null;
  let externalMessageId = '';
  if (channel === 'telegram') {
    response = await this.helpers.httpRequest({
      method: 'POST',
      url: 'https://api.telegram.org/bot' + clean($json.telegramBotToken) + '/sendMessage',
      body: {
        chat_id: externalId,
        text: messageText,
      },
      json: true,
      timeout: 60000,
    });
    externalMessageId = clean(response?.result?.message_id);
  } else {
    response = await this.helpers.httpRequest({
      method: 'POST',
      url: 'https://graph.facebook.com/v20.0/' + clean($json.whatsappPhoneNumberId) + '/messages',
      headers: {
        Authorization: 'Bearer ' + clean($json.whatsappAccessToken),
        'Content-Type': 'application/json',
      },
      body: {
        messaging_product: 'whatsapp',
        to: externalId.replace(/^\\+/, ''),
        type: 'text',
        text: {
          body: messageText,
        },
      },
      json: true,
      timeout: 60000,
    });
    externalMessageId = clean(response?.messages?.[0]?.id);
  }
  return {
    json: {
      ...$json,
      ok: true,
      status: 'ok',
      externalMessageId,
      bridgeSummary: 'Mensaje saliente entregado al canal ' + channel + '.',
      clientReadyOutput: {
        crm: 'Chatwoot',
        channel,
        deliverable: 'mensaje saliente',
        firstAction: 'Confirmar recepcion en el canal y esperar status callback si aplica.',
      },
      operations: [
        channel === 'telegram' ? 'telegram.sendMessage' : 'whatsapp.cloud.messages.create',
      ],
      nextSteps: [
        'Esperar callback de estado del proveedor si el canal lo soporta.',
        'Verificar recepcion del lado del contacto.',
      ],
      errors: [],
    },
  };
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  return {
    json: {
      ...$json,
      ok: false,
      status: 'error',
      bridgeSummary: 'No pude enviar el mensaje real por ' + channel + '.',
      clientReadyOutput: {
        crm: 'Chatwoot',
        channel,
        deliverable: 'error operativo',
        firstAction: 'Revisar credenciales del canal y relanzar el envio.',
      },
      operations: [],
      nextSteps: ['Corregir credenciales del canal y volver a probar el envio.'],
      errors: [message],
    },
  };
}`,
      'runOnceForEachItem'
    ),
    codeNode(
      'sync-chatwoot-status',
      [1900, 500],
      'Sync Chatwoot Status',
      `const clean = (value) => String(value ?? '').trim();
const baseUrl = clean($json.chatwootBaseUrl).replace(/\\/+$/, '');
const accountId = clean($json.chatwootAccountId);
const apiToken = clean($json.chatwootApiToken);
const channel = clean($json.channel) || 'whatsapp';
const externalId = clean($json.externalId);
const identifierKey = clean($json.identifierKey) || channel + ':' + externalId;
const targetInboxId = Number($json.targetInboxId ?? 0);
const statusText = clean($json.messageText) || 'status recibido';
const request = async (method, endpoint, body) =>
  this.helpers.httpRequest({
    method,
    url: baseUrl + endpoint,
    headers: {
      'Content-Type': 'application/json',
      api_access_token: apiToken,
    },
    body,
    json: true,
    timeout: 60000,
  });
try {
  const searchTerms = [...new Set([identifierKey, externalId, externalId.replace(/[^0-9]/g, '')].filter(Boolean))];
  let contact = null;
  for (const term of searchTerms) {
    const searchResult = await request('GET', '/api/v1/accounts/' + accountId + '/contacts/search?q=' + encodeURIComponent(term));
    const payload = Array.isArray(searchResult?.payload) ? searchResult.payload : Array.isArray(searchResult) ? searchResult : [];
    contact = payload.find((candidate) => {
      const candidateIdentifier = clean(candidate?.identifier ?? candidate?.contact_inboxes?.[0]?.source_id);
      const candidatePhone = clean(candidate?.phone_number);
      return (
        candidateIdentifier === identifierKey ||
        candidateIdentifier === externalId ||
        candidatePhone === externalId ||
        candidatePhone.replace(/[^0-9]/g, '') === externalId.replace(/[^0-9]/g, '')
      );
    }) ?? payload[0] ?? null;
    if (contact) break;
  }
  const contactId = Number(contact?.id ?? 0);
  if (!contactId) {
    throw new Error('No encontre el contacto en Chatwoot para reflejar el estado.');
  }
  const conversationsResult = await request(
    'GET',
    '/api/v1/accounts/' + accountId + '/contacts/' + contactId + '/conversations'
  );
  const conversations = Array.isArray(conversationsResult?.payload) ? conversationsResult.payload : [];
  const conversation =
    conversations
      .filter((entry) => Number(entry?.inbox_id ?? 0) === targetInboxId)
      .sort(
        (left, right) =>
          Number(right?.last_activity_at ?? right?.updated_at ?? 0) -
          Number(left?.last_activity_at ?? left?.updated_at ?? 0)
      )[0] ?? null;
  const conversationId = Number(conversation?.id ?? 0);
  if (!conversationId) {
    throw new Error('No encontre una conversacion activa en Chatwoot para reflejar el estado.');
  }
  await request(
    'POST',
    '/api/v1/accounts/' + accountId + '/conversations/' + conversationId + '/messages',
    {
      content: 'Estado externo (' + channel + '): ' + statusText,
      message_type: 'outgoing',
      private: true,
      content_type: 'text',
    }
  );
  return {
    json: {
      ...$json,
      ok: true,
      status: 'ok',
      contactId,
      conversationId,
      bridgeSummary: 'Estado del canal reflejado en Chatwoot.',
      clientReadyOutput: {
        crm: 'Chatwoot',
        channel,
        deliverable: 'estado sincronizado',
        firstAction: 'Revisar la nota privada en la conversacion correspondiente.',
      },
      operations: ['chatwoot.private_note'],
      nextSteps: ['Confirmar si el contacto recibio o leyo el mensaje segun el callback del proveedor.'],
      errors: [],
    },
  };
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  return {
    json: {
      ...$json,
      ok: false,
      status: 'error',
      bridgeSummary: 'No pude reflejar el estado del canal en Chatwoot.',
      clientReadyOutput: {
        crm: 'Chatwoot',
        channel,
        deliverable: 'error operativo',
        firstAction: 'Verificar el mapeo entre externalId y conversacion en Chatwoot.',
      },
      operations: [],
      nextSteps: ['Corregir el mapeo de contacto/conversacion y reintentar la sincronizacion.'],
      errors: [message],
    },
  };
}`,
      'runOnceForEachItem'
    ),
    codeNode(
      'ignore-bridge-event',
      [1900, 660],
      'Ignore Bridge Event',
      `return {
  json: {
    ...$json,
    ok: true,
    status: 'ignored',
    bridgeSummary: 'El evento no requiere accion operativa en el bridge.',
    clientReadyOutput: {
      crm: 'Chatwoot',
      channel: $json.channel || 'crm',
      deliverable: 'evento ignorado',
      firstAction: 'Ninguno; solo se descartaron notas, eventos internos o entradas duplicadas.',
    },
    operations: ['ignored'],
    nextSteps: [],
    errors: [],
  },
};`,
      'runOnceForEachItem'
    ),
    codeNode(
      'return-config-error',
      [1900, 820],
      'Return Config Error',
      `return {
  json: {
    ...$json,
    ok: false,
    status: 'config-error',
    bridgeSummary: 'El bridge real no puede ejecutarse hasta completar la configuracion requerida.',
    clientReadyOutput: {
      crm: 'Chatwoot',
      channel: $json.channel || 'crm',
      deliverable: 'configuracion faltante',
      firstAction: 'Completar variables de entorno y reintentar el webhook.',
    },
    operations: [],
    nextSteps: ['Completar las variables faltantes y volver a disparar el evento.'],
    errors: Array.isArray($json.configErrors) ? $json.configErrors : ['Configuracion incompleta.'],
  },
};`,
      'runOnceForEachItem'
    ),
    mergeNode('merge-bridge-result', [2180, 460], 'Merge Bridge Result', 5),
    codeNode(
      'compose-bridge-response',
      [2460, 460],
      'Compose Bridge Response',
      `const payload = items[0]?.json ?? {};
return [
  {
    json: {
      requestId: payload.requestId ?? 'crm-preview',
      source: payload.source ?? 'manual',
      executionSource: payload.executionSource ?? 'manual',
      sourceSystem: payload.sourceSystem ?? 'chatwoot',
      channel: payload.channel ?? 'crm',
      action: payload.action ?? 'ignore-event',
      crm: payload.crm ?? 'chatwoot',
      ok: Boolean(payload.ok),
      status: payload.status ?? (payload.ok ? 'ok' : 'error'),
      ariaSummary: payload.bridgeSummary ?? 'Bridge CRM procesado.',
      clientReadyOutput: payload.clientReadyOutput ?? {
        crm: 'Chatwoot',
        channel: payload.channel ?? 'crm',
        deliverable: 'salida operacional',
        firstAction: 'Revisar el resultado del workflow.',
      },
      nextSteps: Array.isArray(payload.nextSteps) ? payload.nextSteps : [],
      errors: Array.isArray(payload.errors) ? payload.errors : [],
      operations: Array.isArray(payload.operations) ? payload.operations : [],
      contactId: payload.contactId ?? null,
      conversationId: payload.conversationId ?? null,
      externalMessageId: payload.externalMessageId ?? '',
      bridge: payload.bridge ?? 'chatwoot-whatsapp-telegram',
    },
  },
];`
    ),
    switchNode(
      'bridge-return-mode',
      [2740, 460],
      'Return Mode',
      "={{$json.executionSource === 'webhook' ? 1 : 0}}"
    ),
    setAssignments('preview-bridge-result', [3020, 360], 'Preview Result', [
      assignment('resultMode', 'manual-preview'),
      assignment('summarySource', 'chatwoot-crm-bridge'),
    ]),
    respondToWebhook('respond-bridge-webhook', [3020, 560], 'Respond to Webhook'),
    setAssignments('load-verify-config', [520, 280], 'Load Verify Config', [
      assignment('whatsappVerifyToken', "={{$env.WHATSAPP_VERIFY_TOKEN || ''}}"),
    ]),
    codeNode(
      'validate-whatsapp-verify',
      [800, 280],
      'Validate WhatsApp Verify',
      `const query = $json.query && typeof $json.query === 'object' ? $json.query : {};
const mode = String(query['hub.mode'] ?? '');
const challenge = String(query['hub.challenge'] ?? '');
const verifyToken = String(query['hub.verify_token'] ?? '');
const expectedToken = String($json.whatsappVerifyToken ?? '');
const verified = mode === 'subscribe' && Boolean(expectedToken) && verifyToken === expectedToken;
return {
  json: {
    verified,
    responseText: verified ? challenge : 'invalid verification token',
  },
};`,
      'runOnceForEachItem'
    ),
    respondToWebhook(
      'respond-whatsapp-verify',
      [1080, 280],
      'Respond WhatsApp Verify',
      'text',
      '={{$json.responseText}}'
    ),
  ];

  const connections = {
    'Chatwoot Events': {
      main: [[{ node: 'Normalize Bridge Event', type: 'main', index: 0 }]],
    },
    'WhatsApp Inbound': {
      main: [[{ node: 'Normalize Bridge Event', type: 'main', index: 0 }]],
    },
    'Telegram Inbound': {
      main: [[{ node: 'Normalize Bridge Event', type: 'main', index: 0 }]],
    },
    'Manual Trigger': {
      main: [[{ node: 'Sample Bridge Event', type: 'main', index: 0 }]],
    },
    'Sample Bridge Event': {
      main: [[{ node: 'Normalize Bridge Event', type: 'main', index: 0 }]],
    },
    'Normalize Bridge Event': {
      main: [[{ node: 'Load Runtime Config', type: 'main', index: 0 }]],
    },
    'Load Runtime Config': {
      main: [[{ node: 'Validate Bridge Config', type: 'main', index: 0 }]],
    },
    'Validate Bridge Config': {
      main: [[{ node: 'Route Bridge Action', type: 'main', index: 0 }]],
    },
    'Route Bridge Action': {
      main: [
        [{ node: 'Run Chatwoot Upsert', type: 'main', index: 0 }],
        [{ node: 'Send Channel Message', type: 'main', index: 0 }],
        [{ node: 'Sync Chatwoot Status', type: 'main', index: 0 }],
        [{ node: 'Ignore Bridge Event', type: 'main', index: 0 }],
        [{ node: 'Return Config Error', type: 'main', index: 0 }],
      ],
    },
    'Run Chatwoot Upsert': {
      main: [[{ node: 'Merge Bridge Result', type: 'main', index: 0 }]],
    },
    'Send Channel Message': {
      main: [[{ node: 'Merge Bridge Result', type: 'main', index: 1 }]],
    },
    'Sync Chatwoot Status': {
      main: [[{ node: 'Merge Bridge Result', type: 'main', index: 2 }]],
    },
    'Ignore Bridge Event': {
      main: [[{ node: 'Merge Bridge Result', type: 'main', index: 3 }]],
    },
    'Return Config Error': {
      main: [[{ node: 'Merge Bridge Result', type: 'main', index: 4 }]],
    },
    'Merge Bridge Result': {
      main: [[{ node: 'Compose Bridge Response', type: 'main', index: 0 }]],
    },
    'Compose Bridge Response': {
      main: [[{ node: 'Return Mode', type: 'main', index: 0 }]],
    },
    'Return Mode': {
      main: [
        [{ node: 'Preview Result', type: 'main', index: 0 }],
        [{ node: 'Respond to Webhook', type: 'main', index: 0 }],
      ],
    },
    'WhatsApp Verify': {
      main: [[{ node: 'Load Verify Config', type: 'main', index: 0 }]],
    },
    'Load Verify Config': {
      main: [[{ node: 'Validate WhatsApp Verify', type: 'main', index: 0 }]],
    },
    'Validate WhatsApp Verify': {
      main: [[{ node: 'Respond WhatsApp Verify', type: 'main', index: 0 }]],
    },
  };

  return workflowBase(
    workflowName,
    nodes,
    connections,
    'Bridge real para conectar Chatwoot con WhatsApp Cloud API y Telegram Bot API, validando credenciales, webhooks y errores operativos sin mockear respuestas.'
  );
}

function syncWebhookEntityRows(db, workflowId, workflow) {
  db.prepare('DELETE FROM webhook_entity WHERE workflowId = ?').run(workflowId);

  if (!workflow.active) {
    return;
  }

  const insertWebhookRow = db.prepare(`
    INSERT OR REPLACE INTO webhook_entity (
      workflowId,
      webhookPath,
      method,
      node,
      webhookId,
      pathLength
    ) VALUES (?, ?, ?, ?, ?, ?)
  `);

  const webhookNodes = Array.isArray(workflow.nodes)
    ? workflow.nodes.filter((node) => node.type === 'n8n-nodes-base.webhook')
    : [];

  for (const node of webhookNodes) {
    const webhookPath = String(node?.parameters?.path ?? '').replace(/^\/+/, '');
    if (!webhookPath) continue;

    const method = String(node?.parameters?.httpMethod ?? 'POST').toUpperCase();
    insertWebhookRow.run(
      workflowId,
      webhookPath,
      method,
      String(node?.name ?? node?.id ?? 'Webhook'),
      String(node?.webhookId ?? node?.id ?? ''),
      webhookPath.length
    );
  }
}

function syncWorkflowHistoryRow(db, row, workflow, versionId, now) {
  db.prepare(`
    INSERT OR REPLACE INTO workflow_history (
      versionId,
      workflowId,
      authors,
      createdAt,
      updatedAt,
      nodes,
      connections,
      name,
      autosaved,
      description
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    versionId,
    row.id,
    'import',
    now,
    now,
    JSON.stringify(workflow.nodes),
    JSON.stringify(workflow.connections),
    workflow.name ?? null,
    0,
    workflow.description ?? null
  );
}

function syncPublishedVersionRow(db, workflowId, versionId, isActive, now) {
  db.prepare('DELETE FROM workflow_published_version WHERE workflowId = ?').run(workflowId);

  if (!isActive) {
    return;
  }

  db.prepare(`
    INSERT OR REPLACE INTO workflow_published_version (
      workflowId,
      publishedVersionId,
      createdAt,
      updatedAt
    ) VALUES (?, ?, ?, ?)
  `).run(workflowId, versionId, now, now);
}

function deactivateWorkflowRow(db, rowId, now) {
  db.prepare(`
    UPDATE workflow_entity
    SET
      activeVersionId = NULL,
      updatedAt = ?,
      active = 0
    WHERE id = ?
  `).run(now, rowId);

  syncPublishedVersionRow(db, rowId, null, false, now);
  syncWebhookEntityRows(db, rowId, { active: false, nodes: [] });
}

function writeWorkflowFile(workflow) {
  fs.mkdirSync(path.dirname(workflowPath), { recursive: true });
  fs.writeFileSync(workflowPath, `${JSON.stringify(workflow, null, 2)}\n`, 'utf8');
}

function syncDatabase(dbPath, workflow) {
  if (!fs.existsSync(dbPath)) {
    return { dbPath, updated: 0, deactivated: 0, matchedNames: [] };
  }

  const db = new DatabaseSync(dbPath);
  const now = new Date().toISOString().slice(0, 23).replace('T', ' ');
  const rows = db
    .prepare('SELECT id, versionCounter FROM workflow_entity WHERE name = ? ORDER BY createdAt DESC, id DESC')
    .all(workflow.name);

  if (rows.length === 0) {
    return { dbPath, updated: 0, deactivated: 0, matchedNames: [`${workflow.name} -> missing in DB`] };
  }

  const primaryRow = rows[0];
  const nextVersionId = crypto.randomUUID();

  syncWorkflowHistoryRow(db, primaryRow, workflow, nextVersionId, now);

  db.prepare(`
    UPDATE workflow_entity
    SET
      nodes = ?,
      connections = ?,
      settings = ?,
      staticData = ?,
      pinData = ?,
      meta = ?,
      versionId = ?,
      activeVersionId = ?,
      versionCounter = ?,
      description = ?,
      updatedAt = ?,
      active = ?
    WHERE id = ?
  `).run(
    JSON.stringify(workflow.nodes),
    JSON.stringify(workflow.connections),
    JSON.stringify(workflow.settings ?? {}),
    workflow.staticData === null ? null : JSON.stringify(workflow.staticData),
    JSON.stringify(workflow.pinData ?? {}),
    JSON.stringify(workflow.meta ?? {}),
    nextVersionId,
    workflow.active ? nextVersionId : null,
    Number(primaryRow.versionCounter ?? 1) + 1,
    workflow.description ?? null,
    now,
    workflow.active ? 1 : 0,
    primaryRow.id
  );

  syncPublishedVersionRow(db, primaryRow.id, nextVersionId, workflow.active, now);
  syncWebhookEntityRows(db, primaryRow.id, workflow);

  let deactivated = 0;
  for (const duplicateRow of rows.slice(1)) {
    deactivateWorkflowRow(db, duplicateRow.id, now);
    deactivated += 1;
  }

  return {
    dbPath,
    updated: 1,
    deactivated,
    matchedNames: [`${workflow.name} x${rows.length} -> 1 active`],
  };
}

const workflow = buildCrmWorkflow();
writeWorkflowFile(workflow);
const results = repoDbPaths.map((dbPath) => syncDatabase(dbPath, workflow));

for (const result of results) {
  console.log(`DB: ${result.dbPath}`);
  console.log(`Updated rows: ${result.updated}`);
  console.log(`Deactivated duplicates: ${result.deactivated}`);
  console.log(`Matched: ${result.matchedNames.join(', ') || 'none'}`);
  console.log('');
}
