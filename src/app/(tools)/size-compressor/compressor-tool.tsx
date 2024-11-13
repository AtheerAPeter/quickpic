"use client";
import { FileDropzone } from "@/components/shared/file-dropzone";
import { UploadBox } from "@/components/shared/upload-box";
import { useState, type ChangeEvent, useEffect } from "react";

export default function ImageSizeCompressor() {
  const [images, setImages] = useState<File[]>([]);
  const [quality, setQuality] = useState(0.8);
  const [compressedPreview, setCompressedPreview] = useState<string | null>(
    null,
  );
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [originalSize, setOriginalSize] = useState<string>("");
  const [compressedSize, setCompressedSize] = useState<string>("");
  const [isCompressing, setIsCompressing] = useState(false);

  function formatFileSize(bytes: number): string {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }

  async function compressImage(image: File, quality: number): Promise<File> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const imageUrl = URL.createObjectURL(image);

      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;
        const maxDimension = 1920;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = (height / width) * maxDimension;
            width = maxDimension;
          } else {
            width = (width / height) * maxDimension;
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Could not get canvas context"));

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) return reject(new Error("Could not create blob"));

            const compressedFile = new File([blob], image.name, {
              type: "image/jpeg",
              lastModified: Date.now(),
            });

            resolve(compressedFile);
          },
          "image/jpeg",
          quality,
        );
      };

      img.onerror = () => reject(new Error("Could not load image"));
      img.src = imageUrl;
    });
  }

  function handleImageUpload(e: ChangeEvent<HTMLInputElement>) {
    if (!e.target.files) return;

    const newFiles = Array.from(e.target.files);
    setImages((prev) => [...prev, ...newFiles]);
  }

  function handleImageDrop(files: FileList) {
    setImages((prev) => [...prev, ...files]);
  }

  useEffect(() => {
    if (images[currentIndex] === undefined) return;
    setOriginalSize(formatFileSize(images[currentIndex].size));

    async function generateCompressedPreview() {
      if (images[currentIndex] === undefined) return;
      setIsCompressing(true);
      try {
        const compressedFile = await compressImage(
          images[currentIndex],
          quality,
        );
        setCompressedPreview(URL.createObjectURL(compressedFile));
        setCompressedSize(formatFileSize(compressedFile.size));
      } finally {
        setIsCompressing(false);
      }
    }

    const debounceTimeout = setTimeout(() => {
      void generateCompressedPreview();
    }, 300);

    return () => {
      clearTimeout(debounceTimeout);
    };
  }, [images, quality, currentIndex]);

  function removeImage(index: number) {
    setImages((prev) => prev.filter((_, i) => i !== index));
    if (index === 0) {
      setCompressedPreview(null);
      setOriginalSize("");
      setCompressedSize("");
    }
  }

  async function handleCompress() {
    try {
      setIsCompressing(true);
      const compressedFiles = await Promise.all(
        images.map((image) => compressImage(image, quality)),
      );

      compressedFiles.forEach((file, index) => {
        const link = document.createElement("a");
        link.href = URL.createObjectURL(file);
        link.download = `compressed_${images[index]?.name ?? `image_${index}`}`;
        link.click();
        URL.revokeObjectURL(link.href);
      });
    } catch (error) {
      console.error("Error compressing images:", error);
    } finally {
      setIsCompressing(false);
    }
  }

  function onChangeQuality(e: ChangeEvent<HTMLInputElement>) {
    setQuality(parseFloat(e.target.value));
  }

  function onCancel() {
    setImages([]);
    setCompressedPreview(null);
    setOriginalSize("");
    setCompressedSize("");
  }

  if (images.length === 0) {
    return (
      <FileDropzone
        acceptedFileTypes={[
          "image/*",
          ".jpg",
          ".jpeg",
          ".png",
          ".webp",
          ".svg",
        ]}
        dropText="Drop image file"
        setCurrentFile={handleImageDrop}
      >
        <UploadBox
          title="Compress your images to reduce file size."
          description="Upload Images"
          allow_multiple={true}
          accept="image/*"
          onChange={handleImageUpload}
        />
      </FileDropzone>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-4 p-4 text-2xl">
      <div className="flex flex-wrap justify-center gap-4">
        {images.map((image, index) => (
          <div key={index} className="relative">
            <img
              src={URL.createObjectURL(image)}
              alt={`Preview ${index + 1}`}
              className="h-32 w-32 rounded-lg object-cover"
              role="button"
              onClick={() => {
                setCurrentIndex(index);
              }}
            />
            <button
              onClick={() => removeImage(index)}
              className="absolute -right-2 -top-2 h-8 w-8 rounded-full bg-red-700 text-white hover:bg-red-800"
            >
              X
            </button>
          </div>
        ))}
      </div>

      <div className="flex w-full max-w-md flex-col gap-2">
        <label className="text-sm">Quality: {Math.round(quality * 100)}%</label>
        <input
          type="range"
          min="0.1"
          max="1"
          step="0.1"
          value={quality}
          onChange={onChangeQuality}
          className="w-full"
          disabled={isCompressing}
        />
      </div>

      {images.length > 1 && (
        <p className="inline-block rounded-full border border-white/30 bg-white/5 px-2 py-0.5 text-center text-sm text-white/60">
          All images share the same quality range
        </p>
      )}

      {images.length > 0 && (
        <div className="flex gap-8">
          <div className="flex flex-col items-center gap-2">
            <span className="text-sm font-medium">Original</span>
            <img
              src={
                images[currentIndex]
                  ? URL.createObjectURL(images[currentIndex])
                  : ""
              }
              alt="Original preview"
              className="h-64 w-64 rounded-lg object-cover"
            />
            <span className="text-sm text-gray-600">{originalSize}</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <span className="text-sm font-medium">Compressed Preview</span>
            <div className="relative h-64 w-64">
              <img
                src={
                  compressedPreview ??
                  (images[currentIndex]
                    ? URL.createObjectURL(images[currentIndex])
                    : "")
                }
                alt="Compressed preview"
                className="h-64 w-64 rounded-lg object-cover"
              />
              {isCompressing && (
                <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/50">
                  <div className="text-sm text-white">Compressing...</div>
                </div>
              )}
            </div>
            <span className="text-sm text-gray-600">{compressedSize}</span>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={handleCompress}
          disabled={isCompressing}
          className={`rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-opacity-75 ${
            isCompressing
              ? "cursor-not-allowed bg-gray-500"
              : "bg-green-700 hover:bg-green-800"
          }`}
        >
          {isCompressing ? "Compressing..." : "Download Compressed Images"}
        </button>
        <button
          onClick={onCancel}
          disabled={isCompressing}
          className={`rounded-md px-3 py-1 text-sm font-medium text-white transition-colors ${
            isCompressing
              ? "cursor-not-allowed bg-gray-500"
              : "bg-red-700 hover:bg-red-800"
          }`}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
