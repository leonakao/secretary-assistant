export interface MessageProvider {
  sendTextMessage(params: {
    instanceName: string;
    remoteJid: string;
    text: string;
  }): Promise<any>;

  sendMediaMessage(params: {
    instanceName: string;
    remoteJid: string;
    mediaUrl: string;
    caption?: string;
    mediaType?: 'image' | 'video' | 'audio' | 'document';
  }): Promise<any>;

  getInstanceStatus(instanceName: string): Promise<any>;
}
