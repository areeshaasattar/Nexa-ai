# Nexa AI - Voice Assistant Setup

The assistant uses browser-native APIs for speech-to-text (STT) and text-to-speech (TTS), and calls the **Mistral API** for the LLM responses.

## Architecture

- **Speech-to-Text**: Browser `SpeechRecognition` API (webkit-supported).
- **AI Backend**: Custom `/api/chat` route in Next.js calling Mistral (`api.mistral.ai`).
- **Text-to-Speech**: Browser `speechSynthesis` API.
- **Meeting summaries**: `src/lib/meeting-summary.ts` summarizes `conversation_messages` with Mistral after a call ends.

## Environment Variables

Add the following to your `.env` (see `.env.example` for the full list):

```env
# AI (Mistral)
MODEL_NAME=mistral-small-latest
MISTRAL_API_KEY=your_mistral_api_key
```

- `MISTRAL_API_KEY` is required — without it `/api/chat` and summary generation fail (errors are logged).
- `MODEL_NAME` is optional and defaults to `mistral-small-latest`.

## Setup Instructions

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Database Push**:
   Ensure your database is up to date.
   ```bash
   npm run db:push
   ```

3. **Run Locally**:
   ```bash
   npm run dev
   ```

4. **Start a Call**:
   Navigate to the dashboard, create an agent, and start a meeting. The AI assistant will appear as a sidebar in the call view.

## Design Notes

- **No `bridge-server`**: The experimental WebSocket bridge (an early Gemini experiment) was removed; the AI lives in the user's browser, talking to `/api/chat` over plain HTTP.
- **No `connectOpenAi` / OpenAI Realtime**: The AI is not a server-side call participant; STT and TTS run in the browser.

## Usage

- Click **"Push to Talk"** to start speaking.
- Your speech is transcribed in the browser, sent to `/api/chat` (Mistral, using the agent's `instruction` as the system prompt), and the reply is spoken back to you.
- You can see the conversation history in the sidebar; messages are persisted and summarized at the end of the meeting.
