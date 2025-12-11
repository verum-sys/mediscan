# Voice Mode Feature Documentation

## Overview
Voice Mode allows doctors and healthcare professionals to dictate patient symptoms and medical information using speech-to-text technology. The system automatically transcribes the speech in real-time and processes it through AI for clinical analysis.

## Features

### 1. **Real-Time Speech-to-Text Transcription**
- Uses browser's built-in Web Speech API (free, no API keys needed)
- Supports continuous speech recognition
- Shows interim results as you speak
- Automatic punctuation and capitalization

### 2. **Voice Input Component**
- Reusable component that can be added anywhere
- Visual feedback (microphone icon changes when listening)
- Animated pulse effect when recording
- Error handling with user-friendly messages

### 3. **AI Processing Integration**
- Transcribed text is sent to the same AI pipeline as uploaded documents
- Creates a new visit record automatically
- Generates clinical analysis, differential diagnoses, and recommendations
- Navigates to visit detail page after processing

## Usage

### Accessing Voice Mode

**From Dashboard:**
1. Click the "Voice Mode" quick action card (pink microphone icon)
2. Or navigate to `/voice` directly

### Using Voice Input

**Step 1: Start Recording**
- Click the microphone button
- Browser will request microphone permission (allow it)
- Microphone icon turns red and pulses when listening

**Step 2: Speak**
- Speak clearly about patient symptoms
- Watch real-time transcription appear in the text box
- You can pause and continue speaking

**Step 3: Stop Recording**
- Click the microphone button again to stop
- Or it will auto-stop after silence

**Step 4: Review & Edit**
- Review the transcribed text
- Edit manually if needed
- Click "Analyze with AI" to process

**Step 5: AI Analysis**
- System creates a visit record
- Processes through AI pipeline
- Redirects to visit detail page with full analysis

## Browser Compatibility

### Supported Browsers:
✅ **Google Chrome** (Recommended)
✅ **Microsoft Edge**
✅ **Safari** (macOS/iOS)
✅ **Opera**

### Not Supported:
❌ Firefox (Web Speech API not fully supported)
❌ Internet Explorer

## Technical Details

### Web Speech API
- **Free**: No API keys or external services required
- **Privacy**: All processing happens in the browser
- **Language**: Currently set to English (en-US)
- **Continuous**: Keeps listening until manually stopped

### Component Props

```typescript
interface VoiceInputProps {
    onTranscript: (text: string) => void;  // Callback with transcribed text
    onProcessing?: (isProcessing: boolean) => void;  // Processing state
    autoSubmit?: boolean;  // Auto-submit when done speaking
    className?: string;  // Custom styling
}
```

### Example Usage

```typescript
import VoiceInput from '@/components/VoiceInput';

function MyComponent() {
    const [text, setText] = useState('');

    return (
        <div>
            <Textarea value={text} onChange={(e) => setText(e.target.value)} />
            <VoiceInput 
                onTranscript={setText}
                autoSubmit={false}
            />
        </div>
    );
}
```

## Example Voice Inputs

### Example 1: Acute Condition
**Say:** "Patient complains of severe chest pain radiating to left arm, started 2 hours ago, accompanied by shortness of breath and sweating"

**Result:** AI analyzes for cardiac conditions, generates differential diagnoses

### Example 2: Chronic Condition
**Say:** "45-year-old male with persistent dry cough and fever for 3 days, no improvement with over-the-counter medications"

**Result:** AI considers respiratory infections, generates investigation recommendations

### Example 3: Multiple Symptoms
**Say:** "Female patient with migraine, photophobia, nausea since this morning, history of similar episodes"

**Result:** AI analyzes neurological symptoms, suggests appropriate management

## Troubleshooting

### Microphone Not Working
**Issue:** "Microphone Access Denied"
**Solution:** 
1. Check browser settings
2. Allow microphone access for the website
3. Ensure microphone is not being used by another application

### Poor Transcription Quality
**Issue:** Incorrect or garbled text
**Solution:**
1. Speak clearly and at moderate pace
2. Reduce background noise
3. Use a good quality microphone
4. Manually edit the transcription before submitting

### Browser Not Supported
**Issue:** "Voice Input Not Supported"
**Solution:**
1. Switch to Google Chrome (recommended)
2. Update your browser to the latest version
3. Use manual text input as fallback

## Privacy & Security

### Data Handling
- **Speech Processing**: Done locally in browser
- **Transcription**: Sent to your backend server
- **Storage**: Stored in DynamoDB like other visits
- **No Third-Party**: No external speech services used

### HIPAA Compliance
- All voice data is processed through your existing secure pipeline
- No audio is stored, only transcribed text
- Same security measures as document uploads

## API Integration

### Backend Endpoint
```javascript
POST /api/visits
{
    "chiefComplaint": "transcribed text",
    "visitNotes": "Voice Input: transcribed text",
    "sourceType": "voice_input",
    "facilityName": "Voice Consultation",
    "department": "General",
    "providerName": "AI Assistant",
    "confidenceScore": 85
}
```

### Response
```javascript
{
    "id": "visit-uuid",
    "visit_number": "VS-2024-123456",
    // ... other visit fields
}
```

## Future Enhancements

### Planned Features:
1. **Multi-language Support**: Add support for other languages
2. **Custom Vocabulary**: Medical terminology recognition
3. **Voice Commands**: "Add symptom", "Generate DDX", etc.
4. **Audio Recording**: Save audio files for record-keeping
5. **Offline Mode**: Local speech recognition fallback

## Files Created

### Frontend Components:
- `/src/components/VoiceInput.tsx` - Reusable voice input component
- `/src/pages/VoiceMode.tsx` - Dedicated voice mode page

### Routes:
- `/voice` - Voice mode page

### Integration:
- Dashboard quick action added
- App routing configured

## Support

### Common Questions

**Q: Does this cost money?**
A: No, it uses the browser's free Web Speech API.

**Q: Can I use it offline?**
A: No, Web Speech API requires internet connection.

**Q: Is the audio recorded?**
A: No, only the transcribed text is saved.

**Q: Can I edit the transcription?**
A: Yes, you can manually edit before submitting.

**Q: Does it work on mobile?**
A: Yes, on supported mobile browsers (Chrome, Safari).

---

## Quick Start Guide

1. **Navigate to Voice Mode**: Click "Voice Mode" on dashboard
2. **Click Microphone**: Start speaking
3. **Dictate Symptoms**: Speak patient information clearly
4. **Review Text**: Check transcription accuracy
5. **Analyze**: Click "Analyze with AI"
6. **View Results**: Automatic redirect to visit detail page

**That's it!** Voice Mode makes clinical documentation faster and more efficient.
