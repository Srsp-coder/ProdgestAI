import React, { useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import PauseIcon from "@mui/icons-material/Pause";
import RadioButtonCheckedIcon from "@mui/icons-material/RadioButtonChecked";
import StopCircleIcon from "@mui/icons-material/StopCircle";
import { BsRecordCircle } from "react-icons/bs";
function AudioRecord(props) {
  const [audioBlob, setAudioBlob] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  let [hover, setHover] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [transcription, setTranscription] = useState("");
  const waveformRef = useRef(null);
  const wavesurfer = useRef(null);
  const audioChunks = useRef([]);

  useEffect(() => {
    if (audioBlob && wavesurfer.current) {
      wavesurfer.current.load(URL.createObjectURL(audioBlob));
    }
  }, [audioBlob]);

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);

    recorder.ondataavailable = (e) => audioChunks.current.push(e.data);
    recorder.onstop = async () => {
      const blob = new Blob(audioChunks.current, { type: "audio/webm" });

      // ✅ Check and force MIME type if browser didn't set it
      const fileType = blob.type === "audio/webm" ? blob.type : "audio/webm";
      const file = new File([blob], "recording.webm", { type: fileType });

      console.log("Uploading file with type:", file.type); // ✅ Debug

      const formData = new FormData();
      formData.append("file", file);
      console.log("Blob MIME:", blob.type); // should be 'audio/webm'
      console.log("File MIME:", file.type);

      fetch("http://localhost:3001/api/transcribe", {
        method: "POST",
        body: formData,
      })
        .then((res) => res.json())
        .then((data) => {
          console.log("Transcription:", data.transcription);
          setTranscription(data.transcription);
          if (props.onTranscriptionReady) {
            props.onTranscriptionReady(data.transcription); // 🆕 Send it to App.jsx
          }
        })
        .catch((err) => {
          console.error("Transcription failed:", err);
        });
      setAudioBlob(blob);
      audioChunks.current = [];
    };

    recorder.start();
    setMediaRecorder(recorder);
    setIsRecording(true);
  };

  const stopRecording = () => {
    mediaRecorder.stop();
    setIsRecording(false);
  };

  useEffect(() => {
    wavesurfer.current = WaveSurfer.create({
      container: waveformRef.current,
      waveColor: "#ccc",
      progressColor: "#FFA673",
      cursorColor: "#FFA673",
      height: 80,
      barWidth: 5,
      barRadius: 2,
      responsive: true,
      normalize: true,
      partialRender: true,
    });

    wavesurfer.current.on("finish", () => setIsPlaying(false));

    return () => wavesurfer.current.destroy();
  }, []);

  const togglePlay = () => {
    if (wavesurfer.current) {
      wavesurfer.current.playPause();
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <div
      className="Audio-box"
      onMouseOver={() => setHover(true)}
      onMouseOut={() => setHover(false)}
      style={
        hover
          ? {
              width: "100%",
              maxWidth: "450px",
              minHeight: "510px",
              margin: "20px auto", // ✅ horizontally center it
              paddingLeft: "20px",
              background: "#fff085",
              marginBottom: "15px",
              border: "3px solid black",
              borderRadius: "20px",
              boxShadow: "5px 10px 8px 5px rgba(0, 0, 0, 0.8)",
            }
          : {
              width: "100%",
              maxWidth: "450px",
              minHeight: "510px",
              margin: "20px auto", // ✅ horizontally center it
              paddingLeft: "20px",
              background: "#fff085",
              marginBottom: "15px",
              borderRadius: "20px",
              border: "3px solid black",
              transition: "0.3s",
              boxShadow: "5px 10px 8px 5px rgba(0, 0, 0, 0.8)",
            }
      }
    >
      <button
        onClick={isRecording ? stopRecording : startRecording}
        style={{
          padding: "10px 20px",
          cursor: "pointer",
          background: "none",
          border: "0px",
          margin: "60px",
        }}
      >
        {isRecording ? (
          <StopCircleIcon
            style={{
              color: "black",
              fontSize: "30px",
              backgroundColor: "none",
              padding: "5px",
              border: "3px solid black",
              borderRadius: "5px",
            }}
          />
        ) : (
          <BsRecordCircle
            style={{
              color: "black",
              fontSize: "30px",
              backgroundColor: "none",
              padding: "5px",
              border: "3px solid black",
              borderRadius: "5px",
            }}
          />
        )}
      </button>
      <div
        ref={waveformRef}
        style={{ marginTop: 20, width: "300px", marginBottom: 25 }}
      />
      {audioBlob ? (
        <button onClick={togglePlay} style={{ ...buttonStyle, marginTop: 10 }}>
          {isPlaying ? (
            <PauseIcon style={{ fontSize: "30px" }} />
          ) : (
            <PlayArrowIcon style={{ fontSize: "30px" }} />
          )}
        </button>
      ) : (
        <div className="typewriter">
          {" "}
          <h1
            style={{
              margin: "0",
              fontFamily: '"Edu NSW ACT Hand Pre", cursive',
              fontOpticalSizing: "auto",
              fontWeight: "400",
              fontStyle: " normal",
              color: "black",
              fontSize: "28px",
            }}
          >
            Record a Audio query
          </h1>
        </div>
      )}
    </div>
  );
}

const buttonStyle = {
  padding: "10px 20px",
  cursor: "pointer",
  background: "none",
  border: "0px",
};

export default AudioRecord;
