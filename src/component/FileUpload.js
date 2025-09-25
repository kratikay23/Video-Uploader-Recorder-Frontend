import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import API from "../API";

const FileUpload = () => {
    const [videos, setVideos] = useState([]);
    const [recording, setRecording] = useState(false);
    const [stream, setStream] = useState(null);
    const [recordTime, setRecordTime] = useState(0);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadedSize, setUploadedSize] = useState(0);
    const [totalSize, setTotalSize] = useState(0);
    const [uploading, setUploading] = useState(false);
    const [activeTab, setActiveTab] = useState("upload"); // ✅ Tabs
    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);
    const timerRef = useRef(null);

    useEffect(() => {
        fetchVideos();
    }, []);

    const fetchVideos = async () => {
        const res = await axios.get(API.VIDEO_GET);
        setVideos(res.data);
    };

    // File Upload
    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        await uploadToServer(file);
    };

    const uploadToServer = async (file) => {
        setUploading(true);
        setUploadProgress(0);
        setUploadedSize(0);
        setTotalSize(file.size);

        const formData = new FormData();
        formData.append("video", file);

        try {
            await axios.post(API.VIDEO_POST, formData, {
                headers: { "Content-Type": "multipart/form-data" },
                onUploadProgress: (progressEvent) => {
                    const percent = Math.round(
                        (progressEvent.loaded * 100) / progressEvent.total
                    );
                    setUploadProgress(percent);
                    setUploadedSize(progressEvent.loaded);
                },
            });

            fetchVideos();
        } catch (err) {
            alert("Upload failed");
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this video?")) return;
        try {
            await axios.delete(`${API.VIDEO_DELETE}/${id}`);
            fetchVideos();
        } catch (err) {
            console.error("Error deleting video:", err);
        }
    };

    // Recording
    const startRecording = async () => {
        try {
            const newStream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true,
            });
            setStream(newStream);

            mediaRecorderRef.current = new MediaRecorder(newStream);
            chunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };

            mediaRecorderRef.current.onstop = async () => {
                const blob = new Blob(chunksRef.current, { type: "video/mp4" });
                const recordedFile = new File([blob], `recorded-${Date.now()}.mp4`, {
                    type: "video/mp4",
                });
                await uploadToServer(recordedFile);

                newStream.getTracks().forEach((track) => track.stop());
                setStream(null);
            };

            mediaRecorderRef.current.start();
            setRecording(true);

            setRecordTime(0);
            timerRef.current = setInterval(() => {
                setRecordTime((t) => t + 1);
            }, 1000);
        } catch {
            alert("Could not access camera/microphone");
        }
    };

    const stopRecording = () => {
        clearInterval(timerRef.current);
        mediaRecorderRef.current.stop();
        setRecording(false);
    };

    const formatSize = (bytes) => {
        if (!bytes) return "0 MB";
        return (bytes / (1024 * 1024)).toFixed(2) + " MB";
    };

    return (
        <div style={styles.wrapper}>
            <div style={styles.card}>
                {/* Tabs */}
                <div style={styles.tabContainer}>
                    <button
                        style={{
                            ...styles.tab,
                            ...(activeTab === "upload" ? styles.activeTab : {}),
                        }}
                        onClick={() => setActiveTab("upload")}
                    >
                        Upload Video
                    </button>
                    <button
                        style={{
                            ...styles.tab,
                            ...(activeTab === "videos" ? styles.activeTab : {}),
                        }}
                        onClick={() => setActiveTab("videos")}
                    >
                        Uploaded Videos
                    </button>
                </div>

                {/* Upload Section */}
                {activeTab === "upload" && (
                    <div>
                        <label style={styles.uploadBox}>
                            <input type="file" onChange={handleFileChange} hidden />
                            📂 Drag & Drop or Click to Upload
                        </label>

                        {uploading && (
                            <div style={styles.progressCard}>
                                <p>
                                    Uploading... {uploadProgress}% ({formatSize(uploadedSize)} /{" "}
                                    {formatSize(totalSize)})
                                </p>
                                <div style={styles.progressBar}>
                                    <div
                                        style={{
                                            ...styles.progressFill,
                                            width: `${uploadProgress}%`,
                                        }}
                                    ></div>
                                </div>
                            </div>
                        )}

                        <div style={{ margin: "20px 0", textAlign: "center" }}>
                            {!recording ? (
                                <button style={styles.startBtn} onClick={startRecording}>
                                    ⏺ Start Recording
                                </button>
                            ) : (
                                <button style={styles.stopBtn} onClick={stopRecording}>
                                    ⏹ Stop Recording
                                </button>
                            )}
                        </div>

                        {stream && recording && (
                            <div style={styles.recordBox}>
                                <video
                                    width="300"
                                    autoPlay
                                    muted
                                    ref={(video) => {
                                        if (video && video.srcObject !== stream) {
                                            video.srcObject = stream;
                                        }
                                    }}
                                    style={styles.recordVideo}
                                />
                                <p style={styles.recordText}>
                                    Recording: {recordTime} sec
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* Uploaded Videos Section */}
                {activeTab === "videos" && (
                    <div style={styles.videoGrid}>
                        {videos.map((video) => (
                            <div key={video._id} style={styles.videoCard}>
                                <video width="100%" controls style={styles.videoPreview}>
                                    <source
                                        src={`http://localhost:5000/uploads/${video.filename}`}
                                        type="video/mp4"
                                    />
                                </video>
                                <h4 style={styles.cardTitle}>{video.originalName}</h4>
                                <p style={styles.cardMeta}>
                                    {new Date(video.uploadDate).toLocaleString()} <br />
                                    Size: {formatSize(video.size)}
                                </p>
                                <button
                                    style={styles.deleteBtn}
                                    onClick={() => handleDelete(video._id)}
                                >
                                    🗑 Delete
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

/* 🎨 Styles */
const styles = {
    wrapper: {
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "#7b4c4c",
        padding: "20px",
    },
    card: {
        background: "#fff",
        borderRadius: "12px",
        padding: "20px",
        width: "600px",
        boxShadow: "0 6px 16px rgba(0,0,0,0.2)",
    },
    tabContainer: {
        display: "flex",
        marginBottom: "20px",
    },
    tab: {
        flex: 1,
        padding: "10px",
        border: "none",
        cursor: "pointer",
        background: "#f1f1f1",
        borderRadius: "8px 8px 0 0",
        fontWeight: "500",
    },
    activeTab: {
        background: "#007bff",
        color: "#fff",
    },
    uploadBox: {
        border: "2px dashed #ccc",
        borderRadius: "8px",
        padding: "30px",
        display: "block",
        textAlign: "center",
        color: "#555",
        cursor: "pointer",
        marginBottom: "20px",
    },
    progressCard: {
        background: "#f9f9f9",
        padding: "10px",
        borderRadius: "6px",
        marginBottom: "15px",
    },
    progressBar: {
        height: "10px",
        background: "#eee",
        borderRadius: "6px",
        overflow: "hidden",
    },
    progressFill: {
        height: "100%",
        background: "linear-gradient(90deg,#007bff,#00c6ff)",
    },
    startBtn: {
        background: "#28a745",
        color: "white",
        padding: "10px 20px",
        border: "none",
        borderRadius: "6px",
        cursor: "pointer",
    },
    stopBtn: {
        background: "#dc3545",
        color: "white",
        padding: "10px 20px",
        border: "none",
        borderRadius: "6px",
        cursor: "pointer",
    },
    recordBox: { marginTop: "10px", textAlign: "center" },
    recordVideo: { borderRadius: "8px", boxShadow: "0 2px 8px rgba(0,0,0,0.2)" },
    recordText: { marginTop: "5px", fontSize: "14px", color: "#ff4444" },
    videoGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
        gap: "15px",
    },
    videoCard: {
        border: "1px solid #ddd",
        borderRadius: "8px",
        padding: "10px",
        background: "#fff",
        boxShadow: "0 3px 8px rgba(0,0,0,0.1)",
        textAlign: "center",
    },
    videoPreview: { borderRadius: "6px" },
    cardTitle: { margin: "5px 0", fontSize: "14px", fontWeight: "bold" },
    cardMeta: { fontSize: "12px", color: "#777" },
    deleteBtn: {
        background: "#ff4444",
        color: "white",
        padding: "6px 12px",
        border: "none",
        borderRadius: "6px",
        cursor: "pointer",
        marginTop: "8px",
    },
};

export default FileUpload;
