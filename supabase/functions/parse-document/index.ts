import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import JSZip from "https://esm.sh/jszip@3.10.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ParseResult {
  text: string;
  metadata: {
    fileName: string;
    fileType: string;
    wordCount: number;
    characterCount: number;
  };
}

// Extract text from DOCX file
async function parseDocx(arrayBuffer: ArrayBuffer): Promise<string> {
  try {
    const zip = new JSZip();
    await zip.loadAsync(arrayBuffer);
    
    // The main document content is in word/document.xml
    const documentXml = await zip.file("word/document.xml")?.async("text");
    
    if (!documentXml) {
      console.error("No document.xml found in DOCX");
      return "";
    }
    
    // Extract text from XML, preserving some structure
    // Remove all XML tags but preserve paragraph breaks
    let text = documentXml
      // Add newlines before paragraph tags
      .replace(/<w:p[^>]*>/gi, '\n')
      // Add tabs for table cells
      .replace(/<w:tc[^>]*>/gi, '\t')
      // Add newlines for table rows
      .replace(/<w:tr[^>]*>/gi, '\n')
      // Remove all remaining XML tags
      .replace(/<[^>]+>/g, '')
      // Decode common XML entities
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      // Clean up excessive whitespace
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]+/g, ' ')
      .trim();
    
    return text;
  } catch (error: unknown) {
    console.error("Error parsing DOCX:", error);
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to parse DOCX: ${message}`);
  }
}

// Extract text from PDF using pdf.js approach (simplified text extraction)
async function parsePdf(arrayBuffer: ArrayBuffer): Promise<string> {
  try {
    // Convert ArrayBuffer to string to find text streams
    const bytes = new Uint8Array(arrayBuffer);
    let text = "";
    
    // Simple PDF text extraction - look for text between BT and ET markers
    // This is a basic approach that works for many PDFs
    const decoder = new TextDecoder("latin1");
    const pdfContent = decoder.decode(bytes);
    
    // Find all text objects (between BT and ET)
    const textMatches = pdfContent.matchAll(/BT\s*([\s\S]*?)\s*ET/g);
    
    for (const match of textMatches) {
      const textBlock = match[1];
      // Extract text from Tj and TJ operators
      const tjMatches = textBlock.matchAll(/\((.*?)\)\s*Tj/g);
      for (const tj of tjMatches) {
        text += tj[1] + " ";
      }
      // Handle TJ arrays
      const tjArrayMatches = textBlock.matchAll(/\[(.*?)\]\s*TJ/gi);
      for (const tjArray of tjArrayMatches) {
        const innerText = tjArray[1].matchAll(/\((.*?)\)/g);
        for (const inner of innerText) {
          text += inner[1];
        }
        text += " ";
      }
    }
    
    // Also try to extract text from streams (for newer PDFs)
    const streamMatches = pdfContent.matchAll(/stream\s*([\s\S]*?)\s*endstream/g);
    for (const stream of streamMatches) {
      // Check if stream contains readable text
      const streamContent = stream[1];
      if (streamContent.includes("(") && streamContent.includes(")")) {
        const textInStream = streamContent.matchAll(/\((.*?)\)/g);
        for (const t of textInStream) {
          // Only add if it looks like text (has letters)
          if (/[a-zA-Zα-ωΑ-Ω]/.test(t[1])) {
            text += t[1] + " ";
          }
        }
      }
    }
    
    // Clean up the text
    text = text
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '')
      .replace(/\\t/g, '\t')
      .replace(/\\\(/g, '(')
      .replace(/\\\)/g, ')')
      .replace(/\\([0-9]{3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)))
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    
    // If we couldn't extract much text, the PDF might be image-based
    if (text.length < 100) {
      console.warn("PDF might be image-based or encrypted - limited text extracted");
    }
    
    return text;
  } catch (error: unknown) {
    console.error("Error parsing PDF:", error);
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to parse PDF: ${message}`);
  }
}

// Parse plain text file
function parseText(arrayBuffer: ArrayBuffer): string {
  const decoder = new TextDecoder("utf-8");
  return decoder.decode(arrayBuffer);
}

