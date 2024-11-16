"use client";

import React, { useState, useRef } from "react";
import Image from "next/image";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { jsPDF } from "jspdf";

export const MainContainer = () => {
  const [image, setImage] = useState<File | null>(null);
  const [capturedImageURL, setCapturedImageURL] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [relatedQuestions, setRelatedQuestions] = useState<string[]>([]);
  const [plantProperties, setPlantProperties] = useState<string[]>([]);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const handleStartCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCapturedImageURL(null); // Clear previous image
    } catch (error) {
      console.error("Camera access denied or unavailable:", error);
    }
  };

  const handleCapturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");

      if (context) {
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const dataURL = canvas.toDataURL("image/jpeg");
        setCapturedImageURL(dataURL);

        // Stop camera after snapping photo
        if (videoRef.current.srcObject) {
          const stream = videoRef.current.srcObject as MediaStream;
          stream.getTracks().forEach((track) => track.stop());
        }

        // Convert data URL to File object
        fetch(dataURL)
          .then((res) => res.blob())
          .then((blob) => {
            setImage(new File([blob], "captured-image.jpg", { type: "image/jpeg" }));
          });
      }
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImage(e.target.files[0]);
      setCapturedImageURL(URL.createObjectURL(e.target.files[0]));
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
      const result = await model.generateContent([`Analyze this image and provide details.`, imageParts]);

      const response = await result.response;
      const text = response.text().trim();

      setResult(text);
      extractPlantProperties(text);

      // Generate related questions dynamically
      setRelatedQuestions([
        "What is the ideal soil type?",
        "How often should it be watered?",
        "What diseases affect this plant?",
        "What are the ideal growing conditions?",
      ]);
    } catch (error) {
      console.error("Error analyzing image:", error);
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

  const downloadPDF = () => {
    if (!result) return;

    const doc = new jsPDF();
    const lines = doc.splitTextToSize(result, 180);
    doc.text(lines, 10, 10);
    doc.save("plant-analysis.pdf");
  };

  const askRelatedQuestion = (question: string) => {
    alert(`You clicked: ${question}`);
    // Optionally, integrate this with further API calls.
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
            onClick={handleStartCamera}
            className="w-full bg-green-500 text-white py-3 px-4 rounded-lg mb-4"
          >
            Start Camera
          </button>
          <div className="mb-8">
            <video ref={videoRef} className="w-full max-h-64 rounded-md mb-4"></video>
            <canvas ref={canvasRef} className="hidden"></canvas>
            <button
              type="button"
              onClick={handleCapturePhoto}
              className="w-full bg-green-600 text-white py-3 px-4 rounded-lg"
            >
              Snap Image
            </button>
          </div>

          {capturedImageURL && (
            <div className="mb-8 flex justify-center">
              <Image
                src={capturedImageURL}
                alt="Captured Image"
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
            <h3 className="text-2xl font-bold text-green-800 mb-4">Image Information</h3>
            <div className="text-gray-800 text-justify space-y-4">
              {result.split("\n").map((line, index) => (
                <p key={index} className="mb-2">{line}</p>
              ))}
            </div>
            <h4 className="text-lg font-semibold mt-6 mb-2 text-green-700">Plant Properties</h4>
            <ul className="space-y-2">
              {plantProperties.map((property, index) => (
                <li key={index} className="text-gray-700">
                  {property}
                </li>
              ))}
            </ul>
            {relatedQuestions.length > 0 && (
              <div className="mt-6">
                <h4 className="text-lg font-semibold mb-2 text-green-700">Related Questions</h4>
                <ul className="space-y-2">
                  {relatedQuestions.map((question, index) => (
                    <li key={index}>
                      <button
                        type="button"
                        onClick={() => askRelatedQuestion(question)}
                        className="text-left w-full bg-green-200 text-green-800 px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-300 transition duration-150 ease-in-out"
                      >
                        {question}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
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
