// Updated app/api/[...path]/route.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import tokenManager from '@/lib/smartadvocate/token-manager';

export const dynamic = 'force-dynamic';

async function handleRequest(request: NextRequest, { params }: { params: { path: string[] } }) {
  try {
    // Verify the user is authenticated with Supabase
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Extract the SmartAdvocate API path from the request
    console.log('Raw params.path:', params.path);
    const pathArray = params.path.filter(segment => segment !== 'smartadvocate');
    const apiPath = pathArray.join('/');
    console.log(`SmartAdvocate API path requested: ${apiPath}`);

    // Get request body if it exists
    let body;
    try {
      body = await request.json();
    } catch {
      body = undefined;
    }

    // Get query parameters
    const url = new URL(request.url);
    const queryParams: Record<string, string> = {};
    url.searchParams.forEach((value, key) => {
      queryParams[key] = value;
    });

    // Check if this is a document content request
    const isDocumentContent = apiPath.includes('/document/') && apiPath.includes('/content');

    if (isDocumentContent) {
      // For document content, make the request directly and handle the raw response
      const token = await tokenManager.getValidToken();
      const saUrl = new URL(`https://sa.actslaw.com/CaseSyncAPI/${apiPath}`);

      if (queryParams) {
        Object.entries(queryParams).forEach(([key, value]) => {
          saUrl.searchParams.append(key, value);
        });
      }

      console.log(`Making direct request to: ${saUrl.toString()}`);

      const directResponse = await fetch(saUrl.toString(), {
        method: request.method || 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': '*/*',
        },
        body: body ? JSON.stringify(body) : undefined
      });

      if (!directResponse.ok) {
        throw new Error(`SmartAdvocate API Error: ${directResponse.status} ${directResponse.statusText}`);
      }

      // Get the response as an array buffer to preserve binary data
      const arrayBuffer = await directResponse.arrayBuffer();
      const contentType = directResponse.headers.get('content-type') || 'application/octet-stream';

      console.log(`Document response - Content-Type: ${contentType}, Size: ${arrayBuffer.byteLength} bytes`);
      
      // Log raw response headers and first bytes for debugging
      const responseHeaders = Object.fromEntries(directResponse.headers.entries());
      console.log(`SmartAdvocate API response headers:`, responseHeaders);

      // Check if it's a PDF by examining the first few bytes
      const firstBytes = new Uint8Array(arrayBuffer.slice(0, 10));
      const firstBytesString = String.fromCharCode(...firstBytes);
      const isPDF = firstBytesString.startsWith('%PDF-');

      // Check if it's an MSG file (OLE compound document)
      const oleSignature = Array.from(new Uint8Array(arrayBuffer.slice(0, 8)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      const isMSG = oleSignature === 'd0cf11e0a1b11ae1';

      console.log(`Document response - Content-Type: ${contentType}, Size: ${arrayBuffer.byteLength} bytes`);
      console.log(`First 10 bytes: ${firstBytesString}, isPDF: ${isPDF}, isMSG: ${isMSG}`);

      if (isPDF) {
        // Return PDF with proper headers
        return new NextResponse(arrayBuffer, {
          status: directResponse.status,
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Length': arrayBuffer.byteLength.toString(),
            'Accept-Ranges': 'bytes',
          }
        });
      }

      if (isMSG) {
        // Return MSG with proper headers
        return new NextResponse(arrayBuffer, {
          status: directResponse.status,
          headers: {
            'Content-Type': 'application/vnd.ms-outlook',
            'Content-Length': arrayBuffer.byteLength.toString(),
          }
        });
      }

      // For other content types, return as-is
      return new NextResponse(arrayBuffer, {
        status: directResponse.status,
        headers: {
          'Content-Type': contentType,
          'Content-Length': arrayBuffer.byteLength.toString(),
        }
      });
    }

    // For non-document requests, use the regular token manager
    const smartAdvocateResponse = await tokenManager.makeAuthenticatedRequest({
      method: request.method.toLowerCase(),
      url: `https://sa.actslaw.com/CaseSyncAPI/${apiPath}`,
      data: body,
      params: queryParams
    });

    return NextResponse.json(smartAdvocateResponse.data, {
      status: smartAdvocateResponse.status
    });

  } catch (error: any) {
    console.error('SmartAdvocate API Error:', error);

    if (error.response) {
      return NextResponse.json(error.response.data, {
        status: error.response.status
      });
    } else {
      return NextResponse.json({ error: 'Internal server error' }, {
        status: 500
      });
    }
  }
}

// Helper function to get file extension from content type
function getFileExtension(contentType: string): string {
  const mimeToExt: Record<string, string> = {
    'application/pdf': 'pdf',
    'application/vnd.ms-outlook': 'msg',
    'application/octet-stream': 'bin',
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'text/plain': 'txt',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  };

  return mimeToExt[contentType] || 'bin';
}

// Export all HTTP methods
export { handleRequest as GET, handleRequest as POST, handleRequest as PUT, handleRequest as DELETE, handleRequest as PATCH };
