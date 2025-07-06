import React, { useState } from "react";
import { BiSolidImageAdd } from "react-icons/bi";
import AddPhotoAlternateIcon from "@mui/icons-material/AddPhotoAlternate";
import CloseIcon from "@mui/icons-material/Close";
function ImageUpload({ onImageSelect }) {
  const [file, setFile] = useState(null);

  function handleChange(e) {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(URL.createObjectURL(selectedFile));
      onImageSelect(selectedFile);
    }
  }

  return (
    <div className="upload">
      <input
        type="file"
        onChange={handleChange}
        id="ImgInput"
        accept="image/*"
        style={{ display: "none" }}
      />
      <label htmlFor="ImgInput" className="image-box">
        {file ? (
          <div style={{ width: "100%", height: "100%", position: "relative" }}>
            <CloseIcon
              sx={{
                color: "black",
                background: "white",
                zIndex: "2",
                position: "absolute",
                fontSize: 30,
              }}
              onClick={() => {
                setFile(null);
              }}
            />
            <img src={file} alt="Uploaded preview" className="preview-image" />
          </div>
        ) : (
          <span className="placeholder-text">
            <div className="img-icon">
              <AddPhotoAlternateIcon sx={{ fontSize: 40 }} />
            </div>
          </span>
        )}
      </label>
    </div>
  );
}

export default ImageUpload;
