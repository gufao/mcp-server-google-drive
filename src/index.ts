#!/usr/bin/env node

/**
 * Google Drive MCP Server - Manage Google Drive files and folders
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";

// Configuration - credentials from environment
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN || "";

// Logging configuration - log to stderr
const logger = {
  info: (...args: unknown[]) => console.error("[INFO]", ...args),
  error: (...args: unknown[]) => console.error("[ERROR]", ...args),
  warn: (...args: unknown[]) => console.error("[WARN]", ...args),
};

// === UTILITY FUNCTIONS ===

/**
 * Format error message for user display
 */
function formatError(error: unknown): string {
  if (error instanceof Error) {
    return `❌ Error: ${error.message}`;
  }
  return `❌ Error: ${String(error)}`;
}

/**
 * Validate required parameter
 */
function validateRequired(value: string | undefined, name: string): string {
  if (!value || value.trim() === "") {
    throw new Error(`${name} is required`);
  }
  return value.trim();
}

/**
 * Initialize Google Drive API client
 */
function getDriveClient() {
  if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
    throw new Error(
      "Missing Google Drive credentials. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REFRESH_TOKEN"
    );
  }

  const oauth2Client = new OAuth2Client(CLIENT_ID, CLIENT_SECRET);
  oauth2Client.setCredentials({
    refresh_token: REFRESH_TOKEN,
  });

  return google.drive({ version: "v3", auth: oauth2Client });
}

/**
 * Format file size in human-readable format
 */
function formatFileSize(bytes: string | undefined | null): string {
  if (!bytes) return "N/A";
  const size = parseInt(bytes);
  if (isNaN(size)) return "N/A";

  const units = ["B", "KB", "MB", "GB", "TB"];
  let unitIndex = 0;
  let fileSize = size;

  while (fileSize >= 1024 && unitIndex < units.length - 1) {
    fileSize /= 1024;
    unitIndex++;
  }

  return `${fileSize.toFixed(2)} ${units[unitIndex]}`;
}

/**
 * Format date in readable format
 */
function formatDate(dateString: string | undefined | null): string {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleString();
}

// === TOOL IMPLEMENTATIONS ===

/**
 * List files in Google Drive
 */
async function listFiles(
  folderId: string = "",
  pageSize: string = "10"
): Promise<string> {
  logger.info(`Listing files, folder: ${folderId || "root"}, pageSize: ${pageSize}`);

  try {
    const drive = getDriveClient();
    const pageSizeNum = Math.min(Math.max(parseInt(pageSize) || 10, 1), 100);

    let query = "trashed = false";
    if (folderId && folderId.trim() !== "") {
      query += ` and '${folderId.trim()}' in parents`;
    }

    const response = await drive.files.list({
      pageSize: pageSizeNum,
      q: query,
      fields: "files(id, name, mimeType, size, modifiedTime, webViewLink, iconLink)",
      orderBy: "modifiedTime desc",
    });

    const files = response.data.files;

    if (!files || files.length === 0) {
      return "📁 No files found";
    }

    let result = `📁 Found ${files.length} file(s):\n\n`;

    files.forEach((file, index) => {
      const isFolder = file.mimeType === "application/vnd.google-apps.folder";
      const icon = isFolder ? "📁" : "📄";
      result += `${index + 1}. ${icon} ${file.name}\n`;
      result += `   ID: ${file.id}\n`;
      result += `   Type: ${file.mimeType}\n`;
      result += `   Size: ${formatFileSize(file.size)}\n`;
      result += `   Modified: ${formatDate(file.modifiedTime)}\n`;
      if (file.webViewLink) {
        result += `   Link: ${file.webViewLink}\n`;
      }
      result += `\n`;
    });

    return result;
  } catch (error) {
    logger.error("Error in listFiles:", error);
    return formatError(error);
  }
}

/**
 * Search for files in Google Drive
 */
