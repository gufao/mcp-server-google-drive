# Google Drive MCP Server

A Model Context Protocol (MCP) server that provides secure access to Google Drive for AI assistants.
Built with TypeScript for type safety and modern development practices.

## Purpose

This MCP server provides a secure interface for AI assistants (Claude Code, Codex, Gemini, etc.) to manage Google Drive files and folders through Docker MCP Gateway. It enables operations like listing, searching, uploading, downloading, sharing, and organizing files.

## Features

### Current Implementation

- **`list_files`** - List files in Google Drive, optionally filtered by folder
- **`search_files`** - Search for files by name across your entire Drive
- **`get_file_metadata`** - Get detailed information about a specific file
- **`create_folder`** - Create new folders in Drive
- **`upload_file`** - Upload text files to Drive
- **`download_file`** - Download and read file contents (supports Google Docs, Sheets, etc.)
- **`share_file`** - Share files with specific users via email with custom permissions
- **`delete_file`** - Move files to trash

## Prerequisites

- Node.js 20 or higher
- Docker Desktop with MCP Toolkit enabled
- Docker MCP CLI plugin (`docker mcp` command)
- Google Cloud Project with Drive API enabled
- OAuth 2.0 credentials (Client ID, Client Secret, Refresh Token)

## Google Drive API Setup

### 1. Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Drive API:
   - Go to "APIs & Services" > "Library"
   - Search for "Google Drive API"
   - Click "Enable"

### 2. Create OAuth 2.0 Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. Configure the OAuth consent screen if prompted
4. Choose "Desktop app" as the application type
5. Download the credentials JSON file

### 3. Get a Refresh Token

Use the included helper script to generate a refresh token:

```bash
# First, install dependencies if you haven't already
npm install

# Run the token generation script
node get-refresh-token.mjs "YOUR_CLIENT_ID" "YOUR_CLIENT_SECRET"
```

The script will:
1. Generate an authorization URL
2. Prompt you to visit it in your browser
3. Ask you to paste the authorization code
4. Display your refresh token

**Example:**
```bash
node get-refresh-token.mjs "123456.apps.googleusercontent.com" "GOCSPX-abc123..."
```

The script will output the three credentials you need to store in Docker secrets.

## Installation

### Step 1: Clone or Save Files

Save all the project files to a directory:
- `package.json`
- `tsconfig.json`
- `Dockerfile`
- `src/index.ts`

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Build TypeScript

```bash
npm run build
```

### Step 4: Build Docker Image

```bash
docker build -t google-drive-mcp-server .
```

### Step 5: Set Up Secrets

Store your Google credentials securely in Docker secrets:

```bash
# Set your OAuth credentials
docker mcp secret set GOOGLE_CLIENT_ID="your-client-id"
docker mcp secret set GOOGLE_CLIENT_SECRET="your-client-secret"
docker mcp secret set GOOGLE_REFRESH_TOKEN="your-refresh-token"

# Verify secrets are set
docker mcp secret list
```

### Step 6: Create Custom Catalog

```bash
# Create catalogs directory if it doesn't exist
mkdir -p ~/.docker/mcp/catalogs

# Create or edit custom.yaml
nano ~/.docker/mcp/catalogs/custom.yaml
```

Add this entry to `custom.yaml`:

```yaml
version: 2
name: custom
displayName: Custom MCP Servers
registry:
  google-drive:
    description: "Google Drive file management and operations"
    title: "Google Drive"
    type: server
    dateAdded: "2025-01-01T00:00:00Z"
    image: google-drive-mcp-server:latest
    ref: ""
    readme: ""
    toolsUrl: ""
    source: ""
    upstream: ""
    icon: ""
    tools:
      - name: list_files
      - name: search_files
      - name: get_file_metadata
      - name: create_folder
      - name: upload_file
      - name: download_file
      - name: share_file
      - name: delete_file
    secrets:
      - name: GOOGLE_CLIENT_ID
        env: GOOGLE_CLIENT_ID
        example: "your-client-id.apps.googleusercontent.com"
      - name: GOOGLE_CLIENT_SECRET
        env: GOOGLE_CLIENT_SECRET
        example: "your-client-secret"
      - name: GOOGLE_REFRESH_TOKEN
        env: GOOGLE_REFRESH_TOKEN
        example: "your-refresh-token"
    metadata:
      category: productivity
      tags:
        - google
        - drive
        - storage
        - files
      license: MIT
      owner: local
```

### Step 7: Update Registry

```bash
# Edit registry file
nano ~/.docker/mcp/registry.yaml
```

Add this entry under the existing `registry:` key:

```yaml
registry:
  # ... existing servers ...
  google-drive:
    ref: ""
```

**IMPORTANT**: The entry must be under the `registry:` key, not at the root level.

### Step 8: Verify Docker MCP Gateway

The Docker MCP Gateway automatically loads servers from your custom catalog. Verify the setup:

```bash
# Check if the server is registered
docker mcp server list

# You should see "google-drive" in the list
```

The gateway makes your Google Drive tools available to any MCP-compatible AI client:
- **Claude Code**: Use the `/mcp` command to access tools
- **Claude Desktop**: Tools appear automatically in the interface
- **Other MCP Clients**: Follow their specific documentation for connecting to Docker MCP Gateway

