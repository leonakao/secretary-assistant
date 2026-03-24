export interface ConversationResponse {
  message: string;
}

export interface ConversationStrategy {
  /**
   * Handles the complete conversation flow for a specific user type
   */
  handleConversation(params: {
    companyId: string;
    instanceName: string;
    remoteJid: string;
    message: string;
    userId?: string;
    contactId?: string;
  }): Promise<ConversationResponse>;
}
