const UI_URL = "https://nexora-voice-studio-ui.bgmihere16.workers.dev";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Health check
    if (url.pathname === "/health") {
      return Response.json({
        ok: true,
        provider: "Sarvam Bulbul v3",
        app: "NEXORA Voice Studio"
      });
    }

    // Neural TTS API
    if (url.pathname === "/api/tts" && request.method === "POST") {
      try {
        if (!env.SARVAM_API_KEY) {
          return Response.json(
            { error: "SARVAM_API_KEY secret is not configured." },
            { status: 500 }
          );
        }

        const input = await request.json();
        const text = String(input?.text || "").trim();

        if (!text) {
          return Response.json(
            { error: "Text is required." },
            { status: 400 }
          );
        }

        const cleanText = text
          .replace(/\[pause\]/gi, ", ")
          .replace(/\[emphasis\]/gi, "")
          .replace(/\[dramatic\]/gi, "...")
          .replace(/\[whisper\]/gi, "");

        const body = {
          text: cleanText.slice(0, 2500),
          speaker: String(input?.speaker || "shubh").toLowerCase(),
          model: "bulbul:v3",
          language_code: String(input?.language_code || "hi-IN"),
          pace: Number(input?.pace ?? 0.92),
          temperature: Number(input?.temperature ?? 0.52),
          output_audio_codec: "mp3",
          speech_sample_rate: 48000
        };

        const sarvam = await fetch(
          "https://api.sarvam.ai/text-to-speech",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Accept": "application/json",
              "api-subscription-key": env.SARVAM_API_KEY
            },
            body: JSON.stringify(body)
          }
        );

        const data = await sarvam.json();

        if (!sarvam.ok) {
          return Response.json(
            {
              error:
                data?.error ||
                data?.message ||
                "Sarvam TTS request failed.",
              details: data
            },
            { status: sarvam.status }
          );
        }

        const audio = data?.audios?.[0];

        if (!audio) {
          return Response.json(
            { error: "Sarvam returned no audio." },
            { status: 502 }
          );
        }

        return Response.json({
          audio_base64: audio
        });

      } catch (err) {
        return Response.json(
          { error: err?.message || "TTS server error." },
          { status: 500 }
        );
      }
    }

    // Serve NEXORA Voice Studio UI
    const target = new URL(UI_URL);
    target.pathname = url.pathname;
    target.search = url.search;

    return fetch(
      new Request(target.toString(), request)
    );
  }
};