async function searchFiles(
  query: string = "",
  pageSize: string = "10"
): Promise<string> {
  logger.info(`Searching files with query: ${query}`);

  try {
    const searchQuery = validateRequired(query, "query");
    const drive = getDriveClient();
    const pageSizeNum = Math.min(Math.max(parseInt(pageSize) || 10, 1), 100);

    const driveQuery = `name contains '${searchQuery}' and trashed = false`;

    const response = await drive.files.list({
      pageSize: pageSizeNum,
      q: driveQuery,
      fields: "files(id, name, mimeType, size, modifiedTime, webViewLink)",
      orderBy: "modifiedTime desc",
    });

    const files = response.data.files;

    if (!files || files.length === 0) {
      return `🔍 No files found matching "${searchQuery}"`;
    }

    let result = `🔍 Found ${files.length} file(s) matching "${searchQuery}":\n\n`;

    files.forEach((file, index) => {
      const isFolder = file.mimeType === "application/vnd.google-apps.folder";
      const icon = isFolder ? "📁" : "📄";
      result += `${index + 1}. ${icon} ${file.name}\n`;
      result += `   ID: ${file.id}\n`;
      result += `   Type: ${file.mimeType}\n`;
      result += `   Size: ${formatFileSize(file.size)}\n`;
      result += `   Modified: ${formatDate(file.modifiedTime)}\n`;
      if (file.webViewLink) {
        result += `   Link: ${file.webViewLink}\n`;
      }
      result += `\n`;
    });

    return result;
  } catch (error) {
    logger.error("Error in searchFiles:", error);
    return formatError(error);
  }
}

/**
 * Get detailed metadata about a file
 */
async function getFileMetadata(fileId: string = ""): Promise<string> {
  logger.info(`Getting metadata for file: ${fileId}`);

  try {
    const validFileId = validateRequired(fileId, "fileId");
    const drive = getDriveClient();

    const response = await drive.files.get({
      fileId: validFileId,
      fields: "*",
    });

    const file = response.data;

    let result = `📄 File Metadata:\n\n`;
    result += `Name: ${file.name}\n`;
    result += `ID: ${file.id}\n`;
    result += `Type: ${file.mimeType}\n`;
    result += `Size: ${formatFileSize(file.size)}\n`;
    result += `Created: ${formatDate(file.createdTime)}\n`;
    result += `Modified: ${formatDate(file.modifiedTime)}\n`;

    if (file.owners && file.owners.length > 0) {
      result += `Owner: ${file.owners[0].displayName || file.owners[0].emailAddress}\n`;
    }

    if (file.webViewLink) {
      result += `View Link: ${file.webViewLink}\n`;
    }

    if (file.webContentLink) {
      result += `Download Link: ${file.webContentLink}\n`;
    }

    if (file.description) {
      result += `Description: ${file.description}\n`;
    }

    if (file.shared) {
      result += `Shared: Yes\n`;
    }

    return result;
  } catch (error) {
    logger.error("Error in getFileMetadata:", error);
    return formatError(error);
  }
}

/**
 * Create a new folder in Google Drive
 */
async function createFolder(
  folderName: string = "",
  parentFolderId: string = ""
): Promise<string> {
  logger.info(`Creating folder: ${folderName}`);

  try {
    const validFolderName = validateRequired(folderName, "folderName");
    const drive = getDriveClient();

    const fileMetadata: { name: string; mimeType: string; parents?: string[] } = {
      name: validFolderName,
      mimeType: "application/vnd.google-apps.folder",
    };

    if (parentFolderId && parentFolderId.trim() !== "") {
      fileMetadata.parents = [parentFolderId.trim()];
    }

    const response = await drive.files.create({
      requestBody: fileMetadata,
      fields: "id, name, webViewLink",
    });

    const folder = response.data;

    return `✅ Folder created successfully:\n` +
           `Name: ${folder.name}\n` +
           `ID: ${folder.id}\n` +
           `Link: ${folder.webViewLink || "N/A"}`;
  } catch (error) {
    logger.error("Error in createFolder:", error);
    return formatError(error);
  }
}

/**
 * Upload a text file to Google Drive
 */
async function uploadFile(
  fileName: string = "",
  content: string = "",
  mimeType: string = "text/plain",
  folderId: string = ""
): Promise<string> {
  logger.info(`Uploading file: ${fileName}`);

  try {
    const validFileName = validateRequired(fileName, "fileName");
    const validContent = validateRequired(content, "content");
    const drive = getDriveClient();

    const fileMetadata: { name: string; parents?: string[] } = {
      name: validFileName,
    };

    if (folderId && folderId.trim() !== "") {
      fileMetadata.parents = [folderId.trim()];
    }

    const media = {
      mimeType: mimeType || "text/plain",
      body: validContent,
    };

    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: "id, name, webViewLink, size",
    });

    const file = response.data;

    return `✅ File uploaded successfully:\n` +
           `Name: ${file.name}\n` +
           `ID: ${file.id}\n` +
           `Size: ${formatFileSize(file.size)}\n` +
           `Link: ${file.webViewLink || "N/A"}`;
  } catch (error) {
    logger.error("Error in uploadFile:", error);
    return formatError(error);
  }
}

/**
 * Download file content from Google Drive
 */
