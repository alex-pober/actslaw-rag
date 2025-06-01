import { createClient } from 'npm:@supabase/supabase-js';
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
import { fromMarkdown } from 'npm:mdast-util-from-markdown';
import { toMarkdown } from 'npm:mdast-util-to-markdown';
import { toString } from 'npm:mdast-util-to-string';
import { u } from 'npm:unist-builder';
/**
 * Splits a `mdast` tree into multiple trees based on
 * a predicate function. Will include the splitting node
 * at the beginning of each tree.
 *
 * Useful to split a markdown file into smaller sections.
 */ export function splitTreeBy(tree, predicate) {
  return tree.children.reduce((trees, node)=>{
    const [lastTree] = trees.slice(-1);
    if (!lastTree || predicate(node)) {
      const tree = u('root', [
        node
      ]);
      return trees.concat(tree);
    }
    lastTree.children.push(node);
    return trees;
  }, []);
}
/**
 * Splits markdown content by heading for embedding indexing.
 * Keeps heading in each chunk.
 *
 * If a section is still greater than `maxSectionLength`, that section
 * is chunked into smaller even-sized sections (by character length).
 */ export function processMarkdown(content, maxSectionLength = 2500) {
  const mdTree = fromMarkdown(content);
  if (!mdTree) {
    return {
      sections: []
    };
  }
  const sectionTrees = splitTreeBy(mdTree, (node)=>node.type === 'heading');
  const sections = sectionTrees.flatMap((tree)=>{
    const [firstNode] = tree.children;
    const content = toMarkdown(tree);
    const heading = firstNode.type === 'heading' ? toString(firstNode) : undefined;
    // Chunk sections if they are too large
    if (content.length > maxSectionLength) {
      const numberChunks = Math.ceil(content.length / maxSectionLength);
      const chunkSize = Math.ceil(content.length / numberChunks);
      const chunks = [];
      for(let i = 0; i < numberChunks; i++){
        chunks.push(content.substring(i * chunkSize, (i + 1) * chunkSize));
      }
      return chunks.map((chunk, i)=>({
          content: chunk,
          heading,
          part: i + 1,
          total: numberChunks
        }));
    }
    return {
      content,
      heading
    };
  });
  return {
    sections
  };
}
/**
 * Extracts text from PDF using PDF.co API.
 * First uploads the file, then processes it.
 */ async function processPDFWithAPI(fileBuffer, maxSectionLength = 2500) {
  const apiKey = Deno.env.get('PDF_CO_API_KEY');
  if (!apiKey) {
    throw new Error('PDF_CO_API_KEY environment variable is required for PDF processing');
  }
  try {
    // Step 1: Upload the PDF file to PDF.co
    const uploadResponse = await fetch('https://api.pdf.co/v1/file/upload/base64', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      },
      body: JSON.stringify({
        file: btoa(String.fromCharCode(...new Uint8Array(fileBuffer))),
        name: 'document.pdf'
      })
    });
    const uploadResult = await uploadResponse.json();
    console.log('PDF.co upload response:', JSON.stringify(uploadResult, null, 2));
    if (!uploadResponse.ok || uploadResult.error) {
      throw new Error(`PDF.co upload failed: ${uploadResult.message || 'Unknown error'}`);
    }
    if (!uploadResult.url) {
      throw new Error('No file URL returned from PDF.co upload');
    }
    // Step 2: Extract text from the uploaded PDF
    const extractResponse = await fetch('https://api.pdf.co/v1/pdf/convert/to/text', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      },
      body: JSON.stringify({
        url: uploadResult.url,
        pages: '',
        password: ''
      })
    });
    const extractResult = await extractResponse.json();
    console.log('PDF.co extract response:', JSON.stringify(extractResult, null, 2));
    if (!extractResponse.ok || extractResult.error) {
      throw new Error(`PDF.co extraction failed: ${extractResult.message || 'Unknown error'}`);
    }
    let extractedText = extractResult.body;
    // If result contains a URL instead of direct text, fetch it
    if (!extractedText && extractResult.url) {
      const textResponse = await fetch(extractResult.url);
      extractedText = await textResponse.text();
    }
    if (!extractedText || extractedText.trim().length === 0) {
      throw new Error('No readable text found in PDF');
    }
    console.log(`Extracted ${extractedText.length} characters from PDF`);
    // Split text into logical sections (by double line breaks or page indicators)
    const sections = [];
    const rawSections = extractedText.split(/\n\s*\n/).filter((section)=>section.trim().length > 0);
    // If we don't get good sections from splitting, create them by character count
    if (rawSections.length === 1 && rawSections[0].length > maxSectionLength) {
      const text = rawSections[0];
      const numberChunks = Math.ceil(text.length / maxSectionLength);
      const chunkSize = Math.ceil(text.length / numberChunks);
      for(let i = 0; i < numberChunks; i++){
        const chunk = text.substring(i * chunkSize, (i + 1) * chunkSize);
        sections.push({
          content: chunk.trim(),
          heading: `Section ${i + 1} of ${numberChunks}`,
          section: i + 1,
          part: 1,
          total: 1
        });
      }
    } else {
      rawSections.forEach((sectionText, index)=>{
        const heading = `Section ${index + 1}`;
        // Chunk section if it's too large
        if (sectionText.length > maxSectionLength) {
          const numberChunks = Math.ceil(sectionText.length / maxSectionLength);
          const chunkSize = Math.ceil(sectionText.length / numberChunks);
          for(let i = 0; i < numberChunks; i++){
            const chunk = sectionText.substring(i * chunkSize, (i + 1) * chunkSize);
            sections.push({
              content: chunk.trim(),
              heading: `${heading} (Part ${i + 1}/${numberChunks})`,
              section: index + 1,
              part: i + 1,
              total: numberChunks
            });
          }
        } else {
          sections.push({
            content: sectionText.trim(),
            heading,
            section: index + 1
          });
        }
      });
    }
    return {
      sections
    };
  } catch (error) {
    console.error('Error processing PDF with API:', error);
    throw new Error(`PDF processing failed: ${error.message}`);
  }
}
/**
 * Simple PDF text extraction using native Deno (fallback method)
 * This tries multiple approaches to extract text from PDFs
 */ async function processPDFSimple(fileBuffer, maxSectionLength = 2500) {
  try {
    const uint8Array = new Uint8Array(fileBuffer);
    // Try to decode as UTF-8 first
    let text = '';
    try {
      const decoder = new TextDecoder('utf-8', {
        fatal: false
      });
      text = decoder.decode(uint8Array);
    } catch  {
      // Try Latin-1 if UTF-8 fails
      const decoder = new TextDecoder('latin1', {
        fatal: false
      });
      text = decoder.decode(uint8Array);
    }
    // Look for readable text patterns in PDF
    let extractedText = '';
    // Method 1: Extract text between stream markers
    const streamMatches = text.match(/stream\s*([\s\S]*?)\s*endstream/g);
    if (streamMatches) {
      streamMatches.forEach((match)=>{
        const content = match.replace(/^stream\s*|\s*endstream$/g, '');
        // Look for printable ASCII characters
        const readable = content.match(/[\x20-\x7E]+/g);
        if (readable) {
          extractedText += readable.join(' ') + '\n';
        }
      });
    }
    // Method 2: Look for text objects (Tj, TJ operators)
    const textMatches = text.match(/\((.*?)\)\s*Tj/g);
    if (textMatches) {
      textMatches.forEach((match)=>{
        const content = match.replace(/^\(|\)\s*Tj$/g, '');
        if (content.length > 0) {
          extractedText += content + ' ';
        }
      });
    }
    // Method 3: Look for array text objects
    const arrayTextMatches = text.match(/\[(.*?)\]\s*TJ/g);
    if (arrayTextMatches) {
      arrayTextMatches.forEach((match)=>{
        const content = match.replace(/^\[|\]\s*TJ$/g, '');
        // Extract strings from the array
        const strings = content.match(/\([^)]*\)/g);
        if (strings) {
          strings.forEach((str)=>{
            const cleaned = str.replace(/^\(|\)$/g, '');
            if (cleaned.length > 0) {
              extractedText += cleaned + ' ';
            }
          });
        }
      });
    }
    // Clean up the extracted text
    extractedText = extractedText.replace(/\\n/g, '\n').replace(/\\r/g, '\r').replace(/\\t/g, '\t').replace(/\\(.)/g, '$1').replace(/\s+/g, ' ').trim();
    if (!extractedText || extractedText.length < 10) {
      throw new Error('Could not extract readable text from PDF using simple method');
    }
    console.log(`Simple extraction found ${extractedText.length} characters`);
    // Split into manageable sections
    const sections = [];
    const words = extractedText.split(/\s+/);
    let currentSection = '';
    let sectionCount = 1;
    for (const word of words){
      if (currentSection.length + word.length + 1 > maxSectionLength) {
        if (currentSection.trim()) {
          sections.push({
            content: currentSection.trim(),
            heading: `Section ${sectionCount}`,
            section: sectionCount
          });
          sectionCount++;
        }
        currentSection = word;
      } else {
        currentSection += (currentSection ? ' ' : '') + word;
      }
    }
    // Add final section
    if (currentSection.trim()) {
      sections.push({
        content: currentSection.trim(),
        heading: `Section ${sectionCount}`,
        section: sectionCount
      });
    }
    if (sections.length === 0) {
      throw new Error('No readable content found in PDF');
    }
    return {
      sections
    };
  } catch (error) {
    console.error('Error with simple PDF processing:', error);
    throw new Error(`Simple PDF extraction failed: ${error.message}`);
  }
}
/**
 * Main PDF processing function that tries API first, then fallback
 */ async function processPDF(fileBuffer, maxSectionLength = 2500) {
  const apiKey = Deno.env.get('PDF_CO_API_KEY');
  if (apiKey) {
    try {
      return await processPDFWithAPI(fileBuffer, maxSectionLength);
    } catch (error) {
      console.warn('API PDF processing failed, trying simple extraction:', error.message);
    }
  }
  // Fallback to simple extraction
  return await processPDFSimple(fileBuffer, maxSectionLength);
}
/**
 * Determines file type based on file extension or content type
 */ function getFileType(fileName, contentType) {
  const extension = fileName?.split('.').pop()?.toLowerCase();
  if (extension === 'pdf' || contentType?.includes('pdf')) {
    return 'pdf';
  } else if (extension === 'md' || extension === 'markdown' || contentType?.includes('markdown')) {
    return 'markdown';
  }
  // Default to markdown for text files
  return 'markdown';
}
Deno.serve(async (req)=>{
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
  try {
    const { document_id } = await req.json();
    const { data: document } = await supabase.from('documents_with_storage_path').select().eq('id', document_id).single();
    if (!document?.storage_object_path) {
      return new Response(JSON.stringify({
        error: 'Failed to find uploaded document'
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    const { data: file } = await supabase.storage.from('files').download(document.storage_object_path);
    if (!file) {
      return new Response(JSON.stringify({
        error: 'Failed to download storage object'
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    // Determine file type
    const fileType = getFileType(document.name, file.type);
    let processedContent;
    if (fileType === 'pdf') {
      // Process PDF
      const fileBuffer = await file.arrayBuffer();
      processedContent = await processPDF(fileBuffer);
    } else {
      // Process Markdown (default)
      const fileContents = await file.text();
      processedContent = processMarkdown(fileContents);
    }
    if (!processedContent.sections || processedContent.sections.length === 0) {
      return new Response(JSON.stringify({
        error: 'No content sections found in document'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    // Save document sections
    const { error } = await supabase.from('document_sections').insert(processedContent.sections.map(({ content, heading, section, part, total })=>({
        document_id,
        content,
        heading,
        section_number: section,
        part_number: part,
        total_parts: total
      })));
    if (error) {
      console.error('Database error:', error);
      return new Response(JSON.stringify({
        error: 'Failed to save document sections'
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    console.log(`Saved ${processedContent.sections.length} sections for ${fileType.toUpperCase()} file '${document.name}'`);
    return new Response(JSON.stringify({
      success: true,
      sections_count: processedContent.sections.length,
      file_type: fileType
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Error processing document:', error);
    return new Response(JSON.stringify({
      error: error.message || 'Internal server error'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
});
