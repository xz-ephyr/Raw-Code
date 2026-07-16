export interface ConnectorItem {
  name: string;
  description: string;
  imageSrc?: string;
  imageSrcDark?: string;
  icon?: any;
  stars?: number;
  details?: string[];
  connectorId?: string;
  authType?: 'oauth2' | 'token';
}