async function downloadFile(fileId: string = ""): Promise<string> {
  logger.info(`Downloading file: ${fileId}`);

  try {
    const validFileId = validateRequired(fileId, "fileId");
    const drive = getDriveClient();

    // First get file metadata to check type and size
    const metaResponse = await drive.files.get({
      fileId: validFileId,
      fields: "name, mimeType, size",
    });

    const mimeType = metaResponse.data.mimeType;

    // Check if it's a Google Workspace file (needs export)
    if (mimeType?.startsWith("application/vnd.google-apps.")) {
      let exportMimeType = "text/plain";

      if (mimeType === "application/vnd.google-apps.document") {
        exportMimeType = "text/plain";
      } else if (mimeType === "application/vnd.google-apps.spreadsheet") {
        exportMimeType = "text/csv";
      } else if (mimeType === "application/vnd.google-apps.presentation") {
        exportMimeType = "text/plain";
      }

      const response = await drive.files.export(
        {
          fileId: validFileId,
          mimeType: exportMimeType,
        },
        { responseType: "text" }
      );

      return `📥 File: ${metaResponse.data.name}\n` +
             `Type: ${mimeType}\n` +
             `Content:\n\n${response.data}`;
    } else {
      // Regular file download
      const response = await drive.files.get(
        {
          fileId: validFileId,
          alt: "media",
        },
        { responseType: "text" }
      );

      return `📥 File: ${metaResponse.data.name}\n` +
             `Type: ${mimeType}\n` +
             `Size: ${formatFileSize(metaResponse.data.size)}\n` +
             `Content:\n\n${response.data}`;
    }
  } catch (error) {
    logger.error("Error in downloadFile:", error);
    return formatError(error);
  }
}

/**
 * Share a file with specific permissions
 */
async function shareFile(
  fileId: string = "",
  email: string = "",
  role: string = "reader"
): Promise<string> {
  logger.info(`Sharing file ${fileId} with ${email}`);

  try {
    const validFileId = validateRequired(fileId, "fileId");
    const validEmail = validateRequired(email, "email");
    const drive = getDriveClient();

    // Validate role
    const validRoles = ["reader", "writer", "commenter"];
    const validRole = validRoles.includes(role) ? role : "reader";

    await drive.permissions.create({
      fileId: validFileId,
      requestBody: {
        type: "user",
        role: validRole,
        emailAddress: validEmail,
      },
      fields: "id",
    });

    // Get file info
    const fileInfo = await drive.files.get({
      fileId: validFileId,
      fields: "name, webViewLink",
    });

    return `✅ File shared successfully:\n` +
           `File: ${fileInfo.data.name}\n` +
           `Shared with: ${validEmail}\n` +
           `Permission: ${validRole}\n` +
           `Link: ${fileInfo.data.webViewLink || "N/A"}`;
  } catch (error) {
    logger.error("Error in shareFile:", error);
    return formatError(error);
  }
}

/**
 * Move a file to trash
 */
async function deleteFile(fileId: string = ""): Promise<string> {
  logger.info(`Deleting file: ${fileId}`);

  try {
    const validFileId = validateRequired(fileId, "fileId");
    const drive = getDriveClient();

    // Get file name first
    const fileInfo = await drive.files.get({
      fileId: validFileId,
      fields: "name",
    });

    // Move to trash
    await drive.files.update({
      fileId: validFileId,
      requestBody: {
        trashed: true,
      },
    });

    return `✅ File moved to trash:\n` +
           `Name: ${fileInfo.data.name}\n` +
           `ID: ${validFileId}`;
  } catch (error) {
    logger.error("Error in deleteFile:", error);
    return formatError(error);
  }
}

// === MCP SERVER SETUP ===

