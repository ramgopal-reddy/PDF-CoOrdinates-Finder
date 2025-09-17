import React, { useState, useRef, useEffect } from 'react';
import 'pdfjs-dist/build/pdf.js';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker?url';

const pdfjsLib = (window as any).pdfjsLib;
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

function App() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [coordinates, setCoordinates] = useState<{ x: number; y: number } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [landmarks, setLandmarks] = useState<{ x: number; y: number }[]>([]);
    const [pdfPage, setPdfPage] = useState<any>(null);
    const [viewport, setViewport] = useState<any>(null);

    const drawBlankPage = (width = 794, height = 1123) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const context = canvas.getContext('2d');
        if (!context) return;

        canvas.width = width;
        canvas.height = height;
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, width, height);
        setError(null);
    };

    useEffect(() => {
        if (!pdfjsLib) {
            setError("PDF.js library failed to load. Please refresh the page.");
            return;
        }
        drawBlankPage();
    }, []);

    const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const x = Math.round(event.clientX - rect.left);
        const y = Math.round(event.clientY - rect.top);
        setCoordinates({ x, y });
    };

    const handleMouseLeave = () => {
        setCoordinates(null);
    };

    const renderPdf = async (file: File) => {
        const canvas = canvasRef.current;
        const context = canvas?.getContext('2d');
        if (!file || !canvas || !context) {
            setError("Canvas or file not available.");
            return;
        }

        setIsLoading(true);
        setError(null);

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                if (!event.target?.result) throw new Error("Failed to read file.");
                const typedArray = new Uint8Array(event.target.result as ArrayBuffer);
                const pdf = await pdfjsLib.getDocument(typedArray).promise;
                const page = await pdf.getPage(1);
                const vp = page.getViewport({ scale: 1 });

                canvas.width = vp.width;
                canvas.height = vp.height;

                const renderContext = {
                    canvasContext: context,
                    viewport: vp,
                };
                await page.render(renderContext).promise;

                setPdfPage(page);
                setViewport(vp);
                setLandmarks([]); // Reset landmarks
            } catch (err) {
                console.error("Error rendering PDF:", err);
                setError(`Failed to load PDF. ${err instanceof Error ? err.message : ''}`);
                drawBlankPage();
            } finally {
                setIsLoading(false);
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) {
            setError("No file selected.");
            return;
        }
        if (file.type !== 'application/pdf') {
            setError("Invalid file type. Please upload a PDF.");
            return;
        }
        renderPdf(file);
    };

    const handleReset = () => {
        drawBlankPage();
        if (fileInputRef.current) fileInputRef.current.value = "";
        setLandmarks([]);
        setPdfPage(null);
        setViewport(null);
    };

    const reloadCanvasWithLandmarks = async (currentLandmarks: { x: number; y: number }[]) => {
        const canvas = canvasRef.current;
        const context = canvas?.getContext('2d');
        if (!pdfPage || !viewport || !canvas || !context) return;

        const renderContext = {
            canvasContext: context,
            viewport: viewport,
        };

        await pdfPage.render(renderContext).promise;

        currentLandmarks.forEach(({ x, y }, index) => {
            context.beginPath();
            context.arc(x, y, 5, 0, 2 * Math.PI);
            context.fillStyle = '#ff0000';
            context.fill();
            context.strokeStyle = '#ffffff';
            context.lineWidth = 2;
            context.stroke();

            context.fillStyle = '#000000';
            context.font = '12px Arial';
            context.fillText(`${index + 1}`, x + 8, y - 8);
        });
    };

    const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const x = Math.round(event.clientX - rect.left);
        const y = Math.round(event.clientY - rect.top);

        const newLandmarks = [...landmarks, { x, y }];
        setLandmarks(newLandmarks);
        reloadCanvasWithLandmarks(newLandmarks);
    };

    const handleDeleteLandmark = (indexToDelete: number) => {
        const newLandmarks = landmarks.filter((_, idx) => idx !== indexToDelete);
        setLandmarks(newLandmarks);
        reloadCanvasWithLandmarks(newLandmarks);
    };

    const styles: { [key: string]: React.CSSProperties } = {
        container: { fontFamily: 'Arial, sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px', backgroundColor: '#000000ff', borderRadius: '16px', gap: '40px' },
        controls: { marginBottom: '20px', display: 'flex', gap: '20px', alignItems: 'center' },
        canvasContainer: { position: 'relative', display: 'inline-block', boxShadow: '0 8px 20px rgba(0,0,0,0.15)', borderRadius: '8px' },
        canvas: { border: '2px solid #4a90e2', borderRadius: '8px', cursor: 'crosshair', display: 'block' },
        coordCursor: { position: 'absolute', backgroundColor: '#4a90e2', color: '#fff', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', pointerEvents: 'none', transform: 'translate(10px, 10px)' },
        error: { color: '#d93025', marginTop: '10px', fontWeight: 'bold' },
        button: { padding: '8px 16px', fontSize: '14px', cursor: 'pointer', border: '1px solid #4a90e2', borderRadius: '4px', backgroundColor: '#4a90e2', color: '#fff', transition: '0.3s', outline: 'none' },
        input: { padding: '6px 12px', fontSize: '14px', cursor: 'pointer', border: '1px solid #4a90e2', borderRadius: '4px', backgroundColor: '#4a90e2', color: '#fff', transition: '0.3s', outline: 'none' },
        mainContent: { display: 'flex', alignItems: 'flex-start', gap: '40px' },
        landmarkList: { backgroundColor: '#333', padding: '20px', borderRadius: '8px', maxHeight: '80vh', overflowY: 'auto', minWidth: '250px' },
    };

    return (
        <div style={styles.container}>
            <h1 style={{ color: '#ffffff' }}>PDF Coordinates Viewer with Landmarks</h1>

            <div style={styles.controls}>
                <input type="file" accept=".pdf" onChange={handleFileChange} ref={fileInputRef} style={styles.input} />
                <button onClick={handleReset} style={styles.button}>Reset</button>
            </div>

            {isLoading && <p style={{ color: '#ffffff' }}>Loading PDF...</p>}
            {error && <p style={styles.error}>{error}</p>}

            <div style={styles.mainContent}>
                {/* Landmark List */}
                <div style={styles.landmarkList}>
                    <h3 style={{ color: '#ffffff' }}>Landmarks:</h3>
                    {landmarks.length === 0 ? (
                        <p style={{ color: '#ffffff' }}>No landmarks yet.</p>
                    ) : (
                        <ul style={{ padding: 0, listStyleType: 'none' }}>
                            {landmarks.map((lm, idx) => (
                                <li key={idx} style={{ color: '#ffffff', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                                    {idx + 1}. X: {lm.x}, Y: {lm.y}
                                    <button onClick={() => handleDeleteLandmark(idx)} style={styles.button}>Delete</button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* Canvas */}
                <div style={styles.canvasContainer}>
                    <canvas
                        ref={canvasRef}
                        style={styles.canvas}
                        onClick={handleCanvasClick}
                        onMouseMove={handleMouseMove}
                        onMouseLeave={handleMouseLeave}
                    />
                    {coordinates && (
                        <div style={{ ...styles.coordCursor, top: coordinates.y, left: coordinates.x }}>
                            X: {coordinates.x}, Y: {coordinates.y}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default App;
