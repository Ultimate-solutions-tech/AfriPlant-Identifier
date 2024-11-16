"use client"

import React, { useState } from 'react'
import Image from "next/image";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { jsPDF } from "jspdf";
export const MainContainer = () => {
    
     const [image, setImage] = useState<File | null>(null) 
     const [loading, setLoading] = useState(false)
     const [result, setResult] = useState<string | null>(null); 
     const [Keywords, setKeywords] = useState<string[]>([]);
     const [relatedQuestion, setRelatedQuestion] = useState<string[]>([]);
    //  const resultRef = useRef<HTMLDivElement>(null);
   
     const handleImageUpload = (e : React.ChangeEvent<HTMLInputElement>) => {
        if(e.target.files && e.target.files[0]){
            setImage(e.target.files[0]);
        }
    };

    const handleTakePhoto = async () => {
        const captureImage = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                const video = document.createElement('video');
                video.srcObject = stream;
                video.play();

                await new Promise((resolve) => (video.onloadedmetadata = resolve));

                const canvas = document.createElement('canvas');
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                canvas.getContext('2d')?.drawImage(video, 0, 0);

                canvas.toBlob((blob) => {
                    if (blob) setImage(new File([blob], "captured-image.jpg", { type: "image/jpeg" }));
                });

                stream.getTracks().forEach((track) => track.stop());
            } catch (error) {
                console.error("Camera access denied or unavailable:", error);
            }
        };
        await captureImage();
    };

    const analyzeImage = async (additionalPrompt: string = "") => {
        if (!image) return;

        setLoading(true);

        const genAI = new GoogleGenerativeAI(
            process.env.NEXT_PUBLIC_GOOGLE_GEMINI_API_KEY!
        );

        const model = genAI.getGenerativeModel({
            model: "gemini-1.5-flash",
          });


          try {

            const imageParts = await fileToGenerativePart(image);
            const result = await model.generateContent([
                `Generate details about this image, name, species, planting process, care recommendation, health, disease diagnosis. Also add the recommended season and weather for planting. Format each subheading to be bold and in capital letter for easy readability. Also add additional information. Give the details in a simple african english style for a novice just starting farming in africa ${additionalPrompt}`,
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
            generateKeywords(text);
            await generateRelatedQuestions(text);

          } catch (error) {
            console.log((error as Error)?.message);
          } finally {
            setLoading(false);
          }
    };

    const fileToGenerativePart = async (file : File
    ) : Promise<{
        inlineData: { data : string; mimeType: string };
    }> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () =>{
                const base64Data = reader.result as string;
                const base64Content = base64Data.split(",") [1];
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

    const generateKeywords = (text : string) => {
        const words = text.split(/\s+/)
        const keywordsSet = new Set<string>();

        words.forEach(word => {
            if(word.length > 4 && !["this", "that", "with", "from", "have"].includes(word.toLowerCase())
            ) {
                keywordsSet.add(word);
            }
        });
        setKeywords(Array.from(keywordsSet).slice(0, 5));
    };

    const regenerateContent = (keyword : string) => {
        analyzeImage(`focus more on aspects related to "${keyword}".`);
    };

    const generateRelatedQuestions = async (text : string) => {
         const genAI = new GoogleGenerativeAI(
            process.env.NEXT_PUBLIC_GOOGLE_GEMINI_API_KEY!
        );

        const model = genAI.getGenerativeModel({
            model: "gemini-1.5-flash",
          });

          try{
            const result = await model.generateContent([
                `Based on the following information about an image, generate 5 relation questions that a farmer might ask to learn more about the subject: 
                ${text}
                Format the output as a simple list of questions, one per line.`,
            ]);
            const response = await result.response;
            const questions = response.text().trim().split("\n");
            setRelatedQuestion(questions);
          } catch (error) {
            console.log((error as Error)?.message);
            setRelatedQuestion([]);
            }
    };
    
    const askRelatedQuestion = (question: string) => {
        analyzeImage(
            `Answer the following question about the image : "${question}".`
        );
    };

    const downloadPDF = () => {
        if (!result) return;
    
        const doc = new jsPDF();
        
        // Adding line breaks for better readability in the PDF.
        const lines = doc.splitTextToSize(result, 180); // width of 180 keeps text within margins
        doc.text(lines, 10, 10); // Add the text with 10 units margin
    
        // Save the file
        doc.save("plant-analysis.pdf");
    };
    

    return <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-lg shadow-xl overflow-hidden">
            <div className="p-8">
                <h2 className="text-3xl font-extrabold text-gray-900 mb-8 text-center">Analyze Your Plant </h2>
                <div className="mb-8">
                    <label htmlFor="image-upload" className="block text-sm font-medium text-gray-700 mb-2">Upload an Image</label>
                    <input type="file" id="image-upload" accept="image/*" onChange={handleImageUpload} className="block w-full text-sm to-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:bg-green-100 transition duration-150 ease-in-out" />
                </div>

                {/* Take Photo button */}
                <button 
                    type="button" 
                    onClick={handleTakePhoto} 
                    className="w-full bg-green-500 text-white py-3 px-4 rounded-lg hover:bg-green-600 transition duration-150 ease-in-out font-medium text-lg mb-4"
                >
                    Scan your Image
                </button>

               {/* Display the uploaded or captured image */}
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

                <button type="button" onClick={() => analyzeImage()} disabled={!image || loading} className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed font-medium text-lg">
                    {loading ? "Analyzing..." : "Analyze Image"}
                </button>
            </div>

            {result && (
                <div className="bg-green-50 p-8 border-t border-green-100">
                    <h3 className="text-2xl font-bold text-green-800 mb-4">Image Information</h3>
                    <p className="mb-2 text-gray-800">{result}</p>
                    <button onClick={downloadPDF} className="mt-4 bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600">Download as PDF</button>

                    <div className="max-w-none">
                        {result.split("\n").map((line, index) => {
                            if(line.startsWith("important Information:") || line.startsWith("Other Information:")
                            ) {
                        return (
                            <h4 className="text-xl font-semibold mt-4 mb-2 text-green-700" key={index}>
                            {line}
                            </h4>
                        );
                    } else if(line.match(/^\d+\./) || line.startsWith("-")){
                        return(
                            <li key={index} className="ml-4 mb-2 text-gray-700">
                                {line}
                            </li>
                        );
                    } else if (line.trim() !== "") {
                        return (
                            <p key={index} className="mb-2 text-gray-800">
                                {line}
                            </p>
                        );
                    }

                        return null;
                    })}
                    </div>

                    <div className="mt-6">
                        <h4 className="text-lg font-semibold mb-2 text-green-700">
                            Related Keywords
                        </h4>
                        <div className="flex flex-wrap gap-2">
                            {Keywords.map((keyword, index) => (
                                <button type="button" key={index} onClick={() => regenerateContent(keyword)} className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium hover:bg-green-200 transition duration-150 ease-in-out">
                                    {keyword}
                                </button>
                            ))}
                        </div>
                    </div>

                    {relatedQuestion.length > 0 && (
                    <div className="mt-6">
                        <h4 className="text-lg font-semibold mb-2 text-green-700">
                            Related Questions
                        </h4>
                        <ul className="space-y-2">
                            {relatedQuestion.map((question, index) => (
                                <li key={index}>
                                    <button type="button" onClick={() => askRelatedQuestion(question)} className=" text-left w-full bg-green-200 text-green-800 px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-200 transition duration-150 ease-in-out">
                                    {question}
                                    </button>
                                </li>
                            ))}
                        </ul>
                        </div>
                    )}
                </div>
            )}
        </div>

        <section id="how-it-works" className="mt-16">
            <h2 className="text-3xl font-extrabold text-gray-900 mb-8 text-center">
                How it Works
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {["Upload Image", "AI Analysis", "Get Results"].map((step, index) => (
                    <div key={index} className="bg-white rounded-lg shadow-md p-6 transition duration-150 ease-in-out transform hover:scale-105">
                        <div className="text-3xl font-bold text-green-600 mb-4">
                            {index+1}
                        </div>
                    <h3 className="text-xl font-semibold mb-2 text-gray-800">
                        {step}
                    </h3>
                    <p className="text-gray-600">Our advanced AI analyzes your uploaded image and provides detailed information about its contents.</p>
                    </div>
                )
                )}
            </div>
        </section>

        <section id="features" className="mt-16">
            <h2 className="text-3xl font-extrabold text-gray-900 mb-8 text-center">
                Features
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {["Accurate Information",
                    "Detailed Information",
                    "Fast Results",
                    "User-Friendly Interface",].map((step, index) => (
                    <div key={index} className="bg-white rounded-lg shadow-md p-6 transition duration-150 ease-in-out transform hover:scale-105">
                    
                    <h3 className="text-xl font-semibold mb-2 text-green-600">
                        {step}
                    </h3>
                    <p className="text-gray-600">Our image identifier provides quick and accurate results with a simple, easy-to-use interface.</p>
                    </div>
                )
                )}
            </div>
        </section>
    </main>
};