import { API_BASE_URL } from "@/lib/config/api";

export type HomepageSettings = {
  heroVideoSrc?: string;
  useHeroVideo?: boolean;
  footerVideoSrc?: string;
  braidBookStyles?: string;
};

let settingsRequest: Promise<HomepageSettings> | null = null;

export function getHomepageSettings() {
  if (!settingsRequest) {
    settingsRequest = fetch(`${API_BASE_URL}/api/homepage-settings`, {
      signal: AbortSignal.timeout(8000),
    }).then(async (response) => {
      if (!response.ok) throw new Error(`Homepage settings request failed (${response.status})`);
      return response.json() as Promise<HomepageSettings>;
    }).catch((error) => {
      settingsRequest = null;
      throw error;
    });
  }
  return settingsRequest;
}
