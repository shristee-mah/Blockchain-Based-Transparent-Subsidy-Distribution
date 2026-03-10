"use client";

import React, { useEffect, useId, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";
import jsQR from "jsqr";

interface QRScannerProps {
    onResult: (result: string) => void;
    onError?: (error: string) => void;
}

/**
 * Reusable QR Scanner.
 * - Camera scanning: html5-qrcode (live viewfinder)
 * - File / image scanning: jsQR via Canvas (much more reliable than scanFile)
 */
export default function QRScanner({ onResult, onError }: QRScannerProps) {
    const uid = useId().replace(/:/g, "_");
    const containerId = `qr-reader-${uid}`;
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [cameraRunning, setCameraRunning] = React.useState(false);
    const [scanError, setScanError] = React.useState<string | null>(null);
    const [scanning, setScanning] = React.useState(false);

    // ── Cleanup on unmount ────────────────────────────────────────────────────
    useEffect(() => {
        return () => {
            const s = scannerRef.current;
            if (!s) return;
            void s.stop().catch(() => { });
            setTimeout(() => { try { s.clear(); } catch { /* ignore */ } }, 300);
        };
    }, []);

    // ── Live Camera start ─────────────────────────────────────────────────────
    const startCamera = async () => {
        setScanError(null);
        try {
            const qr = new Html5Qrcode(containerId);
            scannerRef.current = qr;
            await qr.start(
                { facingMode: "environment" },
                { fps: 10, qrbox: { width: 250, height: 250 } },
                (text) => {
                    onResult(text);
                    stopCamera();
                },
                () => { /* ignore per-frame scan errors */ }
            );
            setCameraRunning(true);
        } catch (err: any) {
            const msg = "Camera error: " + (err.message ?? String(err));
            setScanError(msg);
            if (onError) onError(msg);
        }
    };

    // ── Camera stop ─────────────────────────────────────────────────────────
    const stopCamera = async () => {
        try {
            await scannerRef.current?.stop();
            try { scannerRef.current?.clear(); } catch { /* ignore */ }
        } catch { /* ignore */ }
        setCameraRunning(false);
    };

    // ── File scan via jsQR (canvas-based, very reliable) ─────────────────────
    const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setScanError(null);
        setScanning(true);

        // Stop camera if running
        if (cameraRunning) await stopCamera();

        try {
            const text = await decodeQRFromFile(file);
            onResult(text);
        } catch (err: any) {
            const msg =
                "No QR code found in image. Tips: ensure the QR is fully visible, well-lit, and the image is not blurry.";
            setScanError(msg);
            if (onError) onError(msg);
        } finally {
            setScanning(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    return (
        <div style={styles.wrapper}>
            {/* Camera viewport */}
            <div
                id={containerId}
                style={{
                    width: "100%",
                    minHeight: cameraRunning ? 280 : 0,
                    background: cameraRunning ? "#000" : "transparent",
                    borderRadius: 12,
                    overflow: "hidden",
                    transition: "min-height 0.3s",
                }}
            />

            {/* Controls */}
            <div style={styles.controls}>
                {!cameraRunning ? (
                    <button onClick={startCamera} style={styles.btnPrimary} type="button">
                        📷 Start Camera
                    </button>
                ) : (
                    <button onClick={stopCamera} style={styles.btnDanger} type="button">
                        ⏹ Stop Camera
                    </button>
                )}

                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={handleFile}
                />
                <button
                    onClick={() => fileInputRef.current?.click()}
                    style={{ ...styles.btnSecondary, opacity: scanning ? 0.6 : 1 }}
                    disabled={scanning}
                    type="button"
                >
                    {scanning ? "⏳ Scanning..." : "🖼 Upload QR Image"}
                </button>
            </div>

            {cameraRunning && (
                <div style={styles.hint}>
                    Point camera at QR code — detected automatically
                </div>
            )}

            {scanError && <div style={styles.error}>{scanError}</div>}
        </div>
    );
}

// ── jsQR image decoder ───────────────────────────────────────────────────────
// Draws the image onto a hidden canvas, reads ImageData, then calls jsQR.
function decodeQRFromFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement("canvas");
                // Use full image size for best accuracy
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                const ctx = canvas.getContext("2d");
                if (!ctx) return reject(new Error("Canvas not available"));

                ctx.drawImage(img, 0, 0);
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

                const result = jsQR(imageData.data, imageData.width, imageData.height, {
                    inversionAttempts: "dontInvert",
                });

                if (result && result.data) {
                    resolve(result.data);
                } else {
                    // Try with inverted colours (white-on-black QR codes)
                    const resultInv = jsQR(imageData.data, imageData.width, imageData.height, {
                        inversionAttempts: "onlyInvert",
                    });
                    if (resultInv && resultInv.data) {
                        resolve(resultInv.data);
                    } else {
                        reject(new Error("No QR found"));
                    }
                }
            };
            img.onerror = () => reject(new Error("Could not load image"));
            img.src = reader.result as string;
        };

        reader.onerror = () => reject(new Error("Could not read file"));
        reader.readAsDataURL(file);
    });
}

const styles: Record<string, React.CSSProperties> = {
    wrapper: {
        display: "flex",
        flexDirection: "column",
        gap: 12,
        width: "100%",
        maxWidth: 480,
        margin: "0 auto",
    },
    controls: {
        display: "flex",
        gap: 10,
        flexWrap: "wrap",
    },
    btnPrimary: {
        flex: 1,
        padding: "11px 0",
        borderRadius: 8,
        border: "none",
        background: "#3D4B9C",
        color: "#fff",
        fontWeight: 700,
        fontSize: 14,
        cursor: "pointer",
    },
    btnSecondary: {
        flex: 1,
        padding: "11px 0",
        borderRadius: 8,
        border: "1.5px solid #3D4B9C",
        background: "#fff",
        color: "#3D4B9C",
        fontWeight: 700,
        fontSize: 14,
        cursor: "pointer",
    },
    btnDanger: {
        flex: 1,
        padding: "11px 0",
        borderRadius: 8,
        border: "1px solid #fca5a5",
        background: "transparent",
        color: "#dc2626",
        fontWeight: 700,
        fontSize: 14,
        cursor: "pointer",
    },
    hint: {
        fontSize: 12,
        color: "#6b7280",
        textAlign: "center",
        padding: "4px 0",
    },
    error: {
        fontSize: 12,
        color: "#dc2626",
        background: "#fef2f2",
        border: "1px solid #fca5a5",
        padding: "8px 12px",
        borderRadius: 8,
        textAlign: "center",
        lineHeight: 1.5,
    },
};
