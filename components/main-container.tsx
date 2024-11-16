"use client";

import React, { useState, useRef } from "react";
import Image from "next/image";
import { jsPDF } from "jspdf";

export const MainContainer = () => {
  const [image, setImage] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [plantProperties, setPlantProperties] = useState<string[]>([]);
  const [relatedQuestions, setRelatedQuestions] = useState<string[]>([]);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [capturedImageUrl, setCapturedImageUrl] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Handle image upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImage(e.target.files[0]);
      setCapturedImageUrl(URL.createObjectURL(e.target.files[0]));
    }
  };

  // Start camera stream
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      setCameraStream(stream);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (error) {
      console.error("Camera access denied or unavailable:", error);
    }
  };

  // Capture photo from the camera feed
  const handleTakePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const context = canvas.getContext("2d");

      if (context) {
        context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], "captured-image.jpg", { type: "image/jpeg" });
            setImage(file);
            setCapturedImageUrl(URL.createObjectURL(file));
          }
        });
      }

      cameraStream?.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
  };

  // Analyze the uploaded or captured image
  const analyzeImage = async () => {
    if (!image) return;

    setLoading(true);
    try {
      // Simulated analysis result
      const fakeResult =
        "PLANT NAME: Aloe Vera\nSPECIES: Aloe barbadensis miller\nCARE RECOMMENDATIONS: Keep in sunlight, water sparingly\nHEALTH DIAGNOSIS: Healthy\nRECOMMENDED SEASON: Summer";
      setResult(fakeResult);

      // Extract plant properties from the result
      const properties = fakeResult
        .split("\n")
        .filter((line) => line.includes(":"));
      setPlantProperties(properties);

      const fakeQuestions = [
        "How to grow Aloe Vera?",
        "What are the medicinal uses of Aloe Vera?",
        "How to care for Aloe Vera in winter?",
      ];
      setRelatedQuestions(fakeQuestions);
    } catch (error) {
      console.error("Error analyzing image:", error);
    } finally {
      setLoading(false);
    }
  };

  // Download the analysis result as a PDF
  const downloadPDF = () => {
    if (!result) return;

    const doc = new jsPDF();
    const lines = doc.splitTextToSize(result, 180);
    doc.text(lines, 10, 10);
    doc.save("plant-analysis.pdf");
  };

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="bg-white rounded-lg shadow-xl overflow-hidden">
        <div className="p-8">
          <h2 className="text-3xl font-extrabold text-gray-900 mb-8 text-center">
            Analyze Your Plant
          </h2>
          
          {/* Image Upload Section */}
          <div className="mb-8">
            <label
              htmlFor="image-upload"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Upload an Image
            </label>
            <input
              type="file"
              id="image-upload"
              accept="image/*"
              onChange={handleImageUpload}
              className="block w-full text-sm text-gray-500"
            />
          </div>

          {/* Start Camera Button */}
          <button
            type="button"
            onClick={startCamera}
            className="w-full bg-green-500 text-white py-3 px-4 rounded-lg mb-4"
          >
            Start Camera
          </button>

          {/* Real-Time Camera Feed */}
          {cameraStream && (
            <div className="mb-8 flex flex-col items-center">
              <video ref={videoRef} className="rounded-lg shadow-md w-full h-auto" autoPlay />
              <button
                type="button"
                onClick={handleTakePhoto}
                className="bg-green-600 text-white py-3 px-4 rounded-lg mt-4"
              >
                Snap Photo
              </button>
            </div>
          )}

          {/* Display Captured Image */}
          {capturedImageUrl && (
            <div className="mb-8 flex justify-center">
              <Image
                src={capturedImageUrl}
                alt="Captured Image"
                width={300}
                height={300}
                className="rounded-lg shadow-md"
              />
            </div>
          )}

          {/* Analyze Image Button */}
          <button
            type="button"
            onClick={analyzeImage}
            disabled={!image || loading}
            className="w-full bg-green-600 text-white py-3 px-4 rounded-lg"
          >
            {loading ? "Analyzing..." : "Analyze Image"}
          </button>
        </div>

        {/* Display Analysis Result */}
        {result && (
          <div className="bg-green-50 p-8 border-t border-green-100">
            <h3 className="text-2xl font-bold text-green-800 mb-4">
              IMAGE INFORMATION
            </h3>
            <div className="text-gray-800 text-justify space-y-4">
              {result.split("\n").map((line, index) => (
                <p key={index} className="mb-2">{line}</p>
              ))}
            </div>

            {/* Plant Properties */}
            {plantProperties.length > 0 && (
              <div>
                <h4 className="text-lg font-semibold mt-6 mb-2 text-green-700">
                  Plant Properties
                </h4>
                <ul className="space-y-2">
                  {plantProperties.map((property, index) => (
                    <li key={index} className="text-gray-700">{property}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Related Questions */}
            {relatedQuestions.length > 0 && (
              <div className="mt-6">
                <h4 className="text-lg font-semibold mb-2 text-green-700">
                  Related Questions
                </h4>
                <ul className="space-y-2">
                  {relatedQuestions.map((question, index) => (
                    <li key={index}>
                      <a
                        href={`https://www.google.com/search?q=${encodeURIComponent(question)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-green-700 underline"
                      >
                        {question}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Download PDF */}
            <button
              type="button"
              onClick={downloadPDF}
              className="mt-6 w-full bg-blue-600 text-white py-3 px-4 rounded-lg"
            >
              Download PDF
            </button>
          </div>
        )}
      </div>
    </main>
  );
};
