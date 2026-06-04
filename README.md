# speech-and-text-SAT-Chat
always keep both speech and text - dual data group chat for our daily communication 

# SatChat

**Talk to anyone. No barriers.**

---

## Before SatChat

- You send a voice message. Your deaf friend can't hear it.
- You type a message. Your blind friend can't see it.
- You write in English. Your Japanese friend struggles.
- You use WhatsApp. Nothing gets translated. Nothing gets read aloud. Nothing bridges the gap.

## After SatChat

- Every voice message is automatically transcribed to text.
- Every text message is automatically read aloud.
- Every message is translated to your language before you hear or read it.
- One conversation. Everyone included.

---

## Who it's for

| You are | SatChat does |
|---|---|
| Blind / low vision | Reads everything aloud. You speak to reply. |
| Deaf / hard of hearing | Transcribes all voice to text. Instantly. |
| Japanese speaker in an English chat | Translates every message to Japanese before reading it. |
| Anyone | Switch between typing and speaking freely. Same thread. |

---

## How to use it

**1. Open the file**
Double-click `satchat-v0.9.1.html` in Chrome. No install. No server.

**2. Hold 🎤 to send a voice message**
Release to send. Your voice appears as an audio bubble.

**3. Type and hit send for text**
Or press `Ctrl + Enter`.

**4. Tap Transcribe on any audio bubble**
The spoken words appear as text below the audio.

**5. Switch language with EN / 日本語**
All messages are translated to your chosen language before being read aloud.

**6. Tap READ ALL**
Reads the entire conversation aloud — translated into your language.

---

## Setup (2 minutes)

**For voice-to-text (STT):**
Chrome on desktop works out of the box — no key needed.
Firefox or mobile → add an OpenAI key in ⚙ Settings.

**For on-device translation (free, offline after setup):**
1. Open Chrome 138+
2. Go to `chrome://flags`
3. Enable `#language-detection-api` and `#optimization-guide-on-device-model`
4. Restart Chrome — translation downloads once, then works offline forever.

**No Chrome flags?**
Add an OpenAI key in ⚙ Settings — translation uses `gpt-4o-mini` as fallback (~$0.0001 per message).

---

## No accounts. No servers. No subscriptions.

Open source. MIT license.
Built by [Kiara Inc.](https://kiara.team) — Matsudo, Japan.

> *Voice and text. Everyone included.*
