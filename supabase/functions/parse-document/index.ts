import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import JSZip from "https://esm.sh/jszip@3.10.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Minimum text length to consider PDF as text-based (not scanned)
const MIN_TEXT_LENGTH_FOR_VALID_PDF = 200;

interface ParseResult {
  text: string;
  metadata: {
    fileName: string;
    fileType: string;
    wordCount: number;
    characterCount: number;
    usedOcr?: boolean;
  };
}

// OCR using Gemini Vision via Lovable API Gateway
async function performOcrWithGemini(base64Image: string, mimeType: string): Promise<string> {
  const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
  
  if (!lovableApiKey) {
    console.warn("LOVABLE_API_KEY not found, skipping OCR");
    return "";
  }
  
  try {
    console.log("Performing OCR with Gemini Vision...");
    
    const response = await fetch("https://api.lovable.dev/api/v1/chat", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${base64Image}`
                }
              },
              {
                type: "text",
                text: `Εξάγαγε ΟΛΟ το κείμενο από αυτή την εικόνα εγγράφου. 
                
Οδηγίες:
- Διατήρησε τη δομή και τη μορφοποίηση (παραγράφους, λίστες, πίνακες)
- Συμπερίλαβε όλους τους αριθμούς, ημερομηνίες και ποσά
- Για πίνακες, χρησιμοποίησε tabs για διαχωρισμό στηλών
- Αν υπάρχουν δυσανάγνωστα σημεία, σημείωσέ τα με [δυσανάγνωστο]
- Επέστρεψε ΜΟΝΟ το κείμενο, χωρίς επεξηγήσεις

Κείμενο:`
              }
            ]
          }
        ],
        max_tokens: 4096,
        temperature: 0.1
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini OCR API error:", response.status, errorText);
      return "";
    }
    
    const data = await response.json();
    const extractedText = data.choices?.[0]?.message?.content || "";
    
    console.log(`OCR extracted ${extractedText.length} characters`);
    return extractedText.trim();
    
  } catch (error) {
    console.error("OCR error:", error);
    return "";
  }
}

// Extract images from PDF for OCR
function extractPdfPages(arrayBuffer: ArrayBuffer): { images: string[], mimeType: string }[] {
  // For scanned PDFs, we'll convert the entire PDF to be processed
  // Since we can't easily extract individual page images without heavy libraries,
  // we'll send the raw PDF bytes as base64 and let Gemini handle it
  const bytes = new Uint8Array(arrayBuffer);
  const base64 = btoa(String.fromCharCode(...bytes));
  
  return [{ images: [base64], mimeType: 'application/pdf' }];
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

// Extract text from PDF using text stream parsing
function parsePdfTextStreams(arrayBuffer: ArrayBuffer): string {
  try {
    // Convert ArrayBuffer to string to find text streams
    const bytes = new Uint8Array(arrayBuffer);
    let text = "";
    
    // Simple PDF text extraction - look for text between BT and ET markers
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
      const streamContent = stream[1];
      if (streamContent.includes("(") && streamContent.includes(")")) {
        const textInStream = streamContent.matchAll(/\((.*?)\)/g);
        for (const t of textInStream) {
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
    
    return text;
  } catch (error) {
    console.error("Error in PDF text stream parsing:", error);
    return "";
  }
}

// Main PDF parsing function with OCR fallback
async function parsePdf(arrayBuffer: ArrayBuffer, enableOcr: boolean = true): Promise<{ text: string; usedOcr: boolean }> {
  try {
    // First, try standard text extraction
    const textFromStreams = parsePdfTextStreams(arrayBuffer);
    
    console.log(`Standard PDF parsing extracted ${textFromStreams.length} characters`);
    
    // If we got enough text, return it
    if (textFromStreams.length >= MIN_TEXT_LENGTH_FOR_VALID_PDF) {
      console.log("PDF has sufficient text content, using standard parsing");
      return { text: textFromStreams, usedOcr: false };
    }
    
    // PDF might be scanned/image-based - try OCR if enabled
    if (!enableOcr) {
      console.log("OCR disabled, returning limited text");
      return { text: textFromStreams, usedOcr: false };
    }
    
    console.log("PDF appears to be scanned/image-based, attempting OCR...");
    
    // Convert PDF to base64 for Gemini Vision
    const bytes = new Uint8Array(arrayBuffer);
    const base64 = btoa(String.fromCharCode.apply(null, Array.from(bytes)));
    
    // Perform OCR with Gemini
    const ocrText = await performOcrWithGemini(base64, 'application/pdf');
    
    if (ocrText.length > textFromStreams.length) {
      console.log(`OCR successful: extracted ${ocrText.length} characters`);
      return { text: ocrText, usedOcr: true };
    }
    
    // If OCR didn't help, return whatever we have
    console.log("OCR did not improve extraction, using standard parsing result");
    return { text: textFromStreams || ocrText, usedOcr: ocrText.length > 0 };
    
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
  contentType: string,
  enableOcr: boolean = true
): Promise<ParseResult> {
  let text = "";
  let fileType = "unknown";
  let usedOcr = false;
  
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
    const pdfResult = await parsePdf(arrayBuffer, enableOcr);
    text = pdfResult.text;
    usedOcr = pdfResult.usedOcr;
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
  } else if (
    // Image files - use OCR directly
    lowerFileName.endsWith('.png') ||
    lowerFileName.endsWith('.jpg') ||
    lowerFileName.endsWith('.jpeg') ||
    lowerFileName.endsWith('.webp') ||
    lowerContentType.includes('image/')
  ) {
    fileType = "image";
    if (enableOcr) {
      const bytes = new Uint8Array(arrayBuffer);
      const base64 = btoa(String.fromCharCode.apply(null, Array.from(bytes)));
      const mimeType = lowerContentType || 'image/png';
      text = await performOcrWithGemini(base64, mimeType);
      usedOcr = true;
    }
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
      characterCount,
      usedOcr
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
      
      // Check if OCR is enabled (default: true)
      const enableOcr = body.enableOcr !== false;
      
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
            fileData.type || 'application/octet-stream',
            enableOcr
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
            fileContentType || 'application/octet-stream',
            enableOcr
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
    
    // Check if any file used OCR
    const usedOcr = results.some(r => r.metadata.usedOcr);
    
    return new Response(
      JSON.stringify({
        success: true,
        text: combinedText,
        files: results,
        metadata: {
          fileCount: results.length,
          totalWordCount,
          totalCharacterCount: totalCharCount,
          usedOcr
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
