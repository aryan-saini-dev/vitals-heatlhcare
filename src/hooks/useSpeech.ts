import { useState, useEffect, useCallback, useRef } from "react";

export function useSpeech(onSilence?: (finalText: string) => void) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [finalTranscript, setFinalTranscript] = useState("");
  
  // Refs for logic to avoid stale closures
  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const onSilenceRef = useRef(onSilence);
  
  // Accumulated text tracking for VAD logic
  const fullTranscriptRef = useRef("");
  const interimTranscriptRef = useRef("");

  useEffect(() => {
    onSilenceRef.current = onSilence;
  }, [onSilence]);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recog = new SpeechRecognition();
      recog.continuous = true;
      recog.interimResults = true;
      recog.lang = 'en-US';

      recog.onresult = (event: any) => {
        let interim = "";
        let final = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }
        
        // Update refs immediately (no closure lag)
        if (final) {
           fullTranscriptRef.current += final;
           setFinalTranscript(fullTranscriptRef.current);
        }
        interimTranscriptRef.current = interim;
        setInterimTranscript(interim);
        
        // VAD: Reset Silence Timer anytime words are detected
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        
        const currentTotal = (fullTranscriptRef.current + interim).trim();
        
        if (currentTotal.length > 0) {
           silenceTimerRef.current = setTimeout(() => {
              if (onSilenceRef.current) {
                 // Trigger conversational turn with the fresh full text
                 onSilenceRef.current(currentTotal);
                 
                 // Clear internal tracking after turn is submitted
                 fullTranscriptRef.current = "";
                 interimTranscriptRef.current = "";
                 setFinalTranscript("");
                 setInterimTranscript("");
              }
           }, 1200); // 1.2s of silence = human turn-taking
        }
      };

      recog.onerror = (event: any) => {
        if (event.error === 'no-speech') return; 
        console.error("Speech Recognition Error", event.error);
        setIsListening(false);
      };

      recog.onend = () => {
         setIsListening(false);
      };

      recognitionRef.current = recog;
    } else {
      console.warn("Speech Recognition API not supported.");
    }
  }, []);

  const listen = useCallback(() => {
    if (recognitionRef.current && !isListening) {
      fullTranscriptRef.current = "";
      interimTranscriptRef.current = "";
      setFinalTranscript("");
      setInterimTranscript("");
      
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (e) {
        console.error("STT Start Error", e);
      }
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }, [isListening]);

  const speak = useCallback((text: string, onEnd?: () => void, onStart?: () => void) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      const voices = window.speechSynthesis.getVoices();
      const femaleVoice = voices.find(v => v.lang.includes('en') && (v.name.includes('Female') || v.name.includes('Samantha') || v.name.includes('Google UK English Female'))) 
                          || voices.find(v => v.lang.includes('US') || v.lang.includes('UK'));
      
      if (femaleVoice) utterance.voice = femaleVoice;
      utterance.rate = 0.95;
      utterance.pitch = 1.0;
      
      utterance.onstart = () => { 
          setIsSpeaking(true);
          if (onStart) onStart(); 
      }
      utterance.onend = () => { 
          setIsSpeaking(false);
          if (onEnd) onEnd(); 
      };
      
      window.speechSynthesis.speak(utterance);
    } else {
      if (onEnd) onEnd();
    }
  }, []);

  const stopSpeaking = useCallback(() => {
     if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
     }
  }, []);

  return { listen, stopListening, isListening, isSpeaking, transcript: finalTranscript + interimTranscript, liveText: interimTranscript, speak, stopSpeaking };
}
