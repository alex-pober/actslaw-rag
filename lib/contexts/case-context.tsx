// lib/contexts/case-context.tsx
'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import smartAdvocateClient from '@/lib/smartadvocate/client';

interface CaseData {
  caseID: number;
  caseNumber: string;
  caseName: string;
  caseGroup: string;
  caseType: string;
  caseStatus: string;
  caseStatusFrom: string;
  officeName: string;
  incident: {
    incidentDate: string;
    state: string;
  };
  plaintiffs: Array<{
    name: string;
    role: string;
    primary: boolean;
  }>;
  defendant: Array<{
    name: string;
    role: string;
    primary: boolean;
  }>;
  caseStaff: Array<{
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    phone?: string;
  }>;
  createdDate: string;
  modifiedDate: string;
}

interface CaseContextType {
  currentCase: CaseData | null;
  isLoading: boolean;
  error: string | null;
  loadCase: (saNumber: string) => Promise<void>;
  clearCase: () => void;
  isClearing: boolean;
  // Cache for related data
  caseDocuments: any[] | null;
  caseNotes: any[] | null;
  caseContacts: any[] | null;
  // Fetch related data
  loadCaseDocuments: () => Promise<void>;
  loadCaseNotes: () => Promise<void>;
  loadCaseContacts: () => Promise<void>;
}

const CaseContext = createContext<CaseContextType | undefined>(undefined);

export function CaseProvider({ children }: { children: ReactNode }) {
  const [currentCase, setCurrentCase] = useState<CaseData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Related data caches
  const [caseDocuments, setCaseDocuments] = useState<any[] | null>(null);
  const [caseNotes, setCaseNotes] = useState<any[] | null>(null);
  const [caseContacts, setCaseContacts] = useState<any[] | null>(null);

  const loadCase = async (saNumber: string) => {
    if (!saNumber.trim() || isClearing) return;

    try {
      setIsLoading(true);
      setError(null);

      const data = await smartAdvocateClient.getCase(saNumber);
      const caseInfo = Array.isArray(data) ? data[0] : data;

      if (!caseInfo) {
        throw new Error('No case found with that number');
      }

      setCurrentCase(caseInfo);

      // Clear related data when switching cases
      setCaseDocuments(null);
      // setCaseNotes(null);
      // setCaseContacts(null);

      // Store in localStorage for persistence
      localStorage.setItem('currentCase', JSON.stringify(caseInfo));

    } catch (err: any) {
      setError(err.message);
      setCurrentCase(null);
    } finally {
      setIsLoading(false);
    }
  };

  const clearCase = () => {
    setIsClearing(true);
    setCurrentCase(null);
    setError(null);
    setCaseDocuments(null);
    setCaseNotes(null);
    setCaseContacts(null);
    localStorage.removeItem('currentCase');
    
    // Reset clearing flag after a brief delay
    setTimeout(() => {
      setIsClearing(false);
    }, 100);
  };

  const loadCaseDocuments = async () => {
    if (!currentCase) return;

    try {
      // Use the makeRequest method directly or create a specific endpoint
      const documents = await smartAdvocateClient.makeRequest(`case/${currentCase.caseID}/documents?currentPage=0&pageSize=200`, {
        params: { currentPage: '0', pageSize: '200' }
      });
      setCaseDocuments(documents);
    } catch (error) {
      console.error('Failed to load case documents:', error);
    }
  };

  const loadCaseNotes = async () => {
    if (!currentCase) return;

    try {
      const notes = await smartAdvocateClient.makeRequest(`case/${currentCase.caseNumber}/notes`);
      setCaseNotes(notes);
    } catch (error) {
      console.error('Failed to load case notes:', error);
    }
  };

  const loadCaseContacts = async () => {
    if (!currentCase) return;

    try {
      const contacts = await smartAdvocateClient.makeRequest(`case/${currentCase.caseNumber}/contacts`);
      setCaseContacts(contacts);
    } catch (error) {
      console.error('Failed to load case contacts:', error);
    }
  };

  // Load case from URL parameter on mount
  useEffect(() => {
    const savedCase = localStorage.getItem('currentCase');
    if (savedCase) {
      try {
        setCurrentCase(JSON.parse(savedCase));
      } catch (error) {
        console.error('Failed to parse saved case:', error);
        localStorage.removeItem('currentCase');
      }
    }
  }, []);

  return (
    <CaseContext.Provider
      value={{
        currentCase,
        isLoading,
        isClearing,
        error,
        loadCase,
        clearCase,
        caseDocuments,
        caseNotes,
        caseContacts,
        loadCaseDocuments,
        loadCaseNotes,
        loadCaseContacts,
      }}
    >
      {children}
    </CaseContext.Provider>
  );
}

export function useCase() {
  const context = useContext(CaseContext);
  if (context === undefined) {
    throw new Error('useCase must be used within a CaseProvider');
  }
  return context;
}
