'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { usePipeline } from '@/lib/hooks/use-pipeline';
import { cn } from '@/lib/utils';
import { Database } from '@/supabase/functions/_lib/database';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useChat } from 'ai/react';

export default function ChatPage() {
  const supabase = createClientComponentClient<Database>();

  const generateEmbedding = usePipeline(
    'feature-extraction',
    'Supabase/gte-small'
  );

  const { messages, input, handleInputChange, handleSubmit, isLoading } =
    useChat({
      api: `https://umujyhhbtspjdckcwytr.supabase.co/functions/v1/chat`,
    });

  const isReady = !!generateEmbedding;

  return (
    <>
    </>
  );
}
