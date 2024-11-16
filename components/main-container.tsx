"use client";

import React, { useState, useRef } from "react";
import Image from "next/image";
import { GoogleGenerativeAI } from "@google/generative-ai";
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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImage(e.target.files[0]);
      setCapturedImageUrl(URL.createObjectURL(e.target.files[0]));
    }
  };

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
            setCapturedImageUrl(URL.createObjectURL(file)); // Display the captured image
          }
        });
      }

      // Stop the camera stream after capturing the photo
      cameraStream?.getTracks().forEach((track) => track.stop());
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
        - Recommended season and weather for planting.
        Format each heading as bold, in capital letters, and in green color.
        Provide related questions.`, 
        imageParts 
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

      const relatedQs = extractRelatedQuestions(response.text());
      setRelatedQuestions(relatedQs);
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

  const extractRelatedQuestions = (text: string): string[] => {
    const regex = /related question[s]?:\s*([\s\S]+?)(?:\n|$)/i;
    const match = text.match(regex);
    if (match && match[1]) {
      return match[1].split("\n").map((q) => q.trim()).filter(Boolean);
    }
    return [];
  };

  const askRelatedQuestion = (question: string) => {
    console.log(`User selected related question: ${question}`);
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
            <div className="mb-8 flex flex-col items-center">
              <video ref={videoRef} className="rounded-lg shadow-md" autoPlay />
              <button
                type="button"
                onClick={handleTakePhoto}
                className="bg-green-600 text-white py-3 px-4 rounded-lg mt-4"
              >
                Snap Photo
              </button>
            </div>
          )}

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
              IMAGE INFORMATION
            </h3>
            <div className="text-gray-800 text-justify space-y-4">
              {result.split("\n").map((line, index) => (
                <p key={index} className="mb-2">{line}</p>
              ))}
            </div>
            <h4 className="text-lg font-semibold mt-6 mb-2 text-green-700">
              PLANT PROPERTIES
            </h4>
            <ul className="space-y-2">
              {plantProperties.map((property, index) => (
                <li key={index} className="text-gray-700">{property}</li>
              ))}
            </ul>
            {relatedQuestions.length > 0 && (
              <div className="mt-6">
                <h4 className="text-lg font-semibold mb-2 text-green-700">
                  Related Questions
                </h4>
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
