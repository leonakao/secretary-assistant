export interface ConversationResponse {
  message: string;
  actions: string[];
}

export interface ConversationStrategy {
  /**
   * Handles the complete conversation flow for a specific user type
   */
  handleConversation(params: {
    sessionId: string;
    companyId: string;
    instanceName: string;
    remoteJid: string;
    message: string;
  }): Promise<ConversationResponse>;
}
