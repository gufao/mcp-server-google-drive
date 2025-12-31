# CLAUDE.md - Google Drive MCP Server

## Implementation Overview

This MCP server provides AI clients (Claude Code, Codex, Gemini, etc.) with secure access to Google Drive operations through Docker MCP Gateway. The server is TypeScript-based and runs in a Docker container, making it accessible to any MCP-compatible client.

## Architecture

### Components

1. **TypeScript Server** (`src/index.ts`)
   - MCP protocol handler using official SDK
   - Google Drive API integration via googleapis library
   - OAuth 2.0 authentication with refresh tokens
   - Comprehensive error handling and logging

2. **Docker Container**
   - Node.js 20 runtime environment
   - Non-root user (mcpuser) for security
   - Secrets management via Docker Desktop
   - Isolated execution environment

3. **Authentication Flow**
   - OAuth 2.0 with refresh tokens (no interactive auth required)
   - Credentials stored in Docker secrets
   - Automatic token refresh handled by Google Auth Library

### Security Features

- **Secrets Management**: All credentials stored in encrypted Docker secrets
- **Non-Root Execution**: Container runs as unprivileged user (UID 1000)
- **Input Validation**: All parameters validated before processing
- **Error Sanitization**: Sensitive information never exposed in error messages
- **Scope Limitation**: Only requests minimal required Google Drive permissions
- **Timeout Protection**: All API calls have 10-second timeout

## Tool Implementations

### 1. list_files

**Purpose**: List files in a specific folder or root directory

**Parameters**:
- `folderId` (optional): Folder to list files from
- `pageSize` (optional): Number of results (1-100, default 10)

**Implementation Details**:
- Uses Drive API `files.list` method
- Filters out trashed files
- Returns file metadata including ID, name, type, size, modified time, and links
- Sorts by modification time (newest first)

**Example Query**: "List my recent files" or "Show me files in folder abc123"

### 2. search_files

**Purpose**: Search for files by name across entire Drive

**Parameters**:
- `query` (required): Search term
- `pageSize` (optional): Number of results (1-100, default 10)

**Implementation Details**:
- Uses Drive API query syntax: `name contains 'query'`
- Excludes trashed files
- Returns same metadata as list_files
- Case-insensitive search

**Example Query**: "Search for files named 'budget'"

### 3. get_file_metadata

**Purpose**: Get detailed information about a specific file

**Parameters**:
- `fileId` (required): File ID to retrieve

**Implementation Details**:
- Uses Drive API `files.get` with all fields
- Returns comprehensive metadata including owner, sharing status, description
- Provides both view and download links when available

**Example Query**: "Get details for file xyz789"

### 4. create_folder

**Purpose**: Create a new folder in Drive

**Parameters**:
- `folderName` (required): Name of folder to create
- `parentFolderId` (optional): Parent folder (creates in root if omitted)

**Implementation Details**:
- Uses special MIME type `application/vnd.google-apps.folder`
- Returns new folder ID and link
- Validates folder name is not empty

**Example Query**: "Create a folder called 'Projects 2025'"

### 5. upload_file

**Purpose**: Upload text content as a file

**Parameters**:
- `fileName` (required): Name for the new file
- `content` (required): Text content to write
- `mimeType` (optional): MIME type (default: text/plain)
- `folderId` (optional): Destination folder

**Implementation Details**:
- Creates file with provided content
- Supports any text MIME type
- Returns file ID, size, and link
- Current limitation: Text content only (no binary)

**Example Query**: "Upload a file named 'notes.txt' with content 'Hello World'"

### 6. download_file

**Purpose**: Download and read file contents

**Parameters**:
- `fileId` (required): File to download

**Implementation Details**:
- Handles Google Workspace files (Docs, Sheets) via export API
- Downloads regular files via media download
- Exports Docs as text/plain, Sheets as CSV
- Returns content as text (limitation: text-based files only)

**Example Query**: "Download the content of file abc123"

### 7. share_file

**Purpose**: Share a file with a user via email

**Parameters**:
- `fileId` (required): File to share
- `email` (required): User's email address
- `role` (optional): Permission level (reader/writer/commenter, default: reader)

**Implementation Details**:
- Uses Drive API permissions.create
- Creates user-type permission
- Validates role is one of: reader, writer, commenter
- Returns confirmation with file name and link

**Example Query**: "Share file xyz789 with user@example.com as a writer"

### 8. delete_file

**Purpose**: Move a file to trash

**Parameters**:
- `fileId` (required): File to delete

**Implementation Details**:
- Updates file with `trashed: true` (soft delete)
- File can be restored from trash within 30 days
- Returns confirmation with file name
- Does NOT permanently delete (safer approach)

**Example Query**: "Delete file abc123"

## Error Handling Strategy

### Error Types Handled

1. **Authentication Errors**
   - Missing credentials
   - Invalid refresh token
   - Expired tokens (automatically refreshed by library)

2. **API Errors**
   - Invalid file IDs (404 Not Found)
   - Permission denied (403 Forbidden)
   - Rate limiting (429 Too Many Requests)
   - Network timeouts

3. **Validation Errors**
   - Missing required parameters
   - Invalid parameter formats
   - Out-of-range values

### Error Response Format

All errors return user-friendly messages:
```
❌ Error: [Clear description of what went wrong]
```

Internal error details logged to stderr for debugging.

## TypeScript Type Safety

### Key Type Definitions

