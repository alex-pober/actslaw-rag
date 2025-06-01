// app/api/smartadvocate/[...path]/route.ts
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
    // Remove 'smartadvocate' from the beginning of the path if it exists
    const pathArray = params.path.filter(segment => segment !== 'smartadvocate');
    const apiPath = pathArray.join('/');
    console.log(`Filtered path array:`, pathArray);
    console.log(`SmartAdvocate API path requested: ${apiPath}`);
    console.log(`Full URL will be: https://sa.actslaw.com/CaseSyncAPI/${apiPath}`);

    // Get request body if it exists
    let body;
    try {
      body = await request.json();
    } catch {
      // No body or invalid JSON
      body = undefined;
    }

    // Get query parameters
    const url = new URL(request.url);
    const queryParams: Record<string, string> = {};
    url.searchParams.forEach((value, key) => {
      queryParams[key] = value;
    });

    // Make the request to SmartAdvocate using our token manager
    const smartAdvocateResponse = await tokenManager.makeAuthenticatedRequest({
      method: request.method.toLowerCase(),
      url: `https://sa.actslaw.com/CaseSyncAPI/${apiPath}`,
      data: body,
      params: queryParams
    });

    // Return the SmartAdvocate response to the client
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

// Export all HTTP methods
export { handleRequest as GET, handleRequest as POST, handleRequest as PUT, handleRequest as DELETE, handleRequest as PATCH };
