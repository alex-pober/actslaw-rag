import { createClient } from 'npm:@supabase/supabase-js';
import { codeBlock } from 'npm:common-tags';
import OpenAI from 'npm:openai@4.8.0';
const openai = new OpenAI({
  apiKey: Deno.env.get('OPENAI_API_KEY')
});
// These are automatically injected
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
Deno.serve(async (req)=>{
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  if (!supabaseUrl || !supabaseAnonKey) {
    return new Response(JSON.stringify({
      error: 'Missing environment variables.'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
  const authorization = req.headers.get('Authorization');
  if (!authorization) {
    return new Response(JSON.stringify({
      error: `No authorization header passed`
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        authorization
      }
    },
    auth: {
      persistSession: false
    }
  });
  const { messages, embedding } = await req.json();
  const { data: documents, error: matchError } = await supabase.rpc('match_document_sections', {
    embedding,
    match_threshold: 0.8
  }).select('content').limit(5);
  if (matchError) {
    console.error(matchError);
    return new Response(JSON.stringify({
      error: 'There was an error reading your documents, please try again.'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
  const injectedDocs = documents && documents.length > 0 ? documents.map(({ content })=>content).join('\n\n') : 'No documents found';
  console.log(injectedDocs);
  const completionMessages = [
    {
      role: 'user',
      content: codeBlock`
        You're an AI assistant who answers questions about documents.

        You're a chat bot, so keep your replies succinct.

        You're only allowed to use the documents below to answer the question.

        If the question isn't related to these documents, say:
        "Sorry, I couldn't find any information on that."

        If the information isn't available in the below documents, say:
        "Sorry, I couldn't find any information on that."

        Do not go off topic.

        Documents:
        ${injectedDocs}
      `
    },
    ...messages
  ];
  // Create completion WITHOUT streaming for guaranteed useChat compatibility
  const completion = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: completionMessages,
    max_tokens: 1024,
    temperature: 0,
    stream: false // Non-streaming
  });
  const content = completion.choices[0]?.message?.content || 'No response generated';
  // Return in the format that useChat expects
  return new Response(JSON.stringify({
    id: `chatcmpl-${Date.now()}`,
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model: 'gpt-4-turbo-preview',
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant',
          content: content
        },
        finish_reason: 'stop'
      }
    ],
    usage: {
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0
    }
  }), {
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json'
    }
  });
});