// Main parsing function
async function parseDocument(
  arrayBuffer: ArrayBuffer, 
  fileName: string, 
  contentType: string
): Promise<ParseResult> {
  let text = "";
  let fileType = "unknown";
  
  const lowerFileName = fileName.toLowerCase();
  const lowerContentType = contentType.toLowerCase();
  
  // Determine file type and parse accordingly
  if (
    lowerFileName.endsWith('.docx') || 
    lowerContentType.includes('vnd.openxmlformats-officedocument.wordprocessingml')
  ) {
    fileType = "docx";
    text = await parseDocx(arrayBuffer);
  } else if (
    lowerFileName.endsWith('.pdf') || 
    lowerContentType.includes('application/pdf')
  ) {
    fileType = "pdf";
    text = await parsePdf(arrayBuffer);
  } else if (
    lowerFileName.endsWith('.txt') || 
    lowerFileName.endsWith('.md') ||
    lowerFileName.endsWith('.csv') ||
    lowerContentType.includes('text/')
  ) {
    fileType = "text";
    text = parseText(arrayBuffer);
  } else if (
    lowerFileName.endsWith('.doc')
  ) {
    // Old .doc format - try text extraction
    fileType = "doc";
    text = parseText(arrayBuffer);
    // Filter out binary garbage
    text = text.replace(/[^\x20-\x7E\xA0-\xFF\n\r\t]/g, ' ');
    text = text.replace(/\s{3,}/g, ' ').trim();
  } else {
    // Try text extraction as fallback
    fileType = "unknown";
    text = parseText(arrayBuffer);
  }
  
  // Calculate metadata
  const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;
  const characterCount = text.length;
  
  return {
    text,
    metadata: {
      fileName,
      fileType,
      wordCount,
      characterCount
    }
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get content type to determine how to parse request
    const contentType = req.headers.get('content-type') || '';
    
    let results: ParseResult[] = [];
    
    if (contentType.includes('multipart/form-data')) {
      // Handle file upload directly
      const formData = await req.formData();
      const files = formData.getAll('files');
      
      for (const file of files) {
        if (file instanceof File) {
          const arrayBuffer = await file.arrayBuffer();
          const result = await parseDocument(arrayBuffer, file.name, file.type);
          results.push(result);
        }
      }
    } else if (contentType.includes('application/json')) {
      // Handle request with storage paths or base64 data
      const body = await req.json();
      
      if (body.storagePaths && Array.isArray(body.storagePaths)) {
        // Parse files from Supabase storage
        for (const pathInfo of body.storagePaths) {
          const { bucket, path, fileName } = pathInfo;
          
          const { data: fileData, error: downloadError } = await supabase.storage
            .from(bucket || 'project-files')
            .download(path);
          
          if (downloadError) {
            console.error(`Error downloading file ${path}:`, downloadError);
            continue;
          }
          
          const arrayBuffer = await fileData.arrayBuffer();
          const result = await parseDocument(
            arrayBuffer, 
            fileName || path.split('/').pop() || 'unknown',
            fileData.type || 'application/octet-stream'
          );
          results.push(result);
        }
      } else if (body.base64Files && Array.isArray(body.base64Files)) {
        // Parse base64 encoded files
        for (const fileInfo of body.base64Files) {
          const { data, fileName, contentType: fileContentType } = fileInfo;
          
          // Decode base64
          const binaryString = atob(data);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          
          const result = await parseDocument(
            bytes.buffer, 
            fileName,
            fileContentType || 'application/octet-stream'
          );
          results.push(result);
        }
      }
    } else {
      return new Response(
        JSON.stringify({ error: 'Unsupported content type. Use multipart/form-data or application/json' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (results.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No files were parsed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Return combined results
    const combinedText = results.map(r => 
      `=== ${r.metadata.fileName} ===\n\n${r.text}`
    ).join('\n\n---\n\n');
    
    const totalWordCount = results.reduce((sum, r) => sum + r.metadata.wordCount, 0);
    const totalCharCount = results.reduce((sum, r) => sum + r.metadata.characterCount, 0);
    
    return new Response(
      JSON.stringify({
        success: true,
        text: combinedText,
        files: results,
        metadata: {
          fileCount: results.length,
          totalWordCount,
          totalCharacterCount: totalCharCount
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error: unknown) {
    console.error('Error in parse-document:', error);
    const message = error instanceof Error ? error.message : 'Failed to parse document';
    const details = error instanceof Error ? error.toString() : String(error);
    return new Response(
      JSON.stringify({ 
        error: message,
        details: details
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
