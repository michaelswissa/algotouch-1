
import { useEffect } from "react";

type Props = {
  onTokenReceived: (token: string) => void;
  onError?: () => void;
};

export default function CardcomIframeHandler({ onTokenReceived, onError }: Props) {
  useEffect(() => {
    const listener = (event: MessageEvent) => {
      if (!event.data || typeof event.data !== "object") return;

      // Log message for debugging
      console.log("Received postMessage:", event.data);

      if (event.data.type === "CARD_TOKEN_RECEIVED" && event.data.token) {
        console.log("Token received:", event.data.token);
        onTokenReceived(event.data.token);
      } else if (event.data.type === "CARD_TOKEN_FAILED") {
        console.error("Card token failed");
        onError?.();
      }
    };

    window.addEventListener("message", listener);
    return () => window.removeEventListener("message", listener);
  }, [onTokenReceived, onError]);

  return null;
}