const server = new Server(
  {
    name: "google-drive",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Define available tools
const TOOLS: Tool[] = [
  {
    name: "list_files",
    description: "List files in Google Drive, optionally filtered by folder",
    inputSchema: {
      type: "object",
      properties: {
        folderId: {
          type: "string",
          description: "Optional folder ID to list files from (leave empty for root)",
        },
        pageSize: {
          type: "string",
          description: "Number of files to return (1-100, default: 10)",
        },
      },
    },
  },
  {
    name: "search_files",
    description: "Search for files in Google Drive by name",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query (file name to search for)",
        },
        pageSize: {
          type: "string",
          description: "Number of results to return (1-100, default: 10)",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "get_file_metadata",
    description: "Get detailed metadata about a specific file",
    inputSchema: {
      type: "object",
      properties: {
        fileId: {
          type: "string",
          description: "The ID of the file to get metadata for",
        },
      },
      required: ["fileId"],
    },
  },
  {
    name: "create_folder",
    description: "Create a new folder in Google Drive",
    inputSchema: {
      type: "object",
      properties: {
        folderName: {
          type: "string",
          description: "Name of the folder to create",
        },
        parentFolderId: {
          type: "string",
          description: "Optional parent folder ID (leave empty for root)",
        },
      },
      required: ["folderName"],
    },
  },
  {
    name: "upload_file",
    description: "Upload a text file to Google Drive",
    inputSchema: {
      type: "object",
      properties: {
        fileName: {
          type: "string",
          description: "Name of the file to create",
        },
        content: {
          type: "string",
          description: "Content of the file",
        },
        mimeType: {
          type: "string",
          description: "MIME type of the file (default: text/plain)",
        },
        folderId: {
          type: "string",
          description: "Optional folder ID to upload to (leave empty for root)",
        },
      },
      required: ["fileName", "content"],
    },
  },
  {
    name: "download_file",
    description: "Download content of a file from Google Drive",
    inputSchema: {
      type: "object",
      properties: {
        fileId: {
          type: "string",
          description: "The ID of the file to download",
        },
      },
      required: ["fileId"],
    },
  },
  {
    name: "share_file",
    description: "Share a file with a specific user via email",
    inputSchema: {
      type: "object",
      properties: {
        fileId: {
          type: "string",
          description: "The ID of the file to share",
        },
        email: {
          type: "string",
          description: "Email address of the user to share with",
        },
        role: {
          type: "string",
          description: "Permission role: reader, writer, or commenter (default: reader)",
        },
      },
      required: ["fileId", "email"],
    },
  },
  {
    name: "delete_file",
    description: "Move a file to trash in Google Drive",
    inputSchema: {
      type: "object",
      properties: {
        fileId: {
          type: "string",
          description: "The ID of the file to delete",
        },
      },
      required: ["fileId"],
    },
  },
];

// Handle tool listing
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "list_files": {
        const folderId = (args?.folderId as string) || "";
        const pageSize = (args?.pageSize as string) || "10";
        return {
          content: [
            {
              type: "text",
              text: await listFiles(folderId, pageSize),
            },
          ],
        };
      }

      case "search_files": {
        const query = (args?.query as string) || "";
        const pageSize = (args?.pageSize as string) || "10";
        return {
          content: [
            {
              type: "text",
              text: await searchFiles(query, pageSize),
            },
          ],
        };
      }

      case "get_file_metadata": {
        const fileId = (args?.fileId as string) || "";
        return {
          content: [
            {
              type: "text",
              text: await getFileMetadata(fileId),
            },
          ],
        };
      }

      case "create_folder": {
        const folderName = (args?.folderName as string) || "";
        const parentFolderId = (args?.parentFolderId as string) || "";
        return {
          content: [
            {
              type: "text",
              text: await createFolder(folderName, parentFolderId),
            },
          ],
        };
      }

      case "upload_file": {
        const fileName = (args?.fileName as string) || "";
        const content = (args?.content as string) || "";
        const mimeType = (args?.mimeType as string) || "text/plain";
        const folderId = (args?.folderId as string) || "";
        return {
          content: [
            {
              type: "text",
              text: await uploadFile(fileName, content, mimeType, folderId),
            },
          ],
        };
      }

      case "download_file": {
        const fileId = (args?.fileId as string) || "";
        return {
          content: [
            {
              type: "text",
              text: await downloadFile(fileId),
            },
          ],
        };
      }

      case "share_file": {
        const fileId = (args?.fileId as string) || "";
        const email = (args?.email as string) || "";
        const role = (args?.role as string) || "reader";
        return {
          content: [
            {
              type: "text",
              text: await shareFile(fileId, email, role),
            },
          ],
        };
      }

      case "delete_file": {
        const fileId = (args?.fileId as string) || "";
        return {
          content: [
            {
              type: "text",
              text: await deleteFile(fileId),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    logger.error(`Error executing tool ${name}:`, error);
    return {
      content: [
        {
          type: "text",
          text: formatError(error),
        },
      ],
      isError: true,
    };
  }
});

// === SERVER STARTUP ===

async function main() {
  logger.info("Starting Google Drive MCP server...");

  if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
    logger.warn("Google Drive credentials not fully configured");
    logger.warn("Set: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN");
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);

  logger.info("Google Drive MCP server running on stdio");
}

main().catch((error) => {
  logger.error("Fatal error:", error);
  process.exit(1);
});
