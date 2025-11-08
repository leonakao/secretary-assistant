export interface EvolutionMessageKey {
  remoteJid: string;
  fromMe: boolean;
  id: string;
  participant?: string;
}

export interface EvolutionMessageContent {
  conversation?: string;
  extendedTextMessage?: {
    text: string;
  };
  imageMessage?: {
    url: string;
    mimetype: string;
    caption?: string;
  };
  videoMessage?: {
    url: string;
    mimetype: string;
    caption?: string;
  };
  audioMessage?: {
    url: string;
    mimetype: string;
  };
  documentMessage?: {
    url: string;
    mimetype: string;
    fileName: string;
  };
}

export interface EvolutionMessagesUpsertPayload {
  key: EvolutionMessageKey;
  message: EvolutionMessageContent;
  messageTimestamp: number;
  pushName?: string;
}
