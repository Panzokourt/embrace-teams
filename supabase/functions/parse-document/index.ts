import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import JSZip from "https://esm.sh/jszip@3.10.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Minimum text length to consider PDF as text-based (not scanned)
const MIN_TEXT_LENGTH_FOR_VALID_PDF = 500;

// Max file size for processing (5MB)
const MAX_FILE_SIZE = 5 * 1024 * 1024;

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

// OCR/Document parsing using Gemini Vision via Lovable AI Gateway
async function parseDocumentWithGemini(base64Data: string, mimeType: string, fileName: string): Promise<string> {
  const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
  
  if (!lovableApiKey) {
    console.warn("LOVABLE_API_KEY not found, cannot use AI parsing");
    return "";
  }
  
  try {
    console.log(`Parsing document ${fileName} with Gemini Vision...`);
    
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
                  url: `data:${mimeType};base64,${base64Data}`
                }
              },
              {
                type: "text",
                text: `Εξάγαγε ΟΛΟΚΛΗΡΟ το κείμενο από αυτό το έγγραφο PDF. Αυτό είναι ελληνικό δημόσιο έγγραφο (διακήρυξη, προκήρυξη, σύμβαση).

ΟΔΗΓΙΕΣ:
1. Διάβασε ΚΑΘΕ ΣΕΛΙΔΑ προσεκτικά
2. Διατήρησε τη δομή: τίτλους, παραγράφους, αρίθμηση (1.1, 1.2, κλπ)
3. Για ΠΙΝΑΚΕΣ: χρησιμοποίησε format με | για διαχωρισμό στηλών
4. ΚΡΙΣΙΜΑ ΣΤΟΙΧΕΙΑ που πρέπει να εντοπίσεις:
   - Προϋπολογισμός/Budget (π.χ. "124.000,00€")
   - Προθεσμίες (ημερομηνίες υποβολής, διάρκεια)
   - Παραδοτέα (deliverables, πακέτα εργασίας)
   - Κριτήρια αξιολόγησης
   - Τεχνικές προδιαγραφές
5. ΜΗΝ παραλείψεις αριθμούς, ποσά, ημερομηνίες
6. Αν κάτι είναι δυσανάγνωστο, σημείωσε [δυσανάγνωστο]
7. Επέστρεψε ΜΟΝΟ το κείμενο χωρίς σχόλια

ΕΞΑΓΩΓΗ ΚΕΙΜΕΝΟΥ:`
              }
            ]
          }
        ],
        max_tokens: 16384,
        temperature: 0.1
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", response.status, errorText);
      
      // Handle rate limits gracefully
      if (response.status === 429) {
        throw new Error("Rate limit exceeded. Παρακαλώ δοκιμάστε ξανά σε λίγο.");
      }
      if (response.status === 402) {
        throw new Error("Credits required. Προσθέστε credits στο workspace.");
      }
      
      return "";
    }
    
    const data = await response.json();
    const extractedText = data.choices?.[0]?.message?.content || "";
    
    console.log(`Gemini extracted ${extractedText.length} characters from ${fileName}`);
    return extractedText.trim();
    
  } catch (error) {
    console.error("Gemini parsing error:", error);
    throw error;
  }
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
    let text = documentXml
      .replace(/<w:p[^>]*>/gi, '\n')
      .replace(/<w:tc[^>]*>/gi, '\t')
      .replace(/<w:tr[^>]*>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
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

// Basic PDF text extraction (fallback)
function parsePdfTextStreams(arrayBuffer: ArrayBuffer): string {
  try {
    const bytes = new Uint8Array(arrayBuffer);
    let text = "";
    
    const decoder = new TextDecoder("latin1");
    const pdfContent = decoder.decode(bytes);
    
    // Find all text objects (between BT and ET)
    const textMatches = pdfContent.matchAll(/BT\s*([\s\S]*?)\s*ET/g);
    
    for (const match of textMatches) {
      const textBlock = match[1];
      const tjMatches = textBlock.matchAll(/\((.*?)\)\s*Tj/g);
      for (const tj of tjMatches) {
        text += tj[1] + " ";
      }
      const tjArrayMatches = textBlock.matchAll(/\[(.*?)\]\s*TJ/gi);
      for (const tjArray of tjArrayMatches) {
        const innerText = tjArray[1].matchAll(/\((.*?)\)/g);
        for (const inner of innerText) {
          text += inner[1];
        }
        text += " ";
      }
    }
    
    // Clean up
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

// Check if text is readable (not garbled)
function isReadableText(text: string): boolean {
  if (text.length < 100) return false;
  
  // Check for Greek or Latin characters
  const greekPattern = /[α-ωά-ώΑ-ΩΆ-Ώ]/g;
  const latinPattern = /[a-zA-Z]/g;
  
  const greekMatches = text.match(greekPattern) || [];
  const latinMatches = text.match(latinPattern) || [];
  const totalLetters = greekMatches.length + latinMatches.length;
  
  // Check for too many garbage characters
  const garbagePattern = /[^\x20-\x7E\xA0-\xFF\u0370-\u03FF\u1F00-\u1FFF\n\r\t]/g;
  const garbageMatches = text.match(garbagePattern) || [];
  
  // If more than 30% is garbage, text is probably garbled
  const garbageRatio = garbageMatches.length / text.length;
  const letterRatio = totalLetters / text.length;
  
  console.log(`Text analysis: letters=${letterRatio.toFixed(2)}, garbage=${garbageRatio.toFixed(2)}`);
  
  return letterRatio > 0.3 && garbageRatio < 0.3;
}

// Main PDF parsing function with AI fallback
async function parsePdf(arrayBuffer: ArrayBuffer, fileName: string): Promise<{ text: string; usedOcr: boolean }> {
  try {
    // First, try standard text extraction
    const textFromStreams = parsePdfTextStreams(arrayBuffer);
    
    console.log(`Standard PDF parsing extracted ${textFromStreams.length} characters`);
    
    // Check if text is readable and sufficient
    const isReadable = isReadableText(textFromStreams);
    const hasSufficientText = textFromStreams.length >= MIN_TEXT_LENGTH_FOR_VALID_PDF;
    
    if (hasSufficientText && isReadable) {
      console.log("PDF has readable text content, using standard parsing");
      return { text: textFromStreams, usedOcr: false };
    }
    
    // Text is garbled or insufficient - use Gemini Vision
    console.log("PDF text is garbled or insufficient, using Gemini Vision for parsing...");
    
    // Check file size
    if (arrayBuffer.byteLength > MAX_FILE_SIZE) {
      console.warn(`File too large (${arrayBuffer.byteLength} bytes), truncating for AI processing`);
    }
    
    // Convert PDF to base64
    const bytes = new Uint8Array(arrayBuffer.slice(0, MAX_FILE_SIZE));
    const base64 = btoa(String.fromCharCode.apply(null, Array.from(bytes)));
    
    // Use Gemini Vision to parse the PDF
    const aiText = await parseDocumentWithGemini(base64, 'application/pdf', fileName);
    
    if (aiText.length > 0) {
      console.log(`AI parsing successful: extracted ${aiText.length} characters`);
      return { text: aiText, usedOcr: true };
    }
    
    // Fallback to whatever we have
    console.log("AI parsing failed, returning basic extraction");
    return { text: textFromStreams, usedOcr: false };
    
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
  let usedOcr = false;
  
  const lowerFileName = fileName.toLowerCase();
  const lowerContentType = contentType.toLowerCase();
  
  console.log(`Parsing ${fileName} (${contentType}), size: ${arrayBuffer.byteLength} bytes`);
  
  // Determine file type and parse accordingly
  if (
    lowerFileName.endsWith('.docx') || 
    lowerContentType.includes('vnd.openxmlformats-officedocument.wordprocessingml')
  ) {
    fileType = "docx";
    text = await parseDocx(arrayBuffer);
    
    // If DOCX text is garbled, try AI
    if (!isReadableText(text) && text.length < 500) {
      console.log("DOCX text seems garbled, trying AI parsing...");
      const bytes = new Uint8Array(arrayBuffer.slice(0, MAX_FILE_SIZE));
      const base64 = btoa(String.fromCharCode.apply(null, Array.from(bytes)));
      const aiText = await parseDocumentWithGemini(base64, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', fileName);
      if (aiText.length > text.length) {
        text = aiText;
        usedOcr = true;
      }
    }
  } else if (
    lowerFileName.endsWith('.pdf') || 
    lowerContentType.includes('application/pdf')
  ) {
    fileType = "pdf";
    const pdfResult = await parsePdf(arrayBuffer, fileName);
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
  } else if (lowerFileName.endsWith('.doc')) {
    // Old .doc format - try AI parsing
    fileType = "doc";
    const bytes = new Uint8Array(arrayBuffer.slice(0, MAX_FILE_SIZE));
    const base64 = btoa(String.fromCharCode.apply(null, Array.from(bytes)));
    try {
      text = await parseDocumentWithGemini(base64, 'application/msword', fileName);
      usedOcr = true;
    } catch {
      // Fallback to basic text extraction
      text = parseText(arrayBuffer);
      text = text.replace(/[^\x20-\x7E\xA0-\xFF\n\r\t]/g, ' ');
      text = text.replace(/\s{3,}/g, ' ').trim();
    }
  } else if (
    lowerFileName.endsWith('.png') ||
    lowerFileName.endsWith('.jpg') ||
    lowerFileName.endsWith('.jpeg') ||
    lowerFileName.endsWith('.webp') ||
    lowerContentType.includes('image/')
  ) {
    fileType = "image";
    const bytes = new Uint8Array(arrayBuffer);
    const base64 = btoa(String.fromCharCode.apply(null, Array.from(bytes)));
    const mimeType = lowerContentType || 'image/png';
    text = await parseDocumentWithGemini(base64, mimeType, fileName);
    usedOcr = true;
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
    
    // Check if any file used OCR/AI
    const usedOcr = results.some(r => r.metadata.usedOcr);
    
    console.log(`Successfully parsed ${results.length} files, total ${totalWordCount} words, usedAI: ${usedOcr}`);
    
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
    
    // Return appropriate error status
    const status = message.includes('Rate limit') ? 429 : 
                   message.includes('Credits') ? 402 : 500;
    
    return new Response(
      JSON.stringify({ 
        error: message,
        details: details
      }),
      { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
