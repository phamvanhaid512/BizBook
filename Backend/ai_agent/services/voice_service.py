# ai_agent/services/voice_service.py
import io, base64
from gtts import gTTS

class VoiceService:
    def text_to_speech(self, text: str) -> str:
        if not text:
            return ""
        clean_text = text.replace("*", "").replace("#", "").replace(">", "").strip()[:400]
        tts = gTTS(text=clean_text, lang="vi", slow=False)
        buf = io.BytesIO()
        tts.write_to_fp(buf)
        buf.seek(0)
        return f"data:audio/mp3;base64,{base64.b64encode(buf.read()).decode('utf-8')}"