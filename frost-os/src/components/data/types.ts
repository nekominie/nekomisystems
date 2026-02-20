export interface IconConfig {
  id: string;
  paths?: string[];
  svg?: string;
  saved_path?: string;
}

export interface UserProfile{
  name: string;
  avatar: Blob;
  setupDate: Date;
}

export interface DesktopIconState{
  appId: string;
  col: number;
  row: number;
}

export interface DesktopState{
  icons: Record<string, DesktopIconState>
  selected: Set<string>
}