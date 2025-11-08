export interface EvolutionQRCodeData {
  qrcode?: {
    code?: string;
    base64?: string;
    pairingCode?: string;
  };
}

export interface EvolutionConnectionData {
  state?: string;
  status?: string;
  statusReason?: string;
}
