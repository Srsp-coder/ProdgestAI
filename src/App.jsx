import { useState, useRef } from "react";
import axios from "axios";
import "./App.css";
import ImageUpload from "./components/ImageUpload";
import AudioRecord from "./components/AudioRecord";
import SendIcon from "@mui/icons-material/Send";
import QueryResponse from "./components/Response";
import ProdResponse from "./components/ProdResponse";
function App() {
  const scrollRef = useRef(null);
  const [text, setText] = useState("");
  const [response, setResponse] = useState([]);
  const [imageFile, setImageFile] = useState(null);
  const [transcription, setTranscription] = useState("");
  const [originalPrompt, setOriginalPrompt] = useState(""); // ✅ To retry same prompt
  const [confirmedIngredients, setConfirmedIngredients] = useState([]); // ✅ Stores approved ingredients
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [hasQueried, setHasQueried] = useState(false);
  async function queryResponse(promptText = text) {
    setLoading(true);
    try {
      const groqRes = await axios.post(
        "http://localhost:3001/product-suggest",
        {
          prompt: promptText,
        }
      );
      const filters = groqRes.data.parsed;
      console.log("🧠 Groq Filters:", filters);
      if (!filters || !filters.table || !filters.sub_category) {
        setResponse([]);
        setLoading(false);
        return;
      }
      const searchRes = await axios.post(
        "http://localhost:3001/api/product-search",
        filters
      );

      const productList = searchRes.data.results;
      setHasSearched(true);
      setHasQueried(true);
      console.log("📦 Product Results:", productList);
      setResponse(productList || []);
      setOriginalPrompt(promptText);
      setText("");
    } catch (err) {
      console.error(err);
      setResponse([]);
    } finally {
      setLoading(false);
    }
  }

  const handleTranscription = (text) => {
    if (typeof text === "string") {
      setTranscription(text);
      setText(text);
    }
  };
  const handleUserDecision = (decision, parsedIngredients) => {
    if (decision === "yes") {
      setConfirmedIngredients(parsedIngredients);
      console.log("✅ Stored Ingredients:", parsedIngredients);
    } else if (decision === "no" && originalPrompt) {
      queryResponse(originalPrompt); // 🔁 Retry with same prompt
    }
  };

  return (
    <div>
      {/* <img
        src="public/images/MealGenie.png"
        style={{ height: "80px", width: "70px" }}
      ></img> */}
      <h1
        style={{
          color: "#E9F5BE",
          margin: "0px",
          textShadow: `
      -1px -1px 0 black,
       1px -1px 0 black,
      -1px  1px 0 black,
       1px  1px 0 black
    `,
          fontFamily: '"Space Mono", monospace',
          fontWeight: "700",
          fontStyle: "italic",
          fontSize: "60px",
          padding: "0px",
        }}
      >
        ProdGestAI
      </h1>
      <div className="ai-query-bot-container">
        <div className="query-input-container">
          <div className="audio-response-container">
            <div className="image-audio-container" style={{}}>
              {/*<ImageUpload onImageSelect={setImageFile} />*/}
              <AudioRecord onTranscriptionReady={handleTranscription} />
            </div>
            <div className="gradient-border-wrapper">
              <div className="structured-response-container">
                <h3
                  style={{
                    textAlign: "left",
                    fontFamily: "'Merienda', cursive",
                    fontOpticalSizing: "auto",
                    fontWeight: "900",
                    fontStyle: "normal",
                  }}
                >
                  Products:
                </h3>
                <hr
                  style={{
                    border: "none",
                    height: "2px",
                    background: "black",
                  }}
                ></hr>
                {/* <QueryResponse
          response={response}
          transcription={transcription}
          lang="en-IN"
        /> */}
                <div
                  ref={scrollRef}
                  style={{
                    height: "400px",
                    overflowY:
                      "scroll" /* 👈 Always shows vertical scrollbar */,
                    overflowX: "hidden",
                    scrollbarGutter: "stable",
                    padding: "10px",
                  }}
                  className="meal-response-container"
                >
                  {loading ? (
                    <p style={{ fontStyle: "italic" }}>
                      🔄 Searching for products...
                    </p>
                  ) : response.length === 0 && hasSearched ? ( // ✅ Only show after search
                    <p style={{ fontStyle: "italic", color: "gray" }}>
                      No products found.
                    </p>
                  ) : (
                    <ProdResponse
                      response={response}
                      onRegenerate={() => queryResponse(originalPrompt)}
                      onConfirm={(ingredients) =>
                        handleUserDecision("yes", ingredients)
                      }
                      scrollRef={scrollRef}
                      hasQueried={hasQueried}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="input-submit-container">
            <input
              type="text"
              value={text}
              onChange={(event) => setText(event.target.value.toString())}
              required
              className="query-input-text-containter"
            />
            <SendIcon
              onClick={() => queryResponse()}
              className="query-submit-button"
              sx={{
                fontSize: 40,
                color: "#E9F5BE",
                textShadow: "2px 2px 5px rgba(0, 0, 0, 0.8)",
                filter: "drop-shadow(2px 3px 3px rgba(0, 0, 0, 0.8))",
              }}
              role="button"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
