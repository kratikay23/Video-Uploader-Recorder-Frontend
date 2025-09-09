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

    // file upload
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
            fetchVideos()
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

    // Convert bytes → MB
    const formatSize = (bytes) => {
        if (!bytes) return "0 MB";
        return (bytes / (1024 * 1024)).toFixed(2) + " MB";
    };

    return <>
        <div style={{ padding: "20px", fontFamily: "Arial" }}>
            <h2>Video Uploader & Recorder</h2>

            {/* Upload input */}
            <input type="file" onChange={handleFileChange} />

            {uploading && (
                <div style={{ marginTop: "10px" }}>
                    <p>
                        Uploading... {uploadProgress}% (
                        {formatSize(uploadedSize)}/ {formatSize(totalSize)})
                    </p>
                    <progress value={uploadProgress} max="100"></progress>
                </div>
            )}

            <br />

            {/* Recording controls */}
            {!recording ? (
                <button onClick={startRecording}>Start Recording</button>
            ) : (
                <button onClick={stopRecording}>Stop Recording</button>
            )}

            {stream && recording && (
                <div style={{ marginTop: "10px" }}>
                    <video width="300" autoPlay muted ref={(video) => {
                            if (video && video.srcObject !== stream) {
                                video.srcObject = stream;
                            }
                        }}
                    />
                    <p>Recording: {recordTime} sec</p>
                </div>
            )}

            {/* Uploaded Videos */}
            {videos.length > 0 && (
                <table
                    border="1"
                    cellPadding="10"
                    style={{ marginTop: "20px", width: "100%", textAlign: "center" }}
                >
                    <thead>
                        <tr>
                            <th>File Name</th>
                            <th>Date & Time</th>
                            <th>Size</th>
                            <th>Preview</th>
                            <th>Delete</th>
                        </tr>
                    </thead>
                    <tbody>
                        {videos.map((video) => (
                            <tr key={video._id}>
                                <td>{video.originalName}</td>
                                <td>{new Date(video.uploadDate).toLocaleString()}</td>
                                <td>{formatSize(video.size)}</td>
                                <td>
                                    <video width="200" controls>
                                        <source
                                            src={`http://localhost:5000/uploads/${video.filename}`}
                                            type="video/mp4"
                                        />
                                    </video>
                                </td>
                                <td>
                                    <button
                                        onClick={() => handleDelete(video._id)}
                                        style={{ background: "red", color: "white", border: "none", padding: "5px 10px", cursor: "pointer" }}
                                    >
                                        Delete
                                    </button>
                                </td>

                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    </>
};

export default FileUpload;