### Step 9: Test Your Server

```bash
# Verify it appears in the list
docker mcp server list

# Check container logs if needed
docker ps
docker logs <container_name>
```

## Development

### Local Development

```bash
# Install dependencies
npm install

# Run in development mode with auto-reload
npm run dev

# Type check
npm run typecheck

# Build
npm run build

# Run production build
npm start
```

### Local Testing

```bash
# Set environment variables for testing
export GOOGLE_CLIENT_ID="your-client-id"
export GOOGLE_CLIENT_SECRET="your-client-secret"
export GOOGLE_REFRESH_TOKEN="your-refresh-token"

# Run directly
npm start
```

## Usage Examples

### Using with Claude Code

In Claude Code, you can interact with the MCP server:

```bash
# List available MCP servers
/mcp

# Enable the Google Drive server (if not auto-enabled)
# Then ask questions naturally:
```

- "List the files in my Google Drive"
- "Search for files named 'budget' in my Drive"
- "Create a folder called 'Projects 2025'"
- "Upload a file with the content 'Hello World' named 'test.txt'"
- "Show me the metadata for file ID abc123"
- "Download the content of file ID xyz789"
- "Share file ID abc123 with user@example.com as a reader"
- "Delete file ID def456"

### Using with Other Clients

The same natural language queries work with:
- **Claude Desktop**: Tools appear automatically
- **Codex**: Use through MCP integration
- **Gemini**: Via MCP-compatible interface
- **Any MCP Client**: Follow client-specific instructions

## Architecture

```
AI Clients (Claude Code, Codex, Gemini, etc.)
                    ↓
         Docker MCP Gateway
                    ↓
      Google Drive MCP Server (Docker Container)
                    ↓
         Google Drive API (OAuth 2.0)

Credentials Flow:
Docker Desktop Secrets → Container Environment Variables
(CLIENT_ID, CLIENT_SECRET, REFRESH_TOKEN)
```

## TypeScript Benefits

- **Type Safety**: Catch errors at compile time
- **Better IDE Support**: Enhanced autocomplete and refactoring
- **Modern JavaScript**: Use latest ECMAScript features
- **Maintainability**: Self-documenting code with types

## Adding New Tools

1. Define the tool function in `src/index.ts`:

```typescript
async function myNewTool(param: string): Promise<string> {
  try {
    const validParam = validateRequired(param, "param");
    const drive = getDriveClient();

    // Implementation here

    return `✅ Success message`;
  } catch (error) {
    logger.error("Error in myNewTool:", error);
    return formatError(error);
  }
}
```

2. Add tool definition to `TOOLS` array:

```typescript
{
  name: "my_new_tool",
  description: "What it does",
  inputSchema: {
    type: "object",
    properties: {
      param: { type: "string", description: "Description" }
    },
    required: ["param"]
  }
}
```

3. Add case to tool handler:

```typescript
case "my_new_tool": {
  const param = (args?.param as string) || "";
  return {
    content: [{ type: "text", text: await myNewTool(param) }]
  };
}
```

4. Rebuild and redeploy:

```bash
npm run build
docker build -t google-drive-mcp-server .
```

## Troubleshooting

### Tools Not Appearing

- Verify Docker image built successfully: `docker images | grep google-drive`
- Check catalog and registry files for syntax errors (YAML is whitespace-sensitive)
- Verify server is registered: `docker mcp server list`
- Restart your AI client (Claude Code, Claude Desktop, etc.)

### Build Errors

- Check TypeScript version compatibility: `npm run typecheck`
- Ensure all dependencies are installed: `npm install`
- Check Node.js version: `node --version` (should be 20+)

### Authentication Errors

- Verify secrets are set: `docker mcp secret list`
- Ensure secret names match exactly in code and catalog
- Check that refresh token hasn't expired (generate a new one if needed)
- Verify Google Drive API is enabled in your Google Cloud project

### API Errors

- Check Google Cloud Console for API quota limits
- Ensure the OAuth consent screen is properly configured
- Verify the refresh token has the correct scopes
- Check container logs for detailed error messages

## Security Considerations

- All credentials stored in Docker Desktop secrets (encrypted at rest)
- Never hardcode credentials in source code
- Running as non-root user inside container
- Sensitive data never logged to stdout
- Input validation on all parameters
- Timeout protection on API calls (10 seconds)
- OAuth 2.0 for secure authentication

## Limitations

- File uploads limited to text content (binary files not supported in this version)
- Downloads return text content only
- Maximum file size depends on memory constraints
- API rate limits apply based on Google Cloud project quotas

## Future Enhancements

Potential features to add:
- Binary file upload/download support
- Batch operations
- File copying and moving
- Advanced search with filters
- Folder tree navigation
- Revision history access
- Comment management
- Team Drive support

## License

MIT License

## Contributing

Feel free to submit issues or pull requests to improve this MCP server!

## Resources

- [Google Drive API Documentation](https://developers.google.com/drive/api/v3/about-sdk)
- [MCP Protocol Specification](https://modelcontextprotocol.io/)
- [TypeScript Documentation](https://www.typescriptlang.org/)
