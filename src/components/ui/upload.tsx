"use client";

import * as React from "react";
import { Upload, X, File, Image, FileText, FileCode, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileUploadProps {
  accept?: string;
  multiple?: boolean;
  maxSize?: number;
  maxFiles?: number;
  onFilesChange?: (files: File[]) => void;
  onUpload?: (files: File[]) => Promise<void>;
  files?: File[];
  disabled?: boolean;
  className?: string;
  dragActiveText?: string;
  dragInactiveText?: string;
  showPreview?: boolean;
}

const fileIcons: Record<string, React.ReactNode> = {
  image: <Image className="h-8 w-8 text-iot-info" />,
  pdf: <FileText className="h-8 w-8 text-iot-danger" />,
  text: <FileText className="h-8 w-8 text-muted-foreground" />,
  code: <FileCode className="h-8 w-8 text-iot-teal" />,
  default: <File className="h-8 w-8 text-muted-foreground" />,
};

function getFileIcon(file: File): React.ReactNode {
  if (file.type.startsWith("image/")) return fileIcons.image;
  if (file.type === "application/pdf") return fileIcons.pdf;
  if (file.type.startsWith("text/")) return fileIcons.text;
  if (file.type.includes("javascript") || file.type.includes("json")) return fileIcons.code;
  return fileIcons.default;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function FileUpload({
  accept,
  multiple = false,
  maxSize = 10 * 1024 * 1024,
  maxFiles = 5,
  onFilesChange,
  onUpload,
  files: controlledFiles,
  disabled = false,
  className,
  dragActiveText = "Drop files here...",
  dragInactiveText = "Drag & drop files here, or click to browse",
  showPreview = true,
}: FileUploadProps) {
  const [internalFiles, setInternalFiles] = React.useState<File[]>([]);
  const [dragActive, setDragActive] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const files = controlledFiles ?? internalFiles;

  const handleFiles = React.useCallback(
    (newFiles: File[]) => {
      setError(null);
      const validFiles = newFiles.filter((file) => {
        if (maxSize && file.size > maxSize) {
          setError(`File ${file.name} exceeds max size of ${formatFileSize(maxSize)}`);
          return false;
        }
        return true;
      });

      const totalFiles = multiple
        ? [...files, ...validFiles].slice(0, maxFiles)
        : validFiles.slice(0, 1);

      setInternalFiles(totalFiles);
      onFilesChange?.(totalFiles);
    },
    [files, maxSize, maxFiles, multiple, onFilesChange]
  );

  const handleDrag = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = React.useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleFiles(Array.from(e.dataTransfer.files));
      }
    },
    [handleFiles]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(Array.from(e.target.files));
    }
  };

  const removeFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    setInternalFiles(newFiles);
    onFilesChange?.(newFiles);
  };

  const handleUpload = async () => {
    if (!onUpload || files.length === 0) return;
    setUploading(true);
    try {
      await onUpload(files);
      setInternalFiles([]);
      onFilesChange?.([]);
    } catch {
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={cn("w-full", className)}>
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        className={cn(
          "relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors",
          dragActive
            ? "border-iot-teal bg-iot-teal/5"
            : "border-muted-foreground/25 hover:border-muted-foreground/50",
          disabled && "cursor-not-allowed opacity-50",
          !disabled && "cursor-pointer"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleChange}
          disabled={disabled}
          className="hidden"
        />
        <Upload
          className={cn(
            "mb-4 h-10 w-10",
            dragActive ? "text-iot-teal" : "text-muted-foreground"
          )}
        />
        <p className="mb-2 text-sm text-foreground">
          {dragActive ? dragActiveText : dragInactiveText}
        </p>
        <p className="text-xs text-muted-foreground">
          {accept && `Accepted: ${accept}`}
          {maxSize && ` Max size: ${formatFileSize(maxSize)}`}
          {multiple && ` Max files: ${maxFiles}`}
        </p>
      </div>

      {error && (
        <p className="mt-2 text-sm text-destructive">{error}</p>
      )}

      {showPreview && files.length > 0 && (
        <div className="mt-4 space-y-2">
          {files.map((file, index) => (
            <div
              key={`${file.name}-${index}`}
              className="flex items-center gap-3 rounded-md border bg-card p-3"
            >
              {getFileIcon(file)}
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(file.size)}
                </p>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile(index);
                }}
                disabled={disabled || uploading}
                className="rounded-md p-1 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {files.length > 0 && onUpload && (
        <button
          type="button"
          onClick={handleUpload}
          disabled={disabled || uploading}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
        >
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" />
              Upload {files.length} file{files.length > 1 ? "s" : ""}
            </>
          )}
        </button>
      )}
    </div>
  );
}

export { FileUpload, formatFileSize };
