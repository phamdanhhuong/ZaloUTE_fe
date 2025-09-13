import axiosClient from "./axiosClient";

export interface UploadResponse {
  url: string;
  publicId?: string;
  fileName: string;
  fileSize: number;
  fileType: string;
}

export interface UploadProgressCallback {
  (progress: number): void;
}

class UploadService {
  /**
   * Upload file to server
   * @param file - File to upload
   * @param folder - Folder to upload to (optional)
   * @param onProgress - Progress callback (optional)
   * @returns Promise with upload response
   */
  async uploadFile(
    file: File,
    folder: string = "chat-files",
    onProgress?: UploadProgressCallback
  ): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", folder);

    try {
      const response = (await axiosClient.post("/upload/file", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const progress = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            onProgress(progress);
          }
        },
      })) as any; // Type assertion since axiosClient processes the response

      return {
        url: response.url,
        publicId: response.publicId,
        fileName: response.fileName || file.name,
        fileSize: response.fileSize || file.size,
        fileType: response.fileType || file.type,
      };
    } catch (error) {
      console.error("Upload failed:", error);
      throw new Error("Failed to upload file");
    }
  }

  /**
   * Upload image with specific optimizations
   * @param file - Image file to upload
   * @param folder - Folder to upload to
   * @param onProgress - Progress callback
   * @returns Promise with upload response
   */
  async uploadImage(
    file: File,
    folder: string = "chat-images",
    onProgress?: UploadProgressCallback
  ): Promise<UploadResponse> {
    // Validate image type
    if (!file.type.startsWith("image/")) {
      throw new Error("File must be an image");
    }

    return this.uploadFile(file, folder, onProgress);
  }

  /**
   * Upload video with specific optimizations
   * @param file - Video file to upload
   * @param folder - Folder to upload to
   * @param onProgress - Progress callback
   * @returns Promise with upload response
   */
  async uploadVideo(
    file: File,
    folder: string = "chat-videos",
    onProgress?: UploadProgressCallback
  ): Promise<UploadResponse> {
    // Validate video type
    if (!file.type.startsWith("video/")) {
      throw new Error("File must be a video");
    }

    return this.uploadFile(file, folder, onProgress);
  }

  /**
   * Upload multiple files
   * @param files - Array of files to upload
   * @param folder - Folder to upload to
   * @param onProgress - Progress callback for overall progress
   * @returns Promise with array of upload responses
   */
  async uploadMultipleFiles(
    files: File[],
    folder: string = "chat-files",
    onProgress?: UploadProgressCallback
  ): Promise<UploadResponse[]> {
    const totalFiles = files.length;
    let completedFiles = 0;

    const uploadPromises = files.map(async (file) => {
      const result = await this.uploadFile(file, folder, (fileProgress) => {
        // Calculate overall progress
        const overallProgress = Math.round(
          ((completedFiles + fileProgress / 100) / totalFiles) * 100
        );
        onProgress?.(overallProgress);
      });

      completedFiles++;
      onProgress?.(Math.round((completedFiles / totalFiles) * 100));

      return result;
    });

    return Promise.all(uploadPromises);
  }
}

export const uploadService = new UploadService();
export default uploadService;
