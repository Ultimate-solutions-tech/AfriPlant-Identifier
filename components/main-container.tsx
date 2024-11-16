"use client";

import React, { useState } from "react";
import Image from "next/image";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { jsPDF } from "jspdf";

export const MainContainer = () => {
  const [image, setImage] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [plantProperties, setPlantProperties] = useState<string[]>([]);
  const [relatedWords, setRelatedWords] = useState<string[]>([]);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImage(e.target.files[0]);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      setCameraStream(stream);
    } catch (error) {
      console.error("Camera access denied or unavailable:", error);
    }
  };

  const handleTakePhoto = () => {
    if (cameraStream) {
      const video = document.createElement("video");
      video.srcObject = cameraStream;
      video.play();

      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext("2d")?.drawImage(video, 0, 0);

      canvas.toBlob((blob) => {
        if (blob) {
          setImage(new File([blob], "captured-image.jpg", { type: "image/jpeg" }));
        }
      });

      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
  };

  const analyzeImage = async () => {
    if (!image) return;

    setLoading(true);
    const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GOOGLE_GEMINI_API_KEY!);

    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
    });

    try {
      const imageParts = await fileToGenerativePart(image);
      const result = await model.generateContent([
        `Generate details about this image including:
        - Name
        - Species
        - Planting process
        - Care recommendations
        - Health and disease diagnosis
        - Recommended season and weather for planting
        - Related keywords for this image.
        Format each heading as bold, capitalize, and use green font color for headings.`,
        imageParts,
      ]);

      const response = await result.response;
      const text = response
        .text()
        .trim()
        .replace(/```/g, "")
        .replace(/\*\*/g, "")
        .replace(/\*/g, "")
        .replace(/-\s*/g, "")
        .replace(/\n\s*\n/g, "\n");

      setResult(text);
      extractPlantProperties(text);
      extractRelatedWords(text);
    } catch (error) {
      console.log((error as Error)?.message);
    } finally {
      setLoading(false);
    }
  };

  const fileToGenerativePart = async (file: File): Promise<{
    inlineData: { data: string; mimeType: string };
  }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64Data = reader.result as string;
        const base64Content = base64Data.split(",")[1];
        resolve({
          inlineData: {
            data: base64Content,
            mimeType: file.type,
          },
        });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const extractPlantProperties = (text: string) => {
    const properties = text
      .split("\n")
      .filter((line) => line.includes(":"))
      .slice(0, 5);
    setPlantProperties(properties);
  };

  const extractRelatedWords = (text: string) => {
    const lines = text.split("\n");
    const keywordsLine = lines.find((line) => line.toLowerCase().includes("related keywords"));
    if (keywordsLine) {
      setRelatedWords(keywordsLine.split(":")[1].split(",").map((word) => word.trim()));
    }
  };

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

          <button
            type="button"
            onClick={startCamera}
            className="w-full bg-green-500 text-white py-3 px-4 rounded-lg mb-4"
          >
            Start Camera
          </button>

          {cameraStream && (
            <button
              type="button"
              onClick={handleTakePhoto}
              className="w-full bg-green-600 text-white py-3 px-4 rounded-lg mb-4"
            >
              Snap Photo
            </button>
          )}

          {image && (
            <div className="mb-8 flex justify-center">
              <Image
                src={URL.createObjectURL(image)}
                alt="Uploaded or Captured Image"
                width={300}
                height={300}
                className="rounded-lg shadow-md"
              />
            </div>
          )}

          <button
            type="button"
            onClick={analyzeImage}
            disabled={!image || loading}
            className="w-full bg-green-600 text-white py-3 px-4 rounded-lg"
          >
            {loading ? "Analyzing..." : "Analyze Image"}
          </button>
        </div>

        {result && (
          <div className="bg-green-50 p-8 border-t border-green-100">
            <h3 className="text-2xl font-bold text-green-800 mb-4">
              Image Information
            </h3>
            <div className="text-gray-800 text-justify space-y-4">
              {result.split("\n").map((line, index) => (
                <p key={index} className="mb-2">
                  {line.startsWith("•") ? (
                    <strong className="text-green-700 uppercase">{line.replace("•", "").trim()}</strong>
                  ) : (
                    line
                  )}
                </p>
              ))}
            </div>
            <h4 className="text-lg font-semibold mt-6 mb-2 text-green-700">
              Plant Properties
            </h4>
            <ul className="space-y-2">
              {plantProperties.map((property, index) => (
                <li key={index} className="text-gray-700">
                  {property}
                </li>
              ))}
            </ul>
            <h4 className="text-lg font-semibold mt-6 mb-2 text-green-700">
              Related Words
            </h4>
            <ul className="space-y-2">
              {relatedWords.map((word, index) => (
                <li key={index} className="text-gray-700">
                  {word}
                </li>
              ))}
            </ul>
            <button
              onClick={downloadPDF}
              className="mt-6 bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600"
            >
              Download as PDF
            </button>
          </div>
        )}
      </div>
    </main>
  );
};
