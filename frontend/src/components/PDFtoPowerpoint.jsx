import React, { useState } from "react";
import axios from "axios";

const PDFtoPowerpoint = () => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setError("");
    setSuccess("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return setError("Please upload a PDF file");

    const formData = new FormData();
    formData.append("pdfFile", file);

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await axios.post(
        "http://localhost:5000/api/pdf-to-ppt",
        formData,
        { responseType: "blob" }
      );

      // Check if response is a valid blob (PPTX)
      if (!response.data || response.data.size === 0) {
        throw new Error("Received empty file from server");
      }

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      const downloadName = file.name.replace(/\.pdf$/i, ".pptx");
      link.href = url;
      link.setAttribute("download", downloadName);
      document.body.appendChild(link);
      link.click();
      link.remove();

      setSuccess(`Conversion successful! Downloaded as ${downloadName}`);
    } catch (err) {
      console.error("PDF → PPT error:", err);
      setError("Conversion failed. Make sure your PDF contains text.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pdf-to-ppt">
      <h2>PDF → PowerPoint</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="file"
          accept="application/pdf"
          onChange={handleFileChange}
        />
        <button type="submit" disabled={loading}>
          {loading ? "Converting..." : "Convert"}
        </button>
      </form>
      {error && <p style={{ color: "red", marginTop: "10px" }}>{error}</p>}
      {success && <p style={{ color: "green", marginTop: "10px" }}>{success}</p>}
    </div>
  );
};

export default PDFtoPowerpoint;
