import { useState, useEffect } from "react";
import { RxSpeakerLoud } from "react-icons/rx";
const apiKey = import.meta.env.VITE_SARVAM_API_KEY;
function QueryResponse(props) {
  let [responses, setResponses] = useState(props.response || "");
  let [transcript, setTranscript] = useState(props.transcript || "");
  let [speaker, setSpeaker] = useState(false);
  let [clear, setClear] = useState(false);
  let [translatedText, setTranslatedText] = useState("");
  useEffect(() => {
    async function maybeTranslate() {
      const text = props.response || "";
      setResponses(text);
      setTranscript(props.transcript || "");

      // Translate only if language is not en-IN
      if (props.lang && props.lang !== "en-IN") {
        try {
          const res = await fetch("https://api.sarvam.ai/translate", {
            method: "POST",
            headers: {
              "api-subscription-key": apiKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              input: text,
              source_language_code: "auto",
              target_language_code: props.lang,
            }),
          });

          const translated = await res.json();
          setTranslatedText(translated?.translated_text || text);
          console.log("Sarvam API returned:", translated);
        } catch (err) {
          console.error("Translation failed", err);
          setTranslatedText(text); // fallback
        }
      } else {
        setTranslatedText(text);
      }
    }

    maybeTranslate();
  }, [props.response, props.transcript, props.lang]);
  const handleTTS = async () => {
    try {
      const res = await fetch("http://localhost:3001/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: translatedText,
          target_language_code: props.lang,
        }),
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.play();
    } catch (err) {
      console.error("TTS failed", err);
    }
  };
  return (
    <div className="query-response-container">
      {props.transcription && (
        <div
          style={{
            backgroundColor: "#E14434",
            padding: "10px",
            marginBottom: "10px",
            borderRadius: "10px",
            color: "#FFD6B9",
            fontStyle: "italic",
          }}
        >
          You said: {props.transcription}
        </div>
      )}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          paddingTop: "0px",
        }}
      >
        <h3 style={{ color: "#FFE3DD", textAlign: "left", fontSize: "20px" }}>
          Response
        </h3>
        <button
          style={{
            background: "none",
            border: "0px",
            padding: "0px",
            marginTop: "5px",
          }}
        >
          <RxSpeakerLoud
            onMouseOver={() => {
              setSpeaker(true);
            }}
            onMouseOut={() => {
              setSpeaker(false);
            }}
            onClick={handleTTS}
            style={
              speaker
                ? {
                    color: "white",
                    fontSize: "20px",
                    cursor: "pointer",
                    transform: "scale(1.2)",
                  }
                : { color: "white", fontSize: "20px" }
            }
          />
        </button>
        <h4
          onMouseOver={() => {
            setClear(true);
          }}
          onMouseOut={() => {
            setClear(false);
          }}
          onClick={() => {
            setTranslatedText("");
            setResponses("");
          }}
          style={
            clear
              ? {
                  fontFamily: "'Raleway Dots', sans-serif",
                  fontWeight: "600",
                  fontStyle: "normal",
                  color: "#edcec2",
                  fontSize: "20px",
                  marginLeft: "auto",
                  cursor: "pointer",
                }
              : {
                  fontFamily: "'Raleway Dots', sans-serif",
                  fontWeight: "400",
                  fontStyle: "normal",
                  color: "#edcec2",
                  fontSize: "20px",
                  marginLeft: "auto",
                }
          }
        >
          clear
        </h4>
      </div>

      <hr
        style={{
          border: "none",
          borderTop: "2px solid #E17564",
          margin: "5px 0",
          width: "100%",
        }}
      />

      <div className="response-box">{translatedText || responses}</div>
      {/* <div>{props.transcript}</div> */}
    </div>
  );
}
export default QueryResponse;
