"use client";

import { useCallback, useState } from "react";

const ACCEPTED_EXTENSIONS = [".md", ".json", ".yaml", ".yml", ".txt", ".zip"];

interface FileUploaderProps {
  onFilesSelected: (files: File[]) => void;
  files: File[];
}

export function FileUploader({ onFilesSelected, files }: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = useCallback(
    (incoming: FileList | File[]) => {
      const valid = Array.from(incoming).filter((file) => {
        const ext = "." + file.name.split(".").pop()?.toLowerCase();
        return ACCEPTED_EXTENSIONS.includes(ext);
      });

      if (valid.length > 0) {
        onFilesSelected([...files, ...valid]);
      }
    },
    [files, onFilesSelected]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        handleFiles(e.target.files);
      }
    },
    [handleFiles]
  );

  const removeFile = useCallback(
    (index: number) => {
      const updated = files.filter((_, i) => i !== index);
      onFilesSelected(updated);
    },
    [files, onFilesSelected]
  );

  const getFileIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes("soul")) return "ghost";
    if (lower.includes("identity")) return "id";
    if (lower.includes("skill")) return "zap";
    if (lower.includes("memory")) return "brain";
    if (lower.includes("tool")) return "wrench";
    if (lower.includes("agent")) return "bot";
    if (lower.includes("heartbeat") || lower.includes("cron")) return "clock";
    if (lower.includes("recovery")) return "shield";
    if (lower.includes("user")) return "user";
    if (lower.endsWith(".zip")) return "archive";
    if (lower.endsWith(".json") || lower.endsWith(".yaml") || lower.endsWith(".yml")) return "config";
    return "file";
  };

  const FILE_ICON_MAP: Record<string, string> = {
    ghost: "👻",
    id: "🪪",
    zap: "⚡",
    brain: "🧠",
    wrench: "🔧",
    bot: "🤖",
    clock: "⏰",
    shield: "🛡️",
    user: "👤",
    archive: "📦",
    config: "⚙️",
    file: "📄",
  };

  return (
    <div className="w-full space-y-4">
      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          relative border-2 border-dashed rounded-xl p-12
          flex flex-col items-center justify-center gap-4
          transition-all duration-200 cursor-pointer
          ${
            isDragging
              ? "border-primary bg-primary/5 scale-[1.01]"
              : "border-muted-foreground/25 hover:border-muted-foreground/50 hover:bg-muted/50"
          }
        `}
        onClick={() => document.getElementById("file-input")?.click()}
      >
        <div className="text-4xl">
          {isDragging ? "📥" : "📂"}
        </div>
        <div className="text-center">
          <p className="text-lg font-medium">
            {isDragging ? "Drop files here" : "Drag & drop agent files here"}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            or click to browse
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Supports: .md, .json, .yaml, .txt, .zip
          </p>
        </div>

        <input
          id="file-input"
          type="file"
          multiple
          accept={ACCEPTED_EXTENSIONS.join(",")}
          onChange={handleInputChange}
          className="hidden"
        />
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">
            {files.length} file{files.length !== 1 ? "s" : ""} selected
          </p>
          <div className="grid gap-2">
            {files.map((file, index) => {
              const iconKey = getFileIcon(file.name);
              return (
                <div
                  key={`${file.name}-${index}`}
                  className="flex items-center justify-between bg-muted/50 rounded-lg px-4 py-2.5 group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-lg flex-shrink-0">
                      {FILE_ICON_MAP[iconKey]}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {file.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {(file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(index);
                    }}
                    className="text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100 ml-2"
                    aria-label={`Remove ${file.name}`}
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