```typescript
// All tool functions return Promise<string>
async function toolName(param: string): Promise<string>

// OAuth client properly typed
const oauth2Client: OAuth2Client

// Drive API responses use googleapis types
const response: GaxiosResponse<drive_v3.Schema$FileList>
```

### Strict Mode Benefits

- No implicit any types
- Required parameter validation
- Unused variable detection
- Implicit return checking
- Proper async/await types

## Development Guidelines

### Adding New Tools

1. **Define the function** with proper TypeScript types
2. **Implement validation** for all parameters
3. **Handle errors** with try/catch
4. **Return formatted strings** with emojis for clarity
5. **Add to TOOLS array** with JSON schema
6. **Add case to handler** in switch statement
7. **Test thoroughly** before deployment

### Code Style

- Use async/await (never raw Promises or callbacks)
- Log to stderr (console.error) for all diagnostics
- Validate inputs before processing
- Use template literals for string formatting
- Include emojis in user-facing messages for clarity
- Return descriptive success/error messages

### Testing Locally

```bash
# Set environment variables
export GOOGLE_CLIENT_ID="..."
export GOOGLE_CLIENT_SECRET="..."
export GOOGLE_REFRESH_TOKEN="..."

# Run in development mode
npm run dev

# Test via stdio (paste JSON-RPC requests)
npm start
```

## Deployment Process

### Build and Deploy

```bash
# 1. Make code changes
# 2. Type check
npm run typecheck

# 3. Build TypeScript
npm run build

# 4. Build Docker image
docker build -t google-drive-mcp-server .

# 5. Verify with Docker MCP Gateway
```

### Updating Tools

After modifying tools:
1. Update code in `src/index.ts`
2. Update `TOOLS` array if schema changed
3. Rebuild and redeploy
4. Update `custom.yaml` if tools added/removed
5. Verify the server is registered with `docker mcp server list`

## Limitations and Future Work

### Current Limitations

1. **Text Files Only**: Binary upload/download not implemented
2. **Size Limits**: Large files may hit memory constraints
3. **No Batch Operations**: Each operation is individual
4. **Search Simplicity**: Only name-based search (no advanced filters)
5. **No Team Drives**: Only personal Drive supported

### Potential Enhancements

1. **Binary Support**: Use streams for binary file handling
2. **Advanced Search**: Support Drive API's full query syntax
3. **Batch Operations**: Multiple file operations in single request
4. **Folder Navigation**: Tree view and breadcrumb support
5. **Revisions**: Access file version history
6. **Comments**: Read/write file comments
7. **Team Drives**: Shared drive support
8. **Real-time Updates**: Watch for file changes
9. **Export Formats**: More export options for Workspace files
10. **Copy/Move**: File organization operations

## Troubleshooting

### Common Issues

**"Missing Google Drive credentials" error**
- Ensure all three secrets are set in Docker
- Verify secret names match exactly (case-sensitive)
- Check secrets with: `docker mcp secret list`

**"Invalid refresh token" error**
- Refresh token may have expired or been revoked
- Generate a new refresh token using the get-token.js script
- Update the secret: `docker mcp secret set GOOGLE_REFRESH_TOKEN="new-token"`

**"API returned 403" errors**
- Check Google Drive API is enabled in Cloud Console
- Verify OAuth consent screen is configured
- Ensure the refresh token has correct scopes

**Tools not appearing in AI client**
- Verify Docker image exists: `docker images | grep google-drive`
- Check custom.yaml syntax (YAML is whitespace-sensitive)
- Verify server registration: `docker mcp server list`
- Check your AI client's MCP connection status
- Review Docker container logs for errors

## Performance Considerations

### API Rate Limits

Google Drive API has these limits (default tier):
- 1,000 queries per 100 seconds per user
- 10,000 queries per 100 seconds per project

The server automatically handles rate limiting through the googleapis library.

### Optimization Tips

1. Use appropriate page sizes (don't request more than needed)
2. Cache file IDs when working with same files repeatedly
3. Use specific folder IDs instead of searching entire Drive
4. Combine operations when possible

## Security Best Practices

### Credential Management

- **Never commit credentials** to source control
- **Never log credentials** or tokens
- **Use Docker secrets** for all sensitive data
- **Rotate refresh tokens** periodically
- **Use minimal scopes** required for functionality

### Code Security

- **Validate all inputs** before processing
- **Sanitize error messages** to avoid leaking information
- **Use timeouts** on all external API calls
- **Run as non-root** user in container
- **Keep dependencies updated** for security patches

## Monitoring and Debugging

### Logging Strategy

All logs go to stderr with prefixes:
- `[INFO]` - Normal operations
- `[WARN]` - Warnings (non-fatal issues)
- `[ERROR]` - Error conditions

### Viewing Logs

```bash
# Find container ID
docker ps | grep google-drive

# View logs
docker logs <container_id>

# Follow logs in real-time
docker logs -f <container_id>
```

### Debug Mode

For detailed debugging, add more logging:
```typescript
logger.info("Request params:", JSON.stringify(args));
logger.info("API response:", JSON.stringify(response.data));
```

## Contributing

When contributing:
1. Maintain TypeScript strict mode
2. Add tests for new features
3. Update documentation
4. Follow existing code style
5. Validate all inputs
6. Handle all errors gracefully

## References

- [MCP Protocol Spec](https://modelcontextprotocol.io/)
- [Google Drive API v3](https://developers.google.com/drive/api/v3/reference)
- [googleapis Node.js Client](https://github.com/googleapis/google-api-nodejs-client)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [Docker MCP Toolkit](https://www.docker.com/products/model-context-protocol/)
