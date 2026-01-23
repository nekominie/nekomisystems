export interface AppConfig {
  id: string;
  name: string;
  icon: string; // Ruta de la imagen o clase de FontAwesome
  isOpen: boolean;
  isMinimized: boolean;
  zIndex: number;
}