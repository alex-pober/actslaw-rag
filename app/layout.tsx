// app/layout.tsx
import Navbar from '@/components/Navbar';
import { Toaster } from '@/components/ui/sonner';
import Providers from '@/lib/providers';
import { CaseProvider } from '@/lib/contexts/case-context';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { PropsWithChildren } from 'react';
import 'three-dots/dist/three-dots.css';
import './globals.css';

export const metadata = {
  title: 'ACTSLAW - Case Management',
  description: 'Advanced case management and document analysis system',
};

export default async function RootLayout({ children }: PropsWithChildren) {
  // Keep cookies in the JS execution context for Next.js build
  const cookieStore = await cookies();

  const supabase = createServerComponentClient({ cookies: () => cookieStore });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html lang="en" className="h-full">
      <body>
        <Providers>
          <CaseProvider>
            <div className="flex flex-col min-h-screen">
              {/* @ts-ignore */}
              <Navbar user={user} />
              <main className="flex-1 bg-background">
                <div className="w-full flex justify-center">
                  <div className="w-full max-w-none">
                    {children}
                  </div>
                </div>
              </main>
              <Toaster />
            </div>
          </CaseProvider>
        </Providers>
      </body>
    </html>
  );
}
